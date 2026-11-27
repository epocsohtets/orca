import type { Translate } from '@/i18n/use-translate'
import type { HomeBoardState, HomeTask } from './home-board'
import type { HomeDayRecord } from './home-board-day-mock'
import type { HomeWrapUpItem } from './HomeWrapUpDialog'

/**
 * What Wrap up today offers to report: one update per task that moved, checked, then each day record I have not
 * ruled out. A record I linked is checked; one I never answered is unchecked.
 */
export function buildHomeWrapUpItems(
  t: Translate,
  tasks: readonly HomeTask[],
  records: readonly HomeDayRecord[],
  board: HomeBoardState
): HomeWrapUpItem[] {
  return [
    ...tasks
      .filter((task) => !task.done && !task.meetingId)
      .flatMap((task) =>
        task.report
          ? [
              {
                id: task.id,
                title: task.title,
                text:
                  task.id === 'copy' && board.answers.copy
                    ? t(
                        'home.report.copyChosen',
                        'I chose the headline. The body text and the button are being matched to it.'
                      )
                    : task.report,
                included: true
              }
            ]
          : []
      ),
    ...records
      .filter((record) => board.records[record.id] !== 'notWork')
      .map((record) => {
        const answer = board.records[record.id]
        const linked = answer && answer !== 'notWork' ? answer.taskId : null
        return {
          id: record.id,
          title: tasks.find((task) => task.id === (linked ?? record.suggestTaskId))?.title ?? '',
          text: record.text,
          included: linked !== null,
          note: linked
            ? undefined
            : t(
                'home.wrapUp.unconfirmedNote',
                'Unconfirmed record: not reported unless you check it. The task above is the app’s guess.'
              )
        }
      })
  ]
}
