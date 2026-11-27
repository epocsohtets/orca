import { describe, expect, it } from 'vitest'
import { isOpenFollowUp, nextInaxTaskId, type MeetingFollowUp } from './meeting-follow-ups'
import { formatElapsed, groupMeetingsByDay } from './meeting-list-groups'

const followUp = (patch: Partial<MeetingFollowUp>): MeetingFollowUp => ({
  id: 'f',
  title: 't',
  owner: 'o',
  due: '',
  state: 'suggested',
  ...patch
})

describe('meetings', () => {
  it('groups by local day and orders each group toward now', () => {
    const now = new Date(2026, 4, 20, 12, 0).getTime()
    const at = (day: number, hour: number): { startsAt: number } => ({
      startsAt: new Date(2026, 4, day, hour, 0).getTime()
    })
    const groups = groupMeetingsByDay(
      [at(22, 9), at(18, 9), at(20, 23), at(21, 9), at(19, 9), at(20, 0)],
      now
    )
    expect(
      groups.map((g) => [g.id, g.meetings.map((m) => new Date(m.startsAt).getDate())])
    ).toEqual([
      ['today', [20, 20]],
      ['upcoming', [21, 22]],
      ['past', [19, 18]]
    ])
    expect(groupMeetingsByDay([at(20, 9)], now).map((g) => g.id)).toEqual(['today'])
  })

  it('counts a follow-up as open until it is dismissed or its task is done', () => {
    const status = (id: string): 'done' | 'open' | undefined =>
      id === 'INAX-1' ? 'done' : id === 'INAX-2' ? 'open' : undefined
    expect(isOpenFollowUp(followUp({}), status)).toBe(true)
    expect(isOpenFollowUp(followUp({ state: 'dismissed' }), status)).toBe(false)
    expect(isOpenFollowUp(followUp({ state: 'created', taskId: 'INAX-1' }), status)).toBe(false)
    expect(isOpenFollowUp(followUp({ state: 'created', taskId: 'INAX-2' }), status)).toBe(true)
    // A task created here is not in the tracker mock yet.
    expect(isOpenFollowUp(followUp({ state: 'created', taskId: 'INAX-9' }), status)).toBe(true)
  })

  it('allocates the next task id and formats elapsed time', () => {
    expect(nextInaxTaskId(['INAX-128', 'INAX-9', 'OTHER-500'])).toBe('INAX-129')
    expect([formatElapsed(0), formatElapsed(75), formatElapsed(3723)]).toEqual([
      '00:00',
      '01:15',
      '1:02:03'
    ])
  })
})
