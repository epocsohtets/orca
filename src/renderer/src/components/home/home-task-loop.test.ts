import { describe, expect, it } from 'vitest'
import {
  EMPTY_HOME_BOARD_STATE,
  applyHomeTaskLoops,
  decideHomeProposal,
  type HomeBoardState,
  type HomeTask
} from './home-board'
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
const ANSWERED = START + HOME_LOOP_FIRST_WORK_MS + 5_000
const PROPOSED = ANSWERED + HOME_LOOP_SECOND_WORK_MS
const LABELS = {
  working: () => 'working',
  question: 'question',
  proposal: 'proposal',
  confirmed: () => 'confirmed',
  declined: 'declined'
}
const script = () => ({ question: 'Which?', choices: [], note: 'Drafted the message.' })
const board = (at: number, state: HomeBoardState = STARTED): HomeTask =>
  applyHomeTaskLoops([TASK], state, at, script, LABELS)[0]
const STARTED: HomeBoardState = {
  ...EMPTY_HOME_BOARD_STATE,
  loops: {
    report: { startedAt: START, said: [], answer: { choiceId: 'a', at: ANSWERED } }
  }
}

describe('an agent proposal for inAX', () => {
  it('leaves the task as it was until I confirm, and when I say not yet', () => {
    const waiting = board(PROPOSED)
    expect(waiting.proposal).toEqual({ status: 'review', note: 'Drafted the message.' })
    expect(waiting.status).toBe('todo')
    expect(waiting.notes).toEqual([])

    const declined = decideHomeProposal(STARTED, 'report', 'final', { kind: 'declined' }, PROPOSED)
    expect(declined.inax).toEqual({})
    expect(board(PROPOSED + 1, { ...STARTED, ...declined }).status).toBe('todo')
  })

  it('applies what I confirmed, as I corrected it, and records who wrote and who confirmed', () => {
    const confirmed = decideHomeProposal(
      STARTED,
      'report',
      'final',
      { kind: 'confirmed', proposal: { status: 'done', note: ' Shared with Jiwoo. ' } },
      PROPOSED + 10
    )
    const task = board(PROPOSED + 11, { ...STARTED, ...confirmed })
    expect(task.status).toBe('done')
    expect(task.done).toBe(true)
    expect(task.notes).toEqual([
      {
        id: `note-${PROPOSED + 10}`,
        at: PROPOSED + 10,
        text: 'Shared with Jiwoo.',
        status: 'done',
        by: 'agentConfirmed'
      }
    ])
  })
})
