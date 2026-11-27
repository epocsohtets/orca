import { create } from 'zustand'
import {
  appendBrowserActivityVisit,
  toBrowserActivityVisit,
  type BrowserActivityVisit
} from './browser-activity-suggestions'

type BrowserActivityState = {
  visits: BrowserActivityVisit[]
  dismissedIds: string[]
}

const EMPTY_BROWSER_ACTIVITY: BrowserActivityState = { visits: [], dismissedIds: [] }

/** In memory only: the record is gone after a restart and never leaves this window. */
export const useBrowserActivityStore = create<BrowserActivityState>(() => EMPTY_BROWSER_ACTIVITY)

export function recordBrowserActivityVisit(url: string, title: string): void {
  const visit = toBrowserActivityVisit(url, title, Date.now())
  if (visit) {
    useBrowserActivityStore.setState((state) => ({
      visits: appendBrowserActivityVisit(state.visits, visit)
    }))
  }
}

export function dismissBrowserActivitySuggestion(id: string): void {
  useBrowserActivityStore.setState((state) => ({ dismissedIds: [...state.dismissedIds, id] }))
}

export function clearBrowserActivity(): void {
  useBrowserActivityStore.setState(EMPTY_BROWSER_ACTIVITY)
}
