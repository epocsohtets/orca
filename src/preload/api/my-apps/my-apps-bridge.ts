import { ipcRenderer } from 'electron'
import type { AppCheckoutDraft, AppUsageDay } from '../../../shared/my-apps/app-usage'
import type { InstalledApp } from '../../../shared/my-apps/my-app-types'
import type { PreloadApi } from '../../api-types'

export type MyAppsApi = {
  listInstalled: () => Promise<InstalledApp[]>
  getUsageToday: () => Promise<AppUsageDay>
  saveCheckouts: (drafts: AppCheckoutDraft[]) => Promise<AppUsageDay>
}

export const myAppsApi = {
  listInstalled: () => ipcRenderer.invoke('myApps:listInstalled'),
  getUsageToday: () => ipcRenderer.invoke('myApps:getUsageToday'),
  saveCheckouts: (drafts) => ipcRenderer.invoke('myApps:saveCheckouts', drafts)
} satisfies PreloadApi['myApps']
