export const DEFAULT_MEETING_MINUTES = 30
const MINUTE = 60_000
/** Longer than this is almost always a wrong end date. */
const MAX_RANGE_MS = 14 * 86_400_000

// "15:30", "3시", "오후 3시 반", "오전 10시 30분", "3pm".
const CLOCK =
  /(오전|오후|am|pm)?\s*(\d{1,2})\s*(?::\s*(\d{2})|시\s*(반|(\d{1,2})\s*분)?)\s*(am|pm)?|(\d{1,2})\s*(am|pm)/i

export type FoundClock = { minutes: number; index: number; length: number }

/** The first time of day written in `text`, as minutes from midnight. */
export function findClock(text: string): FoundClock | null {
  const match = CLOCK.exec(text)
  if (!match) {
    return null
  }
  const meridiem = (match[1] ?? match[6] ?? match[8] ?? '').toLowerCase()
  let hour = Number(match[2] ?? match[7])
  const minute = match[3] ? Number(match[3]) : match[4] === '반' ? 30 : Number(match[5] ?? 0)
  if (hour > 24 || minute > 59) {
    return null
  }
  const afternoon = meridiem === '오후' || meridiem === 'pm'
  const morning = meridiem === '오전' || meridiem === 'am'
  if (afternoon && hour < 12) {
    hour += 12
  } else if (morning && hour === 12) {
    hour = 0
  } else if (!afternoon && !morning && !match[3] && hour >= 1 && hour <= 7) {
    // "3시" said at work means the afternoon; "15:00" is taken as written.
    hour += 12
  }
  return { minutes: (hour % 24) * 60 + minute, index: match.index, length: match[0].length }
}

/** A typed time of day and nothing else; null when it is not one. */
export function parseClock(text: string): number | null {
  const trimmed = text.trim()
  const found = findClock(trimmed)
  return found && found.index === 0 && found.length === trimmed.length ? found.minutes : null
}

export function formatClock(minutes: number): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`
}

export type MeetingRange = { startsAt: number; endsAt: number }

/** Picking a start moves the end with it: the length stays, or becomes 30 minutes when there was none. */
export function followStart(range: MeetingRange, startsAt: number): MeetingRange {
  const length = range.endsAt - range.startsAt
  return {
    startsAt,
    endsAt: startsAt + (length > 0 ? length : DEFAULT_MEETING_MINUTES * MINUTE)
  }
}

export type MeetingRangeProblem = 'endBeforeStart' | 'tooLong'

/** What is wrong with a range, for the message under the row; null when it can be saved. */
export function checkRange(range: MeetingRange): MeetingRangeProblem | null {
  if (range.endsAt <= range.startsAt) {
    return 'endBeforeStart'
  }
  return range.endsAt - range.startsAt > MAX_RANGE_MS ? 'tooLong' : null
}

/** A day start with a time of day on it. */
export const atMinutes = (dayStart: number, minutes: number): number =>
  new Date(dayStart).setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)

export const minutesOf = (timestamp: number): number => {
  const date = new Date(timestamp)
  return date.getHours() * 60 + date.getMinutes()
}

export const dayStartOf = (timestamp: number): number => new Date(timestamp).setHours(0, 0, 0, 0)

/**
 * Enter in a numbered outline: after "2. text" the next line starts "3. "; on an empty "3. " the number goes.
 * Returns null when Enter should do what it always does.
 */
export function continueNumberedList(
  value: string,
  caret: number
): { value: string; caret: number } | null {
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1
  const line = value.slice(lineStart, caret)
  const match = /^(\d+)\.\s(.*)$/.exec(line)
  if (!match) {
    return null
  }
  if (match[2].trim() === '') {
    return { value: value.slice(0, lineStart) + value.slice(caret), caret: lineStart }
  }
  const insert = `\n${Number(match[1]) + 1}. `
  return {
    value: value.slice(0, caret) + insert + value.slice(caret),
    caret: caret + insert.length
  }
}
