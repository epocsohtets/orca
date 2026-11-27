import { SlidersHorizontal } from 'lucide-react'
import { Trans } from 'react-i18next'
import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import { normalizeWorkStyles } from '../../../../shared/settings/work-styles'
import { i18n } from '@/i18n/i18n'
import { useTranslate } from '@/i18n/use-translate'
import { WorkStylePicker } from '../settings/work-styles/WorkStylePicker'
import { saveWorkStyles } from '../settings/work-styles/save-work-styles'

export function WorkStyleStep({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="space-y-6">
      <WorkStylePicker
        value={normalizeWorkStyles(settings.workStyles)}
        onChange={(next) => saveWorkStyles(settings, next, updateSettings)}
      />
      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <SlidersHorizontal className="size-3.5 shrink-0" />
        <span>
          <Trans
            i18n={i18n}
            defaults={t(
              'workStyles.onboarding.switchNote',
              'Nothing chosen shows everything. Change any time in <em>Settings → General</em>.'
            )}
            components={{ em: <span className="font-medium text-foreground" /> }}
          />
        </span>
      </p>
    </div>
  )
}
