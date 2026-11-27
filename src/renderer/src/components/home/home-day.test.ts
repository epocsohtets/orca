import { describe, expect, it } from 'vitest'
import {
  addWorkdays,
  calendarDaysBetween,
  formatHomeClock,
  formatHomeDuration,
  homePhaseForMinutes,
  homeSampleDay,
  inSameWeek
} from './home-day'

describe('home day', () => {
  it('switches phase at 11:00 and 17:00', () => {
    expect([0, 659, 660, 1019, 1020, 1439].map(homePhaseForMinutes)).toEqual([
      'morning',
      'morning',
      'day',
      'day',
      'evening',
      'evening'
    ])
  })

  it('moves a weekend back to its Friday and keeps a weekday', () => {
    const friday = new Date(2026, 10, 27).getTime()
    expect(homeSampleDay(new Date(2026, 10, 28, 9).getTime())).toBe(friday)
    expect(homeSampleDay(new Date(2026, 10, 29, 23).getTime())).toBe(friday)
    expect(homeSampleDay(new Date(2026, 10, 27, 15).getTime())).toBe(friday)
  })

  it('formats durations without empty parts', () => {
    const labels = { hours: (n: number) => `${n}h`, minutes: (n: number) => `${n}m` }
    expect([25, 60, 80].map((value) => formatHomeDuration(value, labels))).toEqual([
      '25m',
      '1h',
      '1h 20m'
    ])
  })

  it('steps over weekends and knows what is still this week', () => {
    const friday = new Date(2026, 10, 27).getTime()
    const monday = addWorkdays(friday, 1)
    expect(new Date(monday).getDate()).toBe(30)
    expect(calendarDaysBetween(friday, monday)).toBe(3)
    expect(inSameWeek(friday, monday)).toBe(false)
    expect(inSameWeek(friday, addWorkdays(friday, -4))).toBe(true)
    expect(new Date(addWorkdays(monday, -1)).getDate()).toBe(27)
    expect([545, 60, 1090].map(formatHomeClock)).toEqual(['09:05', '01:00', '18:10'])
  })
})
