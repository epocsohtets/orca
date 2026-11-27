import React, { useMemo, useState } from 'react'
import { BotGroupRow } from '@/components/bots/BotGroupRow'
import { BotRow } from '@/components/bots/BotRow'
import { getHostKeyedBotSidebarEntries } from '@/components/bots/bot-sidebar-entry-keys'
import { LazyBotGroupMembersDialog } from '@/components/bots/lazy-bot-dialogs'
import { useBotGroupDelete } from '@/components/bots/use-bot-group-delete'
import { SidebarSectionHeader } from '@/components/sidebar/SidebarSectionHeader'
import { useTranslate } from '@/i18n/use-translate'
import { useBotHomeWorkspaces, useBots } from '@/lib/bot-catalog'
import { selectActiveBotGroupRoomId } from '@/lib/bot-group-catalog'
import { useBotGroups } from '@/lib/bot-group-list'
import { useAppStore } from '@/store'
import { findBotGroupRoom, type BotGroup } from '../../../../shared/bots/bot-group'
import { botGroupMemberBots } from '../../../../shared/bots/bot-sidebar-entries'
import {
  folderWorkspaceKey,
  getActiveSidebarWorkspaceId
} from '../../../../shared/workspace/identity/workspace-scope'
import { SidebarChatRow } from './SidebarChatRow'
import { SIDEBAR_CHAT_CONVERSATIONS, type SidebarChatConversation } from './sidebar-chat-mock-data'
import { sidebarChatPinKey, useSidebarPinnedChats } from './sidebar-pinned-chats'

type PinnedRow = { pinKey: string } & (
  | { conversation: SidebarChatConversation; entry?: undefined }
  | { conversation?: undefined; entry: ReturnType<typeof getHostKeyedBotSidebarEntries>[number] }
)

/** UI-only PoC: the rows pinned from the Bots and Chat sections; hidden while nothing is pinned. */
export function SidebarPinnedSection({ onOpen }: { onOpen: () => void }): React.JSX.Element | null {
  const t = useTranslate()
  const pinned = useSidebarPinnedChats((s) => s.pinned)
  const [collapsed, setCollapsed] = useState(false)
  const [editingGroup, setEditingGroup] = useState<BotGroup | null>(null)
  const bots = useBots()
  const groups = useBotGroups()
  const homes = useBotHomeWorkspaces(bots, groups)
  const deleteGroup = useBotGroupDelete()
  const activeRoomId = useAppStore(selectActiveBotGroupRoomId)
  const activeGroupId = activeRoomId ? findBotGroupRoom(groups, activeRoomId)?.group.id : null
  const activeWorkspaceId = useAppStore((s) =>
    s.activeView === 'tasks' || s.activeView === 'activity' || activeRoomId !== null
      ? null
      : getActiveSidebarWorkspaceId(s.activeWorkspaceKey, s.activeWorktreeId)
  )
  const shown = useAppStore((s) => (s.sidebarBody ?? 'workspaces') !== 'agents')
  const rows = useMemo(() => {
    const botEntries = getHostKeyedBotSidebarEntries(bots, groups, homes)
    return pinned.flatMap((pinKey): PinnedRow[] => {
      const conversation = SIDEBAR_CHAT_CONVERSATIONS.find(
        ({ id }) => sidebarChatPinKey(id) === pinKey
      )
      if (conversation) {
        return [{ pinKey, conversation }]
      }
      // A pinned bot that was deleted or turned off lists nothing.
      const entry = botEntries.find(({ home }) => folderWorkspaceKey(home.id) === pinKey)
      return entry ? [{ pinKey, entry }] : []
    })
  }, [pinned, bots, groups, homes])
  if (!shown || rows.length === 0) {
    return null
  }

  return (
    <div
      data-sidebar-pinned-section=""
      className="flex shrink-0 flex-col border-b border-worktree-sidebar-section-divider pb-2 [[data-sidebar-content-viewport]>&]:-mr-1 [[data-sidebar-content-viewport]>&]:pr-1"
    >
      <SidebarSectionHeader
        title={t('sidebarChat.pinned.title', 'Pinned')}
        sectionId="pinned-chats"
        fold={{
          collapsed,
          label: collapsed
            ? t('sidebarChat.pinned.expand', 'Expand Pinned')
            : t('sidebarChat.pinned.collapse', 'Collapse Pinned'),
          onToggle: () => setCollapsed((value) => !value)
        }}
        actions={null}
      />
      {collapsed ? null : (
        <div className="flex flex-col px-1">
          {rows.map(({ pinKey, conversation, entry }) =>
            !entry ? (
              <SidebarChatRow key={pinKey} conversation={conversation} onOpen={onOpen} />
            ) : entry.kind === 'group' ? (
              <BotGroupRow
                key={pinKey}
                group={entry.group}
                home={entry.home}
                members={botGroupMemberBots(entry.group, bots)}
                isActive={activeGroupId === entry.group.id}
                onOpen={onOpen}
                onManageMembers={() => setEditingGroup(entry.group)}
                onDelete={() => void deleteGroup(entry.group)}
              />
            ) : (
              <BotRow
                key={pinKey}
                bot={entry.bot}
                home={entry.home}
                isActive={activeWorkspaceId === pinKey}
                onOpen={onOpen}
              />
            )
          )}
        </div>
      )}
      {editingGroup ? (
        <LazyBotGroupMembersDialog group={editingGroup} onClose={() => setEditingGroup(null)} />
      ) : null}
    </div>
  )
}
