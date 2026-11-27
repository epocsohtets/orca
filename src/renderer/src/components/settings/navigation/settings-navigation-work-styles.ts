import {
  isForWorkStyles,
  type WorkStyle,
  type WorkStyleSettings
} from '../../../../../shared/settings/work-styles'
import type { SettingsNavTarget } from './settings-navigation-types'

const CODE = ['code'] as const
const DESKTOP_APPS = ['desktop-apps'] as const

/** Pages for some work styles only; an unlisted page (and every bot or project page) is for everyone. */
const WORK_STYLES_BY_TARGET = {
  orchestration: CODE,
  'workspace-cleanup': CODE,
  'session-history': CODE,
  git: CODE,
  terminal: CODE,
  'quick-commands': CODE,
  'mobile-emulator': CODE,
  'floating-workspace': CODE,
  ssh: CODE,
  servers: CODE,
  advanced: CODE,
  dev: CODE,
  experimental: CODE,
  plugins: CODE,
  'share-skills': CODE,
  // Why Code too: the page holds terminal link and SSH workspace routing options.
  browser: ['code', 'web'],
  'computer-use': DESKTOP_APPS,
  'my-apps': DESKTOP_APPS,
  voice: ['meetings']
} satisfies Partial<Record<SettingsNavTarget, readonly WorkStyle[]>>

export const SETTINGS_SECTION_WORK_STYLES: Readonly<
  Record<string, readonly WorkStyle[] | undefined>
> = WORK_STYLES_BY_TARGET

/** Presentation only: a hidden page keeps its values and stays reachable by search and deep link. */
export function isSettingsSectionHiddenForWorkStyles(
  sectionId: string,
  settings: WorkStyleSettings | null | undefined
): boolean {
  return (
    settings?.showAllSettings !== true &&
    !isForWorkStyles(SETTINGS_SECTION_WORK_STYLES[sectionId], settings)
  )
}
