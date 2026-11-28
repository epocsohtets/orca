import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/class-names'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { personName } from './meeting-people'
import { useMeetingText } from './MeetingParts'
import type { MeetingTurn } from './meeting-types'

/** Consecutive turns by one speaker, so a long transcript names each speaker once per run. */
function speakerRuns(turns: readonly MeetingTurn[]): { speakerId: string; turns: MeetingTurn[] }[] {
  const runs: { speakerId: string; turns: MeetingTurn[] }[] = []
  for (const turn of turns) {
    const last = runs.at(-1)
    if (last?.speakerId === turn.speakerId) {
      last.turns.push(turn)
    } else {
      runs.push({ speakerId: turn.speakerId, turns: [turn] })
    }
  }
  return runs
}

/** Speaker-labelled turns with the time of day each was said. `markedTurnId` is shown and marked as the source. */
export function MeetingTranscript({
  turns,
  startsAt,
  markedTurnId,
  markNonce
}: {
  turns: readonly MeetingTurn[]
  /** When the meeting started; turns show the clock time, not a count from zero. */
  startsAt: number
  markedTurnId?: string | null
  /** Changes when the same turn is asked for again, so it scrolls into view again. */
  markNonce?: number
}): React.JSX.Element {
  const text = useMeetingText()
  const marked = useRef<HTMLLIElement | null>(null)
  useEffect(() => {
    // From the speaker's name down, so no name is cut off at the top of the view.
    marked.current?.scrollIntoView({ block: 'start', behavior: motionSafeScrollBehavior() })
  }, [markedTurnId, markNonce])
  return (
    <ol className="flex max-w-prose flex-col gap-4">
      {speakerRuns(turns).map((run) => (
        <li
          key={run.turns[0].id}
          ref={run.turns.some((turn) => turn.id === markedTurnId) ? marked : undefined}
          className="scroll-mt-4"
        >
          <p className="pl-12 text-[13px] font-semibold text-foreground">
            {personName(run.speakerId)}
          </p>
          {run.turns.map((turn) => {
            const isMarked = turn.id === markedTurnId
            return (
              <div
                key={turn.id}
                data-meeting-turn={turn.id}
                data-marked={isMarked || undefined}
                className={cn(
                  'mt-1 grid grid-cols-[3rem_minmax(0,1fr)] rounded-md',
                  isMarked && 'bg-accent ring-1 ring-ring'
                )}
              >
                <span className="pt-0.5 pl-1 font-mono text-2xs leading-5 text-muted-foreground tabular-nums">
                  {text.time(startsAt + turn.at * 1000)}
                </span>
                <p className="py-0.5 pr-2 text-sm leading-relaxed text-foreground">{turn.text}</p>
              </div>
            )
          })}
        </li>
      ))}
    </ol>
  )
}
