import { startOfLocalDay } from '../../../../../shared/automations/scheduling/automation-cron-occurrence'

/** One navigation in a built-in browser tab. Holds no query, hash, page content or input. */
export type BrowserActivityVisit = {
  at: number
  origin: string
  path: string
  title: string
}

export type BrowserActivitySuggestion =
  | { id: string; kind: 'repeated-page'; pages: [BrowserActivityVisit]; count: number }
  | { id: string; kind: 'repeated-sequence'; pages: BrowserActivityVisit[]; count: number }

export const MAX_BROWSER_ACTIVITY_VISITS = 500
const REPEATED_PAGE_MIN_VISITS = 3
const REPEATED_SEQUENCE_LENGTH = 3
const REPEATED_SEQUENCE_MIN_RUNS = 2

export function browserActivityPageUrl(visit: BrowserActivityVisit): string {
  return `${visit.origin}${visit.path}`
}

/** Query and hash are dropped because they can carry tokens and form values. */
export function toBrowserActivityVisit(
  url: string,
  title: string,
  at: number
): BrowserActivityVisit | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }
  return { at, origin: parsed.origin, path: parsed.pathname, title }
}

/** A title update or reload of the page just recorded refreshes that record instead of adding one. */
export function appendBrowserActivityVisit(
  visits: readonly BrowserActivityVisit[],
  visit: BrowserActivityVisit
): BrowserActivityVisit[] {
  const last = visits.at(-1)
  if (last && browserActivityPageUrl(last) === browserActivityPageUrl(visit)) {
    return [...visits.slice(0, -1), { ...last, title: visit.title }]
  }
  return [...visits, visit].slice(-MAX_BROWSER_ACTIVITY_VISITS)
}

/**
 * At most one repeated sequence and one repeated page, from the day of the newest visit.
 * shortcut: visits from all tabs form one sequence; add a tab id when tabs must be told apart.
 */
export function deriveBrowserActivitySuggestions(
  visits: readonly BrowserActivityVisit[],
  dismissedIds: readonly string[] = []
): BrowserActivitySuggestion[] {
  const newest = visits.at(-1)
  if (!newest) {
    return []
  }
  const dayStart = startOfLocalDay(newest.at)
  const today = visits.filter((visit) => visit.at >= dayStart)
  const keys = today.map(browserActivityPageUrl)
  const suggestions: BrowserActivitySuggestion[] = []

  const runs = new Map<string, { count: number; firstStart: number; lastStart: number }>()
  for (let start = 0; start + REPEATED_SEQUENCE_LENGTH <= keys.length; start++) {
    const window = keys.slice(start, start + REPEATED_SEQUENCE_LENGTH)
    if (new Set(window).size !== REPEATED_SEQUENCE_LENGTH) {
      continue
    }
    const id = `sequence:${window.join(' > ')}`
    const run = runs.get(id)
    if (!run) {
      runs.set(id, { count: 1, firstStart: start, lastStart: start })
    } else if (start >= run.lastStart + REPEATED_SEQUENCE_LENGTH) {
      // Overlapping windows are one run, not two.
      runs.set(id, { ...run, count: run.count + 1, lastStart: start })
    }
  }
  let bestRun: { id: string; count: number; firstStart: number; lastStart: number } | null = null
  for (const [id, run] of runs) {
    if (run.count < REPEATED_SEQUENCE_MIN_RUNS || dismissedIds.includes(id)) {
      continue
    }
    // A repeated lap also repeats its rotations; the one seen first is where the user started.
    if (
      !bestRun ||
      run.count > bestRun.count ||
      (run.count === bestRun.count && run.firstStart < bestRun.firstStart)
    ) {
      bestRun = { id, ...run }
    }
  }
  if (bestRun) {
    suggestions.push({
      id: bestRun.id,
      kind: 'repeated-sequence',
      pages: today.slice(bestRun.lastStart, bestRun.lastStart + REPEATED_SEQUENCE_LENGTH),
      count: bestRun.count
    })
  }

  const pages = new Map<string, { visit: BrowserActivityVisit; count: number }>()
  for (const visit of today) {
    const key = browserActivityPageUrl(visit)
    pages.set(key, { visit, count: (pages.get(key)?.count ?? 0) + 1 })
  }
  let bestPage: { id: string; visit: BrowserActivityVisit; count: number } | null = null
  for (const [key, page] of pages) {
    const id = `page:${key}`
    if (page.count < REPEATED_PAGE_MIN_VISITS || dismissedIds.includes(id)) {
      continue
    }
    if (!bestPage || page.count > bestPage.count) {
      bestPage = { id, ...page }
    }
  }
  if (bestPage) {
    suggestions.push({
      id: bestPage.id,
      kind: 'repeated-page',
      pages: [bestPage.visit],
      count: bestPage.count
    })
  }
  return suggestions
}

/** Agent-facing text, so it stays in English like other agent prompts. */
export function buildBrowserActivityAgentPrompt(suggestion: BrowserActivitySuggestion): string {
  const steps = suggestion.pages
    .map((page, index) => `${index + 1}. ${page.title} — ${browserActivityPageUrl(page)}`)
    .join('\n')
  const observed =
    suggestion.kind === 'repeated-sequence'
      ? `Today I went through these pages in this order ${suggestion.count} times:`
      : `Today I opened this page ${suggestion.count} times:`
  return [
    'I keep doing this web work by hand in the built-in browser. Please take it over.',
    '',
    observed,
    steps,
    '',
    'Use the built-in browser (orca CLI: `orca snapshot`, `orca click`, `orca fill`) to do it.',
    'First ask me what I check or change on these pages, then do it and tell me the result.'
  ].join('\n')
}
