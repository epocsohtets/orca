import React, { useState } from 'react'
import { MessageSquarePlus, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SidebarSectionHeader } from '@/components/sidebar/SidebarSectionHeader'
import { WORKTREE_CARD_SURFACE_CLASS_NAME } from '@/components/sidebar/workspace-card/surface/worktree-card-surface'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useAppStore } from '@/store'
import { SidebarChatAvatar } from './SidebarChatAvatar'
import {
  SIDEBAR_CHAT_CONVERSATIONS,
  useSidebarChatOpenConversation,
  type SidebarChatConversation
} from './sidebar-chat-mock-data'

const LIST_LABEL =
  'px-3 pt-2 pb-1 text-2xs font-semibold tracking-wider text-muted-foreground uppercase select-none'

/** UI-only PoC: mock direct messages and groups between the Bots and Projects sections. */
export function SidebarChatSection({
  onOpenConversation
}: {
  onOpenConversation: () => void
}): React.JSX.Element | null {
  const t = useTranslate()
  const [collapsed, setCollapsed] = useState(false)
  const openId = useSidebarChatOpenConversation((s) => s.openId)
  const setOpenId = useSidebarChatOpenConversation((s) => s.setOpenId)
  const newLabel = t('sidebarChat.section.new', 'New message or group')
  const presenceLabels = {
    online: t('sidebarChat.presence.online', 'Online'),
    away: t('sidebarChat.presence.away', 'Away'),
    offline: t('sidebarChat.presence.offline', 'Offline')
  }

  const projectsFirst = useAppStore((state) => state.sidebarProjectsFirst)
  const shown = useAppStore((state) => (state.sidebarBody ?? 'workspaces') !== 'agents')
  if (!shown) {
    return null
  }

  const renderRow = (conversation: SidebarChatConversation): React.JSX.Element => {
    const isActive = openId === conversation.id
    const last = conversation.messages.at(-1)
    return (
      <button
        key={conversation.id}
        type="button"
        data-worktree-card-surface="true"
        data-worktree-card-active={isActive ? 'primary' : undefined}
        data-sidebar-chat-row={conversation.id}
        className={cn(
          WORKTREE_CARD_SURFACE_CLASS_NAME,
          'flex w-[calc(100%-0.25rem)] items-center gap-2 py-1.25 pl-1.25 text-left focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          !isActive && 'worktree-sidebar-card-hover'
        )}
        onClick={() => {
          setOpenId(conversation.id)
          onOpenConversation()
        }}
      >
        <SidebarChatAvatar
          name={conversation.name}
          kind={conversation.kind}
          presence={conversation.presence}
          presenceLabel={conversation.presence ? presenceLabels[conversation.presence] : undefined}
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
    )
  }

  return (
    <div
      data-sidebar-chat-section=""
      className={cn(
        'flex shrink-0 flex-col border-worktree-sidebar-section-divider pb-2',
        projectsFirst ? 'border-t' : 'border-b',
        '[[data-sidebar-content-viewport]>&]:-mr-1 [[data-sidebar-content-viewport]>&]:pr-1'
      )}
    >
      <SidebarSectionHeader
        title={t('sidebarChat.section.title', 'Chat')}
        sectionId="chat"
        fold={{
          collapsed,
          label: collapsed
            ? t('sidebarChat.section.expand', 'Expand Chat')
            : t('sidebarChat.section.collapse', 'Collapse Chat'),
          onToggle: () => setCollapsed((value) => !value)
        }}
        actions={
          collapsed ? null : (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0"
                      aria-label={newLabel}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {newLabel}
                </TooltipContent>
              </Tooltip>
              {/* PoC: the items close the menu and do nothing else. */}
              <DropdownMenuContent side="bottom" align="start" sideOffset={6}>
                <DropdownMenuItem>
                  <MessageSquarePlus className="size-3.5" />
                  {t('sidebarChat.section.newMessage', 'New message')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="size-3.5" />
                  {t('sidebarChat.section.newGroup', 'New group')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
      {collapsed ? null : (
        <div className="flex flex-col px-1">
          <div className={LIST_LABEL}>
            {t('sidebarChat.section.directMessages', 'Direct messages')}
          </div>
          {SIDEBAR_CHAT_CONVERSATIONS.filter(({ kind }) => kind === 'dm').map(renderRow)}
          <div className={LIST_LABEL}>{t('sidebarChat.section.groups', 'Groups')}</div>
          {SIDEBAR_CHAT_CONVERSATIONS.filter(({ kind }) => kind === 'group').map(renderRow)}
        </div>
      )}
    </div>
  )
}
