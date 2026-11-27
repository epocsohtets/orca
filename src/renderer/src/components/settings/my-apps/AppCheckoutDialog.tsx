import { useState } from 'react'
import { AppWindow, Paperclip } from 'lucide-react'
import {
  summarizeAppUsage,
  type AppCheckoutDraft,
  type AppUsageDay
} from '../../../../../shared/my-apps/app-usage'
import type { RegisteredApp } from '../../../../../shared/my-apps/my-app-types'
import { INAX_INTEGRATION_SECTION_ID } from '@/components/integrations/task-trackers/task-provider-integration-section-ids'
import { INAX_MOCK_TASKS } from '@/components/task-page/inax/inax-mock-tasks'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { useAppStore } from '@/store'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../ui/dialog'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { formatActiveTime, formatSessionRanges } from './app-usage-format'

type Draft = { note: string; inaxTaskId: string; outputFile: string }
const EMPTY_DRAFT: Draft = { note: '', inaxTaskId: '', outputFile: '' }
// Radix Select has no empty value, so "no task" needs its own.
const NO_TASK = 'none'

type AppCheckoutDialogProps = {
  apps: RegisteredApp[]
  iconByPath: Map<string, string | null>
  usage: AppUsageDay
  onClose: () => void
  onSaved: (day: AppUsageDay) => void
}

// Mounted only while open, so the drafts reset on every open.
export function AppCheckoutDialog({
  apps,
  iconByPath,
  usage,
  onClose,
  onSaved
}: AppCheckoutDialogProps): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const used = apps
    .map((app) => ({ app, ...summarizeAppUsage(usage.sessions, app.path) }))
    .filter((entry) => entry.sessions.length > 0)
  const setDraft = (path: string, patch: Partial<Draft>): void =>
    setDrafts((current) => ({
      ...current,
      [path]: { ...(current[path] ?? EMPTY_DRAFT), ...patch }
    }))
  const filled: AppCheckoutDraft[] = used.flatMap(({ app, activeMs }) => {
    const draft = drafts[app.path] ?? EMPTY_DRAFT
    const note = draft.note.trim()
    return note || draft.inaxTaskId || draft.outputFile
      ? [
          {
            appPath: app.path,
            appName: app.name,
            activeMs,
            note,
            inaxTaskId: draft.inaxTaskId || undefined,
            outputFile: draft.outputFile || undefined
          }
        ]
      : []
  })
  const save = (): void => {
    void window.api.myApps.saveCheckouts(filled).then((day) => {
      onSaved(day)
      onClose()
    })
  }
  const noteLabel = t('settings.myApps.checkout.note', 'What was this work?')
  const taskLabel = t('settings.myApps.checkout.task', 'inAX task')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('settings.myApps.checkout.title', 'Check out')}</DialogTitle>
          <DialogDescription>
            {t(
              'settings.myApps.checkout.description',
              "Today's use of your registered apps. Say what the work was and where its output is."
            )}
          </DialogDescription>
        </DialogHeader>
        {used.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('settings.myApps.checkout.empty', 'No use of a registered app is recorded today.')}
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto scrollbar-sleek">
            {used.map(({ app, activeMs, sessions }) => {
              const draft = drafts[app.path] ?? EMPTY_DRAFT
              return (
                <div key={app.path} data-checkout-app={app.name} className="space-y-2">
                  <div className="flex items-start gap-3">
                    {iconByPath.get(app.path) ? (
                      <img
                        src={iconByPath.get(app.path) ?? ''}
                        alt=""
                        className="size-6 shrink-0"
                      />
                    ) : (
                      <AppWindow className="size-6 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium">{app.name}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatActiveTime(activeMs, intlLocale)}
                        </span>
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatSessionRanges(sessions, intlLocale)}
                      </p>
                    </div>
                  </div>
                  <Input
                    value={draft.note}
                    maxLength={500}
                    aria-label={`${app.name}: ${noteLabel}`}
                    placeholder={noteLabel}
                    onChange={(event) => setDraft(app.path, { note: event.target.value })}
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    {signedIn ? (
                      <Select
                        value={draft.inaxTaskId || NO_TASK}
                        onValueChange={(value) =>
                          setDraft(app.path, { inaxTaskId: value === NO_TASK ? '' : value })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`${app.name}: ${taskLabel}`}
                          className="min-w-0 flex-1"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_TASK}>
                            {t('settings.myApps.checkout.noTask', 'No inAX task')}
                          </SelectItem>
                          {INAX_MOCK_TASKS.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.id} · {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void window.api.shell.pickAttachment().then((path) => {
                          if (path) {
                            setDraft(app.path, { outputFile: path })
                          }
                        })
                      }
                    >
                      <Paperclip />
                      {t('settings.myApps.checkout.outputFile', 'Output file')}
                    </Button>
                  </div>
                  {draft.outputFile ? (
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {draft.outputFile}
                    </p>
                  ) : null}
                </div>
              )
            })}
            {signedIn ? null : (
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  {t(
                    'settings.myApps.checkout.signInHint',
                    'Sign in with inAX to link this work to a task.'
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose()
                    openSettingsTarget({
                      pane: 'integrations',
                      repoId: null,
                      sectionId: INAX_INTEGRATION_SECTION_ID
                    })
                  }}
                >
                  {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
                </Button>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" disabled={filled.length === 0} onClick={save}>
            {t('settings.myApps.checkout.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
