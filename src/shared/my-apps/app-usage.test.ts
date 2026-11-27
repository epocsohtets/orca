import { expect, it } from 'vitest'
import { recordAppUsageSample, summarizeAppUsage, type AppUsageSession } from './app-usage'

const notes = { path: '/Applications/Notes.app', name: 'Notes' }
const mail = { path: '/Applications/Mail.app', name: 'Mail' }

it('extends a session, merges a short gap without counting it, and splits on a long gap', () => {
  const sessions: AppUsageSession[] = []
  recordAppUsageSample(sessions, notes, 0)
  recordAppUsageSample(sessions, notes, 5_000)
  recordAppUsageSample(sessions, mail, 10_000)
  // Back after 40s: same session, but the 40s away is not foreground time.
  recordAppUsageSample(sessions, notes, 45_000)
  recordAppUsageSample(sessions, notes, 50_000)
  // Back after more than the merge gap: a new session.
  recordAppUsageSample(sessions, notes, 200_000)

  const summary = summarizeAppUsage(sessions, notes.path)
  expect(summary.sessions.map(({ start, end }) => [start, end])).toEqual([
    [0, 50_000],
    [200_000, 200_000]
  ])
  expect(summary.activeMs).toBe(10_000)
  expect(summary.lastUsed).toBe(200_000)
  expect(summarizeAppUsage(sessions, mail.path).sessions).toHaveLength(1)
})
