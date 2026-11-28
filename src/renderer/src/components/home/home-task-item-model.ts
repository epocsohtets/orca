// The 업무 items' shared model: ids, the event helpers and what answering an ask writes.
import type { Translate } from '@/i18n/use-translate'
import {
  botItemAskText,
  type BotItemAsk,
  type BotItemQuestionShape
} from '../../../../shared/bots/bot-item-ask'
import { botItemAnswerWords } from '../../../../shared/bots/bot-item-answer-lines'
import type {
  BotItem,
  BotItemActor,
  BotItemEvent,
  BotItemEventKind,
  BotItemStatus
} from '../../../../shared/bots/bot-items'
import type { HomeBoardState } from './home-board'
import type { HomeBoardView } from './home-board-view'
import type { HomeDayEndCard, HomeDayEndSave } from './home-day-end'
import { HOME_RECORD_NOT_WORK } from './home-day-end'
import { INAX_STATUSES, type InaxStatus } from './home-task-loop'

export const HOME_TASKS_BOT_ID = 'home-tasks'

/** What answering an item's ask does, given each question's answer (a quick reply's label or my words). */
export type HomeItemAnswer =
  | { kind: 'loop'; taskId: string; choices: { id: string; label: string }[] }
  | { kind: 'board'; taskId: string; choices: { id: string; label: string }[] }
  | { kind: 'invitation'; meetingId: string; yes: string }
  | { kind: 'request'; meetingId: string; personId: string; approve: string }
  | {
      kind: 'dayEnd'
      card: Extract<HomeDayEndCard, { kind: 'task' }>
      labels: Record<InaxStatus, string>
    }
  | {
      kind: 'records'
      records: { id: string }[]
      tasks: { id: string; label: string }[]
      notWork: string
    }

export type HomeItemEntry = {
  item: BotItem
  events: BotItemEvent[]
  /** The open ask's event and what answering it does; null with nothing asked. */
  ask: {
    eventId: string
    shape: BotItemQuestionShape
    answer: HomeItemAnswer
  } | null
  /** The task it is; null for a decision of its own. */
  taskId: string | null
  /** Where its chat row goes: the task's conversation, the meeting, or Home. */
  chat: { kind: 'task'; taskId: string } | { kind: 'meeting'; meetingId: string } | { kind: 'home' }
  /** Opened from elsewhere only, never a row of the list: the day's records, a colleague's view of a task. */
  unlisted?: true
}

/** A comment of mine this window sent, kept so the host's read names its request id. */
export type HomeSentComment = { at: number; text: string; requestId?: string }

export type HomeItemsInput = {
  t: Translate
  view: HomeBoardView
  board: HomeBoardState
  evening: boolean
  /** The viewer is 마코, whose 업무 these are; a colleague reads them only. */
  own: boolean
  agentName: string
  /** A moment that stays put across reads: the first one asked for `key`, never later than now. */
  stamp: (key: string, proposed: number) => number
  /** My answers sent from the panel, by `<uid>\0<ask event id>`. */
  sent: ReadonlyMap<string, HomeSentComment>
  /** Request ids of my plain comments, by note id. */
  noteRequests: ReadonlyMap<string, string>
  snoozed: ReadonlyMap<string, number>
  /** When each open day-end ask was last shown, by item: its place in the history once answered. */
  askedAt: Map<string, number>
}

export const BOT_STATUS: Record<InaxStatus, BotItemStatus> = {
  todo: 'planned',
  inProgress: 'working',
  review: 'waiting',
  done: 'done'
}

export function inaxStatusOfItem(status: BotItemStatus): InaxStatus | null {
  return INAX_STATUSES.find((entry) => BOT_STATUS[entry] === status) ?? null
}

// A sample started over is new items: Orca's item views keep what they last read of an item by its uid.
let generation = 0

export function nextHomeItemGeneration(): void {
  generation++
}

export function taskItemUid(taskId: string): string {
  return `task:${generation}:${taskId}`
}

/** 마코's task as a colleague reads it: an item of its own, so no view mixes it with 마코's. */
export function peerTaskItemUid(taskId: string): string {
  return `peer:${generation}:${taskId}`
}

/** The day's records with no task, asked as one item. */
export function homeRecordsItemUid(): string {
  return `records:${generation}`
}

export type Draft = {
  kind: BotItemEventKind
  actor: BotItemActor
  data: Record<string, unknown>
  at: number
}

/** Ids in time order, `e<n>` as hosts write them, so "after" reads and the seen mark compare. */
export function withIds(drafts: Draft[]): BotItemEvent[] {
  let last = 0
  return drafts
    .map((draft, index) => ({ draft, index }))
    .sort((a, b) => a.draft.at - b.draft.at || a.index - b.index)
    .map(({ draft }) => {
      last = Math.max(last + 1, Math.floor(draft.at))
      return { id: `e${last}`, ...draft }
    })
}

export const ME: BotItemActor = { kind: 'owner' }

export function askData(ask: BotItemAsk): Record<string, unknown> {
  return { text: botItemAskText(ask), ask }
}

/** Each question's answer in a comment: a quick reply's label, or the words for that line. */
export function homeItemAnswerWords(shape: BotItemQuestionShape, text: string): (string | null)[] {
  return shape.decisions.map((_, index) => botItemAnswerWords(shape, index, { text }))
}

/** What a comment answering `answer` saves: the store writes for each kind. */
export type HomeItemAnswerWrite =
  | { kind: 'loop'; taskId: string; choiceId: string | null; text?: string }
  | { kind: 'board'; taskId: string; choiceId: string }
  | { kind: 'invitation'; meetingId: string; yes: boolean }
  | { kind: 'request'; meetingId: string; personId: string; approve: boolean }
  | { kind: 'dayEnd'; save: HomeDayEndSave }
  | { kind: 'records'; save: HomeDayEndSave }
  | null

export function homeItemAnswerWrite(
  answer: HomeItemAnswer,
  words: readonly (string | null)[]
): HomeItemAnswerWrite {
  const first = words[0]?.trim() ?? ''
  switch (answer.kind) {
    case 'loop': {
      const choice = answer.choices.find((entry) => entry.label === first)
      return first
        ? {
            kind: 'loop',
            taskId: answer.taskId,
            choiceId: choice?.id ?? null,
            ...(choice ? {} : { text: first })
          }
        : null
    }
    case 'board': {
      const choice = answer.choices.find((entry) => entry.label === first)
      return first
        ? {
            kind: 'board',
            taskId: answer.taskId,
            choiceId: choice?.id ?? first
          }
        : null
    }
    case 'invitation':
      return first
        ? {
            kind: 'invitation',
            meetingId: answer.meetingId,
            yes: first === answer.yes
          }
        : null
    case 'request':
      return first
        ? {
            kind: 'request',
            meetingId: answer.meetingId,
            personId: answer.personId,
            approve: first === answer.approve
          }
        : null
    case 'dayEnd': {
      const { card, labels } = answer
      const current = card.task.status ?? 'todo'
      const status = INAX_STATUSES.find((entry) => labels[entry] === first)
      if (!first) {
        return null
      }
      return {
        kind: 'dayEnd',
        save: {
          kind: 'task',
          taskId: card.task.id,
          // A status picked keeps the agent's note; my own words are the note and leave the status.
          text: status ? (card.suggestion ?? '') : first,
          byAgent: status !== undefined && Boolean(card.suggestion),
          // Picked on a task waiting on someone's reply, even the status it has: the pick clears the wait.
          status: status && (status !== current || card.task.who === 'blocked') ? status : null,
          current,
          answersProposal: card.task.proposal !== undefined,
          answer: first
        }
      }
    }
    case 'records': {
      const answers = answer.records.flatMap((record, index) => {
        const said = words[index]?.trim()
        if (!said) {
          return []
        }
        const task = answer.tasks.find((entry) => entry.label === said)
        return task
          ? [{ recordId: record.id, answer: task.id }]
          : said === answer.notWork
            ? [{ recordId: record.id, answer: HOME_RECORD_NOT_WORK }]
            : []
      })
      return answers.length > 0 ? { kind: 'records', save: { kind: 'records', answers } } : null
    }
  }
}
