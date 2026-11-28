import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import { Button } from '@/components/ui/button'
import { ImeTextarea } from '@/lib/text-input/ime/ime-text-field'
import { BotItemStepper } from '@/components/bots/items/BotItemStepper'
import { useBotItemChords } from '@/components/bots/items/use-bot-item-chords'
import { InaxStatusBadge } from '@/components/task-page/inax/inax-status-badge'
import { personName } from '@/components/meetings/meeting-people'
import { HOME_META_CLASS, HomeProjectDot } from './HomeCard'
import { HomeDayEndChipLine, HomeDayEndRecords, HomeDayEndTimeline } from './HomeDayEndParts'
import type { HomeProjectId, HomeTask } from './home-board'
import type { HomeProject } from './home-board-mock'
import {
  HOME_RECORD_YES,
  type HomeDayEndCard,
  type HomeDayEndDraft,
  type HomeDayEndSave
} from './home-day-end'
import { INAX_STATUSES } from './home-task-loop'
import { inaxStatusLabels } from './home-task-loop-script'

/**
 * The day-end cards beside Home, one at a time, in the shape of Orca's item pane: what the task is, what
 * happened on it, the agent's suggestions as picked chips and a line written ahead, then Save. Nothing reaches
 * colleagues before Save; the two rows under the title say what will and who sees it.
 */
export function HomeDayEndPanel({
  cards,
  projects,
  openTasks,
  onSave,
  onClose,
  onOpenTask,
  onOpenMeeting
}: {
  cards: readonly HomeDayEndCard[]
  projects: Record<HomeProjectId, HomeProject>
  openTasks: readonly HomeTask[]
  onSave: (save: HomeDayEndSave) => void
  onClose: () => void
  onOpenTask: (taskId: string) => void
  onOpenMeeting: (meetingId: string) => void
}): React.JSX.Element | null {
  const t = useTranslate()
  const root = useRef<HTMLDivElement | null>(null)
  const box = useRef<HTMLTextAreaElement | null>(null)
  const saveButton = useRef<HTMLButtonElement | null>(null)
  // The walk is over the cards as they stood when I opened it, so "2 / 7" stays true while saved cards leave.
  const [order] = useState(() => cards.map((card) => `${card.kind}:${card.id}`))
  const [at, setAt] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, HomeDayEndDraft>>({})
  const live = (index: number): HomeDayEndCard | undefined =>
    cards.find((entry) => `${entry.kind}:${entry.id}` === order[index])
  const card = live(at)
  const key = order[at] ?? ''
  const draft = drafts[key] ?? {}
  const patch = (change: HomeDayEndDraft): void =>
    setDrafts((current) => ({ ...current, [key]: { ...current[key], ...change } }))
  const nextFrom = (index: number, direction: 1 | -1): number | null => {
    for (let to = index + direction; to >= 0 && to < order.length; to += direction) {
      if (live(to)) {
        return to
      }
    }
    return null
  }
  const step = (direction: 1 | -1): void => {
    const to = nextFrom(at, direction)
    if (to !== null) {
      setAt(to)
    }
  }
  /** Forward to the next card that is left; past the last one the walk is over. */
  const advance = (): void => {
    const to = nextFrom(at, 1)
    if (to === null) {
      onClose()
    } else {
      setAt(to)
    }
  }
  useBotItemChords(root, { back: onClose, step })
  useEffect(() => {
    // A card with a line to write starts in the box; the others start on Save, so Enter saves either way.
    ;(box.current ?? saveButton.current)?.focus({ preventScroll: true })
  }, [key])
  useEffect(() => {
    if (!card) {
      onClose()
    }
  })
  if (!card) {
    return null
  }

  const statusLabels = inaxStatusLabels(t)
  const me = t('home.activity.me', 'I')
  let header: React.ReactNode
  let body: React.ReactNode
  /** Null on a card that sends nothing to anyone. */
  let shared: string | null
  let viewers: string
  let save: HomeDayEndSave
  if (card.kind === 'task') {
    const { task } = card
    const current = task.status ?? 'todo'
    const picked = draft.status ?? card.proposed ?? current
    const typed = (draft.text ?? '').trim()
    const text = typed || card.suggestion || ''
    const status = picked === current ? null : picked
    save = {
      kind: 'task',
      taskId: task.id,
      text,
      byAgent: text !== '' && text === card.suggestion,
      status,
      current
    }
    shared =
      [
        text ? t('home.dayEnd.sharedNote', 'Progress note') : null,
        status
          ? t('home.dayEnd.sharedStatus', 'Status “{{status}}”', { status: statusLabels[status] })
          : null
      ]
        .filter(Boolean)
        .join(' · ') || t('home.dayEnd.sharedNothing', 'Nothing')
    viewers = t('home.dayEnd.audienceTask', 'The PM and the team of “{{project}}”', {
      project: projects[task.project].name
    })
    header = (
      <>
        <h3 className="text-[15px] leading-5 font-semibold text-foreground">{task.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <HomeProjectDot project={projects[task.project]} />
          <InaxStatusBadge status={current} />
          <span
            className={
              task.due === 'overdue' ? 'text-xs font-medium text-destructive' : HOME_META_CLASS
            }
          >
            {task.dueLabel}
          </span>
        </div>
      </>
    )
    body = (
      <>
        <HomeDayEndTimeline lines={card.timeline} onOpen={() => onOpenTask(task.id)} />
        <div className="mx-3.5 rounded-[10px] bg-sidebar-accent/60 p-3">
          <HomeDayEndChipLine
            question={t('home.dayEnd.status', 'Status')}
            chips={INAX_STATUSES.map((value) => ({
              id: value,
              label: statusLabels[value],
              recommended: value === card.proposed
            }))}
            picked={picked}
            onPick={(value) => patch({ status: INAX_STATUSES.find((entry) => entry === value) })}
          />
        </div>
      </>
    )
  } else if (card.kind === 'meeting') {
    const owner = (followUp: { id: string; suggestedOwnerId: string }): string =>
      draft.picks?.[followUp.id] ?? followUp.suggestedOwnerId
    const rows = card.followUps
      .map((followUp) => ({ followUpId: followUp.id, assigneeId: owner(followUp) }))
      .filter((row) => row.assigneeId !== '')
    save = { kind: 'meeting', meetingId: card.id, rows }
    shared =
      rows.length > 0
        ? t('home.dayEnd.sharedOwners', 'Who has {{count}} follow-ups', { count: rows.length })
        : t('home.dayEnd.sharedNothing', 'Nothing')
    viewers =
      [...new Set(rows.map((row) => row.assigneeId))]
        .map((id) => (id === card.peopleIds[0] ? me : personName(id)))
        .join(', ') || me
    header = (
      <>
        <h3 className="text-[15px] leading-5 font-semibold text-foreground">{card.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <HomeProjectDot project={projects[card.project]} />
          <span className={HOME_META_CLASS}>
            {t('home.dayEnd.followUpCount', '{{count}} follow-ups without an owner', {
              count: card.followUps.length
            })}
          </span>
        </div>
      </>
    )
    body = (
      <>
        <HomeDayEndTimeline lines={card.timeline} onOpen={() => onOpenMeeting(card.id)} />
        <div className="mx-3.5 flex flex-col gap-3 rounded-[10px] bg-sidebar-accent/60 p-3">
          {card.followUps.map((followUp) => (
            <HomeDayEndChipLine
              key={followUp.id}
              question={followUp.text}
              chips={card.peopleIds.map((id, index) => ({
                id,
                label: index === 0 ? me : personName(id),
                recommended: id === followUp.suggestedOwnerId
              }))}
              picked={owner(followUp)}
              // The pick again leaves this one without an owner: it stays open for another day.
              onPick={(id) =>
                patch({
                  picks: { ...draft.picks, [followUp.id]: owner(followUp) === id ? '' : id }
                })
              }
            />
          ))}
        </div>
      </>
    )
  } else {
    const answer = (recordId: string): string => draft.picks?.[recordId] ?? HOME_RECORD_YES
    save = {
      kind: 'records',
      answers: card.records.map((record) => ({
        recordId: record.id,
        answer: answer(record.id) === HOME_RECORD_YES ? record.suggestTaskId : answer(record.id)
      }))
    }
    shared = null
    viewers = me
    header = (
      <h3 className="text-[15px] leading-5 font-semibold text-foreground">
        {t('home.dayEnd.recordsTitle', 'Records without a task')}
      </h3>
    )
    body = (
      <HomeDayEndRecords
        records={card.records}
        openTasks={openTasks}
        answer={answer}
        onAnswer={(recordId, value) => patch({ picks: { ...draft.picks, [recordId]: value } })}
      />
    )
  }

  const commit = (): void => {
    onSave(save)
    advance()
  }
  const progress = t('home.dayEnd.progress', 'Today’s progress')
  const suggestion = card.kind === 'task' ? card.suggestion : null

  return (
    <aside
      ref={root}
      tabIndex={-1}
      aria-label={t('home.wrapUp.title', 'Wrap up')}
      data-home-day-end={card.kind}
      className={cn(
        '@container/item-pane flex w-[400px] shrink-0 flex-col border-l border-border bg-sidebar outline-none',
        '@max-[60rem]/rail-page:absolute @max-[60rem]/rail-page:inset-y-0 @max-[60rem]/rail-page:right-0 @max-[60rem]/rail-page:z-10 @max-[60rem]/rail-page:w-full @max-[60rem]/rail-page:max-w-[400px] @max-[60rem]/rail-page:shadow-lg'
      )}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented && !isImeOwnedKeyboardEvent(event)) {
          event.preventDefault()
          onClose()
        }
      }}
    >
      <div className="flex shrink-0 items-center gap-2 py-2 pr-2 pl-3.5">
        <h2 className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
          {t('home.wrapUp.title', 'Wrap up')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('home.wrapUp.close', 'Close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <div className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-3">
        <div className="px-3.5">{header}</div>
        <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1 px-3.5 text-xs">
          {shared === null ? null : (
            <>
              <dt className="text-muted-foreground">{t('home.dayEnd.shared', 'Shared')}</dt>
              <dd className="text-foreground" data-home-day-end-shared="">
                {shared}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">{t('home.dayEnd.viewers', 'Seen by')}</dt>
          <dd className="text-foreground" data-home-day-end-viewers="">
            {viewers}
          </dd>
        </dl>
        {body}
      </div>
      <div className="mx-3 mb-3 flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-background p-2 shadow-xs">
        {card.kind === 'task' ? (
          <label className="flex flex-col gap-0.5">
            <span className="px-2 pt-1 text-xs text-muted-foreground">{progress}</span>
            <ImeTextarea
              ref={box}
              // Remounted per card, so one card's line never shows in the next.
              key={key}
              rows={2}
              placeholder={suggestion ?? undefined}
              value={draft.text ?? ''}
              data-home-day-end-box=""
              className="scrollbar-sleek block max-h-[6lh] min-h-[2lh] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-5 outline-none [field-sizing:content] placeholder:text-muted-foreground"
              onChange={(event) => patch({ text: event.target.value })}
              onKeyDown={(event) => {
                const plain = !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey
                if (!plain || isImeOwnedKeyboardEvent(event)) {
                  return
                }
                // The chat composer's keys: Tab takes the line written ahead into the box, to edit or to send.
                if (event.key === 'Tab' && suggestion && !draft.text) {
                  event.preventDefault()
                  patch({ text: suggestion })
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  commit()
                }
              }}
            />
          </label>
        ) : null}
        <div className="flex items-center gap-1">
          <BotItemStepper
            pane={root}
            place={{ index: at + 1, total: order.length }}
            loading={false}
            offline={false}
            canStep={(direction) => nextFrom(at, direction) !== null}
            onStep={step}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-home-day-end-skip=""
            onClick={advance}
          >
            {t('home.dayEnd.skip', 'Skip')}
          </Button>
          <Button
            ref={saveButton}
            type="button"
            size="sm"
            data-home-day-end-save=""
            onClick={commit}
          >
            {t('home.dayEnd.save', 'Save')}
          </Button>
        </div>
      </div>
    </aside>
  )
}
