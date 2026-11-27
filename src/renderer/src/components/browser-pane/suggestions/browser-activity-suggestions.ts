import { startOfLocalDay } from '../../../../../shared/automations/scheduling/automation-cron-occurrence'

/** One navigation in a built-in browser tab. Holds no query, hash, page content or input. */
export type BrowserActivityVisit = {
  at: number
  origin: string
  path: string
  title: string
  /** The tab that navigated, so each tab keeps its own sequence. */
  tabId?: string
}

export type BrowserActivitySuggestion =
  | { id: string; kind: 'repeated-page'; pages: [BrowserActivityVisit]; count: number }
  | { id: string; kind: 'repeated-sequence'; pages: BrowserActivityVisit[]; count: number }

export const MAX_BROWSER_ACTIVITY_VISITS = 500
const REPEATED_PAGE_MIN_VISITS = 3
const REPEATED_SEQUENCE_LENGTH = 3
const REPEATED_SEQUENCE_MIN_RUNS = 2
const MAX_REPEATED_PAGE_SUGGESTIONS = 2

export function browserActivityPageUrl(visit: BrowserActivityVisit): string {
  return `${visit.origin}${visit.path}`
}

/** Query and hash are dropped because they can carry tokens and form values. */
export function toBrowserActivityVisit(
  url: string,
  title: string,
  at: number,
  tabId?: string
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
  return { at, origin: parsed.origin, path: parsed.pathname, title, ...(tabId ? { tabId } : {}) }
}

/** A title update or reload of the page a tab just recorded refreshes that record instead of adding one. */
export function appendBrowserActivityVisit(
  visits: readonly BrowserActivityVisit[],
  visit: BrowserActivityVisit
): BrowserActivityVisit[] {
  const last = visits.findLast((entry) => entry.tabId === visit.tabId)
  if (last && browserActivityPageUrl(last) === browserActivityPageUrl(visit)) {
    return visits.map((entry) => (entry === last ? { ...last, title: visit.title } : entry))
  }
  return [...visits, visit].slice(-MAX_BROWSER_ACTIVITY_VISITS)
}

/** The page's own name: its title without the trailing site name ("Issues · acme/app · GitHub"). */
export function browserActivityPageLabel(visit: BrowserActivityVisit): string {
  const parts = visit.title.split(/\s+[·|—–-]\s+/).filter(Boolean)
  const label = (parts.length > 1 ? parts.slice(0, -1) : parts).join(' · ')
  return label || browserActivityPageUrl(visit).replace(/^https?:\/\//, '')
}

type SequenceRun = { count: number; firstAt: number; pages: BrowserActivityVisit[] }

/** Runs of three distinct pages, counted inside each tab so that two tabs never interleave into one. */
function countSequenceRuns(today: readonly BrowserActivityVisit[]): Map<string, SequenceRun> {
  const runs = new Map<string, SequenceRun>()
  const byTab = Map.groupBy(today, (visit) => visit.tabId ?? '')
  for (const visits of byTab.values()) {
    const keys = visits.map(browserActivityPageUrl)
    const lastStarts = new Map<string, number>()
    for (let start = 0; start + REPEATED_SEQUENCE_LENGTH <= keys.length; start++) {
      const window = keys.slice(start, start + REPEATED_SEQUENCE_LENGTH)
      if (new Set(window).size !== REPEATED_SEQUENCE_LENGTH) {
        continue
      }
      const id = `sequence:${window.join(' > ')}`
      const lastStart = lastStarts.get(id)
      // Overlapping windows are one run, not two.
      if (lastStart !== undefined && start < lastStart + REPEATED_SEQUENCE_LENGTH) {
        continue
      }
      lastStarts.set(id, start)
      const pages = visits.slice(start, start + REPEATED_SEQUENCE_LENGTH)
      const run = runs.get(id)
      runs.set(id, {
        count: (run?.count ?? 0) + 1,
        firstAt: Math.min(run?.firstAt ?? Infinity, pages[0].at),
        pages: run && run.pages[0].at > pages[0].at ? run.pages : pages
      })
    }
  }
  return runs
}

/**
 * At most one repeated sequence and two repeated pages, from the day of the newest visit.
 * Pages of the suggested sequence are left out: the sequence already covers them.
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
  const suggestions: BrowserActivitySuggestion[] = []

  // A repeated lap also repeats its rotations; the one seen first is where the user started.
  const bestRun = [...countSequenceRuns(today)]
    .filter(([id, run]) => run.count >= REPEATED_SEQUENCE_MIN_RUNS && !dismissedIds.includes(id))
    .sort(([, a], [, b]) => b.count - a.count || a.firstAt - b.firstAt)
    .at(0)
  if (bestRun) {
    const [id, run] = bestRun
    suggestions.push({ id, kind: 'repeated-sequence', pages: run.pages, count: run.count })
  }
  const covered = new Set(bestRun?.[1].pages.map(browserActivityPageUrl))

  const pages = new Map<string, { visit: BrowserActivityVisit; count: number }>()
  for (const visit of today) {
    const key = browserActivityPageUrl(visit)
    pages.set(key, { visit, count: (pages.get(key)?.count ?? 0) + 1 })
  }
  const repeatedPages = [...pages]
    .filter(
      ([key, page]) =>
        page.count >= REPEATED_PAGE_MIN_VISITS &&
        !covered.has(key) &&
        !dismissedIds.includes(`page:${key}`)
    )
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, MAX_REPEATED_PAGE_SUGGESTIONS)
  for (const [key, page] of repeatedPages) {
    suggestions.push({
      id: `page:${key}`,
      kind: 'repeated-page',
      pages: [page.visit],
      count: page.count
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
