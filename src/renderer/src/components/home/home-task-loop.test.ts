import { describe, expect, it } from 'vitest'
import { EMPTY_HOME_BOARD_STATE, type HomeBoardState, type HomeTask } from './home-board'
import { applyHomeTaskLoops } from './home-board-loops'
import { saveHomeDayEndTask, undoHomeDayEnd } from './home-day-end'
import { HOME_LOOP_FIRST_WORK_MS, HOME_LOOP_SECOND_WORK_MS } from './home-task-loop'

const TASK: HomeTask = {
  id: 'report',
  title: 'Share the report',
  project: 'campaign',
  due: 'today',
  dueLabel: 'Today',
  done: false,
  who: null,
  detail: ''
}
const START = 1_000_000
const ASKED = START + HOME_LOOP_FIRST_WORK_MS
const ANSWERED = ASKED + 5_000
const RESULT = ANSWERED + HOME_LOOP_SECOND_WORK_MS
const LABELS = {
  working: () => 'working',
  question: 'question',
  result: 'result',
  confirmed: () => 'confirmed'
}
const script = () => ({
  question: 'Which?',
  choices: [],
  draft: 'The report.',
  output: 'Report',
  note: 'Wrote it.'
})
// Starting is my own press: the status is "in progress" on inAX from that moment.
const STARTED: HomeBoardState = {
  ...EMPTY_HOME_BOARD_STATE,
  loops: { report: { startedAt: START, said: [] } },
  inax: { report: { status: 'inProgress', statusAt: START, notes: [] } }
}
const ANSWERED_STATE: HomeBoardState = {
  ...STARTED,
  loops: { report: { startedAt: START, said: [], answer: { choiceId: 'a', at: ANSWERED } } }
}
const board = (at: number, state: HomeBoardState): HomeTask =>
  applyHomeTaskLoops([TASK], state, at, script, LABELS)[0]

describe('a task\u2019s loop with its agent', () => {
  it('waits on me only for the information question, never for a permission', () => {
    const waits = [
      board(START + 1, STARTED),
      board(ASKED, STARTED),
      board(ANSWERED + 1, ANSWERED_STATE),
      board(RESULT, ANSWERED_STATE),
      board(RESULT + 3_600_000, ANSWERED_STATE)
    ].map((task) => task.who === 'waiting')
    expect(waits).toEqual([false, true, false, false, false])
    expect(board(ASKED, STARTED).question).toBe('Which?')
  })

  it('keeps the agent\u2019s closing proposal off inAX until its day-end card is saved, and undo takes it back', () => {
    const result = board(RESULT, ANSWERED_STATE)
    expect(result.status).toBe('inProgress')
    expect(result.notes).toEqual([])
    expect(result.proposal).toEqual({ status: 'review', note: 'Wrote it.' })

    const saved = saveHomeDayEndTask(
      { ...ANSWERED_STATE },
      {
        taskId: 'report',
        text: 'Wrote it.',
        byAgent: true,
        status: 'review',
        current: 'inProgress',
        answersProposal: true,
        at: RESULT + 10
      }
    )
    const after = board(RESULT + 11, { ...ANSWERED_STATE, ...saved })
    expect(after.status).toBe('review')
    expect(after.notes?.map((note) => [note.text, note.by])).toEqual([
      ['Wrote it.', 'agentConfirmed']
    ])
    expect(after.loop).toBe('confirmed')

    const undone = undoHomeDayEnd(saved, 0).state
    const back = board(RESULT + 12, { ...ANSWERED_STATE, ...undone })
    expect(back.status).toBe('inProgress')
    expect(back.notes).toEqual([])
    expect(back.loop).toBe('result')
  })
})
