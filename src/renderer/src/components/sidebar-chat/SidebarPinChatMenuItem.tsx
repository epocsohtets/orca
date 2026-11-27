import React from 'react'
import { Pin, PinOff } from 'lucide-react'
import { ContextMenuItem } from '@/components/ui/context-menu'
import { useTranslate } from '@/i18n/use-translate'
import { useSidebarPinnedChats } from './sidebar-pinned-chats'

/** Pins a bot, bot group or chat row to the sidebar's Pinned section, or unpins it. */
export function SidebarPinChatMenuItem({ pinKey }: { pinKey: string }): React.JSX.Element {
  const t = useTranslate()
  const isPinned = useSidebarPinnedChats((s) => s.pinned.includes(pinKey))
  const toggle = useSidebarPinnedChats((s) => s.toggle)
  return (
    <ContextMenuItem onSelect={() => toggle(pinKey)}>
      {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      {isPinned
        ? t('sidebarChat.pinned.unpin', 'Unpin')
        : t('sidebarChat.pinned.pin', 'Pin this chat')}
    </ContextMenuItem>
  )
}
