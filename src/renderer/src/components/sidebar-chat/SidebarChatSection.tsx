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
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useAppStore } from '@/store'
import { MeetingBotChatRow } from '@/components/meetings/MeetingBotChatRow'
import { SidebarChatRow } from './SidebarChatRow'
import { SIDEBAR_CHAT_CONVERSATIONS, type SidebarChatConversation } from './sidebar-chat-mock-data'

const LIST_LABEL =
  'shrink-0 px-3 pt-2 pb-1 text-2xs font-semibold tracking-wider text-muted-foreground uppercase select-none'

/** UI-only PoC: mock direct messages and groups between the Bots and Projects sections. */
export function SidebarChatSection({
  onOpenConversation
}: {
  onOpenConversation: () => void
}): React.JSX.Element | null {
  const t = useTranslate()
  const [collapsed, setCollapsed] = useState(false)
  const newLabel = t('sidebarChat.section.new', 'New message or group')
  const projectsFirst = useAppStore((state) => state.sidebarProjectsFirst)
  const shown = useAppStore((state) => (state.sidebarBody ?? 'workspaces') !== 'agents')
  if (!shown) {
    return null
  }

  const renderRow = (conversation: SidebarChatConversation): React.JSX.Element => (
    <SidebarChatRow key={conversation.id} conversation={conversation} onOpen={onOpenConversation} />
  )

  return (
    <div
      data-sidebar-chat-section=""
      className={cn(
        // Gives way before Bots in a short sidebar: its list scrolls.
        'flex min-h-24 shrink-[4] flex-col border-worktree-sidebar-section-divider pb-2',
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
        <div className="worktree-sidebar-scrollbar flex min-h-0 flex-col overflow-y-auto px-1">
          <div className={LIST_LABEL}>
            {t('sidebarChat.section.directMessages', 'Direct messages')}
          </div>
          <MeetingBotChatRow />
          {SIDEBAR_CHAT_CONVERSATIONS.filter(({ kind }) => kind === 'dm').map(renderRow)}
          <div className={LIST_LABEL}>{t('sidebarChat.section.groups', 'Groups')}</div>
          {SIDEBAR_CHAT_CONVERSATIONS.filter(({ kind }) => kind === 'group').map(renderRow)}
        </div>
      )}
    </div>
  )
}
