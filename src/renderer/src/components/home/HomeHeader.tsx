import { InaxDemoNote } from '@/components/task-page/inax/InaxDemoNote'
import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HOME_FOCUS_RING_CLASS, HOME_META_CLASS } from './HomeCard'
import type { HomeBoardCounts } from './home-board'
import type { HomePhase } from './home-day'

/** Greeting, date and the one line that says what this page is; the actions sit at the right. */
export function HomeGreeting({
  phase,
  date,
  line,
  children
}: {
  phase: HomePhase
  date: string
  line: string
  children: React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  const greeting = {
    morning: t('home.header.morning', 'Good morning, Mako'),
    day: t('home.header.day', 'Hello, Mako'),
    evening: t('home.header.evening', 'Good work today, Mako')
  }[phase]
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{greeting}</h1>
        <p className="text-[13px] text-muted-foreground">
          {date} · {line}
        </p>
        <InaxDemoNote />
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
  agentConfirmed,
  onSelect
}: {
  counts: HomeBoardCounts
  agentFinished: number
  agentConfirmed: number
  onSelect: (tile: HomeTileId) => void
}): React.JSX.Element {
  const t = useTranslate()
  const tiles: { id: HomeTileId; label: string; value: number; sub: string; alert?: boolean }[] = [
    {
      id: 'tasks',
      label: t('home.tiles.tasks', 'My work'),
      value: counts.open,
      sub: t('home.tiles.tasksSub', '{{count}} due today', { count: counts.dueToday })
    },
    {
      id: 'waiting',
      label: t('home.tiles.waiting', 'Needs me'),
      value: counts.waiting,
      sub: t('home.tiles.waitingSub', 'Agents {{agents}}, meetings {{meetings}}', {
        agents: counts.waitingAgents,
        meetings: counts.waitingMeetings
      })
    },
    {
      id: 'agentDone',
      label: t('home.tiles.agentDone', 'Finished by agents'),
      value: agentFinished,
      sub: t('home.tiles.agentDoneSub', 'This week · {{confirmed}} of {{total}} confirmed by me', {
        confirmed: agentConfirmed,
        total: agentFinished
      })
    },
    {
      id: 'late',
      label: t('home.tiles.late', 'Late · awaiting others'),
      value: counts.late,
      sub:
        counts.late > 0
          ? t('home.tiles.lateSub', 'Needs a look')
          : t('home.tiles.lateNone', 'Nothing is stuck'),
      alert: counts.late > 0
    }
  ]
  return (
    <Card size="sm" data-home-tiles="">
      <ul className="grid grid-cols-2 gap-y-2 @min-[44rem]/rail-page:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.id} className="border-border @min-[44rem]/rail-page:not-first:border-l">
            <button
              type="button"
              data-home-tile={tile.id}
              className={`${HOME_FOCUS_RING_CLASS} group/home-tile flex w-full flex-col gap-1 rounded-md px-4 py-1 text-left`}
              onClick={() => onSelect(tile.id)}
            >
              {/* Why no hover fill: a filled tile reads as the selected one. The label underlines instead. */}
              <span
                className={`${HOME_META_CLASS} underline-offset-4 group-hover/home-tile:underline`}
              >
                {tile.label}
              </span>
              <span
                className={`text-2xl leading-8 font-semibold tabular-nums ${tile.alert ? 'text-destructive' : 'text-foreground'}`}
              >
                {tile.value}
              </span>
              <span className={tile.alert ? 'text-xs text-destructive' : HOME_META_CLASS}>
                {tile.sub}
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
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium tabular-nums text-foreground"
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13px] font-medium text-foreground">{step.title}</span>
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
