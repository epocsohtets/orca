export type HomePhase = 'morning' | 'day' | 'evening'

/** Morning until 11:00, evening from 17:00. `minutes` counts from today's midnight. */
export function homePhaseForMinutes(minutes: number): HomePhase {
  if (minutes < 11 * 60) {
    return 'morning'
  }
  return minutes >= 17 * 60 ? 'evening' : 'day'
}

/** The clock each preview phase pretends it is. */
export const HOME_PREVIEW_MINUTES: Record<HomePhase, number> = {
  morning: 9 * 60 + 50,
  day: 13 * 60 + 40,
  evening: 18 * 60 + 10
}

/** The sample day is a working day: a weekend shows the Friday before it. */
export function homeSampleDay(now: number): number {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  const weekday = day.getDay()
  if (weekday === 6) {
    day.setDate(day.getDate() - 1)
  } else if (weekday === 0) {
    day.setDate(day.getDate() - 2)
  }
  return day.getTime()
}

export function formatHomeDuration(
  minutes: number,
  labels: { hours: (count: number) => string; minutes: (count: number) => string }
): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return [hours > 0 ? labels.hours(hours) : '', rest > 0 ? labels.minutes(rest) : '']
    .filter(Boolean)
    .join(' ')
}

const DAY_MS = 86_400_000

/** `count` working days after (or before, when negative) the day that starts at `dayStart`. */
export function addWorkdays(dayStart: number, count: number): number {
  const day = new Date(dayStart)
  const step = count < 0 ? -1 : 1
  for (let left = Math.abs(count); left > 0;) {
    day.setDate(day.getDate() + step)
    if (day.getDay() !== 0 && day.getDay() !== 6) {
      left -= 1
    }
  }
  return day.getTime()
}

/** Whole calendar days from `from` to `to`; both are day starts. */
export function calendarDaysBetween(from: number, to: number): number {
  return Math.round((to - from) / DAY_MS)
}

/** Monday-based: do both day starts fall in one week? */
export function inSameWeek(a: number, b: number): boolean {
  const monday = (dayStart: number): number => {
    const day = new Date(dayStart)
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
    return day.getTime()
  }
  return monday(a) === monday(b)
}

/** 24-hour clock for minutes from midnight: one format for every time on the page. */
export function formatHomeClock(minutes: number): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

const SAMPLE_DAY_STARTS_MS = 9 * 3_600_000

/**
 * A real moment as the sample day shows it: on the sample day (a weekend shows the Friday before), and never
 * before working hours. The night is folded, in order, into the first working hour.
 */
export function homeSampleMoment(real: number): number {
  const sinceMidnight = real - new Date(real).setHours(0, 0, 0, 0)
  return (
    homeSampleDay(real) +
    (sinceMidnight < SAMPLE_DAY_STARTS_MS
      ? SAMPLE_DAY_STARTS_MS + sinceMidnight / 9
      : sinceMidnight)
  )
}
