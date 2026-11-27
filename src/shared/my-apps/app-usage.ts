export type AppUsageSession = {
  path: string
  name: string
  start: number
  end: number
  /** Foreground time inside [start, end]; merged gaps are not counted. */
  activeMs: number
}

export type AppCheckout = {
  id: string
  savedAt: number
  appPath: string
  appName: string
  activeMs: number
  note: string
  inaxTaskId?: string
  /** Path only: the file is never read or uploaded. */
  outputFile?: string
}

export type AppCheckoutDraft = Omit<AppCheckout, 'id' | 'savedAt'>

export type AppUsageDay = {
  sessions: AppUsageSession[]
  checkouts: AppCheckout[]
}

/** Away shorter than this stays in the same session, so the list stays readable. */
export const APP_USAGE_MERGE_GAP_MS = 60_000
/** Two samples closer than this count as continuous foreground time. */
export const APP_USAGE_CONTINUOUS_MS = 15_000

/** Adds one "this app is frontmost now" sample. Mutates and returns `sessions`. */
export function recordAppUsageSample(
  sessions: AppUsageSession[],
  app: { path: string; name: string },
  now: number
): AppUsageSession[] {
  const last = sessions.findLast((session) => session.path === app.path)
  if (last && now >= last.end && now - last.end <= APP_USAGE_MERGE_GAP_MS) {
    if (now - last.end <= APP_USAGE_CONTINUOUS_MS) {
      last.activeMs += now - last.end
    }
    last.end = now
  } else {
    sessions.push({ ...app, start: now, end: now, activeMs: 0 })
  }
  return sessions
}

export function summarizeAppUsage(
  sessions: readonly AppUsageSession[],
  path: string
): { activeMs: number; lastUsed: number | null; sessions: AppUsageSession[] } {
  const own = sessions.filter((session) => session.path === path)
  return {
    activeMs: own.reduce((total, session) => total + session.activeMs, 0),
    lastUsed: own.at(-1)?.end ?? null,
    sessions: own
  }
}

/** Under this much foreground time today, an app is "brief use" and check-out does not ask about it. */
export const APP_CHECKOUT_MIN_ACTIVE_MS = 120_000

export type AppCheckoutRow = {
  app: { path: string; name: string }
  activeMs: number
  sessions: AppUsageSession[]
}

/** Splits today's used apps into rows the check-out form asks about and brief uses it only lists. */
export function splitCheckoutApps(
  apps: readonly { path: string; name: string }[],
  sessions: readonly AppUsageSession[]
): { rows: AppCheckoutRow[]; brief: AppCheckoutRow[] } {
  const used = apps
    .map((app) => {
      const summary = summarizeAppUsage(sessions, app.path)
      return { app, activeMs: summary.activeMs, sessions: summary.sessions }
    })
    .filter((entry) => entry.sessions.length > 0)
  return {
    rows: used.filter((entry) => entry.activeMs >= APP_CHECKOUT_MIN_ACTIVE_MS),
    brief: used.filter((entry) => entry.activeMs < APP_CHECKOUT_MIN_ACTIVE_MS)
  }
}
