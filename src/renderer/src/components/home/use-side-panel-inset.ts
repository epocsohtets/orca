import { useEffect } from 'react'

const PANEL_WIDTH = '400px'

/** While a side panel with its own Save or Send row is open, corner notices stand beside it, not over it. */
export function useSidePanelInset(): void {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--side-panel-inset', PANEL_WIDTH)
    return () => {
      root.style.removeProperty('--side-panel-inset')
    }
  }, [])
}
