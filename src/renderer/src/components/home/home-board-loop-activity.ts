import type { Translate } from '@/i18n/use-translate'
import type { HomeBoardState, HomeTask } from './home-board'
import type { HomeActivity } from './home-board-activity-mock'
import { buildHomeLoopScript, homeLoopAnswerText } from './home-task-loop-script'

/** What happened on the tasks I started with an agent today, newest first: its result, my answer, my start. */
export function buildHomeLoopActivity(
  t: Translate,
  args: {
    board: Pick<HomeBoardState, 'loops' | 'inax'>
    tasks: readonly HomeTask[]
    minutes: number
    me: string
    agent: string
  }
): HomeActivity[] {
  return Object.entries(args.board.loops).flatMap(([taskId, loop]): HomeActivity[] => {
    const task = args.tasks.find((entry) => entry.id === taskId)
    if (!task) {
      return []
    }
    const script = buildHomeLoopScript(t, task, loop)
    const line = (id: string, who: string, text: string, byAgent: boolean): HomeActivity => ({
      id: `loop-${id}-${taskId}`,
      day: 0,
      at: args.minutes,
      who,
      text,
      byAgent,
      taskId
    })
    return [
      ...(task.loop === 'result' || task.loop === 'confirmed'
        ? [
            {
              ...line(
                'result',
                args.agent,
                t('taskLoop.activity.result', '· attached the result to “{{title}}”', {
                  title: task.title
                }),
                true
              ),
              // Sent for review is work done, not work finished: only Done counts in the tile.
              finished: args.board.inax[taskId]?.status === 'done',
              confirmed: task.loop === 'confirmed'
            }
          ]
        : []),
      ...(loop.answer
        ? [
            line(
              'answer',
              args.me,
              t('home.activity.answered', 'answered: {{choice}}', {
                choice: homeLoopAnswerText(script, loop)
              }),
              false
            )
          ]
        : []),
      line(
        'start',
        args.me,
        t('taskLoop.activity.started', '· started the task “{{title}}” with an agent', {
          title: task.title
        }),
        false
      )
    ]
  })
}
