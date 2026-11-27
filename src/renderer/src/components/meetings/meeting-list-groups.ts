export type MeetingListGroupId = 'today' | 'upcoming' | 'past'

type Timed = { startsAt: number }

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Today by local calendar day; Upcoming soonest first; Past newest first. Empty groups are left out. */
export function groupMeetingsByDay<T extends Timed>(
  meetings: readonly T[],
  now: number
): { id: MeetingListGroupId; meetings: T[] }[] {
  const today = startOfDay(now)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const ascending = [...meetings].sort((a, b) => a.startsAt - b.startsAt)
  const groups: { id: MeetingListGroupId; meetings: T[] }[] = [
    {
      id: 'today',
      meetings: ascending.filter((m) => m.startsAt >= today && m.startsAt < tomorrow.getTime())
    },
    { id: 'upcoming', meetings: ascending.filter((m) => m.startsAt >= tomorrow.getTime()) },
    { id: 'past', meetings: ascending.filter((m) => m.startsAt < today).toReversed() }
  ]
  return groups.filter((group) => group.meetings.length > 0)
}

/** 75 -> "01:15"; an hour or more -> "1:02:03". */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const pad = (value: number): string => String(value).padStart(2, '0')
  const hours = Math.floor(seconds / 3600)
  const rest = `${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
  return hours > 0 ? `${hours}:${rest}` : rest
}
