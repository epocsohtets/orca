import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import {
  hidesDeveloperChrome,
  normalizeWorkStyles
} from '../../../../../shared/settings/work-styles'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { SettingsRow, SettingsSwitchRow } from '../form-controls/SettingsFormControls'
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
  const t = useTranslate()
  const [workStyles, showAll] = getWorkStyleSearchEntries()
  return (
    <SettingsGroup title={workStyles.title}>
      <div data-settings-row="" className="py-4">
        <WorkStylePicker
          value={normalizeWorkStyles(settings.workStyles)}
          onChange={(next) => saveWorkStyles(settings, next, updateSettings)}
        />
      </div>
      {hidesDeveloperChrome(settings) ? (
        <SettingsRow
          label={t('workStyles.workFolder.label', 'Work folder location')}
          description={settings.workspaceDir}
          control={
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-work-folder-change=""
              onClick={() =>
                void window.api.shell.pickDirectory({}).then((path) => {
                  if (path) {
                    updateSettings({ workspaceDir: path })
                  }
                })
              }
            >
              {t('workStyles.workFolder.change', 'Change')}
            </Button>
          }
        />
      ) : null}
      <SettingsSwitchRow
        label={showAll.title}
        checked={settings.showAllSettings === true}
        onChange={() => updateSettings({ showAllSettings: settings.showAllSettings !== true })}
      />
    </SettingsGroup>
  )
}
