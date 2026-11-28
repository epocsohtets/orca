import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { HOME_GROUP_RULED_CLASS, HomeCard } from './HomeCard'
import { HomeDayColumn } from './HomeDayColumn'
import { HomeRecordRow } from './HomeRecordRow'
import type { HomeRecordAnswer, HomeTask } from './home-board'
import type { HomeDayBlock, HomeDayRecord } from './home-board-day-mock'

/** My day as the app recorded it. Only I see it. */
export function HomeMyDayCard({
  blocks,
  now,
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
  blocks: readonly HomeDayBlock[]
  /** Minutes from midnight now: the line on the column. */
  now: number
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
  // A block and its record row light up together.
  const [hovered, setHovered] = useState<string | null>(null)
  // A record given a task is no longer one without a task: the heading counts the rows it shows.
  const open = records.filter((record) => !answers[record.id])

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
      <HomeDayColumn blocks={blocks} now={now} hovered={hovered} onHover={setHovered} />
      {records.length > 0 ? (
        <section aria-label={t('home.day.unconfirmed', 'Records without a task')}>
          <h3 className={HOME_GROUP_RULED_CLASS}>
            {t('home.day.unconfirmed', 'Records without a task')}
            {/* A count only while there is something to do. */}
            {open.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums" data-home-records-open="">
                  {open.length}
                </span>
              </>
            ) : null}
          </h3>
          <ul className="mx-4" onMouseLeave={() => setHovered(null)}>
            {open.map((record) => (
              <HomeRecordRow
                key={record.id}
                record={record}
                highlighted={hovered === record.id}
                onHover={() => setHovered(record.id)}
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
