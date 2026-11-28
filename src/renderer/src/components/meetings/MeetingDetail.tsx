import React from 'react'
import { Check, CircleAlert, CircleCheck, List, MessageSquare } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HOME_BOARD_COLUMNS_CLASS, HOME_META_CLASS, HomeCard } from '@/components/home/HomeCard'
import { HomePageHeading, HomeTileRow, type HomeTile } from '@/components/home/HomeHeader'
import type { HomeProjectId } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { InaxStatusBadge } from '@/components/task-page/inax/inax-status-badge'
import {
  SIDEBAR_CHAT_CONVERSATIONS,
  useSidebarChatOpenConversation
} from '@/components/sidebar-chat/sidebar-chat-mock-data'
import { openMeeting, openMeetingTask } from './meeting-navigation'
import { personName } from './meeting-people'
import { excerptAround, followUpCounts, followUpState, meetingAccess } from './meeting-rules'
import { MeetingFollowUps } from './MeetingFollowUps'
import { MeetingMinutes } from './MeetingMinutes'
import { useMeetingText } from './MeetingParts'
import { MeetingPersonChip } from './MeetingPeoplePicker'
import { MeetingPrep } from './MeetingPrep'
import { MeetingRecordingCard } from './MeetingRecordingCard'
import { MinutesRequestControl, MinutesScopeCard, MinutesShareButton } from './MeetingSharing'
import { MeetingTranscript } from './MeetingTranscript'
import type { Meeting } from './meeting-types'
import { useMeetings } from './meetings-store'

/** What an assignee who was not in the meeting may see: their task and the part it rests on. */
function MeetingExcerpt({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const viewerId = useMeetings((state) => state.viewerId)
  const focus = useMeetings((state) => state.focus)
  const mine = useMeetings((state) => state.tasks).filter(
    (task) => task.meetingId === meeting.id && task.assigneeId === viewerId
  )
  return (
    <div className={HOME_BOARD_COLUMNS_CLASS}>
      <div className="flex min-w-0 flex-col gap-4">
        {mine.map((task) => {
          const turnId = meeting.followUps.find((f) => f.id === task.followUpId)?.turnId ?? ''
          return (
            <HomeCard
              key={task.id}
              title={t('meetings.excerpt.task', 'My task')}
              data-meeting-card="excerpt"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => openMeetingTask(task.id)}
                >
                  {t('meetings.openTask', 'Open task')}
                </Button>
              }
            >
              <div className="flex flex-col gap-3 px-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[13px] leading-5 text-foreground">{task.title}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <InaxStatusBadge status={task.status} />
                    <span className={HOME_META_CLASS}>
                      {text.due(task.due)} ·{' '}
                      {t('meetings.excerpt.assignedBy', 'Assigned by {{name}}', {
                        name: personName(meeting.hostId)
                      })}
                    </span>
                  </p>
                </div>
                <div className="border-t border-border pt-3">
                  <h3 className="pb-2 text-xs leading-4 text-muted-foreground">
                    {t('meetings.excerpt.where', 'The part of the meeting it came from')}
                  </h3>
                  <MeetingTranscript
                    turns={excerptAround(meeting.minutes?.transcript ?? [], [turnId])}
                    startsAt={meeting.startsAt}
                    markedTurnId={turnId}
                    markNonce={focus?.nonce}
                  />
                </div>
              </div>
            </HomeCard>
          )
        })}
      </div>
      <HomeCard title={t('meetings.share.card', 'Who sees what')} data-meeting-card="scope">
        <div className="flex flex-col items-start gap-2 px-4">
          <MinutesRequestControl meeting={meeting} />
        </div>
      </HomeCard>
    </div>
  )
}

/** A meeting's project, people and source on one quiet row. Each is read from its shape, with no label. */
function MeetingFacts({
  meeting,
  project,
  showOrigin
}: {
  meeting: Meeting
  project: HomeProject
  showOrigin: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const origin = SIDEBAR_CHAT_CONVERSATIONS.find(({ id }) => id === meeting.originConversationId)
  const before = !meeting.minutes && meeting.recordingStartedAt === null
  const answer = (id: string): string =>
    meeting.responses[id] === 'yes'
      ? t('meetings.response.yes', 'Coming')
      : meeting.responses[id] === 'no'
        ? t('meetings.response.no', 'Not coming')
        : t('meetings.response.none', 'Not answered')
  return (
    <Card size="board" data-meeting-facts="">
      <div className="flex h-9 items-center gap-x-6 overflow-hidden px-4 text-[13px] leading-5 whitespace-nowrap @max-[60rem]/rail-page:h-auto @max-[60rem]/rail-page:min-h-9 @max-[60rem]/rail-page:flex-wrap @max-[60rem]/rail-page:gap-y-2 @max-[60rem]/rail-page:py-2">
        {/* The names the eye does not need are still there for a screen reader. */}
        <span className="flex min-w-0 items-center gap-1.5 text-foreground">
          <span className="sr-only">{t('taskLoop.detail.project', 'Project')}</span>
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="truncate">{project.name}</span>
        </span>
        <ul
          aria-label={t('meetings.detail.attendees', 'People')}
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"
          data-meeting-people=""
        >
          <li className="flex">
            <MeetingPersonChip
              plain
              personId={meeting.hostId}
              tag={t('meetings.detail.host', 'Host')}
            />
          </li>
          {meeting.attendeeIds.map((id) => (
            // Before the meeting each person carries the answer to the invitation.
            <li key={id} className="flex">
              <MeetingPersonChip plain personId={id} tag={before ? answer(id) : undefined} />
            </li>
          ))}
        </ul>
        {origin && showOrigin ? (
          <Button
            type="button"
            variant="link"
            size="inlineInherit"
            aria-label={t('meetings.detail.originChat', 'Chat “{{name}}”', { name: origin.name })}
            data-meeting-origin=""
            onClick={() => useSidebarChatOpenConversation.getState().setOpenId(origin.id)}
          >
            <MessageSquare aria-hidden className="size-3.5" />
            {origin.name}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

type TileId = 'decisions' | 'followUps' | 'done' | 'mine'

/** One meeting: before (outline and materials), during (recording), after (minutes and follow-up tasks). */
export function MeetingDetail({
  meeting,
  projects,
  before
}: {
  meeting: Meeting
  projects: Record<HomeProjectId, HomeProject>
  before: React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const viewerId = useMeetings((state) => state.viewerId)
  const tasks = useMeetings((state) => state.tasks)
  const access = meetingAccess(meeting, viewerId, tasks)
  const isHost = meeting.hostId === viewerId
  const counts = followUpCounts(meeting.followUps, tasks)
  const mine = meeting.followUps.filter((followUp) => {
    const state = followUpState(followUp, tasks)
    return state.kind === 'task'
      ? state.task.assigneeId === viewerId
      : followUp.suggestedOwnerId === viewerId
  })
  const tiles: HomeTile<TileId>[] = [
    {
      id: 'decisions',
      icon: CircleCheck,
      label: t('meetings.minutes.decisions', 'Decisions'),
      value: meeting.minutes?.decisions.length ?? 0
    },
    {
      id: 'followUps',
      icon: List,
      label: t('meetings.followUps.title', 'Follow-up tasks'),
      value: counts.total
    },
    {
      id: 'done',
      icon: Check,
      label: t('meetings.tiles.done', 'Tasks done'),
      value: counts.done
    },
    {
      id: 'mine',
      icon: CircleAlert,
      label: t('meetings.followUps.mine', 'Mine'),
      value: mine.length
    }
  ]
  const state =
    meeting.recordingStartedAt !== null ? 'recording' : meeting.minutes ? 'after' : 'before'

  return (
    <>
      <HomePageHeading
        title={meeting.title}
        line={`${text.when(meeting)}${meeting.place ? ` · ${meeting.place}` : ''}`}
        before={before}
      >
        {access === 'full' && meeting.minutes ? <MinutesShareButton meeting={meeting} /> : null}
      </HomePageHeading>
      <MeetingFacts
        meeting={meeting}
        project={projects[meeting.project]}
        showOrigin={access === 'full'}
      />
      {access !== 'full' ? (
        <MeetingExcerpt meeting={meeting} />
      ) : meeting.minutes ? (
        <>
          <HomeTileRow
            tiles={tiles}
            onSelect={(tile) => {
              if (tile === 'decisions' || tile === 'mine') {
                openMeeting(meeting.id, { depth: 'brief' })
              }
              document
                .querySelector<HTMLElement>(
                  tile === 'decisions' || tile === 'mine'
                    ? '[data-meeting-card="minutes"]'
                    : '[data-meeting-card="follow-ups"]'
                )
                ?.scrollIntoView({ block: 'nearest' })
            }}
          />
          <div className={HOME_BOARD_COLUMNS_CLASS}>
            <div className="flex min-w-0 flex-col gap-4">
              <MeetingMinutes meeting={meeting} minutes={meeting.minutes} />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <MinutesScopeCard meeting={meeting} />
              <MeetingPrep meeting={meeting} isHost={isHost} />
            </div>
          </div>
          {/* The whole width: a follow-up's words get the room, and stay on one line. */}
          <MeetingFollowUps meeting={meeting} />
        </>
      ) : (
        <div className={HOME_BOARD_COLUMNS_CLASS} data-meeting-state={state}>
          <div className="flex min-w-0 flex-col gap-4">
            <MeetingPrep meeting={meeting} isHost={isHost} />
          </div>
          <MeetingRecordingCard meeting={meeting} isHost={isHost} />
        </div>
      )}
    </>
  )
}
