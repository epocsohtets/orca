import { describe, expect, it } from 'vitest'
import {
  appendBrowserActivityVisit,
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

  it('suggests a sequence repeated twice and a page opened three times', () => {
    const lap = ['https://a.test/1', 'https://b.test/2', 'https://c.test/3']
    const visits = record([...lap, ...lap, 'https://a.test/1'])
    const suggestions = deriveBrowserActivitySuggestions(visits)
    expect(suggestions.map((s) => [s.kind, s.count])).toEqual([
      ['repeated-sequence', 2],
      ['repeated-page', 3]
    ])
    expect(buildBrowserActivityAgentPrompt(suggestions[0])).toContain('2. Title https://b.test/2')
    expect(deriveBrowserActivitySuggestions(visits, [suggestions[0].id])).toHaveLength(2)
    expect(
      deriveBrowserActivitySuggestions(
        visits,
        suggestions.map((s) => s.id)
      ).some((s) => s.id === suggestions[1].id)
    ).toBe(false)
  })

  it('ignores visits from before the day of the newest visit', () => {
    const old = record(['https://a.test/1', 'https://b.test/2', 'https://a.test/1']).map(
      (visit) => ({ ...visit, at: visit.at - 24 * 60 * 60 * 1000 })
    )
    const visits = [...old, ...record(['https://b.test/2', 'https://a.test/1'])]
    expect(deriveBrowserActivitySuggestions(visits)).toEqual([])
  })
})
