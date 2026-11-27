import { useCallback, useRef } from 'react'
import { useAppStore } from '@/store/index'
import { signInInaxMock, useInaxMockAccount } from '@/lib/inax-mock-account'
import { ONBOARDING_FINAL_STEP } from '../../../../shared/onboarding/onboarding-defaults'
import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import { agentSurfaceSettingsUpdate } from './onboarding-flow-state'
import type { StepId, StepNumber } from './use-onboarding-flow-types'

type Advance = (advancedVia?: 'button' | 'keyboard') => Promise<void>
type CloseAsCompleted = (
  outcome: 'completed',
  lastStepReached: StepNumber,
  completedPath: 'workspace'
) => Promise<boolean>

/** Agents open as chat and the app lands on Home; returns what went wrong, if anything did. */
async function finishOnboardingWithoutCode(
  settings: GlobalSettings | null,
  updateSettings: (updates: Partial<GlobalSettings>) => Promise<void> | void,
  closeWith: CloseAsCompleted
): Promise<string | null> {
  try {
    await updateSettings(agentSurfaceSettingsUpdate(settings, 'chat'))
    if (await closeWith('completed', ONBOARDING_FINAL_STEP, 'workspace')) {
      useAppStore.getState().openHomePage()
    }
    return null
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

/**
 * The way through onboarding for someone who works without code: the inAX page signs in where they stand, and
 * finishing (or leaving early) sets agents to open as chat and lands the app on Home. Others keep `actions`.
 */
export function useOnboardingWithoutCodeActions(
  actions: { next: Advance; setUpLater: () => Promise<void> },
  args: {
    withoutCode: boolean
    currentStepId: StepId
    settings: GlobalSettings | null
    updateSettings: (updates: Partial<GlobalSettings>) => Promise<void> | void
    closeWith: CloseAsCompleted
    setError: (message: string | null) => void
  }
): { next: Advance; setUpLater: () => Promise<void> } {
  const { withoutCode, currentStepId, settings, updateSettings, closeWith, setError } = args
  const { next: baseNext, setUpLater: baseSetUpLater } = actions
  const finishingRef = useRef(false)
  const finish = useCallback(async (): Promise<void> => {
    if (finishingRef.current) {
      return
    }
    finishingRef.current = true
    const failure = await finishOnboardingWithoutCode(settings, updateSettings, closeWith)
    finishingRef.current = false
    if (failure) {
      setError(failure)
    }
  }, [closeWith, setError, settings, updateSettings])

  const next = useCallback<Advance>(
    async (advancedVia) => {
      if (currentStepId !== 'inax') {
        return baseNext(advancedVia)
      }
      // One button: it signs in where the person stands, then it starts the app.
      if (!useInaxMockAccount.getState().signedIn) {
        signInInaxMock()
        return
      }
      await finish()
    },
    [baseNext, currentStepId, finish]
  )
  const setUpLater = useCallback(
    () => (withoutCode ? finish() : baseSetUpLater()),
    [baseSetUpLater, finish, withoutCode]
  )
  return { next, setUpLater }
}
