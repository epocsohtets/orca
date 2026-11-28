import { addWorkingDays } from './meeting-schedule'
import { DEFAULT_MEETING_MINUTES, atMinutes, dayStartOf, findClock } from './meeting-time-range'

// shortcut: fixed pattern rules stand in for the meeting agent's reading of a conversation; replace with the
// agent itself when one runs. No model is called.

export type MeetingTalk = {
  startsAt: number
  endsAt: number
  /** What the meeting is about, when the line says so. */
  topic: string | null
  /** The line gave no time, so the time is only a first offer. */
  timeGuessed: boolean
}

const MINUTE = 60_000
const WEEKDAYS = '일월화수목금토'
// Things that have "회의" in them and are not a wish to meet.
const NOT_A_MEETING = /회의록|회의실|회의 자료|회의 에이전트/g
const ALREADY_HAPPENED = /(했습니다|했어요|했었|끝났|였습니다|였어요|다녀왔)/
const SETTING_UP =
  /(회의|미팅)(를|을|로|으로)?\s*(한 번\s*)?(잡|하죠|합시다|할까|하면|해요|필요|열)|(모여|모일|모이죠|모입시다|만나서|만날까|만나죠)/
const ASKING_A_TIME = /(어때|어떠|어떨|괜찮|가능|될까|되나요|되세요)/
const DAY_WORD = /(오늘|내일|모레|(다음\s*주\s*)?([일월화수목금토])요일)/
const VAGUE_TIME = /(오전|오후)에/
const TOPIC = /([가-힣A-Za-z0-9][가-힣A-Za-z0-9 ]{1,18}?)\s*(건|관련)(은|는|으로|해서|도)?[\s,]/

function dayFromWord(text: string, now: number): number | null {
  const match = DAY_WORD.exec(text)
  if (!match) {
    return null
  }
  const today = dayStartOf(now)
  const offset = { 오늘: 0, 내일: 1, 모레: 2 }[match[1]]
  if (offset !== undefined) {
    return new Date(today).setDate(new Date(today).getDate() + offset)
  }
  const target = WEEKDAYS.indexOf(match[3])
  const from = new Date(today).getDay()
  // The next such weekday, never today; "다음 주" skips one that is still in this week.
  let ahead = (target - from + 7) % 7 || 7
  if (match[2] && ahead <= (7 - from) % 7) {
    ahead += 7
  }
  return new Date(today).setDate(new Date(today).getDate() + ahead)
}

function lengthMinutes(text: string): number {
  const hours = /(\d+)\s*시간(\s*반)?/.exec(text)
  if (hours) {
    return Number(hours[1]) * 60 + (hours[2] ? 30 : 0)
  }
  const minutes = /(\d+)\s*분/.exec(text)
  return minutes ? Number(minutes[1]) : DEFAULT_MEETING_MINUTES
}

/** What a chat line says about setting up a meeting; null when it is not about that. */
export function detectMeetingTalk(text: string, now: number): MeetingTalk | null {
  const cleaned = text.replace(NOT_A_MEETING, ' ')
  if (ALREADY_HAPPENED.test(cleaned)) {
    return null
  }
  // A length such as "2시간" is not a time of day.
  const withoutLength = cleaned.replace(/\d+\s*시간(\s*반)?/g, ' ')
  const clock = findClock(withoutLength)
  const vague = VAGUE_TIME.exec(cleaned)
  const day = dayFromWord(cleaned, now)
  const hasTime = clock !== null || vague !== null || day !== null
  if (!SETTING_UP.test(cleaned) && !(hasTime && ASKING_A_TIME.test(cleaned))) {
    return null
  }
  const minutes = clock?.minutes ?? (vague ? (vague[1] === '오전' ? 10 * 60 : 14 * 60) : null)
  const rest = clock
    ? withoutLength.slice(0, clock.index) + withoutLength.slice(clock.index + clock.length)
    : cleaned
  const length = /\d+\s*시간/.test(cleaned) ? lengthMinutes(cleaned) : lengthMinutes(rest)
  let startsAt: number
  if (minutes === null) {
    // No time said: the next working day at 10:00 is only a first offer.
    startsAt = atMinutes(day ?? addWorkingDays(now, 1), 10 * 60)
  } else {
    startsAt = atMinutes(day ?? dayStartOf(now), minutes)
    if (day === null && startsAt <= now) {
      startsAt = atMinutes(addWorkingDays(now, 1), minutes)
    }
  }
  const topic = TOPIC.exec(cleaned)?.[1].trim() ?? null
  return { startsAt, endsAt: startsAt + length * MINUTE, topic, timeGuessed: minutes === null }
}
