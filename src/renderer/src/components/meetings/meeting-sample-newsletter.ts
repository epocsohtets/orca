import { JIHO, MINA, SEOYEON } from './meeting-people'
import type { MeetingAskAnswer, MeetingMinutes } from './meeting-types'

export const NEWSLETTER_MINUTES: MeetingMinutes = {
  summary: [
    '11월호는 열어 본 비율이 올랐지만 구독 해지가 평소보다 많았습니다.',
    '해지 사유를 묻는 설문을 넣고, 발송 시간을 오전 8시로 바꿔 시험합니다.'
  ],
  decisions: [
    { text: '구독 해지 화면에 사유를 묻는 한 문항 설문을 넣습니다.', turnId: 't4' },
    { text: '12월 첫 주 발송은 오전 8시로 바꿔서 결과를 비교합니다.', turnId: 't6' }
  ],
  topics: [
    {
      title: '11월호 결과',
      points: [
        { text: '열어 본 비율은 31%로 지난달보다 4%p 올랐습니다.', turnId: 't1' },
        { text: '구독 해지는 평소의 두 배였고, 이유는 아직 모릅니다.', turnId: 't2' }
      ]
    },
    {
      title: '다음 호 준비',
      points: [
        { text: '발송 시간을 오전 8시로 옮겨 출근길에 읽히는지 봅니다.', turnId: 't5' },
        { text: '12월호 주제 후보는 강서연 님이 세 개를 제안합니다.', turnId: 't8' }
      ]
    }
  ],
  transcript: [
    {
      id: 't1',
      at: 12,
      speakerId: JIHO,
      text: '11월호는 열어 본 비율이 31%였습니다. 지난달보다 4%p 올랐어요.'
    },
    {
      id: 't2',
      at: 95,
      speakerId: JIHO,
      text: '그런데 구독 해지가 평소의 두 배였습니다. 이유는 아직 모르겠어요.'
    },
    {
      id: 't3',
      at: 180,
      speakerId: SEOYEON,
      text: '해지할 때 이유를 물어본 적이 없죠? 한 문항이라도 넣으면 좋겠습니다.'
    },
    {
      id: 't4',
      at: 262,
      speakerId: JIHO,
      text: '네, 해지 화면에 한 문항 설문을 넣겠습니다. 문항은 제가 정리할게요.'
    },
    {
      id: 't5',
      at: 350,
      speakerId: MINA,
      text: '발송 시간도 바꿔 보면 어때요? 지금은 오후 2시인데 출근길에 보내면 다를 수 있습니다.'
    },
    {
      id: 't6',
      at: 431,
      speakerId: SEOYEON,
      text: '좋아요. 12월 첫 주는 오전 8시로 보내고 결과를 비교하죠.'
    },
    {
      id: 't7',
      at: 505,
      speakerId: MINA,
      text: '발송 시간 변경은 제가 설정하고 시험해 보겠습니다.'
    },
    {
      id: 't8',
      at: 590,
      speakerId: SEOYEON,
      text: '12월호 주제는 제가 후보 세 개를 뽑아서 다음 주에 제안하겠습니다.'
    }
  ]
}

export const NEWSLETTER_ASKS: MeetingAskAnswer[] = [
  {
    keywords: ['해지', '설문'],
    answer: '구독 해지 화면에 사유를 묻는 한 문항 설문을 넣기로 했습니다.',
    turnId: 't4'
  },
  {
    keywords: ['발송', '시간', '8시'],
    answer: '12월 첫 주 발송을 오전 8시로 바꿔 결과를 비교합니다.',
    turnId: 't6'
  }
]
