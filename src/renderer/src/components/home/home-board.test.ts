import { describe, expect, it } from 'vitest'
import {
  EMPTY_HOME_BOARD_STATE,
  applyHomeBoardState,
  countHomeBoard,
  homeTaskTab,
  orderHomeAgents,
  sortHomeTasks,
  type HomeAgent,
  type HomeTask
} from './home-board'

const task = (id: string, patch: Partial<HomeTask> = {}): HomeTask => ({
  id,
  title: id,
  project: 'campaign',
  due: 'today',
  dueLabel: '',
  done: false,
  who: null,
  detail: '',
  ...patch
})
const labels = { resumed: 'resumed', addedDue: 'today', addedDetail: 'mine' }
const tasks = [
  task('copy', { who: 'waiting', agentId: 'writer', question: 'A or B?' }),
  task('offer', { who: 'waiting', agentId: 'meeting', meetingId: 'weekly' }),
  task('notice', { due: 'overdue', who: 'blocked' })
]
const followUps = [task('follow-1', { due: 'tomorrow' }), task('follow-2', { due: 'week' })]

describe('home board', () => {
  it('counts what waits on me and what is late', () => {
    expect(countHomeBoard(tasks)).toEqual({
      open: 2,
      dueToday: 1,
      waiting: 2,
      waitingAgents: 1,
      waitingMeetings: 1,
      late: 1
    })
    expect(homeTaskTab(tasks[2])).toEqual(['today', 'late'])
    expect(homeTaskTab(tasks[1])).toEqual(['waiting'])
    expect(sortHomeTasks(tasks).map((entry) => entry.id)).toEqual(['copy', 'offer', 'notice'])
  })

  it('hands an answered task back to its agent and turns accepted follow-ups into tasks', () => {
    const next = applyHomeBoardState(
      tasks,
      followUps,
      {
        ...EMPTY_HOME_BOARD_STATE,
        answers: { copy: 'a', offer: 'accept' },
        doneTaskIds: ['notice']
      },
      labels
    )
    expect(next.map((entry) => [entry.id, entry.who, entry.done])).toEqual([
      ['copy', 'agentWorking', false],
      ['follow-1', null, false],
      ['follow-2', null, false],
      ['notice', 'blocked', true]
    ])
    expect(countHomeBoard(next).waiting).toBe(0)
  })

  it('lists agents that wait on me first and clears the wait once I answered', () => {
    const agent = (id: string, state: HomeAgent['state']): HomeAgent => ({
      id,
      name: id,
      doing: '',
      state,
      stage: 1,
      last: '',
      lines: []
    })
    const agents = [agent('research', 'working'), agent('writer', 'waiting'), agent('rest', 'idle')]
    const agentLabels = { resumedLast: 'now', recording: 'recording' }
    expect(orderHomeAgents(agents, tasks, false, agentLabels).map((entry) => entry.id)).toEqual([
      'writer',
      'research',
      'rest'
    ])
    const answered = applyHomeBoardState(
      tasks,
      followUps,
      { ...EMPTY_HOME_BOARD_STATE, answers: { copy: 'a' } },
      labels
    )
    expect(orderHomeAgents(agents, answered, false, agentLabels)[0].state).toBe('working')
  })
})
