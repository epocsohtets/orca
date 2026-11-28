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
    expect(cards.map((card) => card.id)).toEqual(['moved', 'pages'])
    expect(cards[0]).toMatchObject({ suggestion: 'agent line', proposed: 'review' })
  })

  it('asks the host only about follow-ups the meeting gave nobody, and skips a task that only arrived', () => {
    const followUp = (id: string, taskId: string | null) => ({
      id,
      text: id,
      turnId: 't1',
      suggestedOwnerId: taskId ? 'ann' : null,
      due: '2026-12-01',
      taskId,
      declined: false
    })
    const cards = planHomeDayEnd({
      tasks: [task('INAX-1')],
      activity: [line('task:INAX-1', 'INAX-1')],
      records: [],
      recordAnswers: {},
      viewerId: 'me',
      meetings: [
        {
          id: 'm',
          title: 'm',
          hostId: 'me',
          attendeeIds: ['ann'],
          startsAt: 0,
          endsAt: 1,
          place: '',
          project: 'campaign',
          originConversationId: null,
          outline: '',
          materials: [],
          recordingStartedAt: null,
          minutes: { summary: ['', ''], decisions: [], topics: [], transcript: [] },
          minutesSentAt: 10,
          followUps: [followUp('named', 'INAX-1'), followUp('open', null)],
          responses: {},
          shares: [],
          requests: [],
          sample: 'generic'
        }
      ],
      meetingTasks: [
        {
          id: 'INAX-1',
          title: 'named',
          assigneeId: 'ann',
          status: 'todo',
          due: '2026-12-01',
          meetingId: 'm',
          followUpId: 'named',
          route: 'heard',
          createdAt: 11
        }
      ],
      saved: [],
      suggestion: () => null
    })
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      kind: 'meeting',
      meetingId: 'm',
      followUp: { id: 'open', returnedBy: null }
    })
  })

  it('drops a saved task card and the card of a record once it is placed', () => {
    const saved = saveHomeDayEndTask(EMPTY_HOME_BOARD_STATE, {
      taskId: 'moved',
      text: 'agent line',
      byAgent: true,
      status: 'review',
      current: 'inProgress',
      answersProposal: false,
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
        answersProposal: false,
        at: 1
      })
    ).toBe(before)
    const saved = saveHomeDayEndTask(before, {
      taskId: 'moved',
      text: 'my words',
      byAgent: false,
      status: 'review',
      current: 'inProgress',
      answersProposal: false,
      at: 2
    })
    expect(saved.inax.moved).toMatchObject({ status: 'review', notes: [{ by: 'me' }] })
    const both = {
      ...saved,
      dayEnd: [
        ...saved.dayEnd,
        { kind: 'records' as const, id: 'records' as const, recordIds: ['pages'] }
      ]
    }
    // One row's undo takes back that card only.
    const withoutRecords = undoHomeDayEnd(both, 1).state
    expect(withoutRecords.records).toEqual({})
    expect(withoutRecords.inax).toEqual(saved.inax)
    const undone = undoHomeDayEnd(withoutRecords, 0).state
    expect(undone.inax).toEqual(before.inax)
    expect(undone.dayEnd).toEqual([])
  })
})
