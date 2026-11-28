import { describe, expect, it } from 'vitest'
import {
  botItemsFor,
  excerptAround,
  followUpCounts,
  followUpState,
  meetingAccess,
  nextInaxTaskId
} from './meeting-rules'
import { addWorkingDays, scenarioDay, workWeek } from './meeting-schedule'
import type { Meeting, MeetingFollowUp, MeetingTask } from './meeting-types'

const followUp = (id: string, owner: string, taskId: string | null = null): MeetingFollowUp => ({
  id,
  text: id,
  turnId: 't2',
  suggestedOwnerId: owner,
  due: '2026-12-01',
  taskId,
  declined: false
})
const task = (
  id: string,
  followUpId: string,
  assigneeId: string,
  patch: Partial<MeetingTask> = {}
): MeetingTask => ({
  id,
  title: id,
  assigneeId,
  status: 'todo',
  due: '2026-12-01',
  meetingId: 'm',
  followUpId,
  route: 'assigned',
  createdAt: 20,
  ...patch
})
const meeting = (followUps: MeetingFollowUp[]): Meeting => ({
  id: 'm',
  title: 'm',
  hostId: 'host',
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
  followUps,
  responses: {},
  shares: [],
  requests: [],
  sample: 'generic'
})

describe('meeting rules', () => {
  it('reads every count from the tasks, so the numbers add up to the total', () => {
    const followUps = [
      followUp('a', 'ann', 'INAX-1'),
      followUp('b', 'ann', 'INAX-2'),
      followUp('c', 'bob')
    ]
    const tasks = [task('INAX-1', 'a', 'ann', { status: 'done' }), task('INAX-2', 'b', 'ann')]
    const counts = followUpCounts(followUps, tasks)
    expect(counts).toEqual({ total: 3, open: 1, todo: 1, inProgress: 0, done: 1 })
    expect(counts.open + counts.todo + counts.inProgress + counts.done).toBe(counts.total)
    expect(followUpState({ ...followUps[2], declined: true }, tasks).kind).toBe('declined')
  })

  it('gives attendees everything and an outside assignee only an excerpt', () => {
    const m = meeting([followUp('a', 'cho', 'INAX-1')])
    const tasks = [task('INAX-1', 'a', 'cho')]
    expect(['host', 'ann', 'cho', 'dan'].map((id) => meetingAccess(m, id, tasks))).toEqual([
      'full',
      'full',
      'excerpt',
      'none'
    ])
  })

  it('sends one message per follow-up: a proposal the host assigned first is not sent twice', () => {
    const m = meeting([followUp('a', 'ann', 'INAX-1'), followUp('b', 'cho', 'INAX-2')])
    const tasks = [task('INAX-1', 'a', 'ann'), task('INAX-2', 'b', 'cho')]
    expect(botItemsFor('ann', [m], tasks).map((item) => item.key)).toEqual(['minutes:m'])
    expect(botItemsFor('cho', [m], tasks).map((item) => item.key)).toEqual(['assigned:INAX-2'])
    expect(botItemsFor('dan', [m], tasks)).toEqual([])
    // A link share gives the full minutes and one message with the link.
    const shared = { ...m, shares: [{ personId: 'dan', byId: 'host', at: 30 }] }
    expect(meetingAccess(shared, 'dan', tasks)).toBe('full')
    expect(botItemsFor('dan', [shared], tasks).map((item) => item.key)).toEqual(['shared:m'])
  })

  it('keeps the source turn with one turn each side', () => {
    const turns = ['t1', 't2', 't3', 't4', 't5'].map((id, at) => ({
      id,
      at,
      speakerId: 's',
      text: id
    }))
    expect(excerptAround(turns, ['t4']).map((turn) => turn.id)).toEqual(['t3', 't4', 't5'])
    expect(excerptAround(turns, ['t1']).map((turn) => turn.id)).toEqual(['t1', 't2'])
  })

  it('keeps the sample on working days', () => {
    const saturday = new Date(2026, 10, 28, 3, 0).getTime()
    const monday = new Date(2026, 10, 30).getTime()
    // A weekend shows the Friday before it, as Home does.
    expect(scenarioDay(saturday)).toBe(new Date(2026, 10, 27).getTime())
    expect(new Date(addWorkingDays(monday, -1)).getDay()).toBe(5)
    expect(new Date(addWorkingDays(monday, 5)).getDate()).toBe(7)
    expect(workWeek(monday, 1).map((day) => new Date(day).getDate())).toEqual([7, 8, 9, 10, 11])
    expect(nextInaxTaskId(['INAX-131', 'INAX-9'])).toBe('INAX-132')
  })
})
