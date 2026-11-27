import type { SettingsSearchEntry } from '../search/settings-search'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import { searchKeywordTranslator } from '../search/settings-search-keywords'

export function getMyAppsPaneSearchEntries(t: Translate = translate): SettingsSearchEntry[] {
  const keyword = searchKeywordTranslator(t)
  return [
    {
      title: t('settings.myApps.title', 'My apps'),
      description: t(
        'settings.myApps.description',
        'The apps you work in. Orca watches the ones you register.'
      ),
      keywords: [
        ...keyword('settings.myApps.search.apps', 'apps'),
        ...keyword('settings.myApps.search.desktop', 'desktop apps'),
        ...keyword('settings.myApps.search.watch', 'watch')
      ]
    }
  ]
}
