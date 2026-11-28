import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import { Button } from '@/components/ui/button'
import { ImeTextarea } from '@/lib/text-input/ime/ime-text-field'
import { useBotItemChords } from '@/components/bots/items/use-bot-item-chords'
import { personName } from '@/components/meetings/meeting-people'
import { HOME_BOARD_SCOPE_CLASS, HomeProjectDot } from './HomeCard'
import { useSidePanelInset } from './use-side-panel-inset'
import {
  HomeDayEndChipLine,
  HomeDayEndSelect,
  HomeDayEndSuggestionHint,
  HomeDayEndTimeline
} from './HomeDayEndParts'
import type { HomeProjectId, HomeTask } from './home-board'
import type { HomeProject } from './home-board-mock'
import {
  HOME_RECORD_NOT_WORK,
  type HomeDayEndCard,
  type HomeDayEndDraft,
  type HomeDayEndLine,
  type HomeDayEndSave
} from './home-day-end'
import { INAX_STATUSES } from './home-task-loop'
import { inaxStatusLabels } from './home-task-loop-script'

/**
 * The day-end cards beside Home, one at a time, in the shape of Orca's item pane: the task's project and
 * title, what happened on it, then the one thing to settle for this kind of card, and Save. Nothing reaches
 * colleagues before Save.
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
  // The walk is over the cards as they stood when I opened it, so saved cards leave without reordering it.
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
  const me = t('home.activity.me', 'I')
  /** The task's own words, after its project. */
  let title: string
  let project: HomeProject | null = null
  /** A follow-up's meeting, after its title. */
  let source: React.ReactNode = null
  /** Null: the card is not about a task's activity (a day record). */
  let timeline: { lines: readonly HomeDayEndLine[]; open: () => void } | null = null
  let status: React.ReactNode = null
  /** The one labelled control a card of this kind adds, above the footer. */
  let control: React.ReactNode
  let save: HomeDayEndSave
  if (card.kind === 'task') {
    const { task } = card
    const current = task.status ?? 'todo'
    const picked = draft.status ?? card.proposed ?? current
    // The line written ahead is not mine until I take it: Save sends only what stands in the box.
    const text = (draft.text ?? '').trim()
    save = {
      kind: 'task',
      taskId: task.id,
      text,
      byAgent: text !== '' && text === card.suggestion,
      status: picked === current ? null : picked,
      current,
      answersProposal: task.proposal !== undefined
    }
    title = task.title
    project = projects[task.project]
    timeline = { lines: card.timeline, open: () => onOpenTask(task.id) }
    status = (
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
    )
    control = (
      <label className="flex flex-col gap-0.5">
        <span className="px-2 pt-1 text-xs text-muted-foreground">
          {t('home.dayEnd.progress', 'Progress note')}
        </span>
        {card.suggestion && !draft.text ? (
          <HomeDayEndSuggestionHint
            onTake={() => {
              patch({ text: card.suggestion ?? '' })
              box.current?.focus()
            }}
          />
        ) : null}
        <ImeTextarea
          ref={box}
          // Remounted per card, so one card's line never shows in the next.
          key={key}
          rows={2}
          placeholder={card.suggestion ?? undefined}
          value={draft.text ?? ''}
          data-home-day-end-box=""
          className="scrollbar-sleek block max-h-[6lh] min-h-[2lh] w-full resize-none border-0 bg-transparent px-2 py-1 text-[13px] leading-5 outline-none [field-sizing:content] placeholder:text-muted-foreground"
          onChange={(event) => patch({ text: event.target.value })}
          onKeyDown={(event) => {
            const plain = !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey
            if (!plain || isImeOwnedKeyboardEvent(event)) {
              return
            }
            // The chat composer's keys: Tab takes the line written ahead; Enter without it saves the state only.
            if (event.key === 'Tab' && card.suggestion && !draft.text) {
              event.preventDefault()
              patch({ text: card.suggestion })
            } else if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          }}
        />
      </label>
    )
  } else if (card.kind === 'meeting') {
    const assigneeId = draft.picks?.[card.id]
    // Nobody was named for it, so no pick is made ahead: Save without one sends nothing.
    save = {
      kind: 'meeting',
      meetingId: card.meetingId,
      rows: assigneeId ? [{ followUpId: card.followUp.id, assigneeId }] : []
    }
    title = card.followUp.text
    project = projects[card.project]
    source = (
      <Button
        type="button"
        variant="link"
        size="inlineInherit"
        className="text-xs leading-4 text-muted-foreground"
        data-home-day-end-meeting=""
        onClick={() => onOpenMeeting(card.meetingId)}
      >
        <MessageSquare aria-hidden className="size-3.5" />
        {card.meetingTitle}
      </Button>
    )
    timeline = { lines: card.timeline, open: () => onOpenMeeting(card.meetingId) }
    control = (
      <HomeDayEndSelect
        label={t('meetings.followUps.colOwner', 'Owner')}
        value={assigneeId}
        placeholder={t('meetings.followUps.chooseOwner', 'Choose owner')}
        options={card.peopleIds.map((id, index) => ({
          id,
          label: index === 0 ? me : personName(id)
        }))}
        onChange={(id) => patch({ picks: { ...draft.picks, [card.id]: id } })}
      />
    )
  } else {
    const { record } = card
    const answer = draft.picks?.[record.id] ?? record.suggestTaskId
    save = { kind: 'records', answers: [{ recordId: record.id, answer }] }
    title = t('home.day.unconfirmed', 'Records without a task')
    control = (
      <div className="flex flex-col gap-1">
        <p className="truncate px-2 pt-1 text-[13px] leading-5 text-foreground" title={record.text}>
          {record.text}
        </p>
        <HomeDayEndSelect
          label={t('home.dayEnd.task', 'Task')}
          value={answer}
          options={openTasks.map((task) => ({ id: task.id, label: task.title }))}
          last={{ id: HOME_RECORD_NOT_WORK, label: t('home.day.notWork', 'Not work') }}
          onChange={(id) => patch({ picks: { ...draft.picks, [record.id]: id } })}
        />
      </div>
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3.5">
          {project ? <HomeProjectDot project={project} /> : null}
          <h3 className="min-w-0 text-sm leading-5 font-semibold text-foreground">{title}</h3>
          {source}
        </div>
        {timeline ? <HomeDayEndTimeline lines={timeline.lines} onOpen={timeline.open} /> : null}
        {status}
      </div>
      <div
        className={cn(
          'mx-3 mb-3 flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-background p-2 shadow-xs',
          // A dashed edge while the box holds only the agent's suggestion.
          suggestion && !draft.text && 'border-dashed border-muted-foreground/50'
        )}
      >
        {control}
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="outline"
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
