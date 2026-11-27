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
