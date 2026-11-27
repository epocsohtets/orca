import React, { useEffect, useState } from 'react'
import { Circle, Square } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { formatElapsed } from './meeting-list-groups'
import { createMinutes, startRecording, stopRecording } from './meetings-mock'
import type { Meeting } from './meeting-types'

function useElapsedSeconds(startedAt: number | null): number {
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

/** The record control. Mock only: a timer and a timed "processing" step; no microphone is opened. */
export function MeetingRecorder({
  meeting,
  otherRecording
}: {
  meeting: Meeting
  /** Another meeting is recording, so this one cannot start. */
  otherRecording: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const elapsed = useElapsedSeconds(meeting.recordingStartedAt)
  const { phase } = meeting
  const duration = formatElapsed(phase === 'recording' ? elapsed : meeting.recordedSeconds)

  const status =
    phase === 'idle'
      ? t('meetings.recorder.idle', 'Not recorded')
      : phase === 'recording'
        ? t('meetings.recorder.recording', 'Recording')
        : phase === 'processing'
          ? meeting.processingStage === 'transcribing'
            ? t('meetings.recorder.transcribing', 'Transcribing…')
            : t('meetings.recorder.writing', 'Writing minutes…')
          : phase === 'stopped'
            ? t('meetings.recorder.stopped', 'Recorded')
            : t('meetings.recorder.ready', 'Recorded, minutes ready')

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border px-3 py-1.5"
        data-meeting-recorder={phase}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {phase === 'recording' ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
            />
          ) : null}
          {phase === 'processing' ? (
            <span className="inline-flex text-muted-foreground">
              <LoadingSpinner className="size-4" />
            </span>
          ) : null}
          {/* The state is announced; the ticking timer is not. */}
          <span
            role="status"
            className={
              phase === 'recording' || phase === 'processing'
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            }
          >
            {status}
          </span>
          {phase !== 'idle' ? (
            <span
              role={phase === 'recording' ? 'timer' : undefined}
              aria-label={t('meetings.recorder.duration', 'Length {{duration}}', { duration })}
              className="font-mono text-xs tabular-nums text-muted-foreground"
            >
              {duration}
            </span>
          ) : null}
        </div>
        {phase === 'idle' ? (
          <Button
            type="button"
            size="sm"
            disabled={otherRecording}
            onClick={() => startRecording(meeting.id)}
          >
            <Circle className="size-3 fill-current" aria-hidden />
            {t('meetings.recorder.start', 'Start recording')}
          </Button>
        ) : null}
        {phase === 'recording' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => stopRecording(meeting.id)}
          >
            <Square className="size-3 fill-current" aria-hidden />
            {t('meetings.recorder.stop', 'Stop')}
          </Button>
        ) : null}
        {phase === 'stopped' ? (
          <Button type="button" size="sm" onClick={() => createMinutes(meeting.id)}>
            {t('meetings.recorder.createMinutes', 'Create minutes')}
          </Button>
        ) : null}
      </div>
      {phase === 'idle' && otherRecording ? (
        <p className="text-xs text-muted-foreground">
          {t(
            'meetings.recorder.otherRecording',
            'Stop the meeting that is recording to start this one.'
          )}
        </p>
      ) : phase === 'idle' || phase === 'recording' ? (
        <p className="text-xs text-muted-foreground">
          {t(
            'meetings.recorder.pocNote',
            'PoC: no audio is captured and the microphone is not used.'
          )}
        </p>
      ) : null}
    </div>
  )
}
