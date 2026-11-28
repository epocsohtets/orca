import { useEffect } from 'react'

/** The side panel's width: corner notices stand left of it while it is open, never over it. */
export function useSidePanelInset(width: string): void {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--side-panel-width', width)
    return () => {
      root.style.removeProperty('--side-panel-width')
    }
  }, [width])
}
