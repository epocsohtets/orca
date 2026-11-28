import type { Translate } from '@/i18n/use-translate'
import type { HomeTask } from './home-board'
import type { HomeDayEndCard } from './home-day-end'

export type HomeSampleAsk = {
  question: string
  choices: NonNullable<HomeTask['choices']>
  context?: string
  /** When it was asked, on the sample day's clock. */
  at: number
}

/** What the sample's agents asked of me, kept after I answer: the history of each task's item. */
export function homeSampleAsks(
  tasks: readonly HomeTask[],
  at: number
): Record<string, HomeSampleAsk> {
  return Object.fromEntries(
    tasks.flatMap((task) =>
      task.question && task.choices && !task.meetingId
        ? [[task.id, { question: task.question, choices: task.choices, at }]]
        : []
    )
  )
}

/**
 * At day end each card is an ask inside its task, so 내 확인 필요 holds them, and the day's records with no task
 * are one row of their own: one number for tile, tab and panel.
 */
export function withDayEndAsks(
  t: Translate,
  tasks: readonly HomeTask[],
  dayEnd: readonly HomeDayEndCard[]
): HomeTask[] {
  const needsMe = t('home.task.requestWho', 'Needs me')
  return [
    ...tasks.map((task) =>
      !task.done && dayEnd.some((card) => card.kind === 'task' && card.id === task.id)
        ? { ...task, who: 'waiting' as const, whoLabel: needsMe }
        : task
    ),
    ...(dayEnd.some((card) => card.kind === 'records')
      ? [
          {
            id: 'day-records',
            title: t('home.day.unconfirmed', 'Records without a task'),
            // shortcut: records belong to no project; the row hides this one (dayEndRecords).
            project: 'campaign' as const,
            due: 'today' as const,
            dueLabel: t('home.task.today', 'Today'),
            done: false,
            who: 'waiting' as const,
            whoLabel: needsMe,
            detail: '',
            dayEndRecords: true as const
          }
        ]
      : [])
  ]
}
