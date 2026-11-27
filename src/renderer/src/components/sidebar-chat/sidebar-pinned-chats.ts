import { create } from 'zustand'

// shortcut: pins live in memory only and are lost on restart; move to the persisted UI store if the PoC is kept.

/** Pinned rows in pin order: a bot or bot group by its home's workspace key, a mock chat by `sidebarChatPinKey`. */
export const useSidebarPinnedChats = create<{
  pinned: readonly string[]
  toggle: (pinKey: string) => void
}>((set) => ({
  pinned: [],
  toggle: (pinKey) =>
    set(({ pinned }) => ({
      pinned: pinned.includes(pinKey) ? pinned.filter((key) => key !== pinKey) : [...pinned, pinKey]
    }))
}))

const CHAT_PIN_PREFIX = 'sidebar-chat:'

export function sidebarChatPinKey(conversationId: string): string {
  return `${CHAT_PIN_PREFIX}${conversationId}`
}
