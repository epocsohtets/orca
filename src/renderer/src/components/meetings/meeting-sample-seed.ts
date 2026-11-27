import { DAEUN, JIHO, MINA, SEOYEON } from './meeting-people'
import { addWorkingDays, atTime, dateKey } from './meeting-schedule'
import type {
  Meeting,
  MeetingAskAnswer,
  MeetingFollowUp,
  MeetingMinutes,
  MeetingTask
} from './meeting-types'
import { NEWSLETTER_ASKS, NEWSLETTER_MINUTES } from './meeting-sample-newsletter'
import {
  PROMO_ASK_ANSWERS,
  PROMO_FOLLOW_UPS,
  PROMO_MINUTES,
  PROMO_QUESTIONS
} from './meeting-sample-promo'

const meeting = (
  patch: Partial<Meeting> & Pick<Meeting, 'id' | 'title' | 'hostId' | 'startsAt' | 'endsAt'>
): Meeting => ({
  attendeeIds: [],
  place: '',
  originConversationId: null,
  outline: '',
  materials: [],
  recordingStartedAt: null,
  minutes: null,
  minutesSentAt: null,
  followUps: [],
  sample: 'generic',
  ...patch
})

const GENERIC_ASKS: MeetingAskAnswer[] = [
  {
    keywords: ['결정', '정리', '공유'],
    answer: '논의한 내용을 한 장으로 정리해 공유하기로 했습니다.',
    turnId: 't3'
  }
]

/** The prepared minutes a simulated recording produces for a meeting that is not the promotion one. */
function genericMinutes(hostId: string, otherId: string): MeetingMinutes {
  return {
    summary: [
      '오늘 다룬 안건의 범위를 정했습니다.',
      '논의한 내용은 한 장으로 정리해 공유하고, 다음 일정은 따로 잡습니다.'
    ],
    decisions: [{ text: '논의한 내용을 한 장으로 정리해 공유합니다.', turnId: 't3' }],
    topics: [
      {
        title: '안건',
        points: [
          { text: '이번에는 범위를 좁혀 급한 것부터 다룹니다.', turnId: 't2' },
          { text: '다음 일정은 정리한 문서를 보고 잡습니다.', turnId: 't5' }
        ]
      }
    ],
    transcript: [
      {
        id: 't1',
        at: 6,
        speakerId: hostId,
        text: '시간이 짧으니 오늘은 급한 것부터 정하겠습니다.'
      },
      {
        id: 't2',
        at: 70,
        speakerId: otherId,
        text: '범위를 좁히면 이번 주 안에 끝낼 수 있습니다.'
      },
      {
        id: 't3',
        at: 141,
        speakerId: hostId,
        text: '그럼 오늘 논의한 내용은 제가 한 장으로 정리해서 공유하겠습니다.'
      },
      {
        id: 't4',
        at: 203,
        speakerId: otherId,
        text: '저는 필요한 자료를 모아서 내일까지 드리겠습니다.'
      },
      {
        id: 't5',
        at: 268,
        speakerId: hostId,
        text: '좋습니다. 다음 일정은 정리한 문서를 보고 잡죠.'
      }
    ]
  }
}

/** What the simulated recording turns into when it stops. */
export function sampleResult(
  target: Pick<Meeting, 'id' | 'sample' | 'hostId' | 'attendeeIds' | 'startsAt'>
): { minutes: MeetingMinutes; followUps: MeetingFollowUp[] } {
  const followUp = (
    index: number,
    [text, turnId, suggestedOwnerId, days]: [string, string, string, number]
  ): MeetingFollowUp => ({
    id: `${target.id}-f${index + 1}`,
    text,
    turnId,
    suggestedOwnerId,
    due: dateKey(addWorkingDays(target.startsAt, days)),
    taskId: null,
    declined: false
  })
  if (target.sample === 'promo') {
    return { minutes: PROMO_MINUTES, followUps: PROMO_FOLLOW_UPS.map((row, i) => followUp(i, row)) }
  }
  const otherId = target.attendeeIds[0] ?? target.hostId
  const rows: [string, string, string, number][] = [
    ['논의한 내용을 한 장으로 정리해 공유하기', 't3', target.hostId, 1],
    ['필요한 자료 모아서 전달하기', 't4', otherId, 1]
  ]
  return {
    minutes: genericMinutes(target.hostId, otherId),
    followUps: rows.map((row, i) => followUp(i, row))
  }
}

export function askAnswersFor(target: Pick<Meeting, 'id' | 'sample'>): MeetingAskAnswer[] {
  return target.sample === 'promo'
    ? PROMO_ASK_ANSWERS
    : target.id === 'newsletter-review'
      ? NEWSLETTER_ASKS
      : GENERIC_ASKS
}

export function askSuggestionsFor(target: Pick<Meeting, 'id' | 'sample'>): string[] {
  return target.sample === 'promo'
    ? PROMO_QUESTIONS
    : target.id === 'newsletter-review'
      ? ['구독 해지는 어떻게 하기로 했어?', '발송 시간은 언제로 바꿔?']
      : ['무엇을 정했어?']
}

/** The meetings and tasks the app starts with, relative to the scenario day. */
export function seedMeetings(day: number): { meetings: Meeting[]; tasks: MeetingTask[] } {
  const lastWeek = addWorkingDays(day, -5)
  const followUps: MeetingFollowUp[] = [
    {
      id: 'newsletter-review-f1',
      text: '구독 해지 사유 설문 문항 정리하기',
      turnId: 't4',
      suggestedOwnerId: JIHO,
      due: dateKey(addWorkingDays(lastWeek, 3)),
      taskId: 'INAX-129',
      declined: false
    },
    {
      id: 'newsletter-review-f2',
      text: '발송 시간을 오전 8시로 바꿔 시험하기',
      turnId: 't7',
      suggestedOwnerId: MINA,
      due: dateKey(addWorkingDays(day, 2)),
      taskId: 'INAX-130',
      declined: false
    },
    {
      id: 'newsletter-review-f3',
      text: '12월호 주제 후보 3개 제안하기',
      turnId: 't8',
      suggestedOwnerId: SEOYEON,
      due: dateKey(addWorkingDays(day, 2)),
      taskId: 'INAX-131',
      declined: false
    }
  ]
  const statuses = ['done', 'inProgress', 'todo'] as const
  const tasks: MeetingTask[] = followUps.map((followUp, index) => ({
    id: followUp.taskId ?? '',
    title: followUp.text,
    assigneeId: followUp.suggestedOwnerId,
    status: statuses[index],
    due: followUp.due,
    meetingId: 'newsletter-review',
    followUpId: followUp.id,
    route: index === 1 ? 'assigned' : 'accepted',
    createdAt: atTime(lastWeek, 11, 5 + index)
  }))
  return {
    tasks,
    meetings: [
      meeting({
        id: 'newsletter-review',
        title: '11월 뉴스레터 돌아보기',
        hostId: JIHO,
        attendeeIds: [SEOYEON, MINA],
        startsAt: atTime(lastWeek, 10, 30),
        endsAt: atTime(lastWeek, 11),
        place: '2층 회의실 남산',
        outline: '1. 11월호 결과 (열어 본 비율, 구독 해지)\n2. 12월호에서 바꿀 것',
        materials: ['11월호 발송 결과.xlsx'],
        minutes: NEWSLETTER_MINUTES,
        minutesSentAt: atTime(lastWeek, 11, 2),
        followUps
      }),
      meeting({
        id: 'ops-weekly',
        title: '주간 운영 점검',
        hostId: MINA,
        attendeeIds: [SEOYEON, DAEUN],
        startsAt: atTime(addWorkingDays(day, 1), 11),
        endsAt: atTime(addWorkingDays(day, 1), 11, 30),
        place: '화상 회의',
        outline: '1. 지난주 배송 지연 건수\n2. 반품 처리 기간 줄이기\n3. 이번 주 입고 일정',
        materials: ['주간 운영 지표.xlsx']
      }),
      meeting({
        id: 'partner-intro',
        title: '신규 입점사 소개 미팅',
        hostId: SEOYEON,
        attendeeIds: [JIHO],
        startsAt: atTime(addWorkingDays(day, 3), 16),
        endsAt: atTime(addWorkingDays(day, 3), 16, 40),
        place: '1층 접견실',
        outline: '1. 입점사 소개와 주력 상품\n2. 첫 달 노출 계획\n3. 필요한 자료 주고받기',
        materials: ['입점 제안서.pdf']
      })
    ]
  }
}
