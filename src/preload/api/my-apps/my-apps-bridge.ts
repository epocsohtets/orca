import { ipcRenderer } from 'electron'
import type { InstalledApp } from '../../../shared/my-apps/my-app-types'
import type { PreloadApi } from '../../api-types'

export type MyAppsApi = {
  listInstalled: () => Promise<InstalledApp[]>
}

export const myAppsApi = {
  listInstalled: () => ipcRenderer.invoke('myApps:listInstalled')
} satisfies PreloadApi['myApps']
