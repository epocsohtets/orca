// One 업무 item from its events and its open ask, in the shape a bot host lists it.
import type { Translate } from '@/i18n/use-translate'
import {
  botItemAskText,
  botItemQuestionShape,
  type BotItemAsk
} from '../../../../shared/bots/bot-item-ask'
import type { BotItemActor, BotItemStatus } from '../../../../shared/bots/bot-items'
import type { HomeTask } from './home-board'
import { INAX_STATUSES, type InaxStatus } from './home-task-loop'
import { inaxStatusLabels } from './home-task-loop-script'
import {
  BOT_STATUS,
  HOME_TASKS_BOT_ID,
  ME,
  askData,
  withIds,
  type Draft,
  type HomeItemAnswer,
  type HomeItemEntry,
  type HomeSentComment
} from './home-task-item-model'

export type HomeItemEntryContext = {
  t: Translate
  agentName: string
  snoozed: ReadonlyMap<string, number>
  now: number
}

export function makeHomeItemEntry(
  ctx: HomeItemEntryContext,
  uid: string,
  number: number,
  task: Pick<HomeTask, 'title' | 'detail' | 'dueLabel' | 'due' | 'done'> & {
    status?: InaxStatus
    who?: HomeTask['who']
    whoLabel?: string
  },
  drafts: Draft[],
  open: { ask: BotItemAsk; at: number; answer: HomeItemAnswer } | null,
  rest: Pick<HomeItemEntry, 'taskId' | 'chat'> & {
    chatTitle: string
    withDue: boolean
    /** Who asks, when not the task agent: a person, or the meeting agent. */
    asker?: string
  }
): HomeItemEntry {
  const { t, agentName, now } = ctx
  const bot: BotItemActor = {
    kind: 'bot',
    botId: HOME_TASKS_BOT_ID,
    chatId: 'agent'
  }
  const labels = inaxStatusLabels(t)
  const asker: BotItemActor = rest.asker
    ? { kind: 'bot', botId: `asker:${rest.asker}`, chatId: uid }
    : bot
  if (open) {
    drafts.push(
      { kind: 'commented', actor: asker, data: askData(open.ask), at: open.at },
      {
        kind: 'status',
        actor: asker,
        data: { from: null, to: 'needs_you' },
        at: open.at
      }
    )
  }
  // Only asks I saw: one a later ask took the place of before I answered it is not part of the history.
  const events = withIds(drafts).filter((event, index, all) => {
    if (event.kind !== 'commented' || !event.data.ask) {
      return true
    }
    const next = all
      .slice(index + 1)
      .find(
        (later) => later.actor.kind === 'owner' || (later.kind === 'commented' && later.data.ask)
      )
    return !next || next.actor.kind === 'owner'
  })
  const askEvent = open
    ? events.findLast((event) => event.kind === 'commented' && event.data.ask === open.ask)
    : undefined
  const shape = askEvent ? botItemQuestionShape(askEvent.data) : null
  const status: BotItemStatus = task.done
    ? 'done'
    : open || task.who === 'waiting'
      ? 'needs_you'
      : task.who === 'agentWorking'
        ? 'working'
        : task.who === 'blocked'
          ? 'waiting'
          : BOT_STATUS[task.status ?? 'todo']
  const first = events[0]?.at ?? now
  const lastAt = events.at(-1)?.at ?? first
  const lastId = events.at(-1)?.id ?? 'e0'
  const others = events.findLast((event) => event.actor.kind !== 'owner')?.id ?? 'e0'
  const snoozedUntil = ctx.snoozed.get(uid) ?? null
  return {
    item: {
      uid,
      number,
      owner: { botId: HOME_TASKS_BOT_ID, name: agentName },
      title: task.title,
      description: task.detail || null,
      doneMeans: null,
      status,
      chat: { id: uid, kind: 'chat', title: rest.chatTitle },
      madeBy: rest.asker ? { botId: `asker:${rest.asker}`, name: rest.asker, chatId: uid } : null,
      question:
        askEvent && shape && open
          ? {
              eventId: askEvent.id,
              text: botItemAskText(open.ask),
              gist: open.ask.context?.split('\n')[0] ?? open.ask.questions[0].prompt,
              decisions: shape.decisions
            }
          : null,
      ...(askEvent ? { waitingAsk: askEvent.id } : {}),
      closeNote: null,
      wait:
        status === 'waiting'
          ? {
              text: task.who === 'blocked' && task.whoLabel ? task.whoLabel : labels.review,
              at: lastAt
            }
          : null,
      links: [],
      version: events.length,
      lastEventId: lastId,
      othersLastEventId: others,
      snoozedUntil: snoozedUntil !== null && snoozedUntil > now ? snoozedUntil : null,
      lastActivityAt: lastAt,
      createdAt: first,
      updatedAt: lastAt,
      closedAt: status === 'done' ? lastAt : null,
      ...(rest.withDue
        ? {
            due: {
              label:
                task.due === 'overdue' || rest.chat.kind === 'meeting'
                  ? task.dueLabel
                  : `${t('taskLoop.detail.due', 'Due')} ${task.dueLabel}`,
              late: task.due === 'overdue' && !task.done
            }
          }
        : {})
    },
    events,
    ask: askEvent && shape && open ? { eventId: askEvent.id, shape, answer: open.answer } : null,
    taskId: rest.taskId,
    chat: rest.chat
  }
}

/** The day-end question: the question, the agent's note under it as its evidence, then the statuses. */
export function homeDayEndAsk(
  t: Translate,
  labels: Record<InaxStatus, string>,
  note: string | null,
  proposed: InaxStatus | null
): BotItemAsk {
  return {
    questions: [
      {
        prompt: [t('home.dayEnd.question', 'How far did this task get today?'), note]
          .filter(Boolean)
          .join('\n\n'),
        options: INAX_STATUSES.map((value) => ({ label: labels[value] })),
        ...(proposed ? { recommended: INAX_STATUSES.indexOf(proposed) } : {})
      }
    ]
  }
}

/**
 * My answer to an ask that is settled, as my own line under it (`answer`), or as the status I moved it to
 * (`to`). It carries the request id of the send this window made, so the item's view knows it arrived.
 */
export function homeAnsweredLine(
  sent: HomeSentComment | undefined,
  words: string,
  at: number,
  to?: InaxStatus
): Draft {
  return {
    kind: 'status',
    actor: ME,
    data: {
      ...(to ? { from: null, to: BOT_STATUS[to] } : { answer: sent?.text ?? words }),
      ...(sent?.requestId ? { requestId: sent.requestId } : {})
    },
    at: sent?.at ?? at
  }
}
