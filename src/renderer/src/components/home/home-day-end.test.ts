import { describe, expect, it } from 'vitest'
import { EMPTY_HOME_BOARD_STATE, type HomeTask } from './home-board'
import {
  planHomeDayEnd,
  saveHomeDayEndTask,
  undoHomeDayEnd,
  type HomeDayEndLine
} from './home-day-end'

const task = (id: string, patch: Partial<HomeTask> = {}): HomeTask => ({
  id,
  title: id,
  project: 'campaign',
  due: 'today',
  dueLabel: '',
  done: false,
  who: null,
  detail: '',
  status: 'inProgress',
  ...patch
})
const line = (id: string, taskId: string, day = 0): HomeDayEndLine => ({
  id,
  day,
  who: 'someone',
  text: '',
  when: '',
  taskId
})
const plan = (saved = EMPTY_HOME_BOARD_STATE.dayEnd, answers = {}) =>
  planHomeDayEnd({
    tasks: [task('moved', { who: 'draft', report: 'agent line' }), task('quiet'), task('old')],
    activity: [line('a', 'moved'), line('b', 'old', -1)],
    records: [{ id: 'pages', text: 'pages', suggestTaskId: 'moved' }],
    recordAnswers: answers,
    viewerId: 'me',
    meetings: [],
    meetingTasks: [],
    saved,
    suggestion: (entry) => entry.report ?? null
  })

describe('day-end cards', () => {
  it('makes a card only for a task that moved today, with what the agent knows', () => {
    const cards = plan()
    expect(cards.map((card) => card.id)).toEqual(['moved', 'records'])
    expect(cards[0]).toMatchObject({ suggestion: 'agent line', proposed: 'review' })
  })

  it('drops a saved task card and the records card once every record is placed', () => {
    const saved = saveHomeDayEndTask(EMPTY_HOME_BOARD_STATE, {
      taskId: 'moved',
      text: 'agent line',
      byAgent: true,
      status: 'review',
      current: 'inProgress',
      at: 1
    })
    expect(plan(saved.dayEnd, { pages: 'notWork' })).toEqual([])
  })

  it('saves nothing for an empty card, and undo restores what a save changed', () => {
    const before = {
      ...EMPTY_HOME_BOARD_STATE,
      inax: { moved: { status: 'inProgress' as const, notes: [] } },
      records: { pages: 'notWork' as const }
    }
    expect(
      saveHomeDayEndTask(before, {
        taskId: 'moved',
        text: ' ',
        byAgent: false,
        status: null,
        current: 'inProgress',
        at: 1
      })
    ).toBe(before)
    const saved = saveHomeDayEndTask(before, {
      taskId: 'moved',
      text: 'my words',
      byAgent: false,
      status: 'review',
      current: 'inProgress',
      at: 2
    })
    expect(saved.inax.moved).toMatchObject({ status: 'review', notes: [{ by: 'me' }] })
    const undone = undoHomeDayEnd({
      ...saved,
      dayEnd: [...saved.dayEnd, { kind: 'records', id: 'records', recordIds: ['pages'] }]
    })
    expect(undone.state.inax).toEqual(before.inax)
    expect(undone.state.records).toEqual({})
    expect(undone.state.dayEnd).toEqual([])
  })
})
