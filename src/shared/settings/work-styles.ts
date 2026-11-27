export const WORK_STYLES = ['code', 'web', 'desktop-apps', 'meetings'] as const

export type WorkStyle = (typeof WORK_STYLES)[number]

export type WorkStyleSettings = {
  /** How the person works; absent or empty means nothing chosen, so everything shows. */
  workStyles?: WorkStyle[]
  /** Shows every Settings page whatever the work styles are. */
  showAllSettings?: boolean
}

export function normalizeWorkStyles(value: unknown): WorkStyle[] {
  return Array.isArray(value) ? WORK_STYLES.filter((style) => value.includes(style)) : []
}

/** Untagged means for everyone; nothing chosen shows everything, as before the choice existed. */
export function isForWorkStyles(
  tags: readonly WorkStyle[] | undefined,
  settings: WorkStyleSettings | null | undefined
): boolean {
  const chosen = normalizeWorkStyles(settings?.workStyles)
  return !tags || chosen.length === 0 || tags.some((tag) => chosen.includes(tag))
}

const CODE_ONLY: readonly WorkStyle[] = ['code']

/** True only for an explicit choice that leaves Code out. */
export function worksWithoutCode(settings: WorkStyleSettings | null | undefined): boolean {
  return !isForWorkStyles(CODE_ONLY, settings)
}

/**
 * Presentation only: someone who chose work styles without Code does not see developer-only chrome (the
 * workspaces rail item, terminal and host status segments, the setup checklist) unless they ask to see everything.
 */
export function hidesDeveloperChrome(settings: WorkStyleSettings | null | undefined): boolean {
  return settings?.showAllSettings !== true && worksWithoutCode(settings)
}
