import { useMeetings } from './meetings-store'
import type { Meeting } from './meeting-types'

const MINUTE = 60_000

function patchMeeting(id: string, patch: (meeting: Meeting) => Partial<Meeting>): void {
  useMeetings.setState((state) => ({
    meetings: state.meetings.map((m) => (m.id === id ? { ...m, ...patch(m) } : m))
  }))
}

/** Gives someone who was not in the meeting the full minutes; the meeting agent sends them the link. */
export function shareMinutes(meetingId: string, personId: string): void {
  const { viewerId, tick } = useMeetings.getState()
  patchMeeting(meetingId, (m) =>
    m.shares.some((entry) => entry.personId === personId)
      ? {}
      : {
          shares: [
            ...m.shares,
            { personId, byId: viewerId, at: (m.minutesSentAt ?? m.endsAt) + (tick + 1) * MINUTE }
          ],
          requests: m.requests.filter((entry) => entry.personId !== personId)
        }
  )
  useMeetings.setState({ tick: tick + 1 })
}

/** An assignee who was not in the meeting asks its host for the full minutes. */
export function requestMinutes(meetingId: string): void {
  const { viewerId } = useMeetings.getState()
  patchMeeting(meetingId, (m) => ({
    requests: [
      ...m.requests.filter((entry) => entry.personId !== viewerId),
      { personId: viewerId, declined: false }
    ]
  }))
}

export function declineMinutesRequest(meetingId: string, personId: string): void {
  patchMeeting(meetingId, (m) => ({
    requests: m.requests.map((entry) =>
      entry.personId === personId ? { ...entry, declined: true } : entry
    )
  }))
}
