import React from 'react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { Label } from '@/components/ui/label'
import { dayDistance } from './meeting-schedule'
import type { Meeting, MeetingTaskStatus } from './meeting-types'
import { useMeetings } from './meetings-store'

export const MEETING_FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
const DAY: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'short' }

export type MeetingText = {
  time: (timestamp: number) => string
  /** "Today" / "Tomorrow" / "Yesterday" by the scenario day, else the date. */
  day: (timestamp: number) => string
  date: (timestamp: number) => string
  when: (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>) => string
  /** As `when`, with the weekday beside "today" and "tomorrow" too: "Tomorrow (Tue) 15:00–15:30". */
  whenWithWeekday: (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>) => string
  due: (dateKey: string) => string
  status: Record<MeetingTaskStatus, string>
  /** A length with its units, such as "12 min 40 sec": never read as a time of day. */
  elapsed: (seconds: number) => string
}

export function useMeetingText(): MeetingText {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const today = useMeetings((state) => state.day)
  const time = (timestamp: number): string => uiDateTimeFormat(TIME, intlLocale).format(timestamp)
  const date = (timestamp: number): string => uiDateTimeFormat(DAY, intlLocale).format(timestamp)
  const day = (timestamp: number): string => {
    const distance = dayDistance(today, timestamp)
    return distance === 0
      ? t('meetings.day.today', 'Today')
      : distance === 1
        ? t('meetings.day.tomorrow', 'Tomorrow')
        : distance === -1
          ? t('meetings.day.yesterday', 'Yesterday')
          : date(timestamp)
  }
  // A meeting that ends on another day says so.
  const span = (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>): string =>
    dayDistance(meeting.startsAt, meeting.endsAt) === 0
      ? `${time(meeting.startsAt)}–${time(meeting.endsAt)}`
      : `${time(meeting.startsAt)} – ${day(meeting.endsAt)} ${time(meeting.endsAt)}`
  const when = (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>): string =>
    `${day(meeting.startsAt)} ${span(meeting)}`
  return {
    time,
    day,
    date,
    when,
    whenWithWeekday: (meeting) => {
      const near = Math.abs(dayDistance(today, meeting.startsAt)) <= 1
      const weekday = uiDateTimeFormat({ weekday: 'short' }, intlLocale).format(meeting.startsAt)
      return near ? `${day(meeting.startsAt)}(${weekday}) ${span(meeting)}` : when(meeting)
    },
    due: (dateKey) => {
      const [year, month, dayOfMonth] = dateKey.split('-').map(Number)
      return t('meetings.due', 'Due {{date}}', {
        date: date(new Date(year, month - 1, dayOfMonth).getTime())
      })
    },
    elapsed: (seconds) => {
      const whole = Math.max(0, Math.floor(seconds))
      const [h, m, s] = [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60]
      return h > 0
        ? t('meetings.elapsed.hours', '{{h}} hr {{m}} min', { h, m })
        : m > 0
          ? t('meetings.elapsed.minutes', '{{m}} min {{s}} sec', { m, s })
          : t('meetings.elapsed.seconds', '{{s}} sec', { s })
    },
    status: {
      todo: t('meetings.status.todo', 'To do'),
      inProgress: t('meetings.status.inProgress', 'In progress'),
      done: t('meetings.status.done', 'Done')
    }
  }
}

/** One titled block; `action` sits at the end of the heading row. */
export function MeetingSection({
  title,
  action,
  children
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="min-w-0">
      <div className="mb-1.5 flex min-h-6 items-center justify-between gap-2">
        <h3 className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Label above the control, help under the label, error under the control. */
export function MeetingFormField({
  id,
  label,
  description,
  error,
  children
}: {
  id: string
  label: string
  description?: string
  error?: string | null
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p id={`${id}-description`} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** The aria wiring a control inside MeetingFormField needs. */
export function fieldAria(
  id: string,
  error: string | null | undefined,
  hasDescription = false
): { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined } {
  return {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : hasDescription ? `${id}-description` : undefined
  }
}
