import { describe, expect, it } from 'vitest'
import {
  homePhaseForMinutes,
  unansweredEntries,
  visibleTimeline,
  type HomeTimelineEntry
} from './home-day'

const entry = (id: string, at: number, suggestTask?: string): HomeTimelineEntry => ({
  id,
  at,
  text: id,
  actor: 'me',
  suggestTask
})

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

  it('shows only what has happened, newest first, and tracks unanswered entries', () => {
    const entries = [entry('night', -120), entry('later', 900, 'T-2'), entry('early', 540, 'T-1')]
    const shown = visibleTimeline(entries, 600)
    expect(shown.map((item) => item.id)).toEqual(['early', 'night'])
    expect(unansweredEntries(shown, {}).map((item) => item.id)).toEqual(['early'])
    expect(unansweredEntries(shown, { early: 'notWork' })).toEqual([])
  })
})
