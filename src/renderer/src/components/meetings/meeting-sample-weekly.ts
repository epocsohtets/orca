import { JIHO, MAKO, MINA } from './meeting-people'
import type { MeetingAskAnswer, MeetingMinutes } from './meeting-types'

// The same meeting Home's sample day begins with: launch date, headline, vendor quotes.
export const WEEKLY_MINUTES: MeetingMinutes = {
  summary: [
    '출시 캠페인은 다음 달 5일에 시작합니다.',
    '머리 문구는 마코 님이 먼저 고르고 김지우 님이 승인합니다. 협력사 견적은 두 건을 비교해서 정합니다.'
  ],
  decisions: [
    { text: '캠페인은 다음 달 5일에 시작합니다.', turnId: 't3' },
    { text: '출시 페이지의 머리 문구는 마코 님이 고르고 김지우 님이 승인합니다.', turnId: 't5' }
  ],
  topics: [
    {
      title: '시작 날짜와 머리 문구',
      points: [
        { text: '물류 준비가 끝나는 날짜에 맞춰 5일로 정했습니다.', turnId: 't2' },
        { text: '글쓰기 에이전트가 머리 문구 두 안을 올렸습니다.', turnId: 't4' }
      ]
    },
    {
      title: '협력사 견적과 일정',
      points: [
        { text: '영상 협력사 두 곳의 견적이 왔고, 금액과 납기가 다릅니다.', turnId: 't6' },
        { text: '다음 주 일정은 캠페인 일정표에 옮겨 둡니다.', turnId: 't8' }
      ]
    }
  ],
  transcript: [
    {
      id: 't1',
      at: 10,
      speakerId: JIHO,
      text: '오늘은 시작 날짜, 머리 문구, 협력사 견적을 봅니다.'
    },
    {
      id: 't2',
      at: 95,
      speakerId: MINA,
      text: '물류 준비는 다음 달 4일에 끝납니다. 5일부터는 주문을 받아도 됩니다.'
    },
    {
      id: 't3',
      at: 170,
      speakerId: JIHO,
      text: '그럼 캠페인은 다음 달 5일에 시작하는 것으로 하죠.'
    },
    {
      id: 't4',
      at: 260,
      speakerId: MAKO,
      text: '머리 문구는 글쓰기 에이전트가 두 안을 올렸어요. 오늘 안에 제가 하나를 고르겠습니다.'
    },
    {
      id: 't5',
      at: 340,
      speakerId: JIHO,
      text: '좋습니다. 마코 님이 고르시면 김지우 님 승인을 받아서 페이지에 넣겠습니다.'
    },
    {
      id: 't6',
      at: 430,
      speakerId: JIHO,
      text: '영상 협력사 두 곳에서 견적이 왔습니다. 금액도 납기도 꽤 다릅니다.'
    },
    {
      id: 't7',
      at: 515,
      speakerId: MAKO,
      text: '견적 두 건은 제가 비교해서 내일까지 정리하겠습니다.'
    },
    {
      id: 't8',
      at: 600,
      speakerId: MINA,
      text: '다음 주 일정이 몇 개 바뀌었어요. 캠페인 일정표에 옮겨 두면 좋겠습니다.'
    },
    { id: 't9', at: 680, speakerId: MAKO, text: '그것도 제가 일정표에 반영해 두겠습니다.' },
    {
      id: 't10',
      at: 760,
      speakerId: JIHO,
      text: '저는 출시 안내 글의 첫 문단을 문구가 정해지는 대로 고치겠습니다.'
    }
  ]
}

/** [text, source turn, suggested owner, working days until due] */
export const WEEKLY_FOLLOW_UPS: [string, string, string, number][] = [
  ['협력사 견적 두 건 비교', 't7', MAKO, 1],
  ['다음 주 일정을 캠페인 일정표에 반영', 't9', MAKO, 3],
  ['출시 안내 글의 첫 문단 수정', 't10', JIHO, 2]
]

export const WEEKLY_ASKS: MeetingAskAnswer[] = [
  {
    keywords: ['날짜', '언제', '시작'],
    answer: '캠페인은 다음 달 5일에 시작합니다.',
    turnId: 't3'
  },
  {
    keywords: ['문구', '헤드라인', '승인'],
    answer: '머리 문구는 마코 님이 고르고 김지우 님이 승인합니다.',
    turnId: 't5'
  },
  {
    keywords: ['견적', '협력사'],
    answer: '협력사 견적 두 건은 마코 님이 비교해서 정리합니다.',
    turnId: 't7'
  }
]
