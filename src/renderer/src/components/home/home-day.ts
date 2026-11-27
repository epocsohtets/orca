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
