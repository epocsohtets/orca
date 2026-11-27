import type { Translate } from '@/i18n/use-translate'
import type { HomeBoardState } from './home-board'
import { buildHomeTasks } from './home-board-mock'
import type { HomeActivity } from './home-board-day-mock'

/** What I did on the board, as activity lines stamped with the current time. */
export function buildHomeMyActivity(
  t: Translate,
  board: HomeBoardState,
  minutes: number
): HomeActivity[] {
  const recording = board.meetingStartedAt !== null
  const me = t('home.activity.me', 'I')
  return [
    ...Object.entries(board.answers).map(([taskId, choiceId]) => {
      const task = buildHomeTasks(t).find((entry) => entry.id === taskId)
      const choice = task?.choices?.find((entry) => entry.id === choiceId)
      return {
        id: `answer-${taskId}`,
        at: minutes,
        who: me,
        text: t('home.activity.answered', 'answered: {{choice}}', { choice: choice?.label ?? '' }),
        byAgent: false,
        taskId: task?.meetingId ? undefined : taskId
      }
    }),
    ...(recording
      ? [
          {
            id: 'meeting-started',
            at: minutes,
            who: me,
            text: t(
              'home.activity.meetingStarted',
              'started a meeting; the meeting bot is recording'
            ),
            byAgent: false,
            agentId: 'meeting'
          }
        ]
      : []),
    ...(board.wrapUp
      ? [
          {
            id: 'wrapped-up',
            at: minutes,
            who: me,
            text: t('home.activity.wrappedUp', 'confirmed {{count}} updates in Wrap up today', {
              count: board.wrapUp.count
            }),
            byAgent: false
          }
        ]
      : [])
  ]
}
