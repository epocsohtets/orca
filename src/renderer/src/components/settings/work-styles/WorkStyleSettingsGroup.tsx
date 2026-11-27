import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { normalizeWorkStyles } from '../../../../../shared/settings/work-styles'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { WorkStylePicker } from './WorkStylePicker'
import { saveWorkStyles } from './save-work-styles'
import { getWorkStyleSearchEntries } from './work-style-search'

export function WorkStyleSettingsGroup({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const [workStyles, showAll] = getWorkStyleSearchEntries()
  return (
    <SettingsGroup title={workStyles.title} description={workStyles.description}>
      <div data-settings-row="" className="py-4">
        <WorkStylePicker
          value={normalizeWorkStyles(settings.workStyles)}
          onChange={(next) => saveWorkStyles(settings, next, updateSettings)}
        />
      </div>
      <SettingsSwitchRow
        label={showAll.title}
        description={showAll.description}
        checked={settings.showAllSettings === true}
        onChange={() => updateSettings({ showAllSettings: settings.showAllSettings !== true })}
      />
    </SettingsGroup>
  )
}
