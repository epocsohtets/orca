import { ipcMain, nativeImage } from 'electron'
import type { IpcHandleRegistrar } from './lazy-ipc-handle-group'
import type { InstalledApp } from '../../shared/my-apps/my-app-types'
import { listInstalledMacApps, macApplicationDirs } from '../my-apps/installed-mac-apps'

export function registerMyAppsHandlers(ipc: IpcHandleRegistrar = ipcMain): void {
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
