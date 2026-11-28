import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { HOME_GROUP_CLASS, HomeCard } from './HomeCard'
import { HomeRecordRow } from './HomeRecordRow'
import type { HomeRecordAnswer, HomeTask } from './home-board'
import type { HomeDayRecord, HomeDaySegment } from './home-board-day-mock'

// Three steps of one token: each holds 3:1 against the card in both themes.
const SEGMENT_CLASS: Record<HomeDaySegment['id'], string> = {
  app: 'bg-foreground',
  browser: 'bg-foreground/75',
  meeting: 'bg-foreground/50'
}

/** My day as the app recorded it. Only I see it. */
export function HomeMyDayCard({
  segments,
  duration,
  records,
  answers,
  tasks,
  onAnswer,
  cardsLeft,
  result,
  onManageApps,
  onManageBrowser,
  onWrapUp
}: {
  segments: readonly HomeDaySegment[]
  duration: (minutes: number) => string
  records: readonly HomeDayRecord[]
  answers: Readonly<Record<string, HomeRecordAnswer>>
  tasks: readonly HomeTask[]
  onAnswer: (recordId: string, answer: HomeRecordAnswer | null) => void
  /** Day-end cards still to go through. */
  cardsLeft: number
  /** What the cards I saved sent to colleagues. */
  result: React.ReactNode
  onManageApps: () => void
  onManageBrowser: () => void
  onWrapUp: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const total = segments.reduce((sum, segment) => sum + segment.minutes, 0)

  return (
    <HomeCard
      title={t('home.day.title', 'My day')}
      data-home-card="day"
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost-muted" size="xs" data-home-manage-records="">
              {t('home.day.manage', 'Manage records')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onManageApps}>
              {t('home.day.manageApps', 'Apps that are recorded')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onManageBrowser}>
              {t('home.day.manageBrowser', 'Browser activity record')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="flex flex-col gap-2 px-4 pb-3">
        {total > 0 ? (
          <>
            <div aria-hidden className="flex h-2 overflow-hidden rounded-full">
              {segments.map((segment) => (
                <span
                  key={segment.id}
                  className={SEGMENT_CLASS[segment.id]}
                  style={{ width: `${(segment.minutes / total) * 100}%` }}
                />
              ))}
            </div>
            {/* The legend is the text form of the bar, in the bar's order. */}
            <ul className="flex flex-wrap gap-x-4 gap-y-1" data-home-day-legend="">
              {segments.map((segment) => (
                <li key={segment.id} className="flex items-center gap-1.5 text-xs text-foreground">
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-sm ${SEGMENT_CLASS[segment.id]}`}
                  />
                  <span>{segment.label}</span>
                  <span className="tabular-nums">{duration(segment.minutes)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      {records.length > 0 ? (
        <section aria-label={t('home.day.unconfirmed', 'Records without a task')}>
          <h3 className={`mx-4 border-t border-border px-0 ${HOME_GROUP_CLASS}`}>
            {t('home.day.unconfirmed', 'Records without a task')}
          </h3>
          <ul className="mx-4">
            {records.map((record) => (
              <HomeRecordRow
                key={record.id}
                record={record}
                answer={answers[record.id]}
                tasks={tasks}
                onAnswer={(answer) => onAnswer(record.id, answer)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mx-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {/* Outline: the page's one primary is in its header. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cardsLeft === 0}
          data-home-wrap-up-open=""
          onClick={onWrapUp}
        >
          {t('home.wrapUp.title', 'Wrap-up')}
        </Button>
      </div>
      {result}
    </HomeCard>
  )
}
