import { ipcMain, nativeImage } from 'electron'
import type { IpcHandleRegistrar } from './lazy-ipc-handle-group'
import type { InstalledApp } from '../../shared/my-apps/my-app-types'
import type { AppCheckoutDraft, AppUsageDay } from '../../shared/my-apps/app-usage'
import { getAppUsageToday, saveAppCheckouts } from '../my-apps/app-usage-tracker'
import { listInstalledMacApps, macApplicationDirs } from '../my-apps/installed-mac-apps'

export function registerMyAppsHandlers(ipc: IpcHandleRegistrar = ipcMain): void {
  ipc.handle('myApps:getUsageToday', (): Promise<AppUsageDay> => getAppUsageToday())
  ipc.handle('myApps:saveCheckouts', (_event, drafts: AppCheckoutDraft[]): Promise<AppUsageDay> =>
    saveAppCheckouts(
      drafts.map((draft) => ({
        appPath: String(draft.appPath),
        appName: String(draft.appName),
        activeMs: Number(draft.activeMs) || 0,
        note: String(draft.note ?? '').slice(0, 500),
        inaxTaskId: draft.inaxTaskId ? String(draft.inaxTaskId) : undefined,
        outputFile: draft.outputFile ? String(draft.outputFile) : undefined
      }))
    )
  )
  ipc.handle('myApps:listInstalled', async (): Promise<InstalledApp[]> => {
    if (process.platform !== 'darwin') {
      return []
    }
    const apps = await listInstalledMacApps(macApplicationDirs())
    return Promise.all(
      apps.map(async (installed) => ({
        ...installed,
        // getFileIcon returns the generic bundle icon for .app; the Quick Look thumbnail is the app's own.
        icon: await nativeImage
          .createThumbnailFromPath(installed.path, { width: 64, height: 64 })
          .then((image) => (image.isEmpty() ? null : image.toDataURL()))
          .catch(() => null)
      }))
    )
  })
}
