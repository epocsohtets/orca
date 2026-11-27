import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/class-names'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { personName } from './meeting-people'
import { formatElapsed } from './meeting-schedule'
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

/** Speaker-labelled turns with quiet timestamps. `markedTurnId` is shown and marked as the source. */
export function MeetingTranscript({
  turns,
  markedTurnId,
  markNonce
}: {
  turns: readonly MeetingTurn[]
  markedTurnId?: string | null
  /** Changes when the same turn is asked for again, so it scrolls into view again. */
  markNonce?: number
}): React.JSX.Element {
  const marked = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    marked.current?.scrollIntoView({ block: 'center', behavior: motionSafeScrollBehavior() })
  }, [markedTurnId, markNonce])
  return (
    <ol className="flex max-w-prose flex-col gap-4">
      {speakerRuns(turns).map((run) => (
        <li key={run.turns[0].id}>
          <p className="pl-12 text-[13px] font-semibold text-foreground">
            {personName(run.speakerId)}
          </p>
          {run.turns.map((turn) => {
            const isMarked = turn.id === markedTurnId
            return (
              <div
                key={turn.id}
                ref={isMarked ? marked : undefined}
                data-meeting-turn={turn.id}
                data-marked={isMarked || undefined}
                className={cn(
                  'mt-1 grid grid-cols-[3rem_minmax(0,1fr)] rounded-md',
                  isMarked && 'bg-accent ring-1 ring-ring'
                )}
              >
                <span className="pt-0.5 pl-1 font-mono text-2xs leading-5 text-muted-foreground tabular-nums">
                  {formatElapsed(turn.at)}
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
