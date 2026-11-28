import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { HomeDayBlock } from './home-board-day-mock'
import { formatHomeClock } from './home-day'

const MAX_PX_PER_HOUR = 32
const MIN_PX_PER_HOUR = 20
/** The whole axis fits this; the hour height shrinks to it, down to the minimum. */
const MAX_AXIS_PX = 288
/** Every block carries its name: a shorter one is drawn this tall and pushes the next one down. */
const BLOCK_MIN_PX = 20

const BLOCK_CLASS: Record<HomeDayBlock['kind'], string> = {
  meeting: 'border-foreground bg-foreground text-background',
  app: 'border-border bg-background text-foreground',
  record:
    'border-dashed border-muted-foreground/60 bg-[repeating-linear-gradient(135deg,transparent_0_4px,var(--muted)_4px_8px)] text-foreground'
}

/**
 * My day on a clock: each block sits at its real time and is as tall as it lasted. A meeting is filled, app use is
 * outlined, a record with no task is dashed; the record rows under the column are the dashed blocks.
 */
export function HomeDayColumn({
  blocks,
  now,
  hovered,
  onHover
}: {
  blocks: readonly HomeDayBlock[]
  /** Minutes from midnight. */
  now: number
  /** The record whose row is under the pointer. */
  hovered: string | null
  onHover: (recordId: string | null) => void
}): React.JSX.Element {
  const t = useTranslate()
  // From the hour of the first activity to the hour after the last one ends, not to now: no empty evening.
  // With nothing recorded yet, the hour now is in.
  const first = blocks.length > 0 ? Math.min(...blocks.map((b) => b.from)) : now
  const lastEnd = blocks.length > 0 ? Math.max(...blocks.map((b) => b.to)) : now
  const start = Math.floor(first / 60) * 60
  const end = Math.max(start + 60, (Math.floor(lastEnd / 60) + 1) * 60)
  const pxPerHour = Math.min(
    MAX_PX_PER_HOUR,
    Math.max(MIN_PX_PER_HOUR, MAX_AXIS_PX / ((end - start) / 60))
  )
  const y = (minutes: number): number => ((minutes - start) / 60) * pxPerHour
  const hours: number[] = []
  for (let hour = start / 60; hour <= end / 60; hour += 1) {
    hours.push(hour)
  }
  // Each block at its real start. Only a start inside the one before's name row moves down, and only that far;
  // a block ends where the next begins, so no push carries on down the day. Its start time still says when.
  const sorted = [...blocks].filter((block) => block.from < end).sort((a, b) => a.from - b.from)
  const tops = sorted.reduce<number[]>(
    (list, block) => [
      ...list,
      Math.max(y(block.from), (list.at(-1) ?? -BLOCK_MIN_PX) + BLOCK_MIN_PX)
    ],
    []
  )
  const placed = sorted.map((block, index) => {
    const top = tops[index]!
    const next = tops[index + 1]
    const lasted = Math.max(BLOCK_MIN_PX, y(Math.min(block.to, end)) - y(block.from)) - 1
    return {
      block,
      top,
      height: next === undefined ? lasted : Math.min(lasted, next - top - 1)
    }
  })
  const last = placed.at(-1)
  const bottom = last ? last.top + last.height + 1 : 0
  const columnHeight = Math.max(y(end), bottom)

  return (
    <div className="px-4 pt-2 pb-3">
      <div className="relative ml-8 border-l border-border" style={{ height: columnHeight }}>
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {(hour - start / 60) % 3 === 0 ? (
              <span
                aria-hidden
                className="absolute -left-8 w-6 -translate-y-2 text-right text-xs leading-4 text-muted-foreground/70 tabular-nums"
                style={{ top: y(hour * 60) }}
              >
                {String(hour).padStart(2, '0')}
              </span>
            ) : null}
            <span
              aria-hidden
              className="absolute inset-x-0 border-t border-dotted border-border"
              style={{ top: y(hour * 60) }}
            />
          </React.Fragment>
        ))}
        <ol aria-label={t('home.day.title', 'My day')} data-home-day-column="">
          {placed.map(({ block, top, height }) => {
            const when = `${formatHomeClock(block.from)}–${formatHomeClock(block.to)}`
            return (
              <li key={block.id} className="absolute right-0 left-1.5" style={{ top, height }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      data-home-day-block={block.kind}
                      data-highlighted={
                        block.recordId && block.recordId === hovered ? 'true' : 'false'
                      }
                      className={cn(
                        'flex h-full items-center justify-between gap-2 overflow-hidden rounded-[4px] border px-1.5 text-xs leading-4 whitespace-nowrap',
                        BLOCK_CLASS[block.kind],
                        'data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-ring'
                      )}
                      onMouseEnter={() => onHover(block.recordId ?? null)}
                      onMouseLeave={() => onHover(null)}
                    >
                      <span className="min-w-0 truncate">{block.label}</span>
                      <span
                        className={cn(
                          'shrink-0 tabular-nums',
                          block.kind === 'meeting'
                            ? 'text-background/70'
                            : 'text-muted-foreground/70'
                        )}
                      >
                        {formatHomeClock(block.from)}
                      </span>
                      <span className="sr-only">{when}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={4} className="max-w-sm">
                    {`${block.label} · ${when}`}
                  </TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ol>
        {now > start && now < end ? (
          <span
            aria-hidden
            data-home-day-now=""
            className="absolute -left-px right-0 h-px bg-destructive"
            style={{ top: y(now) }}
          />
        ) : null}
      </div>
    </div>
  )
}
