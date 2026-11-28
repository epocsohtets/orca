import React, { useEffect, useState } from 'react'
import { Circle, Square } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HOME_META_CLASS, HomeCard } from '@/components/home/HomeCard'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { useMeetingText } from './MeetingParts'
import type { Meeting } from './meeting-types'
import { startRecording, stopRecording } from './meetings-store'

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

/** Before the minutes exist: the recording, which only the host starts and ends. */
export function MeetingRecordingCard({
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
    <HomeCard
      title={t('meetings.recording.card', 'Recording')}
      data-meeting-card="recording"
      data-meeting-recorder={recording ? 'recording' : 'idle'}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-2">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          {recording ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1" role="status">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
              />
              <span className="text-[13px] font-medium text-foreground">
                {t('meetings.recording.on', 'Recording')}
              </span>
              <span
                role="timer"
                className="text-2xl leading-8 font-semibold text-foreground tabular-nums"
              >
                {text.elapsed(elapsed)}
              </span>
            </p>
          ) : isHost ? null : (
            <p className="text-[13px] text-foreground">
              {t(
                'meetings.recording.attendeeIdle',
                'When the host starts recording, everyone in the meeting sees the recording mark.'
              )}
            </p>
          )}
          <p className={HOME_META_CLASS}>
            {recording
              ? t(
                  'meetings.recording.everyoneSees',
                  'All {{count}} people in the meeting see this.',
                  {
                    count: people
                  }
                )
              : null}
          </p>
        </div>
        {isHost && !recording ? (
          <Button
            type="button"
            size="sm"
            data-meeting-record="start"
            onClick={() => startRecording(meeting.id)}
          >
            <Circle className="size-3 fill-current" aria-hidden />
            {t('meetings.recording.start', 'Start recording')}
          </Button>
        ) : null}
        {isHost && recording ? (
          <Button
            type="button"
            size="sm"
            data-meeting-record="stop"
            onClick={() => {
              stopRecording(meeting.id)
              toast.success(
                t(
                  'meetings.recording.sent',
                  'The meeting agent sent the minutes to all {{count}} people in the meeting.',
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
    </HomeCard>
  )
}
