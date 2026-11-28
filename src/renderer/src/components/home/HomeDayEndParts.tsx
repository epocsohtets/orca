import React, { useId } from 'react'
import { Check } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { Button } from '@/components/ui/button'
import { ShortcutKeyCombo } from '@/components/ui/ShortcutKeyCombo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  BOT_ITEM_CHIP,
  BOT_ITEM_CHIP_ACTION,
  BOT_ITEM_CHIP_PICKED,
  BOT_ITEM_OPEN_QUESTION,
  BotItemChipWords
} from '@/components/bots/items/BotItemQuestionStep'
import { HomeAvatar } from './HomeCard'
import { HomeActivityItem } from './HomeActivityCard'
import type { HomeDayEndLine } from './home-day-end'

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
            // Why a label: the visible words and the "recommended" mark ran together when read out.
            aria-label={
              chip.recommended
                ? `${chip.label}, ${t('bots.items.ask.recommended', 'Recommended')}`
                : undefined
            }
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

/**
 * Over the box while it holds only the agent's line: named as a suggestion, with the button and the key that
 * take it. Grey text alone read as text already in the box.
 */
export function HomeDayEndSuggestionHint({ onTake }: { onTake: () => void }): React.JSX.Element {
  const t = useTranslate()
  return (
    <span
      className="flex items-center gap-2 px-2 text-xs text-muted-foreground"
      data-home-day-end-ahead=""
    >
      {t('home.dayEnd.ahead', 'Agent’s suggestion')}
      <Button type="button" variant="outline" size="xs" data-home-day-end-take="" onClick={onTake}>
        {t('home.dayEnd.take', 'Use')}
        <ShortcutKeyCombo keys={['Tab']} size="compact" />
      </Button>
    </span>
  )
}

export function HomeDayEndTimeline({
  lines,
  onOpen
}: {
  lines: readonly HomeDayEndLine[]
  onOpen: () => void
}): React.JSX.Element {
  const t = useTranslate()
  // The heading stays with no rows: the card keeps its shape.
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

/**
 * The one control a card adds, with its name: a select. `last` comes after a separator (a record's "not work").
 * Picking does not save: Save does.
 */
export function HomeDayEndSelect({
  label,
  value,
  placeholder,
  options,
  last,
  onChange
}: {
  label: string
  value: string | undefined
  placeholder?: string
  options: readonly { id: string; label: string }[]
  last?: { id: string; label: string }
  onChange: (id: string) => void
}): React.JSX.Element {
  const id = useId()
  return (
    <div className="flex items-center gap-2 px-2">
      <label htmlFor={id} className="w-16 shrink-0 text-xs leading-4 text-muted-foreground">
        {label}
      </label>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger id={id} size="sm" className="min-w-0 flex-1" data-home-day-end-select="">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
          {last ? (
            <>
              <SelectSeparator />
              <SelectItem value={last.id}>{last.label}</SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  )
}
