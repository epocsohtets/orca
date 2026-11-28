import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/index'
import { worksWithoutCode } from '../../../../shared/settings/work-styles'

/** Once per app start: someone who works without code opens on Home, never on the terminal workspace. */
export function useLandOnHomeWithoutCode(): void {
  const ready = useAppStore((s) => s.persistedUIReady && s.settings !== null)
  const landedRef = useRef(false)
  useEffect(() => {
    if (!ready || landedRef.current) {
      return
    }
    landedRef.current = true
    const state = useAppStore.getState()
    // A restored page of their own (Tasks, Settings) stays; only the developer default is replaced.
    if (worksWithoutCode(state.settings) && state.activeView === 'terminal') {
      state.openHomePage()
    }
  }, [ready])
}
