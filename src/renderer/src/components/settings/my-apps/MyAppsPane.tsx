import { useEffect, useMemo, useState } from 'react'
import { AppWindow, Plus, Trash2 } from 'lucide-react'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import type { InstalledApp, RegisteredApp } from '../../../../../shared/my-apps/my-app-types'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '../../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { Switch } from '../../ui/switch'
import { SettingsGroup } from '../section-layout/SettingsGroup'

type MyAppsPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
}

function AppIcon({ icon }: { icon: string | null | undefined }): React.JSX.Element {
  return icon ? (
    <img src={icon} alt="" className="size-6 shrink-0" />
  ) : (
    <AppWindow className="size-6 shrink-0 text-muted-foreground" />
  )
}

export function MyAppsPane({ settings, updateSettings }: MyAppsPaneProps): React.JSX.Element {
  const t = useTranslate()
  const [installed, setInstalled] = useState<InstalledApp[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const apps = useMemo(() => settings.myApps ?? [], [settings.myApps])
  const iconByPath = useMemo(
    () => new Map(installed.map((app) => [app.path, app.icon])),
    [installed]
  )
  const available = installed.filter((app) => !apps.some((entry) => entry.path === app.path))

  useEffect(() => {
    let cancelled = false
    void window.api.myApps
      .listInstalled()
      .then((list) => {
        if (!cancelled) {
          setInstalled(list)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const save = (next: RegisteredApp[]): void => {
    void updateSettings({ myApps: next })
  }
  const addLabel = t('settings.myApps.add', 'Add app')

  return (
    <SettingsGroup
      title={t('settings.myApps.registered', 'Registered apps')}
      action={
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-3.5" />
              {addLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" aria-label={addLabel} className="w-80">
            <Command label={addLabel}>
              <CommandInput
                placeholder={t('settings.myApps.searchPlaceholder', 'Search installed apps…')}
              />
              <CommandList className="max-h-72">
                <CommandEmpty>{t('settings.myApps.noMatches', 'No apps found.')}</CommandEmpty>
                <CommandGroup>
                  {available.map((app) => (
                    <CommandItem
                      key={app.path}
                      value={`${app.name} ${app.path}`}
                      selection="palette"
                      onSelect={() => {
                        save([...apps, { name: app.name, path: app.path }])
                        setPickerOpen(false)
                      }}
                    >
                      <AppIcon icon={app.icon} />
                      <span className="truncate">{app.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      }
    >
      {apps.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <AppWindow className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {t('settings.myApps.emptyTitle', 'No apps registered')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('settings.myApps.emptyDescription', 'Add the apps you work in to watch them.')}
          </p>
        </div>
      ) : (
        apps.map((app) => (
          <div
            key={app.path}
            data-settings-row=""
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <AppIcon icon={iconByPath.get(app.path)} />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{app.name}</span>
                  {app.paused ? (
                    <Badge variant="secondary">{t('settings.myApps.paused', 'Paused')}</Badge>
                  ) : (
                    <Badge variant="outline">
                      <span className="size-1.5 rounded-full bg-status-success" />
                      {t('settings.myApps.watching', 'Watching')}
                    </Badge>
                  )}
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">{app.path}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                checked={!app.paused}
                aria-label={t('settings.myApps.watchToggle', 'Watch {{name}}', {
                  name: app.name
                })}
                onCheckedChange={(checked) =>
                  save(
                    apps.map((entry) =>
                      entry.path === app.path ? { ...entry, paused: !checked } : entry
                    )
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('settings.myApps.remove', 'Remove {{name}}', { name: app.name })}
                onClick={() => save(apps.filter((entry) => entry.path !== app.path))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </SettingsGroup>
  )
}
