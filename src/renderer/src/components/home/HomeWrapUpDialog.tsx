import React, { useId, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { InaxDemoNote } from '@/components/task-page/inax/InaxDemoNote'
import { HOME_META_CLASS } from './HomeCard'
import { HomeRecordRow } from './HomeRecordRow'
import type { HomeRecordAnswer, HomeTask } from './home-board'
import type { HomeDayRecord } from './home-board-day-mock'
import type { HomeWrapUpUpdate } from './home-board-view'

/** What I changed in the preview: an edited text, and whether I chose to report it. Nothing starts chosen. */
type Edit = { text?: string; included?: boolean; error?: boolean }

function WrapUpField({
  update,
  edit,
  disabled,
  onChange
}: {
  update: HomeWrapUpUpdate
  edit: Edit
  disabled: boolean
  onChange: (patch: Edit) => void
}): React.JSX.Element {
  const t = useTranslate()
  const textId = useId()
  const errorId = useId()
  const text = edit.text ?? update.text
  const included = edit.included === true
  return (
    <li className="flex flex-col gap-2" data-home-wrap-up-update={update.id}>
      <Label htmlFor={textId}>{update.title}</Label>
      <Textarea
        id={textId}
        value={text}
        disabled={disabled}
        aria-invalid={edit.error ? true : undefined}
        aria-describedby={edit.error ? errorId : undefined}
        onChange={(event) =>
          onChange({ text: event.target.value, error: edit.error && !event.target.value.trim() })
        }
        onBlur={() => onChange({ error: included && !text.trim() })}
      />
      {edit.error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {t('home.wrapUp.errorEmpty', 'Write the update, or clear “Report this” to leave it out.')}
        </p>
      ) : null}
      {update.linkedRecords > 0 ? (
        <p className={HOME_META_CLASS}>
          {t(
            'home.wrapUp.linkedRecords',
            'Records linked from My day: {{count}} · only I see the records',
            { count: update.linkedRecords }
          )}
        </p>
      ) : null}
      {/* Why min-h-6: the label is the 24px target for its 16px box. */}
      <Label variant="control" className="min-h-6">
        <Checkbox
          checked={included}
          disabled={disabled}
          onCheckedChange={(checked) => onChange({ included: checked === true, error: false })}
        />
        {t('home.wrapUp.include', 'Report this')}
      </Label>
    </li>
  )
}

/** The trust step: every update that would be reported, where it goes and who sees it, before any of it goes. */
export function HomeWrapUpDialog({
  updates,
  unanswered,
  tasks,
  onAnswerRecord,
  open,
  onOpenChange,
  onConfirmed
}: {
  updates: readonly HomeWrapUpUpdate[]
  /** Day records I have not answered: never reported, answerable here. */
  unanswered: readonly HomeDayRecord[]
  tasks: readonly HomeTask[]
  onAnswerRecord: (recordId: string, answer: HomeRecordAnswer | null) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed: (count: number) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [edits, setEdits] = useState<Record<string, Edit>>({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<{ title: string; text: string }[] | null>(null)
  const textOf = (update: HomeWrapUpUpdate): string => edits[update.id]?.text ?? update.text
  const included = updates.filter((update) => edits[update.id]?.included === true)
  const allIncluded = updates.length > 0 && included.length === updates.length
  const patch = (id: string, change: Edit): void =>
    setEdits((current) => ({ ...current, [id]: { ...current[id], ...change } }))
  const confirm = (): void => {
    const empty = included.filter((update) => !textOf(update).trim())
    if (empty.length > 0) {
      empty.forEach((update) => patch(update.id, { error: true }))
      return
    }
    setSending(true)
    const report = included.map((update) => ({ title: update.title, text: textOf(update) }))
    // shortcut: nothing is sent; the short wait stands in for the report call.
    window.setTimeout(() => {
      setSending(false)
      setDone(report)
      onConfirmed(report.length)
    }, 600)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent scrollable className="sm:max-w-lg" data-home-wrap-up="">
        <DialogHeader>
          <DialogTitle>{t('home.wrapUp.title', 'Wrap up today')}</DialogTitle>
          <DialogDescription>
            {done === null
              ? t(
                  'home.wrapUp.destination',
                  'Only the updates you check become comments on their tasks in inAX. The project’s members and the team lead see them.'
                )
              : t('home.wrapUp.done', '{{count}} updates reported.', { count: done.length })}
          </DialogDescription>
          <InaxDemoNote />
        </DialogHeader>
        {done === null ? (
          <>
            {/* Why min-h-6: the label is the 24px target for its 16px box. */}
            <Label variant="control" className="min-h-6" data-home-wrap-up-all="">
              <Checkbox
                checked={allIncluded}
                disabled={sending || updates.length === 0}
                onCheckedChange={(checked) =>
                  updates.forEach((update) =>
                    patch(update.id, { included: checked === true, error: false })
                  )
                }
              />
              {t('home.wrapUp.selectAll', 'Select all {{count}}', { count: updates.length })}
            </Label>
            <ul className="flex flex-col gap-6">
              {updates.map((update) => (
                <WrapUpField
                  key={update.id}
                  update={update}
                  edit={edits[update.id] ?? {}}
                  disabled={sending}
                  onChange={(change) => patch(update.id, change)}
                />
              ))}
            </ul>
            {unanswered.length > 0 ? (
              <section
                aria-label={t('home.wrapUp.unanswered', 'Records not checked yet')}
                className="flex flex-col gap-1 border-t border-border pt-3"
                data-home-wrap-up-unanswered=""
              >
                <h3 className="text-[13px] font-medium text-foreground">
                  {t(
                    'home.wrapUp.unansweredTitle',
                    'Records not checked yet: {{count}} · only I see them',
                    { count: unanswered.length }
                  )}
                </h3>
                <ul>
                  {unanswered.map((record) => (
                    <HomeRecordRow
                      key={record.id}
                      record={record}
                      answer={undefined}
                      tasks={tasks}
                      onAnswer={(answer) => onAnswerRecord(record.id, answer)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <ul className="flex flex-col gap-3">
            {done.map((item) => (
              <li key={item.title} className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-foreground">{item.title}</span>
                <span className={HOME_META_CLASS}>{item.text}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          {done === null ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={sending}
                onClick={() => onOpenChange(false)}
              >
                {t('home.wrapUp.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                disabled={sending || included.length === 0}
                aria-busy={sending || undefined}
                onClick={confirm}
              >
                {t('home.wrapUp.confirm', 'Report {{count}} updates', { count: included.length })}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('home.wrapUp.close', 'Close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
