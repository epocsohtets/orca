// What a meeting's row of 내 확인 필요 asks: an invitation, a request to see the minutes, or the meeting agent's offer.
import type { Translate } from '@/i18n/use-translate'
import type { BotItemAsk } from '../../../../shared/bots/bot-item-ask'
import type { HomeBoardState, HomeTask } from './home-board'
import {
  HOME_TASKS_BOT_ID,
  askData,
  type Draft,
  type HomeItemAnswer,
  type HomeItemsInput
} from './home-task-item-model'

/** A meeting's row: an invitation or a request to see its minutes, answered here; an offer, as its row asks. */
export function meetingRowAsk(
  t: Translate,
  task: HomeTask,
  board: HomeBoardState,
  input: HomeItemsInput,
  uid: string,
  answered: (uid: string, key: string, words: string, at: number) => Draft,
  drafts: Draft[]
): { ask: BotItemAsk; at: number; answer: HomeItemAnswer } | null {
  const meetingId = task.meetingId
  if (!meetingId || task.done) {
    return null
  }
  const at = input.stamp(`ask:${uid}`, Date.now())
  if (task.invitation) {
    const yes = t('meetings.response.yes', 'Coming')
    return {
      ask: {
        questions: [
          {
            prompt: t('meetings.response.label', 'Will you come to “{{title}}”?', {
              title: task.meetingTitle ?? task.title
            }),
            options: [{ label: yes }, { label: t('meetings.response.no', 'Not coming') }]
          }
        ]
      },
      at,
      answer: { kind: 'invitation', meetingId, yes }
    }
  }
  if (task.id.startsWith('request:')) {
    const personId = task.id.split(':')[2] ?? ''
    const approve = t('meetings.share.approve', 'Approve')
    return {
      ask: {
        questions: [
          {
            prompt: task.title,
            options: [{ label: t('meetings.share.decline', 'Decline') }, { label: approve }]
          }
        ]
      },
      at,
      answer: { kind: 'request', meetingId, personId, approve }
    }
  }
  if (task.question && task.choices) {
    const ask: BotItemAsk = {
      questions: [
        {
          prompt: task.question,
          options: task.choices.map((choice) => ({ label: choice.label }))
        }
      ]
    }
    const choice = board.answers[task.id]
    if (choice !== undefined) {
      drafts.push({
        kind: 'commented',
        actor: { kind: 'bot', botId: HOME_TASKS_BOT_ID, chatId: 'agent' },
        data: askData(ask),
        at
      })
      drafts.push(
        answered(
          uid,
          'board',
          task.choices.find((entry) => entry.id === choice)?.label ?? choice,
          at + 1
        )
      )
      return null
    }
    return { ask, at, answer: { kind: 'board', taskId: task.id, choices: task.choices } }
  }
  return null
}
