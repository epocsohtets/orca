import React, { useId, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  NativeChatCardActions,
  NativeChatCardFrame,
  NativeChatCardStatus
} from '@/components/native-chat/NativeChatCardFrame'
import { INAX_STATUSES, type HomeProposal, type InaxStatus } from '@/components/home/home-task-loop'
import { inaxStatusLabels, inaxStatusTo } from '@/components/home/home-task-loop-script'

function isInaxStatus(value: string): value is InaxStatus {
  return INAX_STATUSES.some((status) => status === value)
}

/**
 * What the agent asks to put on inAX, in the chat's own card: the new status, the note it wrote, a way to its
 * output, and who will see it. Nothing is applied until Confirm; Correct edits both in place.
 */
export function TaskProposalCard({
  proposal,
  project,
  onConfirm,
  onDecline,
  onOpenOutput
}: {
  proposal: HomeProposal
  project: string
  onConfirm: (proposal: HomeProposal) => void
  onDecline: () => void
  /** Shows the draft the note is about; absent while there is none yet. */
  onOpenOutput?: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const statusId = useId()
  const noteId = useId()
  const errorId = useId()
  const labels = inaxStatusLabels(t)
  const withNote = proposal.note.length > 0
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState(proposal.status)
  const [note, setNote] = useState(proposal.note)
  const [error, setError] = useState(false)
  const missingNote = withNote && !note.trim()
  const to = inaxStatusTo(t)[editing ? status : proposal.status]

  return (
    // Why the wrapper: the card's fill reads the chat palette, which Home does not set.
    <div className="native-chat-appearance" data-task-proposal="">
      <NativeChatCardFrame
        heading={t('taskLoop.proposal.heading', 'The agent’s proposal for inAX')}
        status={
          <NativeChatCardStatus tone="warning">
            {t('taskLoop.proposal.pending', 'Not on inAX yet')}
          </NativeChatCardStatus>
        }
        title={
          withNote
            ? t(
                'taskLoop.proposal.titleNote',
                'Change the status {{to}} and leave this progress note',
                {
                  to
                }
              )
            : t('taskLoop.proposal.title', 'Change the status {{to}}', { to })
        }
        footer={
          <NativeChatCardActions>
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false)
                    setStatus(proposal.status)
                    setNote(proposal.note)
                    setError(false)
                  }}
                >
                  {t('taskLoop.proposal.cancelEdit', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  data-task-proposal-confirm=""
                  onClick={() => {
                    if (missingNote) {
                      setError(true)
                      return
                    }
                    onConfirm({ status, note: withNote ? note.trim() : '' })
                  }}
                >
                  {t('taskLoop.proposal.confirmEdited', 'Confirm as corrected')}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={onDecline}>
                  {t('taskLoop.proposal.decline', 'Not yet')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  {t('taskLoop.proposal.edit', 'Correct')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  data-task-proposal-confirm=""
                  onClick={() => onConfirm(proposal)}
                >
                  {t('taskLoop.proposal.confirm', 'Confirm')}
                </Button>
              </>
            )}
          </NativeChatCardActions>
        }
      >
        <div className="mt-2 flex flex-col gap-2">
          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={statusId}>{t('taskLoop.proposal.statusLabel', 'Status')}</Label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    if (isInaxStatus(value)) {
                      setStatus(value)
                    }
                  }}
                >
                  <SelectTrigger id={statusId} size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INAX_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {labels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {withNote ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={noteId}>
                    {t('taskLoop.proposal.noteLabel', 'Progress note')}
                  </Label>
                  <Textarea
                    id={noteId}
                    value={note}
                    rows={4}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(event) => {
                      setNote(event.target.value)
                      if (error && event.target.value.trim()) {
                        setError(false)
                      }
                    }}
                    onBlur={() => setError(missingNote)}
                  />
                  {error ? (
                    <p id={errorId} role="alert" className="text-xs text-destructive">
                      {t(
                        'taskLoop.proposal.noteError',
                        'Write at least one line that says what was done, then confirm.'
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : withNote ? (
            <p className="border-l-2 border-border pl-3 text-[13px] whitespace-pre-line text-foreground">
              {proposal.note}
            </p>
          ) : null}
          {onOpenOutput ? (
            <Button
              type="button"
              variant="link"
              size="inlineText"
              className="self-start"
              onClick={onOpenOutput}
            >
              {t('taskLoop.proposal.output', 'See the draft this note is about')}
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t(
              'taskLoop.proposal.audience',
              'When you confirm, the PM and the team of “{{project}}” see this on inAX. Until then nobody sees it.',
              { project }
            )}
          </p>
        </div>
      </NativeChatCardFrame>
    </div>
  )
}
