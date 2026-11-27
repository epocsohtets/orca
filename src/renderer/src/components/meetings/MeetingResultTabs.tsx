import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { formatElapsed } from './meeting-list-groups'
import { MeetingSection } from './MeetingParts'
import type { MeetingResult, MeetingTurn } from './meeting-types'

/** Consecutive turns by one speaker, so a long transcript names each speaker once per run. */
function speakerRuns(turns: MeetingTurn[]): { speaker: string; turns: MeetingTurn[] }[] {
  const runs: { speaker: string; turns: MeetingTurn[] }[] = []
  for (const turn of turns) {
    const last = runs.at(-1)
    if (last?.speaker === turn.speaker) {
      last.turns.push(turn)
    } else {
      runs.push({ speaker: turn.speaker, turns: [turn] })
    }
  }
  return runs
}

export function MeetingTranscriptTab({ result }: { result: MeetingResult }): React.JSX.Element {
  const t = useTranslate()
  const runs = speakerRuns(result.transcript)
  return (
    <div className="flex max-w-prose flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {t(
          'meetings.transcript.caption',
          '{{count}} turns. Speakers are matched to the attendees.',
          {
            count: result.transcript.length
          }
        )}
      </p>
      <ol className="flex flex-col gap-4">
        {runs.map((run) => (
          <li key={run.turns[0].at}>
            <p className="pl-12 text-[13px] font-semibold text-foreground">{run.speaker}</p>
            {run.turns.map((turn) => (
              <div key={turn.at} className="mt-1 grid grid-cols-[3rem_minmax(0,1fr)]">
                <span className="pt-0.5 font-mono text-2xs leading-5 tabular-nums text-muted-foreground">
                  {formatElapsed(turn.at)}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{turn.text}</p>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function MeetingMinutesTab({ result }: { result: MeetingResult }): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="flex max-w-prose flex-col gap-6">
      <MeetingSection title={t('meetings.minutes.summary', 'Summary')}>
        <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
      </MeetingSection>
      <MeetingSection title={t('meetings.minutes.decisions', 'Decisions')}>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground marker:text-muted-foreground">
          {result.decisions.map((decision) => (
            <li key={decision}>{decision}</li>
          ))}
        </ul>
      </MeetingSection>
      <MeetingSection title={t('meetings.minutes.minutes', 'Minutes')}>
        <div className="flex flex-col gap-3">
          {result.minutes.map((section) => (
            <div key={section.topic}>
              <h4 className="text-[13px] font-semibold text-foreground">{section.topic}</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-muted-foreground">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </MeetingSection>
    </div>
  )
}
