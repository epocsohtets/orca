import { describe, expect, it } from 'vitest'
import { detectMeetingTalk } from './meeting-talk-detection'
import {
  checkRange,
  continueNumberedList,
  followStart,
  formatClock,
  parseClock
} from './meeting-time-range'
import { whisperFor, type ChatLine } from './meeting-whisper'

// Thursday 26 November 2026, 10:00 local.
const NOW = new Date(2026, 10, 26, 10, 0).getTime()
const at = (day: number, hour: number, minute = 0): number =>
  new Date(2026, 10, day, hour, minute).getTime()
const span = (text: string): [number, number] | null => {
  const talk = detectMeetingTalk(text, NOW)
  return talk ? [talk.startsAt, talk.endsAt] : null
}

describe('meeting talk pattern rules', () => {
  it('reads the day, the time and the length from a line about meeting', () => {
    expect(span('내일 3시에 30분만 모일까요?')).toEqual([at(27, 15), at(27, 15, 30)])
    expect(span('내일 오후 2시에 30분만 모여서 정하면 어떨까요?')).toEqual([
      at(27, 14),
      at(27, 14, 30)
    ])
    expect(span('금요일 2시 어때요?')).toEqual([at(27, 14), at(27, 14, 30)])
    expect(span('다음 주 화요일 오전 10시 30분에 1시간 회의 합시다')).toEqual([
      at(31, 10, 30),
      at(31, 11, 30)
    ])
    expect(span('오늘 16:00에 미팅 하죠')).toEqual([at(26, 16), at(26, 16, 30)])
  })

  it('moves a time that has passed today to the next working day', () => {
    expect(span('9시에 회의 하죠')).toEqual([at(27, 9), at(27, 9, 30)])
    // Friday's next working day is Monday.
    const friday = new Date(2026, 10, 27, 17, 0).getTime()
    expect(detectMeetingTalk('3시에 모일까요?', friday)?.startsAt).toBe(at(30, 15))
  })

  it('offers a first time when the line gives none, and says it guessed', () => {
    const talk = detectMeetingTalk('이건 회의로 잡읍시다', NOW)
    expect(talk?.timeGuessed).toBe(true)
    expect(talk?.startsAt).toBe(at(27, 10))
    expect(detectMeetingTalk('내일 오후에 30분만 모여서 정하죠', NOW)).toMatchObject({
      startsAt: at(27, 14),
      endsAt: at(27, 14, 30),
      timeGuessed: false
    })
  })

  it('reads the topic when the line names one', () => {
    expect(detectMeetingTalk('뉴스레터 주제 건은 금요일 2시에 회의로 잡읍시다.', NOW)?.topic).toBe(
      '뉴스레터 주제'
    )
    expect(detectMeetingTalk('금요일 2시 어때요?', NOW)?.topic).toBeNull()
    expect(
      detectMeetingTalk('그 건은 다음 주 목요일 오전 10시에 회의 합시다', NOW)?.topic
    ).toBeNull()
  })

  it('stays quiet for lines that are not about setting up a meeting', () => {
    for (const line of [
      '회의록 잘 봤습니다.',
      '어제 회의 했습니다. 결과는 공유 폴더에 있어요.',
      '오늘 오후 3시에 택배 마감이 한 시간 당겨집니다.',
      '회의실 예약은 제가 해 둘게요.',
      '배너 크기는 지난번과 같게 가면 될까요?'
    ]) {
      expect(detectMeetingTalk(line, NOW)).toBeNull()
    }
  })
})

describe('meeting whisper', () => {
  const lines: ChatLine[] = [
    { id: '1', authorId: 'jiho', text: '결과를 공유 폴더에 올렸습니다.' },
    { id: '2', authorId: 'jiho', text: '내일 2시에 30분만 모일까요?', whisperFor: 'mako' }
  ]
  const ask = (viewerId: string, patch = {}): string | null =>
    whisperFor({ lines, viewerId, dismissed: false, handledMessageIds: [], now: NOW, ...patch })
      ?.messageId ?? null

  it('asks one person and nobody else in the same chat', () => {
    expect(ask('mako')).toBe('2')
    expect(ask('jiho')).toBeNull()
    expect(ask('mina')).toBeNull()
  })

  it('asks the writer of a typed line, and only the writer', () => {
    const typed = [...lines, { id: 'sent-1', authorId: 'mina', text: '금요일 4시 어때요?' }]
    const who = (viewerId: string): string | null =>
      whisperFor({ lines: typed, viewerId, dismissed: false, handledMessageIds: [], now: NOW })
        ?.messageId ?? null
    expect(who('mina')).toBe('sent-1')
    expect(who('mako')).toBe('2')
    expect(who('jiho')).toBeNull()
  })

  it('does not ask again after "no thanks", or about a line that became a meeting', () => {
    expect(ask('mako', { dismissed: true })).toBeNull()
    expect(ask('mako', { handledMessageIds: ['2'] })).toBeNull()
  })
})

describe('meeting date and time range', () => {
  it('reads a typed time and refuses what is not one', () => {
    expect(parseClock('15:30')).toBe(15 * 60 + 30)
    expect(parseClock('오후 3시 반')).toBe(15 * 60 + 30)
    expect(parseClock('3시')).toBe(15 * 60)
    expect(parseClock('오전 9시 5분')).toBe(9 * 60 + 5)
    expect(parseClock('9:00')).toBe(9 * 60)
    expect(parseClock('3pm')).toBe(15 * 60)
    expect(parseClock('25:00')).toBeNull()
    expect(parseClock('내일')).toBeNull()
    expect(parseClock('15:30쯤')).toBeNull()
    expect(formatClock(9 * 60 + 5)).toBe('09:05')
  })

  it('moves the end with the start and keeps the length', () => {
    const half = { startsAt: at(27, 14), endsAt: at(27, 14, 30) }
    expect(followStart(half, at(27, 16))).toEqual({ startsAt: at(27, 16), endsAt: at(27, 16, 30) })
    const twoDays = { startsAt: at(27, 9), endsAt: at(28, 18) }
    expect(followStart(twoDays, at(30, 9))).toEqual({ startsAt: at(30, 9), endsAt: at(31, 18) })
    // A broken range gets the default length back.
    expect(followStart({ startsAt: at(27, 14), endsAt: at(27, 13) }, at(27, 15)).endsAt).toBe(
      at(27, 15, 30)
    )
  })

  it('names what is wrong with a range', () => {
    expect(checkRange({ startsAt: at(27, 14), endsAt: at(27, 14, 30) })).toBeNull()
    expect(checkRange({ startsAt: at(27, 9), endsAt: at(28, 18) })).toBeNull()
    expect(checkRange({ startsAt: at(27, 14), endsAt: at(27, 14) })).toBe('endBeforeStart')
    expect(checkRange({ startsAt: at(27, 14), endsAt: at(26, 15) })).toBe('endBeforeStart')
    expect(checkRange({ startsAt: at(1, 9), endsAt: at(27, 9) })).toBe('tooLong')
  })

  it('continues a numbered outline on Enter', () => {
    expect(continueNumberedList('1. 기간', 5)).toEqual({ value: '1. 기간\n2. ', caret: 9 })
    expect(continueNumberedList('1. 기간\n2. ', 9)).toEqual({ value: '1. 기간\n', caret: 6 })
    expect(continueNumberedList('메모', 2)).toBeNull()
  })
})
