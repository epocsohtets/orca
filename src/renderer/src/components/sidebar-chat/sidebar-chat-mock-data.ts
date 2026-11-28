import { create } from 'zustand'
import {
  DAEUN,
  HYUNWOO,
  JIHO,
  JIWOO,
  MAKO,
  MEETING_PEOPLE,
  MINA
} from '@/components/meetings/meeting-people'

// shortcut: hard-coded PoC data with no backend, IPC or persistence; replace with a real chat store when messaging exists.

export type SidebarChatPresence = 'online' | 'away' | 'offline'

export type SidebarChatMessage = {
  id: string
  author: string
  time: string
  text: string
  /** Set on messages typed here; sample messages name their author. */
  authorId?: string
  /** Sample only: who the meeting agent asks when this line reads as setting up a meeting. */
  whisperFor?: string
}

export type SidebarChatConversation = {
  id: string
  kind: 'dm' | 'group'
  name: string
  presence?: SidebarChatPresence
  /** Everyone in the conversation, the app's owner included. */
  memberIds: string[]
  unread: number
  messages: SidebarChatMessage[]
}

export const SIDEBAR_CHAT_SELF = '나'

export const SIDEBAR_CHAT_CONVERSATIONS: SidebarChatConversation[] = [
  {
    id: 'dm-jiwoo',
    memberIds: [MAKO, JIHO],
    kind: 'dm',
    name: '박지호',
    presence: 'online',
    unread: 2,
    messages: [
      {
        id: '1',
        author: '박지호',
        time: '10:12',
        text: '뉴스레터 다음 호 주제 후보는 언제쯤 볼 수 있을까요?'
      },
      {
        id: '2',
        author: SIDEBAR_CHAT_SELF,
        time: '10:14',
        text: '수요일까지 세 개 뽑아서 드릴게요.'
      },
      {
        id: '3',
        author: '박지호',
        time: '10:15',
        text: '좋습니다. 그 전에 지난달 결과 표를 먼저 보내 둘게요.'
      },
      { id: '4', author: '박지호', time: '10:15', text: '공유 폴더에 올렸습니다.' },
      {
        id: '5',
        author: '박지호',
        time: '10:21',
        text: '뉴스레터 주제 건은 금요일 2시에 회의로 잡읍시다.',
        whisperFor: MAKO
      }
    ]
  },
  {
    id: 'dm-alex',
    memberIds: [MAKO, MINA],
    kind: 'dm',
    name: '이민아',
    presence: 'away',
    unread: 0,
    messages: [
      {
        id: '1',
        author: SIDEBAR_CHAT_SELF,
        time: '09:02',
        text: '이번 주 입고 일정은 확정됐나요?'
      },
      {
        id: '2',
        author: '이민아',
        time: '09:20',
        text: '아직입니다. 점심 뒤에 물류 쪽 답을 받고 알려 드릴게요.'
      }
    ]
  },
  {
    id: 'dm-mina',
    memberIds: [MAKO, DAEUN],
    kind: 'dm',
    name: '정다은',
    presence: 'online',
    unread: 1,
    messages: [
      {
        id: '1',
        author: '정다은',
        time: '어제',
        text: '지난주 문의 유형을 정리해서 올려 두었습니다.'
      }
    ]
  },
  {
    id: 'dm-sam',
    memberIds: [MAKO, HYUNWOO],
    kind: 'dm',
    name: '최현우',
    presence: 'offline',
    unread: 0,
    messages: [
      {
        id: '1',
        author: '최현우',
        time: '월',
        text: '입점사 소개 자료 표지는 이 안으로 가겠습니다.'
      },
      { id: '2', author: SIDEBAR_CHAT_SELF, time: '월', text: '네, 좋습니다. 고맙습니다.' }
    ]
  },
  {
    id: 'group-promo',
    memberIds: [MAKO, JIHO, MINA, DAEUN],
    kind: 'group',
    name: '연말-프로모션',
    unread: 3,
    messages: [
      {
        id: '1',
        author: '박지호',
        time: '09:12',
        text: '작년 연말 프로모션 결과를 정리해서 공유 폴더에 올렸습니다.'
      },
      {
        id: '2',
        author: '이민아',
        time: '09:20',
        text: '할인율을 25%로 올리자는 의견이 있던데, 물류 쪽 계산을 먼저 봐야 할 것 같아요.'
      },
      {
        id: '3',
        author: '정다은',
        time: '09:31',
        text: '문의 대응 시간도 같이 정했으면 합니다. 작년 첫 주가 정말 힘들었어요.'
      },
      {
        id: '4',
        author: '박지호',
        time: '09:38',
        text: '글로는 길어지겠네요. 다음 주 화요일 오후 2시에 30분만 모여서 정하면 어떨까요?',
        whisperFor: MAKO
      }
    ]
  },
  {
    id: 'group-design',
    memberIds: [MAKO, JIHO, MINA, DAEUN, HYUNWOO, JIWOO],
    kind: 'group',
    name: '마케팅팀',
    unread: 2,
    messages: [
      { id: '1', author: '박지호', time: '11:01', text: '이번 주 콘텐츠 일정표를 올렸습니다.' },
      { id: '2', author: '최현우', time: '11:04', text: '배너 크기는 지난번과 같게 가면 될까요?' },
      { id: '3', author: SIDEBAR_CHAT_SELF, time: '11:06', text: '네, 같은 크기로 부탁드립니다.' }
    ]
  },
  {
    id: 'group-release',
    memberIds: [MAKO, MINA, DAEUN, JIHO, HYUNWOO],
    kind: 'group',
    name: '운영-공지',
    unread: 0,
    messages: [
      {
        id: '1',
        author: '이민아',
        time: '08:30',
        text: '오늘 오후 3시에 택배 마감이 한 시간 당겨집니다.'
      },
      { id: '2', author: '정다은', time: '08:41', text: '고객 안내 문구에 반영했습니다.' }
    ]
  },
  {
    id: 'group-random',
    memberIds: [MAKO, JIHO, MINA, DAEUN, HYUNWOO, JIWOO],
    kind: 'group',
    name: '점심-모임',
    unread: 0,
    messages: [
      { id: '1', author: '최현우', time: '금', text: '금요일 점심은 1층 식당에서 모입니다.' }
    ]
  }
]

/** Who wrote a message: the typed ones say so, the sample ones are matched by name. */
export function chatAuthorId(message: SidebarChatMessage): string {
  return (
    message.authorId ??
    (message.author === SIDEBAR_CHAT_SELF
      ? MAKO
      : (MEETING_PEOPLE.find((person) => person.name === message.author)?.id ?? message.author))
  )
}

/** Messages typed in this window, by conversation. They last until the window reloads. */
export const useSidebarChatSent = create<{ sent: Record<string, SidebarChatMessage[]> }>(() => ({
  sent: {}
}))

export function sendSidebarChatMessage(
  conversationId: string,
  message: Omit<SidebarChatMessage, 'id'>
): void {
  useSidebarChatSent.setState(({ sent }) => {
    const list = sent[conversationId] ?? []
    return {
      sent: { ...sent, [conversationId]: [...list, { ...message, id: `sent-${list.length + 1}` }] }
    }
  })
}

/** The conversation shown over the main area; null shows the page under it. */
export const useSidebarChatOpenConversation = create<{
  openId: string | null
  setOpenId: (openId: string | null) => void
}>((set) => ({ openId: null, setOpenId: (openId) => set({ openId }) }))
