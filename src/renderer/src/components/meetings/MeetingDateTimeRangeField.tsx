import React, { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MonthCalendar } from '@/components/ui/month-calendar'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/class-names'
import { useMeetingText } from './MeetingParts'
import {
  atMinutes,
  dayStartOf,
  followStart,
  formatClock,
  minutesOf,
  parseClock,
  type MeetingRange
} from './meeting-time-range'

const SLOT_MINUTES = 30
const SLOTS = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, index) => index * SLOT_MINUTES)

function DateButton({
  id,
  label,
  value,
  today,
  disabled,
  onChange
}: {
  id?: string
  label: string
  value: number
  today: number
  disabled?: boolean
  onChange: (dayStart: number) => void
}): React.JSX.Element {
  const text = useMeetingText()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`${label}: ${text.date(value)}`}
        >
          <CalendarDays aria-hidden className="text-muted-foreground" />
          {text.date(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <MonthCalendar
          autoFocus
          selected={new Date(value)}
          today={new Date(today)}
          onSelect={(day) => {
            onChange(day.getTime())
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** A time of day: type it ("15:10", "오후 3시 반") or pick from the half-hour list. */
function TimeInput({
  label,
  value,
  disabled,
  invalid,
  onChange,
  onInvalid
}: {
  label: string
  value: number
  disabled?: boolean
  invalid: boolean
  onChange: (minutes: number) => void
  /** Typed text that is not a time; null once it is one again. */
  onInvalid: (typed: string | null) => void
}): React.JSX.Element {
  // Null shows the committed value; text while the person is typing.
  const [typed, setTyped] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const commit = (): void => {
    if (typed === null) {
      return
    }
    const parsed = parseClock(typed)
    if (parsed === null) {
      onInvalid(typed)
      return
    }
    onInvalid(null)
    setTyped(null)
    onChange(parsed)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          aria-invalid={invalid}
          autoComplete="off"
          disabled={disabled}
          className="h-8 w-[4.5rem] text-center"
          value={typed ?? formatClock(value)}
          onFocus={(event) => {
            event.target.select()
            setOpen(true)
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setTyped(event.target.value)
            setOpen(false)
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
              setOpen(false)
            } else if (event.key === 'ArrowDown' && !open) {
              setOpen(true)
            }
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-24"
        // The field keeps the keyboard so typing still works with the list open.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <ul
          role="listbox"
          aria-label={label}
          className="-m-2 max-h-56 overflow-y-auto scrollbar-sleek"
        >
          {SLOTS.map((slot) => (
            <li key={slot} role="option" aria-selected={slot === value}>
              <button
                type="button"
                ref={
                  slot === Math.floor(value / SLOT_MINUTES) * SLOT_MINUTES
                    ? (node) => node?.scrollIntoView({ block: 'center' })
                    : undefined
                }
                className={cn(
                  'w-full cursor-pointer rounded-sm px-2 py-1 text-left text-xs tabular-nums outline-none hover:bg-accent focus-visible:bg-accent',
                  slot === value && 'bg-accent font-medium'
                )}
                onClick={() => {
                  onInvalid(null)
                  setTyped(null)
                  onChange(slot)
                  setOpen(false)
                }}
              >
                {formatClock(slot)}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/**
 * When the meeting is, on one row: start date and time ~ end date and time. Moving the start moves the end with
 * it; a meeting may end on another day.
 */
export function MeetingDateTimeRangeField({
  id,
  value,
  today,
  startDisabled,
  disabled,
  invalid,
  onChange,
  onTimeTyped,
  onBlur
}: {
  id: string
  value: MeetingRange
  today: number
  /** The start is "now" and cannot be moved. */
  startDisabled?: boolean
  disabled?: boolean
  invalid: boolean
  onChange: (range: MeetingRange) => void
  onTimeTyped: (typed: string | null) => void
  onBlur: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const labels = {
    startDate: t('meetings.form.startDate', 'Start date'),
    startTime: t('meetings.form.startTime', 'Start time'),
    endDate: t('meetings.form.endDate', 'End date'),
    endTime: t('meetings.form.endTime', 'End time')
  }
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={invalid ? `${id}-error` : `${id}-description`}
      className="flex flex-wrap items-center gap-x-2 gap-y-2"
      onBlur={(event) => {
        // Checked when the keyboard leaves the whole row, not between its four controls.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onBlur()
        }
      }}
    >
      <span className="flex items-center gap-1.5">
        <DateButton
          id={id}
          label={labels.startDate}
          value={dayStartOf(value.startsAt)}
          today={today}
          disabled={disabled || startDisabled}
          onChange={(day) =>
            onChange(followStart(value, atMinutes(day, minutesOf(value.startsAt))))
          }
        />
        <TimeInput
          label={labels.startTime}
          value={minutesOf(value.startsAt)}
          disabled={disabled || startDisabled}
          invalid={invalid}
          onChange={(minutes) =>
            onChange(followStart(value, atMinutes(dayStartOf(value.startsAt), minutes)))
          }
          onInvalid={onTimeTyped}
        />
      </span>
      <span aria-hidden className="text-muted-foreground">
        ~
      </span>
      <span className="flex items-center gap-1.5">
        <DateButton
          label={labels.endDate}
          value={dayStartOf(value.endsAt)}
          today={today}
          disabled={disabled}
          onChange={(day) =>
            onChange({ ...value, endsAt: atMinutes(day, minutesOf(value.endsAt)) })
          }
        />
        <TimeInput
          label={labels.endTime}
          value={minutesOf(value.endsAt)}
          disabled={disabled}
          invalid={invalid}
          onChange={(minutes) =>
            onChange({ ...value, endsAt: atMinutes(dayStartOf(value.endsAt), minutes) })
          }
          onInvalid={onTimeTyped}
        />
      </span>
    </div>
  )
}
