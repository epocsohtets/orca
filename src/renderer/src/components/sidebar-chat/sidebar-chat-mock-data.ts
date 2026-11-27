import { create } from 'zustand'

// shortcut: hard-coded PoC data with no backend, IPC or persistence; replace with a real chat store when messaging exists.

export type SidebarChatPresence = 'online' | 'away' | 'offline'

export type SidebarChatMessage = {
  id: string
  author: string
  time: string
  text: string
}

export type SidebarChatConversation = {
  id: string
  kind: 'dm' | 'group'
  name: string
  presence?: SidebarChatPresence
  memberCount?: number
  unread: number
  messages: SidebarChatMessage[]
}

export const SIDEBAR_CHAT_SELF = 'You'

export const SIDEBAR_CHAT_CONVERSATIONS: SidebarChatConversation[] = [
  {
    id: 'dm-jiwoo',
    kind: 'dm',
    name: 'Jiwoo Park',
    presence: 'online',
    unread: 2,
    messages: [
      { id: '1', author: 'Jiwoo Park', time: '10:12', text: 'Morning! Did the sidebar PoC build?' },
      { id: '2', author: SIDEBAR_CHAT_SELF, time: '10:14', text: 'Yes, the Chat section renders.' },
      { id: '3', author: 'Jiwoo Park', time: '10:15', text: 'Nice. Can you share a screenshot?' },
      { id: '4', author: 'Jiwoo Park', time: '10:15', text: 'I will review it after standup.' }
    ]
  },
  {
    id: 'dm-alex',
    kind: 'dm',
    name: 'Alex Kim',
    presence: 'away',
    unread: 0,
    messages: [
      { id: '1', author: SIDEBAR_CHAT_SELF, time: '09:02', text: 'Is the release branch cut?' },
      { id: '2', author: 'Alex Kim', time: '09:20', text: 'Not yet. I will cut it after lunch.' }
    ]
  },
  {
    id: 'dm-mina',
    kind: 'dm',
    name: 'Mina Cho',
    presence: 'online',
    unread: 1,
    messages: [
      {
        id: '1',
        author: 'Mina Cho',
        time: 'Yesterday',
        text: 'The new icons are in the design file.'
      }
    ]
  },
  {
    id: 'dm-sam',
    kind: 'dm',
    name: 'Sam Lee',
    presence: 'offline',
    unread: 0,
    messages: [
      { id: '1', author: 'Sam Lee', time: 'Mon', text: 'Thanks for the review.' },
      { id: '2', author: SIDEBAR_CHAT_SELF, time: 'Mon', text: 'Any time.' }
    ]
  },
  {
    id: 'group-promo',
    kind: 'group',
    name: '연말-프로모션',
    memberCount: 4,
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
        text: '글로는 길어지겠네요. 오늘 오후에 잠깐 모여서 정하면 어떨까요?'
      }
    ]
  },
  {
    id: 'group-design',
    kind: 'group',
    name: 'design',
    memberCount: 8,
    unread: 5,
    messages: [
      { id: '1', author: 'Mina Cho', time: '11:01', text: 'Sidebar spacing proposal is ready.' },
      { id: '2', author: 'Jiwoo Park', time: '11:04', text: 'Looks good. Keep the 13px rows.' },
      { id: '3', author: SIDEBAR_CHAT_SELF, time: '11:06', text: 'I will match the Bots section.' },
      { id: '4', author: 'Alex Kim', time: '11:09', text: 'Dark mode check, too.' }
    ]
  },
  {
    id: 'group-release',
    kind: 'group',
    name: 'release',
    memberCount: 12,
    unread: 0,
    messages: [
      { id: '1', author: 'Alex Kim', time: '08:30', text: 'RC build is green on all platforms.' },
      { id: '2', author: 'Sam Lee', time: '08:41', text: 'Windows smoke test passed.' }
    ]
  },
  {
    id: 'group-random',
    kind: 'group',
    name: 'random',
    memberCount: 23,
    unread: 0,
    messages: [{ id: '1', author: 'Sam Lee', time: 'Fri', text: 'Coffee machine is fixed.' }]
  }
]

/** The conversation shown over the main area; null shows the page under it. */
export const useSidebarChatOpenConversation = create<{
  openId: string | null
  setOpenId: (openId: string | null) => void
}>((set) => ({ openId: null, setOpenId: (openId) => set({ openId }) }))
