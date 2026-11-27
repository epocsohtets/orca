import { expect, it } from 'vitest'
import {
  APP_CHECKOUT_MIN_ACTIVE_MS,
  recordAppUsageSample,
  splitCheckoutApps,
  summarizeAppUsage,
  type AppUsageSession
} from './app-usage'

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

it('asks about apps at or over the minimum time and lists the rest as brief use', () => {
  const pages = { path: '/Applications/Pages.app', name: 'Pages' }
  const session = (app: typeof notes, activeMs: number): AppUsageSession => ({
    ...app,
    start: 0,
    end: activeMs,
    activeMs
  })
  const { rows, brief } = splitCheckoutApps(
    [notes, mail, pages],
    [
      session(notes, APP_CHECKOUT_MIN_ACTIVE_MS - 1),
      session(mail, APP_CHECKOUT_MIN_ACTIVE_MS / 2),
      session(mail, APP_CHECKOUT_MIN_ACTIVE_MS / 2)
    ]
  )
  expect(rows.map((row) => row.app.name)).toEqual(['Mail'])
  expect(brief.map((row) => row.app.name)).toEqual(['Notes'])
})
