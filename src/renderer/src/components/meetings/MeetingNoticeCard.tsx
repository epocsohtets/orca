import React from 'react'
import { Bot, CalendarClock, X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/store'
import { openMeeting, openMeetingBot } from './meeting-navigation'
import { personName } from './meeting-people'
import { botItemsFor, isParticipant } from './meeting-rules'
import { useMeetingText } from './MeetingParts'
import { isSeen, markSeen, scenarioNow, useMeetings } from './meetings-store'

const SOON_MS = 10 * 60_000

/** Brings a meeting to the person: one that is about to start, or what the meeting bot just sent. */
export function MeetingNoticeCard(): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const state = useMeetings()
  const onBotPage = useAppStore((s) => s.activeView === 'meetingBot')
  const now = scenarioNow()
  const unread = botItemsFor(state.viewerId, state.meetings, state.tasks).filter(
    (item) => !isSeen(state, item.key) && !isSeen(state, `notice:${item.key}`)
  )
  const soon = state.meetings.find(
    (m) =>
      isParticipant(m, state.viewerId) &&
      !m.minutes &&
      m.recordingStartedAt === null &&
      m.startsAt >= now &&
      m.startsAt - now <= SOON_MS &&
      !isSeen(state, `notice:soon:${m.id}`)
  )
  const item = onBotPage ? undefined : unread.at(-1)
  // Recording that someone else started on a meeting I am in.
  const recording = state.meetings.find(
    (m) =>
      m.recordingStartedAt !== null &&
      m.hostId !== state.viewerId &&
      isParticipant(m, state.viewerId) &&
      !isSeen(state, `notice:recording:${m.id}:${m.recordingStartedAt}`)
  )
  const asked = state.meetings
    .filter((m) => m.hostId === state.viewerId)
    .flatMap((m) => m.requests.filter((r) => !r.declined).map((r) => ({ meeting: m, request: r })))
    .find(
      ({ meeting, request }) => !isSeen(state, `notice:request:${meeting.id}:${request.personId}`)
    )
  const bot = <Bot aria-hidden className="size-4 text-muted-foreground" />
  const notice = recording
    ? {
        key: `notice:recording:${recording.id}:${recording.recordingStartedAt}`,
        icon: <span aria-hidden className="size-2 rounded-full bg-destructive" />,
        title: t('meetings.notice.recordingTitle', 'Recording has started'),
        body: t(
          'meetings.notice.recordingBody',
          '{{name}} is recording “{{title}}”. It stays in the status bar until it ends.',
          { name: personName(recording.hostId), title: recording.title }
        ),
        action: t('meetings.chat.open', 'Open the meeting'),
        run: () => openMeeting(recording.id)
      }
    : item
      ? {
          key: `notice:${item.key}`,
          icon: bot,
          title:
            item.kind === 'minutes'
              ? t('meetings.notice.minutesTitle', 'Meeting bot: the minutes are here')
              : item.kind === 'shared'
                ? t('meetings.notice.sharedTitle', 'Meeting bot: minutes were shared with you')
                : t('meetings.notice.taskTitle', 'Meeting bot: a task was assigned to you'),
          body: item.kind === 'assigned' ? item.task.title : item.meeting.title,
          action: t('meetings.notice.openMessage', 'Open the message'),
          run: openMeetingBot
        }
      : asked
        ? {
            key: `notice:request:${asked.meeting.id}:${asked.request.personId}`,
            icon: bot,
            title: t('meetings.notice.requestTitle', '{{name}} asks to see the minutes', {
              name: personName(asked.request.personId)
            }),
            body: asked.meeting.title,
            action: t('meetings.notice.openRequest', 'See the request'),
            run: () => openMeeting(asked.meeting.id, { depth: 'brief' })
          }
        : soon
          ? {
              key: `notice:soon:${soon.id}`,
              icon: <CalendarClock aria-hidden className="size-4 text-muted-foreground" />,
              title: t('meetings.notice.soonTitle', 'Starts in {{count}} minutes', {
                count: Math.max(1, Math.round((soon.startsAt - now) / 60_000))
              }),
              body: `${soon.title} · ${text.time(soon.startsAt)}${soon.place ? ` · ${soon.place}` : ''}`,
              action: t('meetings.notice.openOutline', 'Read the outline'),
              run: () => openMeeting(soon.id)
            }
          : null
  if (!notice) {
    return null
  }
  return (
    <div data-meeting-notice={notice.key}>
      <Card size="notice" role="complementary" aria-labelledby="meeting-notice-heading">
        <div className="flex flex-col gap-2.5 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {notice.icon}
              <h3 id="meeting-notice-heading" className="text-sm font-semibold">
                {notice.title}
              </h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={t('meetings.notice.dismiss', 'Dismiss')}
              onClick={() => markSeen([notice.key])}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{notice.body}</p>
          <div className="mt-0.5 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                markSeen([notice.key])
                notice.run()
              }}
            >
              {notice.action}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
