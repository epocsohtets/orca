import { DAEUN, HYUNWOO, JIHO, MINA, MAKO } from './meeting-people'
import { addWorkingDays, atTime, dateKey } from './meeting-schedule'
import type {
  Meeting,
  MeetingAskAnswer,
  MeetingFollowUp,
  MeetingMinutes,
  MeetingTask
} from './meeting-types'
import { NEWSLETTER_ASKS, NEWSLETTER_MINUTES } from './meeting-sample-newsletter'
import { WEEKLY_ASKS, WEEKLY_FOLLOW_UPS, WEEKLY_MINUTES } from './meeting-sample-weekly'
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
  project: 'campaign',
  originConversationId: null,
  outline: '',
  materials: [],
  recordingStartedAt: null,
  minutes: null,
  minutesSentAt: null,
  followUps: [],
  responses: {},
  shares: [],
  requests: [],
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
    [text, turnId, suggestedOwnerId, days]: [string, string, string | null, number]
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
  const rows: [string, string, string | null, number][] = [
    ['논의한 내용을 한 장으로 정리해 공유', 't3', target.hostId, 1],
    ['필요한 자료를 모아서 전달', 't4', otherId, 1],
    // Said without a name or a date: the one the host settles at day end.
    ['다음 일정 조율', 't5', null, 3]
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
      : target.id === 'weekly'
        ? WEEKLY_ASKS
        : GENERIC_ASKS
}

export function askSuggestionsFor(target: Pick<Meeting, 'id' | 'sample'>): string[] {
  return target.sample === 'promo'
    ? PROMO_QUESTIONS
    : target.id === 'newsletter-review'
      ? ['구독 해지는 어떻게 하기로 했어?', '발송 시간은 언제로 바꿔?']
      : target.id === 'weekly'
        ? ['캠페인은 언제 시작해?', '견적은 누가 비교해?']
        : ['무엇을 정했어?']
}

/** The meetings and tasks the app starts with, relative to the scenario day. */
export function seedMeetings(day: number): { meetings: Meeting[]; tasks: MeetingTask[] } {
  const lastWeek = addWorkingDays(day, -5)
  const followUps: MeetingFollowUp[] = [
    {
      id: 'newsletter-review-f1',
      text: '구독 해지 사유 설문 문항 정리',
      turnId: 't4',
      suggestedOwnerId: JIHO,
      due: dateKey(addWorkingDays(lastWeek, 3)),
      taskId: 'INAX-129',
      declined: false
    },
    {
      id: 'newsletter-review-f2',
      text: '발송 시간을 오전 8시로 바꿔 시험',
      turnId: 't7',
      suggestedOwnerId: MINA,
      due: dateKey(addWorkingDays(day, 2)),
      taskId: 'INAX-130',
      declined: false
    },
    {
      id: 'newsletter-review-f3',
      text: '다음 호 주제 후보 3개 제안',
      turnId: 't8',
      suggestedOwnerId: MAKO,
      due: dateKey(addWorkingDays(day, 2)),
      taskId: 'INAX-131',
      declined: false
    }
  ]
  const statuses = ['done', 'inProgress', 'todo'] as const
  const tasks: MeetingTask[] = followUps.map((followUp, index) => ({
    id: followUp.taskId ?? '',
    title: followUp.text,
    assigneeId: followUp.suggestedOwnerId ?? JIHO,
    status: statuses[index],
    due: followUp.due,
    meetingId: 'newsletter-review',
    followUpId: followUp.id,
    route: index === 1 ? 'assigned' : 'accepted',
    createdAt: atTime(lastWeek, 11, 5 + index)
  }))
  // This morning's meeting named an owner and a date for each, so its follow-ups are tasks already.
  const weeklyFollowUps: MeetingFollowUp[] = WEEKLY_FOLLOW_UPS.map(
    ([text, turnId, suggestedOwnerId, days], index) => ({
      id: `weekly-f${index + 1}`,
      text,
      turnId,
      suggestedOwnerId,
      due: dateKey(addWorkingDays(day, days)),
      taskId: `INAX-${132 + index}`,
      declined: false
    })
  )
  const weeklyTasks: MeetingTask[] = weeklyFollowUps.map((followUp, index) => ({
    id: followUp.taskId ?? '',
    title: followUp.text,
    assigneeId: followUp.suggestedOwnerId ?? JIHO,
    status: 'todo',
    due: followUp.due,
    meetingId: 'weekly',
    followUpId: followUp.id,
    route: 'heard',
    createdAt: atTime(day, 9, 1 + index)
  }))
  return {
    tasks: [...tasks, ...weeklyTasks],
    meetings: [
      meeting({
        id: 'newsletter-review',
        title: '지난달 뉴스레터 돌아보기',
        hostId: JIHO,
        attendeeIds: [MAKO, MINA],
        startsAt: atTime(lastWeek, 10, 30),
        endsAt: atTime(lastWeek, 11),
        place: '2층 회의실 남산',
        outline: '1. 지난 호 결과 (열어 본 비율, 구독 해지)\n2. 다음 호에서 바꿀 것',
        materials: [{ kind: 'file', name: '지난 호 발송 결과.xlsx', size: 86_400 }],
        minutes: NEWSLETTER_MINUTES,
        minutesSentAt: atTime(lastWeek, 11, 2),
        followUps
      }),
      meeting({
        id: 'weekly',
        title: '캠페인 주간 회의',
        hostId: JIHO,
        attendeeIds: [MAKO, MINA],
        startsAt: atTime(day, 8, 30),
        endsAt: atTime(day, 9),
        place: '3층 회의실 한강',
        outline: '1. 시작 날짜\n2. 출시 페이지의 머리 문구\n3. 협력사 견적',
        materials: [{ kind: 'file', name: '협력사 견적 비교.xlsx', size: 48_200 }],
        minutes: WEEKLY_MINUTES,
        minutesSentAt: atTime(day, 9),
        followUps: weeklyFollowUps
      }),
      meeting({
        id: 'draft-review',
        title: '브랜드 리뉴얼 시안 리뷰',
        hostId: HYUNWOO,
        attendeeIds: [MAKO, JIHO],
        startsAt: atTime(day, 15),
        endsAt: atTime(day, 16),
        place: '2층 회의실 남산',
        project: 'brand',
        outline: '1. 시안 2안 비교\n2. 지난 리뷰의 결정 3건 확인',
        materials: [
          { kind: 'file', name: '브랜드 가이드 시안 A.pdf', size: 3_420_000 },
          { kind: 'file', name: '브랜드 가이드 시안 B.pdf', size: 3_180_000 }
        ],
        responses: { [MAKO]: 'yes' }
      }),
      meeting({
        id: 'mid-check',
        title: '캠페인 중간 점검',
        hostId: MAKO,
        attendeeIds: [JIHO, MINA],
        startsAt: atTime(addWorkingDays(day, 3), 14),
        endsAt: atTime(addWorkingDays(day, 3), 14, 30),
        place: '3층 회의실 한강'
      }),
      meeting({
        id: 'ops-weekly',
        title: '주간 운영 점검',
        hostId: MINA,
        attendeeIds: [MAKO, DAEUN],
        project: 'support',
        startsAt: atTime(addWorkingDays(day, 1), 11),
        endsAt: atTime(addWorkingDays(day, 1), 11, 30),
        place: '화상 회의',
        outline: '1. 지난주 배송 지연 건수\n2. 반품 처리 기간 줄이기\n3. 이번 주 입고 일정',
        materials: [{ kind: 'file', name: '주간 운영 지표.xlsx', size: 112_300 }]
      }),
      meeting({
        id: 'partner-intro',
        title: '신규 입점사 소개 미팅',
        hostId: MAKO,
        attendeeIds: [JIHO],
        startsAt: atTime(addWorkingDays(day, 3), 16),
        endsAt: atTime(addWorkingDays(day, 3), 16, 40),
        place: '1층 접견실',
        outline: '1. 입점사 소개와 주력 상품\n2. 첫 달 노출 계획\n3. 필요한 자료 주고받기',
        materials: [{ kind: 'file', name: '입점 제안서.pdf', size: 1_240_000 }]
      })
    ]
  }
}
