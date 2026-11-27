import { useId, useState } from 'react'
import { AppWindow, Paperclip, X } from 'lucide-react'
import {
  APP_CHECKOUT_MIN_ACTIVE_MS,
  splitCheckoutApps,
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
import { Label } from '../../ui/label'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { formatActiveTime, formatSessionRanges } from './app-usage-format'

type Draft = {
  note: string
  inaxTaskId: string
  outputFile: string
  notWork: boolean
  /** The note field lost focus once, or a save was tried: its error may show. */
  touched: boolean
}
const EMPTY_DRAFT: Draft = {
  note: '',
  inaxTaskId: '',
  outputFile: '',
  notWork: false,
  touched: false
}
// Radix Select has no empty value, so "no task" needs its own.
const NO_TASK = 'none'

type AppCheckoutDialogProps = {
  apps: RegisteredApp[]
  iconByPath: Map<string, string | null>
  usage: AppUsageDay
  /** Gets focus back when the dialog closes. */
  returnFocusRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSaved: (day: AppUsageDay) => void
}

// Rule: every app used for the minimum time needs a note, unless it is marked "Not work".
function noteMissing(draft: Draft): boolean {
  return !draft.notWork && draft.note.trim() === ''
}

// Mounted only while open, so the drafts reset on every open.
export function AppCheckoutDialog({
  apps,
  iconByPath,
  usage,
  returnFocusRef,
  onClose,
  onSaved
}: AppCheckoutDialogProps): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const formId = useId()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'failed'>('idle')
  const saving = status === 'saving'
  const { rows, brief } = splitCheckoutApps(apps, usage.sessions)
  const draftOf = (path: string): Draft => drafts[path] ?? EMPTY_DRAFT
  const setDraft = (path: string, patch: Partial<Draft>): void =>
    setDrafts((current) => ({
      ...current,
      [path]: { ...(current[path] ?? EMPTY_DRAFT), ...patch }
    }))
  const fieldId = (index: number, field: string): string => `${formId}-${index}-${field}`

  const save = (): void => {
    const firstInvalid = rows.findIndex(({ app }) => noteMissing(draftOf(app.path)))
    if (firstInvalid !== -1) {
      setDrafts((current) =>
        Object.fromEntries(
          rows.map(({ app }) => [
            app.path,
            { ...(current[app.path] ?? EMPTY_DRAFT), touched: true }
          ])
        )
      )
      document.getElementById(fieldId(firstInvalid, 'note'))?.focus()
      return
    }
    const entries: AppCheckoutDraft[] = rows.flatMap(({ app, activeMs }) => {
      const draft = draftOf(app.path)
      return draft.notWork
        ? []
        : [
            {
              appPath: app.path,
              appName: app.name,
              activeMs,
              note: draft.note.trim(),
              inaxTaskId: draft.inaxTaskId || undefined,
              outputFile: draft.outputFile || undefined
            }
          ]
    })
    if (entries.length === 0) {
      onClose()
      return
    }
    setStatus('saving')
    window.api.myApps
      .saveCheckouts(entries)
      .then((day) => {
        onSaved(day)
        onClose()
      })
      // The dialog stays open with the typed text, so the user can save again.
      .catch(() => setStatus('failed'))
  }

  const notWorkLabel = t('settings.myApps.checkout.notWork', 'Not work')
  const removeFileLabel = t('settings.myApps.checkout.removeOutputFile', 'Remove output file')

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent
        className="sm:max-w-xl"
        // Cancel in the footer closes; the 16px corner X is under the 24px target minimum.
        showCloseButton={false}
        busy={saving}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('settings.myApps.checkout.title', 'Check out')}</DialogTitle>
          <DialogDescription>
            {t(
              'settings.myApps.checkout.description',
              'Today\'s use of your registered apps. For each app, say what the work was or mark it "Not work".'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          {rows.length === 0 && brief.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('settings.myApps.checkout.empty', 'No use of a registered app is recorded today.')}
            </p>
          ) : (
            // The padding keeps focus rings inside the scroll clip.
            <div className="-mx-1 max-h-[60vh] space-y-4 overflow-y-auto scrollbar-sleek px-1 py-1">
              {rows.map(({ app, activeMs, sessions }, index) => {
                const draft = draftOf(app.path)
                const showError = draft.touched && noteMissing(draft)
                const icon = iconByPath.get(app.path)
                return (
                  <section
                    key={app.path}
                    data-checkout-app={app.name}
                    aria-labelledby={fieldId(index, 'heading')}
                    className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-start gap-3">
                      {icon ? (
                        <img src={icon} alt="" className="size-6 shrink-0" />
                      ) : (
                        <AppWindow className="size-6 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3
                          id={fieldId(index, 'heading')}
                          className="flex items-baseline gap-2 text-sm font-medium"
                        >
                          {app.name}
                          <span className="font-normal tabular-nums text-muted-foreground">
                            {formatActiveTime(activeMs, intlLocale)}
                          </span>
                        </h3>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatSessionRanges(sessions, intlLocale)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={draft.notWork ? 'secondary' : 'outline-strong'}
                        size="xs"
                        aria-pressed={draft.notWork}
                        aria-label={`${app.name}: ${notWorkLabel}`}
                        disabled={saving}
                        onClick={() => setDraft(app.path, { notWork: !draft.notWork })}
                      >
                        {notWorkLabel}
                      </Button>
                    </div>
                    {draft.notWork ? null : (
                      <div className="space-y-3 pl-9">
                        <div className="space-y-1.5">
                          <Label htmlFor={fieldId(index, 'note')} variant="dialog-field">
                            {t('settings.myApps.checkout.note', 'What was this work?')}
                          </Label>
                          <Input
                            id={fieldId(index, 'note')}
                            value={draft.note}
                            maxLength={500}
                            disabled={saving}
                            aria-invalid={showError}
                            aria-describedby={showError ? fieldId(index, 'note-error') : undefined}
                            onChange={(event) => setDraft(app.path, { note: event.target.value })}
                            onBlur={() => setDraft(app.path, { touched: true })}
                          />
                          {showError ? (
                            <p
                              id={fieldId(index, 'note-error')}
                              role="alert"
                              className="text-xs text-destructive"
                            >
                              {t(
                                'settings.myApps.checkout.noteError',
                                'Write the work in one line, or mark this app "Not work".'
                              )}
                            </p>
                          ) : null}
                        </div>
                        {signedIn ? (
                          <div className="space-y-1.5">
                            <Label htmlFor={fieldId(index, 'task')} variant="dialog-field">
                              {t('settings.myApps.checkout.taskOptional', 'inAX task (optional)')}
                            </Label>
                            <Select
                              value={draft.inaxTaskId || NO_TASK}
                              disabled={saving}
                              onValueChange={(value) =>
                                setDraft(app.path, { inaxTaskId: value === NO_TASK ? '' : value })
                              }
                            >
                              <SelectTrigger id={fieldId(index, 'task')} className="w-full min-w-0">
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
                          </div>
                        ) : null}
                        <div className="space-y-1.5">
                          <Label htmlFor={fieldId(index, 'file')} variant="dialog-field">
                            {t(
                              'settings.myApps.checkout.outputFileOptional',
                              'Output file (optional)'
                            )}
                          </Label>
                          <div className="flex min-w-0 items-center gap-2">
                            <Button
                              id={fieldId(index, 'file')}
                              type="button"
                              variant="outline-strong"
                              size="sm"
                              disabled={saving}
                              onClick={() =>
                                void window.api.shell.pickAttachment().then((path) => {
                                  if (path) {
                                    setDraft(app.path, { outputFile: path })
                                  }
                                })
                              }
                            >
                              <Paperclip />
                              {draft.outputFile
                                ? t('settings.myApps.checkout.changeFile', 'Change file')
                                : t('settings.myApps.checkout.chooseFile', 'Choose file')}
                            </Button>
                            {draft.outputFile ? (
                              <>
                                <span
                                  data-checkout-file=""
                                  className="min-w-0 flex-1 truncate font-mono text-xs"
                                >
                                  {draft.outputFile}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label={`${app.name}: ${removeFileLabel}`}
                                  disabled={saving}
                                  onClick={() => {
                                    setDraft(app.path, { outputFile: '' })
                                    // This button unmounts; keep focus on the field it belonged to.
                                    document.getElementById(fieldId(index, 'file'))?.focus()
                                  }}
                                >
                                  <X />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )
              })}
              {brief.length > 0 ? (
                <p
                  data-checkout-brief=""
                  className="border-t border-border pt-3 text-xs text-muted-foreground first:border-t-0 first:pt-0"
                >
                  {t(
                    'settings.myApps.checkout.brief',
                    'Brief use (under {{minimum}}, not asked): {{apps}}',
                    {
                      minimum: formatActiveTime(APP_CHECKOUT_MIN_ACTIVE_MS, intlLocale),
                      apps: brief
                        .map(
                          ({ app, activeMs }) =>
                            `${app.name} ${formatActiveTime(activeMs, intlLocale)}`
                        )
                        .join(', ')
                    }
                  )}
                </p>
              ) : null}
              {signedIn || rows.length === 0 ? null : (
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'settings.myApps.checkout.signInHint',
                      'Sign in with inAX to link this work to a task.'
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline-strong"
                    size="sm"
                    disabled={saving}
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
          {status === 'failed' ? (
            <p role="alert" data-checkout-save-error="" className="text-xs text-destructive">
              {t(
                'settings.myApps.checkout.saveError',
                'The check-out was not saved. Your text is kept. Select Save again.'
              )}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              // Fixed width: the label swap to "Saving…" must not move the footer.
              className="w-28"
              disabled={saving || rows.length === 0}
              aria-busy={saving}
            >
              {saving ? <LoadingSpinner /> : null}
              {saving
                ? t('settings.myApps.checkout.saving', 'Saving…')
                : t('settings.myApps.checkout.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
