import { useMemo } from 'react'
import {
  FEATURE_WALL_SETUP_STEPS,
  getFirstIncompleteFeatureWallSetupStepId,
  type FeatureWallSetupStepId
} from '../../../../../shared/feature-education/explore/feature-wall-setup-steps'
import { useSetupGuideProgress } from '../../setup-guide/use-setup-guide-progress'

export type SettingsSetupGuideProgress = {
  ready: boolean
  doneCount: number
  total: number
  firstIncompleteStepId: FeatureWallSetupStepId | null
}

export function getSettingsSetupGuideProgress(progress: {
  ready: boolean
  stepDone: Partial<Record<FeatureWallSetupStepId, boolean>>
  /** Counts of the steps this person is asked to do; absent means every step. */
  coreDoneCount?: number
  coreTotal?: number
}): SettingsSetupGuideProgress {
  const doneCount =
    progress.coreDoneCount ??
    FEATURE_WALL_SETUP_STEPS.filter((step) => progress.stepDone[step.id]).length
  const total = progress.coreTotal ?? FEATURE_WALL_SETUP_STEPS.length
  const firstIncompleteStepId =
    doneCount === total ? null : getFirstIncompleteFeatureWallSetupStepId(progress.stepDone)

  return {
    ready: progress.ready,
    doneCount,
    total,
    firstIncompleteStepId
  }
}

export function useSettingsSetupGuideProgress(
  shouldRefreshCoreState: boolean
): SettingsSetupGuideProgress {
  const fullProgress = useSetupGuideProgress(shouldRefreshCoreState, false, false)

  return useMemo(() => getSettingsSetupGuideProgress(fullProgress), [fullProgress])
}
