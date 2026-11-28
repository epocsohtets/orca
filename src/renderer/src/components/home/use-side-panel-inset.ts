import { useEffect } from 'react'

// The tallest bottom block of a side panel: the day-end card's note box with its Save row.
const BOTTOM_ROWS = '12rem'

/** While a side panel with its own Save or Send row is open, corner notices stand above that row, not over it. */
export function useSidePanelInset(): void {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--side-panel-rows', BOTTOM_ROWS)
    return () => {
      root.style.removeProperty('--side-panel-rows')
    }
  }, [])
}
