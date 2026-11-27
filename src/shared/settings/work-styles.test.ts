import { describe, expect, it } from 'vitest'
import { hidesDeveloperChrome } from './work-styles'

describe('developer-only chrome', () => {
  it('is hidden only for an explicit choice without Code, and "show all" restores it', () => {
    expect(hidesDeveloperChrome({ workStyles: ['web', 'meetings'] })).toBe(true)
    expect(hidesDeveloperChrome({ workStyles: ['web', 'meetings'], showAllSettings: true })).toBe(
      false
    )
    expect(hidesDeveloperChrome({ workStyles: ['web', 'code'] })).toBe(false)
    expect(hidesDeveloperChrome({ workStyles: [] })).toBe(false)
    expect(hidesDeveloperChrome(null)).toBe(false)
  })
})
