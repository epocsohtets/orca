import { describe, expect, it } from 'vitest'
import { isSettingsSectionHiddenForWorkStyles as hidden } from './settings-navigation-work-styles'

describe('isSettingsSectionHiddenForWorkStyles', () => {
  it('hides nothing until work styles are chosen', () => {
    expect(hidden('terminal', null)).toBe(false)
    expect(hidden('terminal', { workStyles: [] })).toBe(false)
  })

  it('hides pages tagged for other work styles only', () => {
    const settings = { workStyles: ['web' as const, 'meetings' as const] }
    expect(hidden('terminal', settings)).toBe(true)
    expect(hidden('computer-use', settings)).toBe(true)
    expect(hidden('browser', settings)).toBe(false)
    expect(hidden('voice', settings)).toBe(false)
    expect(hidden('general', settings)).toBe(false)
    expect(hidden('repo-1', settings)).toBe(false)
  })

  it('shows everything while Show all settings is on', () => {
    expect(hidden('terminal', { workStyles: ['web'], showAllSettings: true })).toBe(false)
  })
})
