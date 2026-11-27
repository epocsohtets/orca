import { create } from 'zustand'
import {
  appendBrowserActivityVisit,
  toBrowserActivityVisit,
  type BrowserActivityVisit
} from './browser-activity-suggestions'

type BrowserActivityState = {
  visits: BrowserActivityVisit[]
  dismissedIds: string[]
  /** Suggestions the list has already shown; the rest carry the new dot. */
  seenIds: string[]
}

const EMPTY_BROWSER_ACTIVITY: BrowserActivityState = { visits: [], dismissedIds: [], seenIds: [] }

/** In memory only: the record is gone after a restart and never leaves this window. */
export const useBrowserActivityStore = create<BrowserActivityState>(() => EMPTY_BROWSER_ACTIVITY)

export function recordBrowserActivityVisit(url: string, title: string, tabId?: string): void {
  const visit = toBrowserActivityVisit(url, title, Date.now(), tabId)
  if (visit) {
    useBrowserActivityStore.setState((state) => ({
      visits: appendBrowserActivityVisit(state.visits, visit)
    }))
  }
}

export function dismissBrowserActivitySuggestion(id: string): void {
  useBrowserActivityStore.setState((state) => ({ dismissedIds: [...state.dismissedIds, id] }))
}

export function markBrowserActivitySuggestionsSeen(ids: readonly string[]): void {
  useBrowserActivityStore.setState((state) => {
    const unseen = ids.filter((id) => !state.seenIds.includes(id))
    return unseen.length > 0 ? { seenIds: [...state.seenIds, ...unseen] } : state
  })
}

export function clearBrowserActivity(): void {
  useBrowserActivityStore.setState(EMPTY_BROWSER_ACTIVITY)
}
