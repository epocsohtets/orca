import { describe, expect, it } from 'vitest'
import type { Translate } from '@/i18n/use-translate'
import { awaitsAnswer } from '@/components/meetings/meeting-rules'
import type { Meeting } from '@/components/meetings/meeting-types'
import { buildHomeDay } from './home-board-day-mock'

const t: Translate = (_key, fallback) => fallback

describe('buildHomeDay', () => {
  it('shows a stretch once it has begun, cut at now, and its record as a dashed block', () => {
    const { blocks } = buildHomeDay(t, 'day', 'Figma', 13 * 60 + 40)
    const last = blocks.at(-1)
    expect(last).toMatchObject({ taskId: 'review', from: 13 * 60 + 35, to: 13 * 60 + 40 })
    expect(
      blocks.filter((block) => block.kind === 'record').map((block) => block.recordId)
    ).toEqual(['competitor-pages', 'app-block'])
    expect(blocks.every((block) => block.from < 13 * 60 + 40)).toBe(true)
  })

  it('has no app blocks without a registered app', () => {
    const { blocks } = buildHomeDay(t, 'evening', undefined, 18 * 60)
    expect(blocks.every((block) => block.label === 'Browser')).toBe(true)
  })
})

describe('awaitsAnswer', () => {
  const meeting: Meeting = {
    id: 'm',
    title: 'Weekly',
    hostId: 'host',
    attendeeIds: ['me'],
    startsAt: 0,
    endsAt: 0,
    place: '',
    originConversationId: null,
    outline: '',
    materials: [],
    project: 'campaign',
    recordingStartedAt: null,
    minutes: null,
    minutesSentAt: null,
    followUps: [],
    responses: {},
    shares: [],
    requests: [],
    sample: 'generic'
  }
  it('waits on an invited person until they answer or the meeting starts', () => {
    expect(awaitsAnswer(meeting, 'me')).toBe(true)
    expect(awaitsAnswer(meeting, 'host')).toBe(false)
    expect(awaitsAnswer({ ...meeting, responses: { me: 'no' } }, 'me')).toBe(false)
    expect(awaitsAnswer({ ...meeting, recordingStartedAt: 1 }, 'me')).toBe(false)
  })
})
