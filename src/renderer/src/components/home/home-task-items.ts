// My 업무 as Orca's bot items: one item per task, its history as the item's events, and what is asked of me
// as the item's ask. Decisions with no task (an invitation, a request to see minutes, records with no task)
// are items of their own. The item panel's own components read these; nothing here draws.
import type { BotItemAsk } from '../../../../shared/bots/bot-item-ask'
import type { BotItemActor } from '../../../../shared/bots/bot-items'
import type { HomeDayEndCard } from './home-day-end'
import { homeLoopDraftAt, homeLoopQuestionAt, INAX_STATUSES } from './home-task-loop'
import { buildHomeLoopScript, homeLoopAnswerText, inaxStatusLabels } from './home-task-loop-script'
import {
  homeRowItemUid,
  HOME_TASKS_BOT_ID,
  BOT_STATUS,
  ME,
  askData,
  taskItemUid,
  type Draft,
  type HomeItemAnswer,
  type HomeItemEntry,
  type HomeItemsInput
} from './home-task-item-model'
import { makeHomeItemEntry } from './home-task-item-entry'
import { meetingRowAsk } from './home-task-item-asks'

export function buildHomeTaskItems(input: HomeItemsInput): HomeItemEntry[] {
  const { t, view, board, agentName, stamp } = input
  const bot: BotItemActor = { kind: 'bot', botId: HOME_TASKS_BOT_ID, chatId: 'agent' }
  const labels = inaxStatusLabels(t)
  const now = Date.now()
  const entries: HomeItemEntry[] = []
  const dayEndCards = input.evening ? view.dayEnd : []
  const ctx = { t, agentName, snoozed: input.snoozed, now }
  /** The day-end ask comes after everything the task holds when it first shows, and stays there: a host never
   *  moves an event, and an item view reads only what comes after what it has. */
  const openDayEndAt = (uid: string, drafts: readonly Draft[]): number => {
    const at = stamp(`dayend:${uid}`, Math.max(now, ...drafts.map((draft) => draft.at + 1)))
    input.askedAt.set(uid, at)
    return at
  }
  const pushEntry = (
    ...args: Parameters<typeof makeHomeItemEntry> extends [unknown, ...infer R] ? R : never
  ): void => {
    entries.push(makeHomeItemEntry(ctx, ...args))
  }

  /** My answer to an ask that is settled: the comment I sent here, else the answer as its words. */
  const answered = (uid: string, key: string, words: string, at: number): Draft => {
    const sent = input.sent.get(`${uid}\u0000${key}`)
    return {
      kind: 'commented',
      actor: ME,
      data: {
        text: sent?.text ?? words,
        ...(sent?.requestId ? { requestId: sent.requestId } : {})
      },
      at: sent?.at ?? at
    }
  }

  view.tasks.forEach((task, index) => {
    if (task.dayEndRecords) {
      return
    }
    const uid = taskItemUid(task.id)
    const drafts: Draft[] = []
    const loop = board.loops[task.id]
    const saved = board.dayEnd.flatMap((entry) =>
      entry.kind === 'task' && entry.id === task.id ? [entry] : []
    )
    const savedNotes = new Set(saved.map((entry) => entry.noteId))
    for (const entry of saved) {
      const savedAt = entry.at ?? now
      const note = (task.notes ?? []).find((candidate) => candidate.id === entry.noteId)
      const status = entry.status ?? task.status ?? 'todo'
      const ask: BotItemAsk = {
        ...(note?.by === 'agentConfirmed' ? { context: note.text } : {}),
        questions: [
          {
            prompt: t('taskLoop.detail.status', 'Status'),
            options: INAX_STATUSES.map((value) => ({ label: labels[value] })),
            recommended: INAX_STATUSES.indexOf(status)
          }
        ]
      }
      const askAt = Math.min(input.askedAt.get(uid) ?? savedAt - 2, savedAt - 2)
      drafts.push({ kind: 'commented', actor: bot, data: askData(ask), at: askAt })
      drafts.push(
        answered(uid, 'dayend', note?.by === 'me' ? note.text : labels[status], savedAt - 1)
      )
    }
    for (const note of task.notes ?? []) {
      const requestId = input.noteRequests.get(note.id)
      // A line saved from the day-end ask is that ask and my answer below, not a second copy.
      if (!savedNotes.has(note.id)) {
        drafts.push({
          kind: 'commented',
          actor: note.by === 'me' ? ME : bot,
          data: { text: note.text, ...(requestId ? { requestId } : {}) },
          at: note.at
        })
      }
      if (note.statusChanged !== false) {
        drafts.push({
          kind: 'status',
          actor: ME,
          data: { from: null, to: BOT_STATUS[note.status] },
          at: note.at + 1
        })
      }
    }
    if (
      task.statusAt !== undefined &&
      !(task.notes ?? []).some((note) => note.at === task.statusAt)
    ) {
      drafts.push({
        kind: 'status',
        actor: ME,
        data: { from: null, to: BOT_STATUS[task.status ?? 'todo'] },
        at: task.statusAt
      })
    }
    let open: { ask: BotItemAsk; at: number; answer: HomeItemAnswer } | null = null
    if (loop) {
      const script = buildHomeLoopScript(t, task, loop)
      const askAt = homeLoopQuestionAt(loop)
      // The agent's plan is its first word on the task, in the chat and here.
      drafts.push({
        kind: 'commented',
        actor: bot,
        data: { text: script.plan },
        at: loop.startedAt + 1
      })
      const ask: BotItemAsk = {
        questions: [
          {
            prompt: script.question,
            options: script.choices.map((choice) => ({ label: choice.label })),
            ...(script.choices.some((choice) => choice.recommended)
              ? { recommended: script.choices.findIndex((choice) => choice.recommended) }
              : {})
          }
        ]
      }
      const answer: HomeItemAnswer = { kind: 'loop', taskId: task.id, choices: script.choices }
      if (loop.answer) {
        drafts.push({ kind: 'commented', actor: bot, data: askData(ask), at: askAt })
        drafts.push(answered(uid, `loop`, homeLoopAnswerText(script, loop), loop.answer.at))
        const draftAt = homeLoopDraftAt(loop)
        if (draftAt !== null && draftAt <= now) {
          drafts.push({
            kind: 'commented',
            actor: bot,
            data: { text: script.draft ?? script.next },
            at: draftAt
          })
        }
      } else if (task.loop === 'question') {
        open = { ask, at: askAt, answer }
      }
      for (const said of loop.said) {
        if (!(task.notes ?? []).some((note) => note.at === said.at)) {
          drafts.push({ kind: 'commented', actor: ME, data: { text: said.text }, at: said.at })
        }
      }
    }
    const sampleAsk = view.sampleAsks[task.id]
    if (sampleAsk) {
      const ask: BotItemAsk = {
        ...(sampleAsk.context ? { context: sampleAsk.context } : {}),
        questions: [
          {
            prompt: sampleAsk.question,
            options: sampleAsk.choices.map((choice) => ({ label: choice.label })),
            ...(sampleAsk.choices.some((choice) => choice.recommended)
              ? { recommended: sampleAsk.choices.findIndex((choice) => choice.recommended) }
              : {})
          }
        ]
      }
      const askAt = stamp(`ask:${uid}`, sampleAsk.at)
      const choice = board.answers[task.id]
      const answer: HomeItemAnswer = { kind: 'board', taskId: task.id, choices: sampleAsk.choices }
      if (choice !== undefined) {
        drafts.push({ kind: 'commented', actor: bot, data: askData(ask), at: askAt })
        const label = sampleAsk.choices.find((entry) => entry.id === choice)?.label ?? choice
        drafts.push(answered(uid, 'board', label, askAt + 60_000))
      } else if (!task.done) {
        open = { ask, at: askAt, answer }
      }
    }
    const card = dayEndCards.find(
      (entry): entry is Extract<HomeDayEndCard, { kind: 'task' }> =>
        entry.kind === 'task' && entry.id === task.id
    )
    if (!open && card) {
      const current = task.status ?? 'todo'
      const pick = card.proposed ?? current
      open = {
        ask: {
          ...(card.suggestion ? { context: card.suggestion } : {}),
          questions: [
            {
              prompt: t('taskLoop.detail.status', 'Status'),
              options: INAX_STATUSES.map((status) => ({ label: labels[status] })),
              recommended: INAX_STATUSES.indexOf(pick)
            }
          ]
        },
        // After what the task already holds: the ask is the day's last word on it.
        at: openDayEndAt(uid, drafts),
        answer: { kind: 'dayEnd', card, labels }
      }
    }
    const meetingAsk = task.meetingId
      ? meetingRowAsk(t, task, board, input, uid, answered, drafts)
      : null
    if (meetingAsk) {
      open = meetingAsk
    }
    pushEntry(
      uid,
      index + 1,
      task,
      drafts,
      open,
      task.meetingId
        ? {
            taskId: null,
            chat: { kind: 'meeting', meetingId: task.meetingId },
            chatTitle: task.meetingTitle ?? task.title,
            withDue: Boolean(task.invitation),
            asker: task.askedBy ?? t('meetings.bot.name', 'Meeting agent')
          }
        : {
            taskId: task.id,
            chat: { kind: 'task', taskId: task.id },
            chatTitle: agentName,
            withDue: true
          }
    )
  })

  const records = view.tasks.find((task) => task.dayEndRecords)
  const recordCards = dayEndCards.flatMap((card) => (card.kind === 'records' ? [card] : []))
  if (records && recordCards.length > 0) {
    const tasks = view.openTasks.slice(0, 7).map((task) => ({ id: task.id, label: task.title }))
    const notWork = t('home.day.notWork', 'Not work')
    const shown = recordCards.slice(0, 5)
    pushEntry(
      homeRowItemUid(records),
      view.tasks.length + 1,
      records,
      [],
      {
        ask: {
          questions: shown.map((card) => {
            const suggested = tasks.findIndex((task) => task.id === card.record.suggestTaskId)
            return {
              prompt: card.record.text,
              options: [...tasks.map((task) => ({ label: task.label })), { label: notWork }],
              ...(suggested !== -1 ? { recommended: suggested } : {})
            }
          })
        },
        at: stamp(`dayend:${homeRowItemUid(records)}`, now),
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
  }
  return entries
}
