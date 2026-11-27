import React from 'react'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import { WORKTREE_CARD_SURFACE_CLASS_NAME } from '@/components/sidebar/workspace-card/surface/worktree-card-surface'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { SidebarChatAvatar } from './SidebarChatAvatar'
import { SidebarPinChatMenuItem } from './SidebarPinChatMenuItem'
import {
  useSidebarChatOpenConversation,
  type SidebarChatConversation
} from './sidebar-chat-mock-data'
import { sidebarChatPinKey } from './sidebar-pinned-chats'

/** A mock DM or group row; the Chat and Pinned sections both list it. */
export function SidebarChatRow({
  conversation,
  onOpen
}: {
  conversation: SidebarChatConversation
  onOpen: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const openId = useSidebarChatOpenConversation((s) => s.openId)
  const setOpenId = useSidebarChatOpenConversation((s) => s.setOpenId)
  const presenceLabels = {
    online: t('sidebarChat.presence.online', 'Online'),
    away: t('sidebarChat.presence.away', 'Away'),
    offline: t('sidebarChat.presence.offline', 'Offline')
  }
  const isActive = openId === conversation.id
  const last = conversation.messages.at(-1)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          data-worktree-card-surface="true"
          data-worktree-card-active={isActive ? 'primary' : undefined}
          data-sidebar-chat-row={conversation.id}
          className={cn(
            WORKTREE_CARD_SURFACE_CLASS_NAME,
            'flex w-[calc(100%-0.25rem)] shrink-0 items-center gap-2 py-1.25 pl-1.25 text-left focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            !isActive && 'worktree-sidebar-card-hover'
          )}
          onClick={() => {
            setOpenId(conversation.id)
            onOpen()
          }}
        >
          <SidebarChatAvatar
            name={conversation.name}
            kind={conversation.kind}
            presence={conversation.presence}
            presenceLabel={
              conversation.presence ? presenceLabels[conversation.presence] : undefined
            }
          />
          <span className="flex min-w-0 flex-1 flex-col justify-center">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  'min-w-0 truncate text-[13px] leading-5',
                  conversation.unread > 0 && 'font-semibold'
                )}
              >
                {conversation.name}
              </span>
              {last ? (
                <span className="ml-auto shrink-0 text-3xs leading-none text-muted-foreground tabular-nums">
                  {last.time}
                </span>
              ) : null}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {conversation.kind === 'group'
                  ? t('sidebarChat.members', '{{count}} members', {
                      count: conversation.memberCount ?? 0
                    })
                  : last?.text}
              </span>
              {conversation.unread > 0 ? (
                // SidebarNav's count pill.
                <span
                  className="shrink-0 rounded-full bg-primary px-1.5 py-px text-3xs font-semibold text-primary-foreground tabular-nums"
                  aria-label={t('sidebarChat.unread', '{{count}} unread', {
                    count: conversation.unread
                  })}
                >
                  {conversation.unread}
                </span>
              ) : null}
            </span>
          </span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <SidebarPinChatMenuItem pinKey={sidebarChatPinKey(conversation.id)} />
      </ContextMenuContent>
    </ContextMenu>
  )
}
