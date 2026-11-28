import type { Translate } from '@/i18n/use-translate'
import type { HomeAgent, HomeTask } from './home-board'
import type { HomeSampleContext } from './home-board-mock'

/** The sample's agents and bots, each with the end of its conversation. */
export function buildHomeAgents(
  t: Translate,
  tasks: readonly HomeTask[],
  sample: HomeSampleContext,
  /** The meeting agent's row is read from the meetings, not written here. */
  meeting: Pick<HomeAgent, 'doing' | 'state' | 'stage' | 'taskId'>
): HomeAgent[] {
  const title = (id: string): string => tasks.find((task) => task.id === id)?.title ?? ''
  const researchDone = sample.phase === 'evening'
  return [
    {
      id: 'research',
      name: t('home.agent.research', 'Research agent'),
      taskId: 'research',
      doing: title('research'),
      state: researchDone ? 'idle' : 'working',
      stage: researchDone ? 3 : 2,
      last: researchDone ? sample.ago(17 * 60 + 10) : t('home.agent.justNow', 'Just now'),
      lines: [
        researchDone
          ? t(
              'home.agent.researchDoneLine',
              'All three competitors are in the table. It is ready for you to read.'
            )
          : t(
              'home.agent.researchLine',
              'Two competitors are done. I am checking the discount terms of the last one.'
            )
      ]
    },
    {
      id: 'writer',
      name: t('home.agent.writer', 'Writing agent'),
      taskId: 'copy',
      doing: title('copy'),
      state: 'waiting',
      stage: 3,
      last: sample.ago(9 * 60 + 40),
      lines: [
        t(
          'home.agent.writerLine1',
          'I uploaded two headlines. A leads with the meeting, B with speed.'
        ),
        t(
          'home.agent.writerLine2',
          'When you choose, I will match the body text and the button to it.'
        )
      ]
    },
    {
      id: 'meeting',
      name: t('home.agent.meeting', 'Meeting agent'),
      ...meeting,
      last: t('home.agent.justNow', 'Just now'),
      lines: []
    },
    {
      id: 'triage',
      name: t('home.agent.triage', 'Inquiry agent'),
      taskId: 'notice',
      doing: title('notice'),
      state: 'blocked',
      stage: 2,
      last: sample.ago(8 * 60 + 55),
      lines: [
        t('home.agent.triageLine1', 'I need the new delivery dates to revise the notice.'),
        t(
          'home.agent.triageLine2',
          'Lee Mina asked the logistics team again. I continue when they reply.'
        )
      ]
    },
    {
      id: 'calendar',
      name: t('home.agent.calendar', 'Schedule agent'),
      doing: t('home.agent.calendarDoing', 'Nothing assigned'),
      state: 'idle',
      stage: 0,
      last: sample.dayName(-1),
      lines: [t('home.agent.calendarLine', 'I will tell you when next week’s schedule changes.')]
    }
  ]
}
