import React, { useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { cn } from '@/lib/class-names'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import { ImeTextarea } from '@/lib/text-input/ime/ime-text-field'
import { Button } from '@/components/ui/button'
import { BOT_ITEM_CHIP, BOT_ITEM_CHIP_ACTION } from '@/components/bots/items/BotItemQuestionStep'
import { BotItemStatusIcon } from '@/components/bots/items/BotItemStatusIcon'
import type { BotItemStatus } from '../../../../shared/bots/bot-items'
import { HOME_META_CLASS, HomeProjectDot } from '@/components/home/HomeCard'
import { useSidePanelInset } from '@/components/home/use-side-panel-inset'
import { HomeDayEndChipLine } from '@/components/home/HomeDayEndParts'
import type { HomeTask } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { INAX_STATUSES, type InaxStatus } from '@/components/home/home-task-loop'
import { inaxStatusLabels, inaxStatusTo } from '@/components/home/home-task-loop-script'
import { personName } from '@/components/meetings/meeting-people'

const NOTE_TIME: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
}

/** Which of the item list's four groups the task is in. */
function itemGroup(task: HomeTask): BotItemStatus {
  if (task.status === 'done') {
    return 'done'
  }
  if (task.who === 'waiting') {
    return 'needs_you'
  }
  return task.who === 'agentWorking' ? 'working' : 'waiting'
}

/**
 * A task beside its conversation, in the shape of Orca's item pane: what it is, its due date, its status,
 * the agent's question when one is open, and the progress notes. A status picked here is my own hand: it is
 * the task's status at once. `readOnly` is a colleague's view of the same task.
 */
export function WorkTaskPanel({
  task,
  project,
  readOnly = false,
  onStatus,
  onAnswer,
  onStart,
  className
}: {
  task: HomeTask
  project: HomeProject
  readOnly?: boolean
  onStatus: (status: InaxStatus) => void
  onAnswer: (choiceId: string | null, text?: string) => void
  /** Hands a task that is mine and not started to an agent. */
  onStart?: () => void
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const box = useRef<HTMLTextAreaElement | null>(null)
  const [own, setOwn] = useState('')
  useSidePanelInset()
  const statusLabels = inaxStatusLabels(t)
  const statusTo = inaxStatusTo(t)
  const group = itemGroup(task)
  const groupLabels: Record<BotItemStatus, string> = {
    needs_you: t('taskLoop.group.needsYou', 'Needs you'),
    working: t('taskLoop.group.working', 'In progress'),
    waiting: t('taskLoop.group.waiting', 'Waiting'),
    planned: t('taskLoop.group.waiting', 'Waiting'),
    done: t('taskLoop.group.closed', 'Closed'),
    canceled: t('taskLoop.group.closed', 'Closed')
  }
  const status = task.status ?? 'todo'
  const asks = !readOnly && task.question !== undefined && task.choices !== undefined
  const notes = task.notes ?? []
  const sendOwn = (): void => {
    const text = own.trim()
    if (text) {
      onAnswer(null, text)
      setOwn('')
    }
  }

  return (
    <aside
      aria-label={task.title}
      data-work-task-panel={task.id}
      className={cn(
        '@container/item-pane flex w-[400px] shrink-0 flex-col border-l border-border bg-sidebar',
        className
      )}
    >
      <div className="flex min-h-9 shrink-0 items-center gap-1.5 py-2.5 pr-2 pl-3.5 text-xs font-medium text-muted-foreground">
        {/* The group is where the task stands with me and my agent; a colleague sees its status only. */}
        {readOnly ? null : (
          <>
            <BotItemStatusIcon status={group} />
            <span data-work-task-group={group}>{groupLabels[group]}</span>
          </>
        )}
      </div>
      <div className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-3">
        <div className="px-3.5">
          <h2 className="text-[15px] leading-5 font-semibold text-foreground">{task.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <HomeProjectDot project={project} />
            <span
              className={
                task.due === 'overdue' && !task.done
                  ? 'text-xs font-medium text-destructive'
                  : HOME_META_CLASS
              }
            >
              {task.due === 'overdue'
                ? task.dueLabel
                : `${t('taskLoop.detail.due', 'Due')} ${task.dueLabel}`}
            </span>
          </div>
        </div>
        {task.detail ? (
          <section className="px-3.5">
            <h3 className="mb-1 text-xs text-muted-foreground">
              {t('taskLoop.detail.description', 'Description')}
            </h3>
            <p className="text-[13px] leading-5 text-foreground">{task.detail}</p>
          </section>
        ) : null}
        {asks && task.question && task.choices ? (
          <div className="mx-3.5 rounded-[10px] bg-sidebar-accent/60 p-3" data-work-task-ask="">
            <HomeDayEndChipLine
              question={task.question}
              chips={task.choices.map((choice) => ({
                id: choice.id,
                label: choice.label,
                recommended: choice.recommended === true
              }))}
              picked={undefined}
              onPick={(choiceId) => onAnswer(choiceId)}
            >
              <button
                type="button"
                data-work-task-own-words=""
                className={cn(
                  BOT_ITEM_CHIP,
                  BOT_ITEM_CHIP_ACTION,
                  'flex items-center gap-1.5 text-muted-foreground'
                )}
                onClick={() => box.current?.focus()}
              >
                <Pencil aria-hidden className="size-3 shrink-0" />
                {t('taskLoop.question.ownWords', 'My own answer')}
              </button>
            </HomeDayEndChipLine>
          </div>
        ) : null}
        <dl className="grid grid-cols-[72px_minmax(0,1fr)] items-baseline gap-x-2 gap-y-2 px-3.5 text-xs">
          {task.assignee || readOnly ? (
            <>
              <dt className="text-muted-foreground">{t('taskLoop.detail.assignee', 'Owner')}</dt>
              <dd className="text-foreground">{personName(task.assignee ?? '')}</dd>
            </>
          ) : null}
          {task.who === 'agentWorking' && task.whoLabel ? (
            <>
              <dt className="text-muted-foreground">{t('taskLoop.detail.activity', 'Activity')}</dt>
              <dd className="text-foreground">{task.whoLabel}</dd>
            </>
          ) : null}
          {task.outputName && !readOnly ? (
            <>
              <dt className="text-muted-foreground">{t('taskLoop.detail.output', 'Result')}</dt>
              <dd className="text-foreground">{task.outputName}</dd>
            </>
          ) : null}
          {task.folder && !readOnly ? (
            <>
              <dt className="text-muted-foreground">{t('taskLoop.detail.folder', 'Folder')}</dt>
              <dd className="break-all text-foreground" data-work-task-folder="">
                {task.folder}
              </dd>
            </>
          ) : null}
        </dl>
        <div className="px-3.5">
          {readOnly ? (
            <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 text-xs">
              <dt className="text-muted-foreground">{t('taskLoop.detail.status', 'Status')}</dt>
              <dd className="text-foreground" data-work-task-status={status}>
                {statusLabels[status]}
              </dd>
            </dl>
          ) : (
            <HomeDayEndChipLine
              question={t('taskLoop.detail.status', 'Status')}
              quiet
              chips={INAX_STATUSES.map((value) => ({
                id: value,
                label: statusLabels[value],
                recommended: false
              }))}
              picked={status}
              onPick={(value) => {
                const next = INAX_STATUSES.find((entry) => entry === value)
                if (next && next !== status) {
                  onStatus(next)
                }
              }}
            />
          )}
        </div>
        {notes.length === 0 ? null : (
          <section className="px-3.5" data-work-task-notes="">
            <h3 className="mb-1 text-xs text-muted-foreground">
              {t('taskLoop.detail.notes', 'Progress notes')}
            </h3>

            <ol className="flex flex-col gap-3">
              {notes.toReversed().map((note) => (
                <li key={note.id} className="flex flex-col gap-1">
                  <p className="text-[13px] leading-5 whitespace-pre-line text-foreground">
                    {note.text}
                  </p>
                  <p className={HOME_META_CLASS}>
                    {[
                      note.by === 'agentConfirmed'
                        ? t('taskLoop.detail.noteByAgent', 'Written by the agent, confirmed by me')
                        : t('taskLoop.detail.noteByMe', 'Written by me'),
                      uiDateTimeFormat(NOTE_TIME, intlLocale).format(note.at),
                      note.statusChanged === false
                        ? null
                        : t('taskLoop.detail.noteStatus', 'Status changed {{to}}', {
                            to: statusTo[note.status]
                          })
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      {asks ? (
        <div className="mx-3 mb-3 flex shrink-0 flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-xs">
          <label className="flex flex-col gap-0.5">
            <span className="px-2 pt-1 text-xs text-muted-foreground">
              {t('taskLoop.question.ownWords', 'My own answer')}
            </span>
            <ImeTextarea
              ref={box}
              rows={1}
              value={own}
              data-work-task-box=""
              className="scrollbar-sleek block max-h-[6lh] min-h-[1lh] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-5 outline-none [field-sizing:content]"
              onChange={(event) => setOwn(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !isImeOwnedKeyboardEvent(event)) {
                  event.preventDefault()
                  sendOwn()
                }
              }}
            />
          </label>
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={!own.trim()} onClick={sendOwn}>
              {t('taskLoop.question.send', 'Send')}
            </Button>
          </div>
        </div>
      ) : onStart ? (
        <div className="mx-3 mb-3 flex shrink-0 justify-end">
          <Button type="button" size="sm" data-work-task-start="" onClick={onStart}>
            {t('taskLoop.detail.start', 'Start with an agent')}
          </Button>
        </div>
      ) : null}
    </aside>
  )
}
