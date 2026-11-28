import { homeSampleDay } from '@/components/home/home-day'

const DAY = 86_400_000

const isWorkingDay = (timestamp: number): boolean => {
  const day = new Date(timestamp).getDay()
  return day !== 0 && day !== 6
}

function midnight(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Local midnight `days` calendar days from `from` (DST-safe: by date, not by 24 h). */
export function addDays(from: number, days: number): number {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return midnight(date.getTime())
}

/** The scenario's "today": Home's sample day, so the two never show different dates. */
export const scenarioDay = homeSampleDay

/** Local midnight `count` working days from `from` (negative goes back). */
export function addWorkingDays(from: number, count: number): number {
  let day = midnight(from)
  const step = count < 0 ? -1 : 1
  for (let left = Math.abs(count); left > 0;) {
    day = addDays(day, step)
    if (isWorkingDay(day)) {
      left -= 1
    }
  }
  return day
}

export const atTime = (day: number, hour: number, minute = 0): number =>
  new Date(day).setHours(hour, minute, 0, 0)

/** YYYY-MM-DD for a local day. */
export function dateKey(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The Monday-to-Friday days of the week holding `day`, moved by `weekOffset` weeks. */
export function workWeek(day: number, weekOffset: number): number[] {
  const start = midnight(day)
  const monday = addDays(start, 1 - new Date(start).getDay() + weekOffset * 7)
  return [0, 1, 2, 3, 4].map((index) => addDays(monday, index))
}

export const sameDay = (a: number, b: number): boolean => midnight(a) === midnight(b)

/** Whole days from `from` to `to` by local date. */
export const dayDistance = (from: number, to: number): number =>
  Math.round((midnight(to) - midnight(from)) / DAY)

/** 75 -> "01:15"; an hour or more -> "1:02:03". */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const pad = (value: number): string => String(value).padStart(2, '0')
  const hours = Math.floor(seconds / 3600)
  const rest = `${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
  return hours > 0 ? `${hours}:${rest}` : rest
}
