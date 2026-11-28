import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { openMeeting } from './meeting-navigation'
import { isParticipant } from './meeting-rules'
import { useElapsedSeconds } from './MeetingDetail'
import { useMeetingText } from './MeetingParts'
import { useMeetings } from './meetings-store'

/** "Recording · title · 12 min 40 sec" on every screen, for everyone in the meeting being recorded. */
export function MeetingRecordingStatusSegment(): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const meeting = useMeetings((state) =>
    state.meetings.find((m) => m.recordingStartedAt !== null && isParticipant(m, state.viewerId))
  )
  const elapsed = useElapsedSeconds(meeting?.recordingStartedAt ?? null)
  if (!meeting) {
    return null
  }
  return (
    // The one loud item among the bar's quiet icons: state colour on the dot, border and fill.
    // The words stay in the foreground colour, because red text on the red tint is under 4.5:1.
    <button
      type="button"
      data-meeting-recording-status=""
      onClick={() => openMeeting(meeting.id)}
      className="inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-md border border-destructive/50 bg-destructive/10 px-2 text-xs text-foreground outline-none hover:bg-destructive/15 focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t(
        'meetings.recording.statusAria',
        '{{title}} is being recorded. Open the meeting.',
        {
          title: meeting.title
        }
      )}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
      />
      <span className="font-semibold">{t('meetings.recording.on', 'Recording')}</span>
      <span aria-hidden className="text-muted-foreground">
        ·
      </span>
      <span className="max-w-56 truncate">{meeting.title}</span>
      <span aria-hidden className="text-muted-foreground">
        ·
      </span>
      <span className="tabular-nums">{text.elapsed(elapsed)}</span>
    </button>
  )
}
