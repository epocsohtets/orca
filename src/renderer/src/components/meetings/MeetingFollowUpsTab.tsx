import React, { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MeetingFollowUp } from './meeting-follow-ups'
import { formatDueDate } from './meeting-time-format'
import { fieldAria, InaxTaskChip, MeetingFormField } from './MeetingParts'
import { createTaskFromFollowUp, editFollowUp, setFollowUpDismissed } from './meetings-mock'

type Draft = Pick<MeetingFollowUp, 'title' | 'owner' | 'due'>
type DraftErrors = Partial<Record<keyof Draft, string>>

function FollowUpEditForm({
  followUp,
  onSave,
  onCancel
}: {
  followUp: MeetingFollowUp
  onSave: (draft: Draft) => void
  onCancel: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [draft, setDraft] = useState<Draft>({
    title: followUp.title,
    owner: followUp.owner,
    due: followUp.due
  })
  const [errors, setErrors] = useState<DraftErrors>({})
  const check = (field: keyof Draft, value: string): string | undefined =>
    field === 'title' && !value.trim()
      ? t('meetings.followUps.titleRequired', 'Enter what needs to be done.')
      : field === 'owner' && !value.trim()
        ? t('meetings.followUps.ownerRequired', 'Enter the name of the person who owns this.')
        : undefined
  const id = (field: keyof Draft): string => `follow-up-${followUp.id}-${field}`
  // Checked on blur; while typing, an error only clears once the value is valid again.
  const bind = (field: keyof Draft) => ({
    value: draft[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setDraft((current) => ({ ...current, [field]: value }))
      if (errors[field] && !check(field, value)) {
        setErrors((current) => ({ ...current, [field]: undefined }))
      }
    },
    onBlur: () => setErrors((current) => ({ ...current, [field]: check(field, draft[field]) }))
  })

  return (
    <form
      className="flex max-w-md flex-col gap-4 py-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const next: DraftErrors = {
          title: check('title', draft.title),
          owner: check('owner', draft.owner)
        }
        setErrors(next)
        const firstInvalid = (['title', 'owner'] as const).find((field) => next[field])
        if (firstInvalid) {
          document.getElementById(id(firstInvalid))?.focus()
          return
        }
        onSave({ title: draft.title.trim(), owner: draft.owner.trim(), due: draft.due })
      }}
    >
      <MeetingFormField
        id={id('title')}
        label={t('meetings.followUps.fieldTitle', 'Action')}
        error={errors.title}
      >
        <Input {...fieldAria(id('title'), errors.title)} {...bind('title')} autoFocus />
      </MeetingFormField>
      <MeetingFormField
        id={id('owner')}
        label={t('meetings.followUps.fieldOwner', 'Owner')}
        error={errors.owner}
      >
        <Input {...fieldAria(id('owner'), errors.owner)} {...bind('owner')} />
      </MeetingFormField>
      <MeetingFormField
        id={id('due')}
        label={t('meetings.followUps.fieldDue', 'Due date')}
        description={t('meetings.followUps.dueHelp', 'Optional.')}
      >
        {/* shortcut: native date input; use the month-calendar popover if this form outlives the PoC. */}
        <Input
          type="date"
          className="w-44"
          {...fieldAria(id('due'), null, true)}
          {...bind('due')}
        />
      </MeetingFormField>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t('meetings.followUps.save', 'Save')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('meetings.cancel', 'Cancel')}
        </Button>
      </div>
    </form>
  )
}

export function MeetingFollowUpsTab({
  meetingId,
  followUps
}: {
  meetingId: string
  followUps: MeetingFollowUp[]
}): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const [editingId, setEditingId] = useState<string | null>(null)
  const count = (state: MeetingFollowUp['state']): number =>
    followUps.filter((f) => f.state === state).length

  return (
    <div className="flex max-w-3xl flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {t(
          'meetings.followUps.caption',
          'Suggested {{suggested}} · Linked to a task {{created}} · Dismissed {{dismissed}}',
          {
            suggested: count('suggested'),
            created: count('created'),
            dismissed: count('dismissed')
          }
        )}
      </p>
      <ul className="divide-y divide-border">
        {followUps.map((followUp) => {
          if (followUp.id === editingId) {
            return (
              <li key={followUp.id}>
                <FollowUpEditForm
                  followUp={followUp}
                  onCancel={() => setEditingId(null)}
                  onSave={(draft) => {
                    editFollowUp(meetingId, followUp.id, draft)
                    setEditingId(null)
                  }}
                />
              </li>
            )
          }
          const due = formatDueDate(followUp.due, intlLocale)
          const dismissed = followUp.state === 'dismissed'
          return (
            <li
              key={followUp.id}
              data-follow-up-state={followUp.state}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5"
            >
              <div className="min-w-0 flex-1 basis-64">
                <p
                  className={
                    dismissed
                      ? 'text-[13px] text-muted-foreground line-through'
                      : 'text-[13px] font-medium text-foreground'
                  }
                >
                  {followUp.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {followUp.owner}
                  {' · '}
                  {due
                    ? t('meetings.due', 'Due {{date}}', { date: due })
                    : t('meetings.noDue', 'No due date')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {followUp.state === 'suggested' ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => createTaskFromFollowUp(meetingId, followUp.id)}
                    >
                      {t('meetings.followUps.createTask', 'Create task')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setFollowUpDismissed(meetingId, followUp.id, true)}
                    >
                      {t('meetings.followUps.dismiss', 'Dismiss')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('meetings.followUps.edit', 'Edit “{{title}}”', {
                        title: followUp.title
                      })}
                      onClick={() => setEditingId(followUp.id)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  </>
                ) : null}
                {followUp.state === 'created' && followUp.taskId ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {t('meetings.followUps.linked', 'Task')}
                    </span>
                    <InaxTaskChip taskId={followUp.taskId} />
                  </>
                ) : null}
                {dismissed ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {t('meetings.followUps.dismissed', 'Dismissed')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setFollowUpDismissed(meetingId, followUp.id, false)}
                    >
                      {t('meetings.followUps.restore', 'Restore')}
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
