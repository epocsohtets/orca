// The 업무 items no list row shows: 마코's tasks as a colleague reads them, and the day's records with no task.
import type { BotItemActor } from '../../../../shared/bots/bot-items'
import { MAKO, personName } from '@/components/meetings/meeting-people'
import type { HomeTask } from './home-board'
import type { HomeDayEndCard } from './home-day-end'
import { makeHomeItemEntry, type HomeItemEntryContext } from './home-task-item-entry'
import {
  BOT_STATUS,
  HOME_TASKS_BOT_ID,
  homeRecordsItemUid,
  peerTaskItemUid,
  type Draft,
  type HomeItemEntry,
  type HomeItemsInput
} from './home-task-item-model'

/** 마코's tasks as inAX shows them to a colleague, each read-only: its history and its progress notes. */
export function buildPeerTaskItems(
  ctx: HomeItemEntryContext,
  tasks: readonly HomeTask[]
): HomeItemEntry[] {
  const bot: BotItemActor = { kind: 'bot', botId: HOME_TASKS_BOT_ID, chatId: 'agent' }
  return tasks.map((task, index) => {
    const uid = peerTaskItemUid(task.id)
    const mako: BotItemActor = { kind: 'bot', botId: `asker:${personName(MAKO)}`, chatId: uid }
    const drafts: Draft[] = (task.notes ?? []).flatMap((note): Draft[] => [
      {
        kind: 'commented',
        actor: note.by === 'me' ? mako : bot,
        data: { text: note.text },
        at: note.at
      },
      ...(note.statusChanged === false
        ? []
        : [
            {
              kind: 'status' as const,
              actor: mako,
              data: { from: null, to: BOT_STATUS[note.status] },
              at: note.at + 1
            }
          ])
    ])
    const entry = makeHomeItemEntry(ctx, uid, index + 1, task, drafts, null, {
      taskId: task.id,
      chat: { kind: 'task', taskId: task.id },
      chatTitle: ctx.agentName,
      withDue: true,
      asker: personName(MAKO)
    })
    return { ...entry, unlisted: true }
  })
}

/**
 * The day's records with no task: one question per record, opened by 업무 정리 and never listed, since a record
 * is not a 업무. Answered, it leaves; its result is in 내 하루.
 */
export function buildRecordsItem(
  ctx: HomeItemEntryContext,
  input: Pick<HomeItemsInput, 'view' | 'stamp'>,
  dayEndCards: readonly HomeDayEndCard[]
): HomeItemEntry | null {
  const { t, now } = ctx
  const recordCards = dayEndCards.flatMap((card) => (card.kind === 'records' ? [card] : []))
  if (recordCards.length === 0) {
    return null
  }
  const tasks = input.view.openTasks.slice(0, 7).map((task) => ({ id: task.id, label: task.title }))
  const notWork = t('home.day.notWork', 'Not work')
  const shown = recordCards.slice(0, 5)
  const uid = homeRecordsItemUid()
  const question = t('home.day.recordQuestion', 'Which task is this record?')
  const entry = makeHomeItemEntry(
    ctx,
    uid,
    input.view.tasks.length + 1,
    {
      title: t('home.day.unconfirmed', 'Records without a task'),
      detail: '',
      dueLabel: '',
      due: 'today',
      done: false
    },
    [],
    {
      ask: {
        questions: shown.map((card) => {
          const suggested = tasks.findIndex((task) => task.id === card.record.suggestTaskId)
          return {
            // The question, then the record as its evidence.
            prompt: `${question}\n\n${card.record.text}`,
            options: [...tasks.map((task) => ({ label: task.label })), { label: notWork }],
            ...(suggested !== -1 ? { recommended: suggested } : {})
          }
        })
      },
      at: input.stamp(`dayend:${uid}`, now),
      answer: {
        kind: 'records',
        records: shown.map((card) => ({ id: card.record.id })),
        tasks,
        notWork
      }
    },
    {
      taskId: null,
      chat: { kind: 'home' },
      chatTitle: t('home.day.title', 'My day'),
      withDue: false
    }
  )
  return { ...entry, unlisted: true }
}
