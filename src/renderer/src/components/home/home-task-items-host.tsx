// The 업무 bot's host in this window: Orca's item panel calls it as it calls any bot host, and it answers from
// the Home store. Mounted once for the app, so Home's panel and a task workspace's sidebar read one list.
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { useTranslate } from '@/i18n/use-translate'
import { emitBotsChangedWindowEvent } from '@/lib/bots-changed-window-event'
import { serveLocalBotItems } from '@/lib/local-bot-items'
import { openInaxTask } from '@/components/task-page/inax/inax-source-selection'
import { openMeeting } from '@/components/meetings/meeting-navigation'
import { respondToInvitation } from '@/components/meetings/meetings-store'
import { declineMinutesRequest, shareMinutes } from '@/components/meetings/meeting-sharing-actions'
import { useAppStore } from '@/store'
import { mascotAvatar } from '../../../../shared/bot-avatar'
import type { Bot } from '../../../../shared/bot-types'
import type { BotItem, BotItemEvent } from '../../../../shared/bots/bot-items'
import { BOT_ITEM_STATUSES, parseBotItemEventId } from '../../../../shared/bots/bot-items'
import { isRecord } from '../../../../shared/agent-status/child-work/agent-status-child-work-value-guards'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../shared/execution-host/execution-host'
import { useHomeBoard } from './use-home-board'
import { useHomeBoardStore } from './home-board-store'
import {
  answerHomeLoop,
  commentHomeTask,
  ensureHomeTaskChat,
  saveHomeDayEnd,
  setHomeTaskStatus,
  settleHomeDayEnd
} from './home-board-actions'
import { inaxStatusLabels } from './home-task-loop-script'
import { MAKO } from '@/components/meetings/meeting-people'
import { buildHomeTaskItems } from './home-task-items'
import {
  BOT_STATUS,
  HOME_TASKS_BOT_ID,
  ME,
  homeItemAnswerWords,
  homeItemAnswerWrite,
  inaxStatusOfItem,
  type HomeItemEntry,
  type HomeSentComment
} from './home-task-item-model'
import { INAX_STATUSES } from './home-task-loop'

/** The task agent as Orca's item panel names it: the owner of every 업무 item. */
export function homeTasksBot(name: string): Bot {
  return {
    id: HOME_TASKS_BOT_ID,
    name,
    hostId: LOCAL_EXECUTION_HOST_ID,
    folder: 'home-tasks',
    folderWorkspaceId: 'home-tasks',
    agent: 'claude',
    avatar: mascotAvatar('B1'),
    paused: false,
    notifications: {
      needsPermission: true,
      taskComplete: true,
      couldNotFinish: true
    },
    members: [],
    slack: null,
    linear: null,
    github: null,
    chatSessionId: 'home-tasks',
    itemsStale: 'never',
    createdAt: 1,
    updatedAt: 1
  }
}

/**
 * Which 업무 Home's panel shows, so a click elsewhere on Home (a row, 업무 정리) opens it there; and the last
 * item whose ask I answered, so the day-end pass goes on to the next by itself.
 */
export const useHomeItemsPanel = create<{
  request: { uid: string; at: number } | null
  answered: { uid: string; at: number } | null
}>(() => ({ request: null, answered: null }))

export function openHomeItem(uid: string): void {
  useHomeItemsPanel.setState({ request: { uid, at: Date.now() } })
}

/** Whether the host holds `uid` with an ask waiting on me. */
export function homeItemIsOpen(uid: string): boolean {
  return listed().some((entry) => entry.item.uid === uid && entry.ask !== null)
}

/** From another screen: Home, with `uid` open in its panel. */
export function openHomeNeedsYou(uid: string): void {
  useAppStore.getState().openHomePage()
  openHomeItem(uid)
}

// shortcut: what this window sent and the snoozes live for the app session; the board's store keeps the answers
// themselves, so a reload shows each answer as its words without the request id a pending send waits on.
const stamps = new Map<string, number>()
const sent = new Map<string, HomeSentComment>()
const noteRequests = new Map<string, string>()
const snoozed = new Map<string, number>()
const askedAt = new Map<string, number>()
/** Each item's number, given once: a row leaving the list never moves another item's number. */
const numbers = new Map<string, number>()
const numberOf = (uid: string): number => {
  const known = numbers.get(uid)
  if (known !== undefined) {
    return known
  }
  numbers.set(uid, numbers.size + 1)
  return numbers.size
}
/** Decisions with no task, answered here: their row goes from the board, and they stay as closed items of the
 *  person who answered them, by `<viewer>\0<uid>`. */
const kept = new Map<string, HomeItemEntry>()
/** Who the demo shows the app as. */
let viewer = ''
const keptKey = (uid: string): string => `${viewer}\u0000${uid}`
let entries: HomeItemEntry[] = []
let seenEventId = 'e0'
/** The board's time of day as the host last built it: an answer in the evening settles the task's day. */
let evening = false

/** Starting the sample over: what this window sent and when each ask came go with the board. */
export function resetHomeTaskItems(): void {
  for (const map of [stamps, sent, noteRequests, snoozed, kept, askedAt, numbers]) {
    map.clear()
  }
}

const stamp = (key: string, proposed: number): number => {
  const known = stamps.get(key)
  if (known !== undefined) {
    return known
  }
  const at = Math.min(proposed, Date.now())
  stamps.set(key, at)
  return at
}

function listed(): HomeItemEntry[] {
  const live = new Set(entries.map((entry) => entry.item.uid))
  const mine = [...kept.entries()].flatMap(([key, entry]) =>
    key === keptKey(entry.item.uid) && !live.has(entry.item.uid) ? [entry] : []
  )
  return [...entries, ...mine]
}

function entryOf(uid: unknown): HomeItemEntry {
  const entry = listed().find((candidate) => candidate.item.uid === uid)
  if (!entry) {
    throw Object.assign(new Error('Item not found'), { code: 'not_found' })
  }
  return entry
}

function changed(): void {
  emitBotsChangedWindowEvent(LOCAL_EXECUTION_HOST_ID, {
    botIds: [HOME_TASKS_BOT_ID],
    kinds: ['items']
  })
}

function newest(events: readonly BotItemEvent[]): number {
  return Math.max(0, ...events.map((event) => parseBotItemEventId(event.id) ?? 0))
}

function comment(params: Record<string, unknown>): void {
  const entry = entryOf(params.item)
  const text = typeof params.text === 'string' ? params.text : ''
  const requestId = typeof params.requestId === 'string' ? params.requestId : undefined
  const at = Date.now()
  const ask = entry.ask
  // A reply to the open ask answers it; anything else is a note on the task, in its timeline and its chat.
  if (ask && (params.questionId === undefined || params.questionId === ask.eventId)) {
    const write = homeItemAnswerWrite(ask.answer, homeItemAnswerWords(ask.shape, text))
    if (write) {
      // The key the item's history finds this answer by again.
      const key =
        write.kind === 'dayEnd'
          ? 'dayend'
          : write.kind === 'loop' || write.kind === 'board'
            ? write.kind
            : ask.eventId
      sent.set(`${entry.item.uid}\u0000${key}`, { at, text, requestId })
      // A decision of its own stays as a closed item with my answer as my line; the day's records are no
      // 업무 and leave once answered.
      if (!entry.taskId && !entry.unlisted) {
        const answer: BotItemEvent = {
          id: `e${Math.max(at, newest(entry.events) + 1)}`,
          kind: 'status',
          actor: ME,
          data: { answer: text, ...(requestId ? { requestId } : {}) },
          at
        }
        kept.set(keptKey(entry.item.uid), {
          ...entry,
          ask: null,
          events: [...entry.events, answer],
          item: {
            ...entry.item,
            status: 'done',
            question: null,
            waitingAsk: undefined,
            lastEventId: answer.id,
            lastActivityAt: at,
            updatedAt: at,
            closedAt: at
          }
        })
      }
      applyWrite(write)
      if (evening && (write.kind === 'loop' || write.kind === 'board') && entry.taskId) {
        settleHomeDayEnd(entry.taskId)
      }
      useHomeItemsPanel.setState({ answered: { uid: entry.item.uid, at } })
      return
    }
  }
  if (entry.taskId) {
    // My line is the task's conversation too: the chat holds it, and the agent replies there and here.
    const noteId = commentHomeTask(entry.taskId, text, at, entry.item.title)
    if (requestId) {
      noteRequests.set(noteId, requestId)
    }
    return
  }
  const note: BotItemEvent = {
    id: `e${Math.max(at, newest(entry.events) + 1)}`,
    kind: 'commented',
    actor: { kind: 'owner' },
    data: { text, ...(requestId ? { requestId } : {}) },
    at
  }
  kept.set(keptKey(entry.item.uid), { ...entry, events: [...entry.events, note] })
}

function applyWrite(write: NonNullable<ReturnType<typeof homeItemAnswerWrite>>): void {
  switch (write.kind) {
    case 'loop':
      answerHomeLoop(write.taskId, write.choiceId, write.text)
      return
    case 'board':
      useHomeBoardStore.setState((state) => ({
        answers: { ...state.answers, [write.taskId]: write.choiceId }
      }))
      return
    case 'invitation':
      respondToInvitation(write.meetingId, write.yes ? 'yes' : 'no')
      return
    case 'request':
      if (write.approve) {
        shareMinutes(write.meetingId, write.personId)
      } else {
        declineMinutesRequest(write.meetingId, write.personId)
      }
      return
    case 'dayEnd':
    case 'records':
      saveHomeDayEnd(write.save)
  }
}

async function call(method: string, raw: unknown): Promise<unknown> {
  const params = isRecord(raw) ? raw : {}
  switch (method) {
    case 'bots.items.owner.list': {
      const items: BotItem[] = listed().flatMap((entry) => (entry.unlisted ? [] : [entry.item]))
      const counts: Record<string, number> = {}
      for (const item of items) {
        counts[item.status] = (counts[item.status] ?? 0) + 1
      }
      return { items, counts, seenEventId }
    }
    case 'bots.items.owner.opened': {
      const was = seenEventId
      seenEventId = `e${Math.max(0, ...listed().map((entry) => newest(entry.events)))}`
      return { seenEventId: was }
    }
    case 'bots.items.owner.show': {
      const entry = entryOf(params.item)
      const after = typeof params.after === 'string' ? parseBotItemEventId(params.after) : null
      return {
        item: entry.item,
        events:
          after === null
            ? entry.events
            : entry.events.filter((event) => (parseBotItemEventId(event.id) ?? 0) > after)
      }
    }
    case 'bots.items.owner.comment':
      comment(params)
      changed()
      return { ok: true }
    case 'bots.items.owner.status': {
      const uids = Array.isArray(params.items) ? params.items : []
      const status = BOT_ITEM_STATUSES.find((entry) => entry === params.status)
      const to = status ? inaxStatusOfItem(status) : null
      for (const uid of uids) {
        const entry = entryOf(uid)
        if (entry.taskId && to) {
          setHomeTaskStatus(entry.taskId, to)
        }
      }
      return { ok: true }
    }
    case 'bots.items.owner.snooze': {
      const list = Array.isArray(params.items) ? params.items : []
      for (const row of list) {
        const uid = isRecord(row) ? row.item : undefined
        if (typeof uid === 'string') {
          if (typeof params.until === 'number') {
            snoozed.set(uid, params.until)
          } else {
            snoozed.delete(uid)
          }
        }
      }
      changed()
      return { ok: true }
    }
    default:
      throw Object.assign(new Error(`${method} is not served for 업무`), {
        code: 'method_not_found'
      })
  }
}

function openChat(chatId: string): void {
  const entry = listed().find((candidate) => candidate.item.uid === chatId)
  if (!entry) {
    return
  }
  if (entry.chat.kind === 'task') {
    const { taskId } = entry.chat
    // Every task has its conversation: one I have not handed over gets it now.
    void ensureHomeTaskChat(taskId, entry.item.title).then(() => openInaxTask(taskId))
  } else if (entry.chat.kind === 'meeting') {
    openMeeting(entry.chat.meetingId)
  } else {
    useAppStore.getState().openHomePage()
  }
}

function numbered(input: Parameters<typeof buildHomeTaskItems>[0]): HomeItemEntry[] {
  return buildHomeTaskItems(input).map((entry) => ({
    ...entry,
    // A colleague's view of a task has the task's number.
    item: { ...entry.item, number: numberOf(entry.item.uid.replace(/^peer:/, 'task:')) }
  }))
}

/** Keeps the 업무 bot's items in step with the board; mount once. */
export function HomeTaskItemsHost(): null {
  const t = useTranslate()
  const { view, board, phase, viewerId } = useHomeBoard()
  const agentName = t('taskLoop.agent.name', 'Task agent')
  useEffect(() => {
    evening = phase === 'evening'
    viewer = viewerId
  }, [phase, viewerId])
  const built = useMemo(
    () =>
      numbered({
        t,
        view,
        board,
        evening: phase === 'evening',
        own: viewerId === MAKO,
        agentName,
        stamp,
        sent,
        noteRequests,
        snoozed,
        askedAt
      }),
    [t, view, board, phase, viewerId, agentName]
  )
  useEffect(() => {
    // A 업무 has inAX's four statuses, by their inAX names: Needs you and Canceled are not offered.
    const labels = inaxStatusLabels(t)
    const statuses = INAX_STATUSES.map((status) => ({
      status: BOT_STATUS[status],
      label: labels[status]
    }))
    return serveLocalBotItems(HOME_TASKS_BOT_ID, { call, openChat, statuses })
  }, [t])
  useEffect(() => {
    const before = JSON.stringify(entries.map((entry) => [entry.item, entry.events.length]))
    entries = built
    if (JSON.stringify(built.map((entry) => [entry.item, entry.events.length])) !== before) {
      changed()
    }
  }, [built])
  return null
}
