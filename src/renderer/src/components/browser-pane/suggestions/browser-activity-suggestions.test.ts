import { describe, expect, it } from 'vitest'
import {
  appendBrowserActivityVisit,
  browserActivityPageLabel,
  buildBrowserActivityAgentPrompt,
  deriveBrowserActivitySuggestions,
  toBrowserActivityVisit,
  type BrowserActivityVisit
} from './browser-activity-suggestions'

const NOON = new Date(2026, 10, 28, 12).getTime()

function record(urls: string[]): BrowserActivityVisit[] {
  return urls.reduce<BrowserActivityVisit[]>((visits, url, index) => {
    const visit = toBrowserActivityVisit(url, `Title ${url}`, NOON + index)
    return visit ? appendBrowserActivityVisit(visits, visit) : visits
  }, [])
}

describe('browser activity suggestions', () => {
  it('records origin and path only, and only for web pages', () => {
    expect(toBrowserActivityVisit('https://a.test/x?token=1#frag', 'A', 1)).toEqual({
      at: 1,
      origin: 'https://a.test',
      path: '/x',
      title: 'A'
    })
    expect(toBrowserActivityVisit('file:///etc/hosts', 'hosts', 1)).toBeNull()
  })

  it('merges a repeat of the page just recorded', () => {
    expect(record(['https://a.test/x', 'https://a.test/x?q=2'])).toHaveLength(1)
  })

  it('suggests a sequence repeated twice, and pages outside it opened three times', () => {
    const lap = ['https://a.test/1', 'https://b.test/2', 'https://c.test/3']
    const other = ['https://d.test/4', 'https://e.test/5']
    const visits = record([...lap, ...lap, ...other, ...other, ...other])
    const suggestions = deriveBrowserActivitySuggestions(visits)
    expect(suggestions.map((s) => [s.kind, s.count, s.pages[0].path])).toEqual([
      ['repeated-sequence', 2, '/1'],
      ['repeated-page', 3, '/4'],
      ['repeated-page', 3, '/5']
    ])
    expect(buildBrowserActivityAgentPrompt(suggestions[0])).toContain('2. Title https://b.test/2')
    const afterDismiss = deriveBrowserActivitySuggestions(visits, [suggestions[1].id])
    expect(afterDismiss.map((s) => s.id)).toEqual([suggestions[0].id, suggestions[2].id])
  })

  it('keeps one sequence per tab', () => {
    const visit = (url: string, tabId: string, at: number): BrowserActivityVisit => {
      const { origin, pathname } = new URL(url)
      return { at: NOON + at, origin, path: pathname, title: url, tabId }
    }
    // Tab x walks 1 > 2 > 3 twice while tab y keeps loading other pages in between.
    const urls = ['https://a.test/1', 'https://b.test/2', 'https://c.test/3']
    let visits: BrowserActivityVisit[] = []
    for (let lap = 0; lap < 2; lap++) {
      for (const [index, url] of urls.entries()) {
        const at = lap * 10 + index * 2
        visits = appendBrowserActivityVisit(visits, visit(url, 'x', at))
        visits = appendBrowserActivityVisit(visits, visit(`https://noise.test/${at}`, 'y', at + 1))
      }
    }
    expect(deriveBrowserActivitySuggestions(visits).map((s) => [s.kind, s.count])).toEqual([
      ['repeated-sequence', 2]
    ])
  })

  it('names a page by its title without the site name', () => {
    const page = toBrowserActivityVisit('https://github.com/acme/app/issues', '', 1)!
    expect(browserActivityPageLabel({ ...page, title: 'Issues · acme/app · GitHub' })).toBe(
      'Issues · acme/app'
    )
    expect(browserActivityPageLabel(page)).toBe('github.com/acme/app/issues')
  })

  it('ignores visits from before the day of the newest visit', () => {
    const old = record(['https://a.test/1', 'https://b.test/2', 'https://a.test/1']).map(
      (visit) => ({ ...visit, at: visit.at - 24 * 60 * 60 * 1000 })
    )
    const visits = [...old, ...record(['https://b.test/2', 'https://a.test/1'])]
    expect(deriveBrowserActivitySuggestions(visits)).toEqual([])
  })
})
