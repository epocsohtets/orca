export type InstalledApp = {
  name: string
  path: string
  /** PNG data URL; null when the OS gave no icon. */
  icon: string | null
}

export type RegisteredApp = {
  name: string
  path: string
  paused?: boolean
}

export type MyAppsGlobalSettings = {
  /** Apps registered in Settings > My apps. Foreground time of the unpaused ones is recorded locally. */
  myApps?: RegisteredApp[]
}
