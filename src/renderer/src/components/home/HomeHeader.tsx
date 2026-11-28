import React from 'react'
import { CircleAlert, CircleCheck, Clock, List, type LucideIcon } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HOME_FOCUS_RING_CLASS, HOME_META_CLASS } from './HomeCard'
import type { HomeBoardCounts } from './home-board'

/** Greeting and date; the actions sit at the right. One greeting all day. */
export function HomeGreeting({
  name,
  date,
  children
}: {
  name: string
  date: string
  children: React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <HomePageHeading title={t('home.header.day', 'Hello, {{name}}', { name })} line={date}>
      {children}
    </HomePageHeading>
  )
}

/** The top of a board page: its name, the date, actions at the right. */
export function HomePageHeading({
  title,
  line,
  before,
  children
}: {
  title: string
  /** The line under the title (the date); none on a form. */
  line?: string
  /** A way back, above the title. */
  before?: React.ReactNode
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col items-start gap-1">
        {before}
        <h1
          tabIndex={-1}
          data-page-heading=""
          className="text-xl leading-7 font-semibold tracking-tight text-foreground outline-none"
        >
          {title}
        </h1>
        {line ? <p className={HOME_META_CLASS}>{line}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </header>
  )
}

export type HomeTileId = 'tasks' | 'waiting' | 'agentDone' | 'late'

/** Four big numbers. Each one is a button that shows the rows behind its number. */
export function HomeTiles({
  counts,
  agentFinished,
  onSelect
}: {
  counts: HomeBoardCounts
  agentFinished: number
  onSelect: (tile: HomeTileId) => void
}): React.JSX.Element {
  const t = useTranslate()
  const tiles: HomeTile<HomeTileId>[] = [
    {
      id: 'tasks',
      icon: List,
      label: t('home.tiles.tasks', 'My work'),
      value: counts.open
    },
    {
      id: 'waiting',
      icon: CircleAlert,
      label: t('home.tiles.waiting', 'Needs me'),
      value: counts.waiting
    },
    {
      id: 'agentDone',
      icon: CircleCheck,
      label: t('home.tiles.agentDone', 'Finished by agents'),
      value: agentFinished
    },
    {
      id: 'late',
      icon: Clock,
      label: t('home.tiles.late', 'Late'),
      value: counts.late,
      alert: counts.late > 0
    }
  ]
  return <HomeTileRow tiles={tiles} onSelect={onSelect} />
}

export type HomeTile<Id extends string> = {
  id: Id
  icon: LucideIcon
  label: string
  value: number | string
  /** Words under the number, never a second count: a tile shows one number. */
  sub?: string
  /** What the helper line means: done is green, alert (late, or waits on me) is red. */
  tone?: 'done' | 'alert'
  /** The number counts late items and is above zero. */
  alert?: boolean
}

const TONE_CLASS = {
  done: 'text-status-success',
  alert: 'text-destructive'
} as const

/** One container of four numbers split by hairlines; each is a button that shows the rows behind it. */
export function HomeTileRow<Id extends string>({
  tiles,
  onSelect
}: {
  tiles: readonly HomeTile<Id>[]
  onSelect: (id: Id) => void
}): React.JSX.Element {
  return (
    <Card size="board" data-home-tiles="">
      <ul className="grid grid-cols-2 @min-[44rem]/rail-page:grid-cols-4">
        {tiles.map((tile) => (
          <li
            key={tile.id}
            className="min-w-0 border-border @max-[44rem]/rail-page:even:border-l @max-[44rem]/rail-page:nth-[n+3]:border-t @min-[44rem]/rail-page:not-first:border-l"
          >
            <button
              type="button"
              data-home-tile={tile.id}
              className={`${HOME_FOCUS_RING_CLASS} group/home-tile flex w-full min-w-0 flex-col gap-0.5 rounded-md p-4 text-left`}
              onClick={() => onSelect(tile.id)}
            >
              {/* Why no hover fill: a filled tile reads as the selected one. The label underlines instead. */}
              <span
                className={`flex items-center gap-1.5 whitespace-nowrap ${HOME_META_CLASS} underline-offset-4 group-hover/home-tile:underline`}
              >
                <tile.icon aria-hidden className="size-3.5 shrink-0" />
                {tile.label}
              </span>
              <span
                className={`text-[22px] leading-[26px] font-semibold tabular-nums ${tile.alert ? 'text-destructive' : 'text-foreground'}`}
              >
                {tile.value}
              </span>
              <span
                className={`max-w-full truncate text-xs leading-4 ${tile.tone ? TONE_CLASS[tile.tone] : 'text-muted-foreground'}`}
              >
                {tile.sub || '\u00a0'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export type HomeStep = {
  id: string
  title: string
  detail: string
  action: string
  run: () => void
}

/** Nothing is connected yet: the first steps, in order. */
export function HomeFirstSteps({ steps }: { steps: HomeStep[] }): React.JSX.Element {
  const t = useTranslate()
  return (
    <Card size="sm" data-home-card="first-run">
      <section aria-label={t('home.firstRun.title', 'Start here')} className="flex flex-col">
        <h2 className="px-4 pb-2 text-sm font-semibold text-foreground">
          {t('home.firstRun.title', 'Start here')}
        </h2>
        <ol className="divide-y divide-border border-t border-border">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center gap-3 px-4 py-3">
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs tabular-nums text-foreground"
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13px] text-foreground">{step.title}</span>
                <span className={HOME_META_CLASS}>{step.detail}</span>
              </span>
              <Button
                type="button"
                variant={index === 0 ? 'default' : 'outline'}
                size="xs"
                className="shrink-0"
                onClick={step.run}
              >
                {step.action}
              </Button>
            </li>
          ))}
        </ol>
      </section>
    </Card>
  )
}
