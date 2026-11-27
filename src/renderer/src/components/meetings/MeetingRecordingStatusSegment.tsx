import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { openMeeting } from './meeting-navigation'
import { isParticipant } from './meeting-rules'
import { formatElapsed } from './meeting-schedule'
import { useElapsedSeconds } from './MeetingDetail'
import { useMeetings } from './meetings-store'

/** "Recording · 12:40" on every screen, for everyone in the meeting being recorded. */
export function MeetingRecordingStatusSegment(): React.JSX.Element | null {
  const t = useTranslate()
  const meeting = useMeetings((state) =>
    state.meetings.find((m) => m.recordingStartedAt !== null && isParticipant(m, state.viewerId))
  )
  const elapsed = useElapsedSeconds(meeting?.recordingStartedAt ?? null)
  if (!meeting) {
    return null
  }
  const label = t('meetings.recording.status', 'Recording · {{time}}', {
    time: formatElapsed(elapsed)
  })
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-meeting-recording-status=""
          onClick={() => openMeeting(meeting.id)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-accent/70"
          aria-label={t(
            'meetings.recording.statusAria',
            '{{title}} is being recorded. Open the meeting.',
            {
              title: meeting.title
            }
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
          <span className="text-[11px] tabular-nums">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {meeting.title}
      </TooltipContent>
    </Tooltip>
  )
}
