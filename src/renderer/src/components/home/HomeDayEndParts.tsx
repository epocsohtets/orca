import React from 'react'
import { Check } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  BOT_ITEM_CHIP,
  BOT_ITEM_CHIP_ACTION,
  BOT_ITEM_CHIP_PICKED,
  BOT_ITEM_OPEN_QUESTION,
  BotItemChipWords
} from '@/components/bots/items/BotItemQuestionStep'
import { HomeAvatar } from './HomeCard'
import { HomeActivityItem } from './HomeActivityCard'
import type { HomeTask } from './home-board'
import { HOME_RECORD_NOT_WORK, HOME_RECORD_YES, type HomeDayEndLine } from './home-day-end'

type Chip = { id: string; label: string; recommended: boolean; person?: boolean }

/** One question of a card in the item ask's shape: its words, then reply chips; the pick is filled, with a check. */
export function HomeDayEndChipLine({
  question,
  note,
  label,
  quiet = false,
  chips,
  picked,
  onPick,
  children
}: {
  question: string
  note?: React.ReactNode
  /** What the chips choose, when the question's own words do not say it. */
  label?: string
  /** The words name a field of the task, not a question to answer: they read as a label. */
  quiet?: boolean
  chips: readonly Chip[]
  picked: string | undefined
  onPick: (id: string) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div
      role="group"
      aria-label={question}
      className="border-t border-border pt-3 first:border-0 first:pt-0"
    >
      <p
        className={
          quiet
            ? 'text-xs text-muted-foreground'
            : cn('min-w-0 text-[13px] leading-5', BOT_ITEM_OPEN_QUESTION)
        }
      >
        {question}
      </p>
      {note}
      {label ? <p className="mt-2.5 text-xs text-muted-foreground">{label}</p> : null}
      {/* One answer per line: a radio group, so the pick is announced and the arrows move through it. */}
      <div
        role="radiogroup"
        aria-label={label ?? question}
        className={cn('flex flex-wrap gap-2', label ? 'mt-1.5' : 'mt-2.5')}
      >
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="radio"
            aria-checked={picked === chip.id}
            className={cn(
              BOT_ITEM_CHIP,
              BOT_ITEM_CHIP_ACTION,
              'flex items-center gap-1.5',
              picked === chip.id ? BOT_ITEM_CHIP_PICKED : 'text-foreground'
            )}
            onClick={() => onPick(chip.id)}
          >
            {picked === chip.id ? (
              <Check aria-hidden className="size-3 shrink-0" />
            ) : chip.person ? (
              // People are one choice: an empty radio mark says so before anyone is picked.
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border border-current opacity-50"
              />
            ) : null}
            {chip.person ? <HomeAvatar name={chip.label} /> : null}
            <span className="min-w-0 max-w-full">
              <BotItemChipWords reply={{ ...chip, recommended: false }} />
              {/* The agent's pick says so in words: a star alone was guessed at. */}
              {chip.recommended ? (
                <span className="ml-1.5 text-xs opacity-70" data-home-chip-recommended="">
                  <span aria-hidden>★ </span>
                  {t('bots.items.ask.recommended', 'Recommended')}
                </span>
              ) : null}
            </span>
          </button>
        ))}
        {children}
      </div>
    </div>
  )
}

export function HomeDayEndTimeline({
  lines,
  onOpen
}: {
  lines: readonly HomeDayEndLine[]
  onOpen: () => void
}): React.JSX.Element | null {
  const t = useTranslate()
  if (lines.length === 0) {
    return null
  }
  return (
    <section>
      <h4 className="mb-1 px-3.5 text-xs text-muted-foreground">
        {t('home.activity.title', 'Recent activity')}
      </h4>
      <ol className="mx-3.5">
        {lines.map((line) => (
          <HomeActivityItem key={line.id} entry={line} onClick={onOpen} />
        ))}
      </ol>
    </section>
  )
}

/** The records the app could not place: each with the task the agent picked, to take, change or rule out. */
export function HomeDayEndRecords({
  records,
  openTasks,
  answer,
  onAnswer
}: {
  records: readonly { id: string; text: string; suggestTaskId: string }[]
  openTasks: readonly HomeTask[]
  answer: (recordId: string) => string
  onAnswer: (recordId: string, answer: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const titleOf = (taskId: string): string =>
    openTasks.find((task) => task.id === taskId)?.title ?? ''
  return (
    <div className="mx-3.5 flex flex-col gap-3 rounded-[10px] bg-sidebar-accent/60 p-3">
      {records.map((record) => {
        const picked = answer(record.id)
        const other =
          picked !== HOME_RECORD_YES && picked !== HOME_RECORD_NOT_WORK ? titleOf(picked) : null
        return (
          <HomeDayEndChipLine
            key={record.id}
            question={record.text}
            note={
              <p className="mt-1 flex items-baseline gap-2 text-xs">
                <span className="text-muted-foreground">{t('home.dayEnd.task', 'Task')}</span>
                <span className="min-w-0 text-foreground">
                  {other ?? titleOf(record.suggestTaskId)}
                </span>
              </p>
            }
            chips={[
              {
                id: HOME_RECORD_YES,
                label: t('home.dayEnd.recordYes', 'This task'),
                recommended: true
              }
            ]}
            picked={other ? undefined : picked}
            onPick={(id) => onAnswer(record.id, id)}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-pressed={other !== null}
                  className={cn(
                    BOT_ITEM_CHIP,
                    BOT_ITEM_CHIP_ACTION,
                    other ? BOT_ITEM_CHIP_PICKED : 'text-foreground'
                  )}
                >
                  {other ? <Check aria-hidden className="size-3 shrink-0" /> : null}
                  {t('home.dayEnd.recordOther', 'Another task')}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {openTasks
                  .filter((task) => task.id !== record.suggestTaskId)
                  .map((task) => (
                    <DropdownMenuItem key={task.id} onSelect={() => onAnswer(record.id, task.id)}>
                      {task.title}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              aria-pressed={picked === HOME_RECORD_NOT_WORK}
              className={cn(
                BOT_ITEM_CHIP,
                BOT_ITEM_CHIP_ACTION,
                picked === HOME_RECORD_NOT_WORK ? BOT_ITEM_CHIP_PICKED : 'text-foreground'
              )}
              onClick={() => onAnswer(record.id, HOME_RECORD_NOT_WORK)}
            >
              {picked === HOME_RECORD_NOT_WORK ? (
                <Check aria-hidden className="size-3 shrink-0" />
              ) : null}
              {t('home.day.notWork', 'Not work')}
            </button>
          </HomeDayEndChipLine>
        )
      })}
    </div>
  )
}
