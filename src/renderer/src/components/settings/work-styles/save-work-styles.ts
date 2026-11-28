import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { worksWithoutCode, type WorkStyle } from '../../../../../shared/settings/work-styles'
import { normalizeNativeChatProviderChoices } from '../../../../../shared/native-chat/settings/native-chat-providers'
import { useAppStore } from '@/store/index'

type UpdateSettings = (updates: Partial<GlobalSettings>) => void | Promise<void>

// The desktop keeps no "chosen" mark for the surface; onboarding saves it together with the default agent.
function agentSurfaceWasChosen(settings: GlobalSettings): boolean {
  return (
    settings.agentDefaultSurfaceChosen === true ||
    settings.defaultTuiAgent != null ||
    Object.keys(normalizeNativeChatProviderChoices(settings.nativeChatProviders)).length > 0
  )
}

/** Saves the choice; first leaving Code out also moves two presentation defaults away from the developer layout. */
export function saveWorkStyles(
  settings: GlobalSettings,
  next: WorkStyle[],
  updateSettings: UpdateSettings
): void {
  const leftCodeOut = worksWithoutCode({ workStyles: next }) && !worksWithoutCode(settings)
  void updateSettings({
    workStyles: next,
    ...(leftCodeOut && !agentSurfaceWasChosen(settings) ? { agentDefaultSurface: 'chat' } : {})
  })
  if (leftCodeOut) {
    useAppStore.getState().setRightSidebarOpen(false)
    // Home stays full width; the titlebar toggle brings the list (Chat) back beside it.
    useAppStore.getState().setSidebarOpen(false)
  }
}
