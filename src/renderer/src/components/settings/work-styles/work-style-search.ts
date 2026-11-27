import { translate } from '@/i18n/i18n'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getWorkStyleSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('workStyles.title', 'How you work'),
    description: translate(
      'workStyles.description',
      'Choose every way you work. Orca hides the settings and setup steps you do not need. With nothing chosen, everything shows.'
    ),
    keywords: [
      translate('workStyles.options.code.label', 'Code'),
      translate('workStyles.options.web.label', 'Web'),
      translate('workStyles.options.desktopApps.label', 'Desktop apps'),
      translate('workStyles.options.meetings.label', 'Meetings')
    ]
  },
  {
    title: translate('workStyles.showAll.label', 'Show all settings'),
    description: translate(
      'workStyles.showAll.description',
      'Show every Settings page, including the pages hidden for your work style.'
    )
  }
])
