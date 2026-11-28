import { describe, expect, it } from 'vitest'
import {
  EMPTY_HOME_BOARD_STATE,
  applyHomeBoardState,
  countHomeBoard,
  homeTaskTab,
  orderHomeAgents,
  planHomeWrapUp,
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
const labels = {
  resumed: 'resumed',
  addedDue: 'today',
  addedDetail: 'mine',
  addedAgent: 'agent',
  doneReport: 'I finished it'
}
const tasks = [
  task('copy', { who: 'waiting', agentId: 'writer', question: 'A or B?' }),
  task('offer', { who: 'waiting', agentId: 'meeting', meetingId: 'weekly' }),
  task('notice', { due: 'overdue', who: 'blocked' })
]

describe('home board', () => {
  it('counts what waits on me and what is late', () => {
    expect(countHomeBoard(tasks)).toEqual({
      open: 3,
      dueToday: 1,
      waiting: 2,
      waitingAgents: 1,
      waitingMeetings: 1,
      late: 1
    })
    expect(homeTaskTab(tasks[2])).toEqual(['today', 'late'])
    expect(homeTaskTab(tasks[1])).toEqual(['today', 'waiting'])
    expect(sortHomeTasks(tasks).map((entry) => entry.id)).toEqual(['copy', 'offer', 'notice'])
  })

  it('hands an answered task back to its agent and finishes what I finished', () => {
    const next = applyHomeBoardState(
      tasks,
      {
        ...EMPTY_HOME_BOARD_STATE,
        answers: { copy: 'a' },
        doneTaskIds: ['notice']
      },
      labels
    )
    expect(next.map((entry) => [entry.id, entry.who, entry.done])).toEqual([
      ['copy', 'agentWorking', false],
      ['offer', 'waiting', false],
      ['notice', 'blocked', true]
    ])
    expect(countHomeBoard(next).waiting).toBe(1)
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
      { ...EMPTY_HOME_BOARD_STATE, answers: { copy: 'a' } },
      labels
    )
    expect(orderHomeAgents(agents, answered, false, agentLabels)[0].state).toBe('working')
  })

  it('reports a day record only under the task I linked it to, and never an unanswered one', () => {
    const board = [task('research', { report: 'two of three done' }), task('review'), task('other')]
    const records = [{ id: 'pages' }, { id: 'app' }, { id: 'chat' }]
    const plan = planHomeWrapUp(board, records, { pages: { taskId: 'review' }, chat: 'notWork' })
    expect(plan.items.map((item) => [item.task.id, item.linkedRecords])).toEqual([
      ['research', 0],
      ['review', 1]
    ])
    expect(plan.unanswered).toEqual([{ id: 'app' }])
    // Linking the unanswered record moves it under its task and empties the list.
    const linked = planHomeWrapUp(board, records, {
      pages: { taskId: 'review' },
      chat: 'notWork',
      app: { taskId: 'research' }
    })
    expect(linked.items.map((item) => [item.task.id, item.linkedRecords])).toEqual([
      ['research', 1],
      ['review', 1]
    ])
    expect(linked.unanswered).toEqual([])
  })
})
