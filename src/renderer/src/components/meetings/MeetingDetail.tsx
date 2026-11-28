import React, { useEffect, useState } from 'react'
import { ArrowLeft, Circle, Square } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { RAIL_PAGE_GUTTER_X } from '@/components/rail-page/RailPage'
import {
  SIDEBAR_CHAT_CONVERSATIONS,
  useSidebarChatOpenConversation
} from '@/components/sidebar-chat/sidebar-chat-mock-data'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { cn } from '@/lib/class-names'
import { openMeetingTask } from './meeting-navigation'
import { personName } from './meeting-people'
import { excerptAround, meetingAccess } from './meeting-rules'
import { MeetingMinutes } from './MeetingMinutes'
import { MeetingSection, useMeetingText } from './MeetingParts'
import { MinutesRequestControl, MinutesSharing } from './MeetingSharing'
import { MeetingPrep } from './MeetingPrep'
import { MeetingTranscript } from './MeetingTranscript'
import type { Meeting } from './meeting-types'
import { startRecording, stopRecording, useMeetings } from './meetings-store'

/** Seconds since `startedAt`, ticking while the window can be seen. */
export function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) {
      return
    }
    setNow(Date.now())
    // The timer is the feature, but it has nothing to draw while the window is hidden.
    return installWindowVisibilityInterval({ run: () => setNow(Date.now()), intervalMs: 1000 })
  }, [startedAt])
  return startedAt === null ? 0 : (now - startedAt) / 1000
}

function RecordingStrip({
  meeting,
  isHost
}: {
  meeting: Meeting
  isHost: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const elapsed = useElapsedSeconds(meeting.recordingStartedAt)
  const recording = meeting.recordingStartedAt !== null
  const people = meeting.attendeeIds.length + 1
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border px-3 py-1.5"
        data-meeting-recorder={recording ? 'recording' : 'idle'}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {recording ? (
            <>
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
              />
              <span role="status" className="font-medium text-foreground">
                {t('meetings.recording.on', 'Recording')}
              </span>
              <span role="timer" className="font-mono text-xs text-muted-foreground tabular-nums">
                {text.elapsed(elapsed)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(
                  'meetings.recording.everyoneSees',
                  'All {{count}} people in the meeting see this.',
                  {
                    count: people
                  }
                )}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {isHost
                ? t('meetings.recording.hostIdle', 'Start recording when the meeting begins.')
                : t(
                    'meetings.recording.attendeeIdle',
                    'When the host starts recording, it shows here and in the status bar.'
                  )}
            </span>
          )}
        </div>
        {isHost && !recording ? (
          <Button type="button" size="sm" onClick={() => startRecording(meeting.id)}>
            <Circle className="size-3 fill-current" aria-hidden />
            {t('meetings.recording.start', 'Start recording')}
          </Button>
        ) : null}
        {isHost && recording ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              stopRecording(meeting.id)
              toast.success(
                t(
                  'meetings.recording.sent',
                  'The meeting bot sent the minutes to all {{count}} people in the meeting.',
                  { count: people }
                )
              )
            }}
          >
            <Square className="size-3 fill-current" aria-hidden />
            {t('meetings.recording.stop', 'End recording')}
          </Button>
        ) : null}
      </div>
      {isHost && !recording ? (
        <p className="text-xs text-muted-foreground">
          {t(
            'meetings.recording.simulated',
            'This build does not capture sound. When you end the recording, prepared sample minutes are made and sent to the attendees.'
          )}
        </p>
      ) : null}
    </div>
  )
}

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
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-6 scrollbar-sleek',
        RAIL_PAGE_GUTTER_X
      )}
    >
      <div className="flex max-w-prose flex-col items-start gap-2">
        <p className="text-xs text-muted-foreground">
          {t(
            'meetings.excerpt.scope',
            'You were not in this meeting, so you see your task and the part of the meeting it came from. The host or an attendee can share the full minutes with you.'
          )}
        </p>
        <MinutesRequestControl meeting={meeting} />
      </div>
      {mine.map((task) => {
        const followUp = meeting.followUps.find((f) => f.id === task.followUpId)
        const turnId = followUp?.turnId ?? ''
        return (
          <MeetingSection
            key={task.id}
            title={t('meetings.excerpt.task', 'My task')}
            action={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => openMeetingTask(task.id)}
              >
                {t('meetings.openTask', 'Open task')}
              </Button>
            }
          >
            <p className="text-sm font-medium text-foreground">{task.title}</p>
            <p className="mb-3 text-xs text-muted-foreground">
              {text.status[task.status]} · {text.due(task.due)} ·{' '}
              {t('meetings.excerpt.assignedBy', 'Assigned by {{name}}', {
                name: personName(meeting.hostId)
              })}
            </p>
            <MeetingTranscript
              turns={excerptAround(meeting.minutes?.transcript ?? [], [turnId])}
              startsAt={meeting.startsAt}
              markedTurnId={turnId}
              markNonce={focus?.nonce}
            />
          </MeetingSection>
        )
      })}
    </div>
  )
}

/** One meeting: before (outline), during (recording), after (minutes and follow-up tasks). */
export function MeetingDetail({
  meeting,
  onBack
}: {
  meeting: Meeting
  onBack: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const viewerId = useMeetings((state) => state.viewerId)
  const tasks = useMeetings((state) => state.tasks)
  const access = meetingAccess(meeting, viewerId, tasks)
  const isHost = meeting.hostId === viewerId
  const origin = SIDEBAR_CHAT_CONVERSATIONS.find(({ id }) => id === meeting.originConversationId)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className={cn('flex shrink-0 flex-col gap-3 pt-4 pb-3', RAIL_PAGE_GUTTER_X)}>
        <div className="flex items-start gap-2">
          {/* The span carries the rule: Button's own display would beat it. */}
          <span className="-ml-1.5 @min-[40rem]/rail-page:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon-toolbar"
              aria-label={t('meetings.backToList', 'Back to the list')}
              onClick={onBack}
            >
              <ArrowLeft aria-hidden />
            </Button>
          </span>
          <div className="min-w-0 flex-1">
            <h2
              tabIndex={-1}
              data-meeting-detail-title=""
              className="text-base font-semibold tracking-tight text-foreground outline-none"
            >
              {meeting.title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {text.when(meeting)}
              {meeting.place ? ` · ${meeting.place}` : ''}
            </p>
            <p className="text-xs text-muted-foreground" data-meeting-people="">
              {t('meetings.detail.people', 'Host {{host}} · Attendees {{attendees}}', {
                host: personName(meeting.hostId),
                // Before the meeting each name carries the answer to the invitation.
                attendees: meeting.attendeeIds
                  .map((id) =>
                    meeting.minutes || meeting.recordingStartedAt !== null
                      ? personName(id)
                      : `${personName(id)} (${
                          meeting.responses[id] === 'yes'
                            ? t('meetings.response.yes', 'Coming')
                            : meeting.responses[id] === 'no'
                              ? t('meetings.response.no', 'Not coming')
                              : t('meetings.response.none', 'No answer')
                        })`
                  )
                  .join(', ')
              })}
            </p>
            {origin && access === 'full' ? (
              <span className="mt-0.5 -ml-2 block">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  data-meeting-origin=""
                  onClick={() => useSidebarChatOpenConversation.getState().setOpenId(origin.id)}
                >
                  {t('meetings.detail.origin', 'Set up from the chat “{{name}}”', {
                    name: origin.name
                  })}
                </Button>
              </span>
            ) : null}
          </div>
        </div>
        {access === 'full' && !meeting.minutes ? (
          <RecordingStrip meeting={meeting} isHost={isHost} />
        ) : null}
        {access === 'full' && meeting.minutes ? <MinutesSharing meeting={meeting} /> : null}
      </div>
      {access !== 'full' ? (
        <MeetingExcerpt meeting={meeting} />
      ) : meeting.minutes ? (
        <MeetingMinutes meeting={meeting} minutes={meeting.minutes} />
      ) : (
        <div
          className={cn('min-h-0 flex-1 overflow-y-auto pb-6 scrollbar-sleek', RAIL_PAGE_GUTTER_X)}
        >
          <MeetingPrep meeting={meeting} isHost={isHost} />
        </div>
      )}
    </div>
  )
}
