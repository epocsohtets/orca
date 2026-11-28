import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import type { SettingsSearchEntry } from '../search/settings-search'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { clearBrowserActivity } from '@/components/browser-pane/suggestions/browser-activity-store'

export const getBrowserActivitySearchEntry = createLocalizedCatalog((): SettingsSearchEntry => ({
  title: translate('settings.browser.activitySuggestions.title', 'Activity suggestions'),
  description: translate(
    'settings.browser.activitySuggestions.description',
    'Records the address, title and time of pages you open in this app’s browser, and suggests handing repeated work to an agent. The record stays on this computer.'
  ),
  keywords: [
    ...translateSearchKeyword('auto.components.settings.browser.search.2d2d995c58', 'browser'),
    ...translateSearchKeyword(
      'settings.browser.activitySuggestions.searchKeywords.activity',
      'activity'
    ),
    ...translateSearchKeyword(
      'settings.browser.activitySuggestions.searchKeywords.suggestions',
      'suggestions'
    ),
    ...translateSearchKeyword(
      'settings.browser.activitySuggestions.searchKeywords.privacy',
      'privacy'
    )
  ]
}))

export function BrowserActivitySuggestionsSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const entry = getBrowserActivitySearchEntry()
  const enabled = settings.browserActivityRecordEnabled !== false

  return (
    <SearchableSetting
      title={entry.title}
      description={entry.description}
      keywords={entry.keywords}
      id="browser-activity-suggestions"
    >
      <SettingsSwitchRow
        label={entry.title}
        description={entry.description}
        checked={enabled}
        onChange={() => {
          if (enabled) {
            // Turning the record off also drops what it already holds.
            clearBrowserActivity()
          }
          updateSettings({ browserActivityRecordEnabled: !enabled })
        }}
      />
    </SearchableSetting>
  )
}
