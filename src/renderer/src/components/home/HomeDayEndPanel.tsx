import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import { Button } from '@/components/ui/button'
import { ImeTextarea } from '@/lib/text-input/ime/ime-text-field'
import { BotItemStepper } from '@/components/bots/items/BotItemStepper'
import { useBotItemChords } from '@/components/bots/items/use-bot-item-chords'
import { personName } from '@/components/meetings/meeting-people'
import { HOME_BOARD_SCOPE_CLASS, HOME_META_CLASS, HomeProjectDot } from './HomeCard'
import { useSidePanelInset } from './use-side-panel-inset'
import {
  HomeDayEndChipLine,
  HomeDayEndRecords,
  HomeDayEndSuggestionHint,
  HomeDayEndTimeline
} from './HomeDayEndParts'
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
  useSidePanelInset()
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
  const progress = t('home.dayEnd.progress', 'Progress note')
  const me = t('home.activity.me', 'I')
  let header: React.ReactNode
  let body: React.ReactNode
  /** What Save sends. Null on a card that sends nothing to anyone. */
  let shared: string | null
  /** What colleagues see of this already, without my confirmation. */
  let visibleNow: string | null = null
  let viewers: string
  let save: HomeDayEndSave
  if (card.kind === 'task') {
    const { task } = card
    const current = task.status ?? 'todo'
    const picked = draft.status ?? card.proposed ?? current
    // The line written ahead is not mine until I take it: Save sends only what stands in the box.
    const text = (draft.text ?? '').trim()
    const status = picked === current ? null : picked
    save = {
      kind: 'task',
      taskId: task.id,
      text,
      byAgent: text !== '' && text === card.suggestion,
      status,
      current,
      answersProposal: task.proposal !== undefined
    }
    shared =
      [
        text ? progress : null,
        status
          ? t('home.dayEnd.sharedStatus', 'Status {{from}} → {{to}}', {
              from: statusLabels[current],
              to: statusLabels[status]
            })
          : null
      ]
        .filter(Boolean)
        .join(' · ') || t('home.dayEnd.sharedNothing', 'Nothing more')
    // Status and activity are shared as they happen; only the written line and a proposed status wait for Save.
    visibleNow = [
      t('home.dayEnd.nowStatus', 'Status {{status}}', { status: statusLabels[current] }),
      card.timeline[0]
        ? t('home.dayEnd.nowActivity', 'Last activity {{when}}', { when: card.timeline[0].when })
        : null,
      task.who === 'agentWorking' ? t('home.dayEnd.nowAgent', 'Agent working') : null
    ]
      .filter(Boolean)
      .join(' · ')
    viewers = t('home.dayEnd.audienceTask', 'The PM and the team of “{{project}}”', {
      project: projects[task.project].name
    })
    header = (
      <>
        <h3 className="text-sm leading-5 font-semibold text-foreground">{task.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <HomeProjectDot project={projects[task.project]} />
          {/* The status is said once, as text, in the "Now" row: a pill here read as a control. */}
          <span
            className={
              task.due === 'overdue' ? 'text-xs leading-4 text-destructive' : HOME_META_CLASS
            }
          >
            {task.due === 'overdue'
              ? task.dueLabel
              : `${t('taskLoop.detail.due', 'Due')} ${task.dueLabel}`}
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
    // Nobody was named for these, so no pick is made ahead: only the ones I give an owner are saved.
    const rows = card.followUps.flatMap((followUp) =>
      draft.picks?.[followUp.id]
        ? [{ followUpId: followUp.id, assigneeId: draft.picks[followUp.id] }]
        : []
    )
    save = { kind: 'meeting', meetingId: card.id, rows }
    shared =
      rows.length > 0
        ? t('home.dayEnd.sharedOwners', 'Owners of {{count}} follow-ups', { count: rows.length })
        : t('home.dayEnd.sharedNothing', 'Nothing more')
    visibleNow = t('home.dayEnd.nowMeeting', 'Minutes · {{count}} follow-up tasks', {
      count: card.settled
    })
    // Everyone in the meeting sees who has its follow-ups.
    viewers = card.peopleIds.map((id, index) => (index === 0 ? me : personName(id))).join(', ')
    header = (
      <>
        <h3 className="text-sm leading-5 font-semibold text-foreground">{card.title}</h3>
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
              note={
                followUp.returnedBy ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {personName(followUp.returnedBy)} ·{' '}
                    {t('meetings.followUps.stateDeclined', 'Says not theirs')}
                  </p>
                ) : undefined
              }
              label={t('meetings.followUps.colOwner', 'Owner')}
              chips={card.peopleIds.map((id, index) => ({
                id,
                label: index === 0 ? me : personName(id),
                recommended: false,
                person: true
              }))}
              picked={draft.picks?.[followUp.id]}
              onPick={(id) => patch({ picks: { ...draft.picks, [followUp.id]: id } })}
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
      <h3 className="text-sm leading-5 font-semibold text-foreground">
        {t('home.day.unconfirmed', 'Records without a task')}
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
  const suggestion = card.kind === 'task' ? card.suggestion : null

  return (
    <aside
      ref={root}
      tabIndex={-1}
      aria-label={t('home.wrapUp.title', 'Wrap-up')}
      data-home-day-end={card.kind}
      className={cn(
        '@container/item-pane @container/home-card flex w-[400px] shrink-0 flex-col border-l border-border bg-sidebar outline-none',
        HOME_BOARD_SCOPE_CLASS,
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
        <h2 className="min-w-0 flex-1 text-xs leading-4 text-muted-foreground">
          {t('home.wrapUp.title', 'Wrap-up')}
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
          <dt className="text-muted-foreground">{t('home.dayEnd.viewers', 'Who sees it')}</dt>
          <dd className="text-foreground" data-home-day-end-viewers="">
            {viewers}
          </dd>
          {visibleNow === null ? null : (
            <>
              <dt className="text-muted-foreground">{t('home.dayEnd.visibleNow', 'Now')}</dt>
              <dd className="text-foreground" data-home-day-end-now="">
                {visibleNow}
              </dd>
            </>
          )}
          {shared === null ? null : (
            <>
              <dt className="text-muted-foreground">{t('home.dayEnd.shared', 'After Save')}</dt>
              <dd className="text-foreground" data-home-day-end-shared="">
                {shared}
              </dd>
            </>
          )}
        </dl>
        {body}
      </div>
      <div
        className={cn(
          'mx-3 mb-3 flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-background p-2 shadow-xs',
          // A dashed edge while the box holds only the agent's suggestion.
          suggestion && !draft.text && 'border-dashed border-muted-foreground/50'
        )}
      >
        {card.kind === 'task' ? (
          <label className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 px-2 pt-1 text-xs text-muted-foreground">
              <span className="min-w-0 flex-1">{progress}</span>
            </span>
            {suggestion && !draft.text ? (
              <HomeDayEndSuggestionHint
                onTake={() => {
                  patch({ text: suggestion })
                  box.current?.focus()
                }}
              />
            ) : null}
            <ImeTextarea
              ref={box}
              // Remounted per card, so one card's line never shows in the next.
              key={key}
              rows={2}
              placeholder={suggestion ?? undefined}
              value={draft.text ?? ''}
              data-home-day-end-box=""
              className="scrollbar-sleek block max-h-[6lh] min-h-[2lh] w-full resize-none border-0 bg-transparent px-2 py-1 text-[13px] leading-5 outline-none [field-sizing:content] placeholder:text-muted-foreground"
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
            variant="outline"
            size="sm"
            data-home-day-end-skip=""
            onClick={advance}
          >
            {t('home.dayEnd.next', 'Next')}
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
