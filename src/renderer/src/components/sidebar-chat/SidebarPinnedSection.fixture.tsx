import { defineFixture } from '../../component-fixtures/component-fixture'
import { stubBots } from '../../component-fixtures/fixture-bots'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import { SidebarBotsSection } from '@/components/bots/SidebarBotsSection'
import type { Bot } from '../../../../shared/bot-types'
import { mascotAvatar } from '../../../../shared/bot-avatar'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'
import { ConfirmationDialogProvider } from '../dismiss/confirmation/confirmation-dialog'
import { SidebarChatSection } from './SidebarChatSection'
import { SidebarPinnedSection } from './SidebarPinnedSection'
import { sidebarChatPinKey, useSidebarPinnedChats } from './sidebar-pinned-chats'

const BOT: Bot = {
  id: 'scout',
  name: 'Scout',
  hostId: 'local',
  folder: 'scout',
  folderWorkspaceId: 'fw-scout',
  agent: 'claude',
  avatar: mascotAvatar('F1'),
  paused: false,
  notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
  members: [],
  slack: null,
  linear: null,
  github: null,
  chatSessionId: 'home',
  sidebarOrder: 0,
  createdAt: 1,
  updatedAt: 1
}

/** One bot chat and one DM pinned, above the Bots and Chat sections they come from. */
export const botAndDirectMessage = defineFixture({
  width: 280,
  store: {
    folderWorkspaces: [
      makeFolderWorkspace({
        id: BOT.folderWorkspaceId,
        projectGroupId: 'bots',
        name: BOT.name,
        folderPath: '/home/me/.orca/bots/scout'
      })
    ]
  },
  setup: () => {
    stubBots([BOT])
    useSidebarPinnedChats.setState({
      pinned: [folderWorkspaceKey(BOT.folderWorkspaceId), sidebarChatPinKey('dm-jiwoo')]
    })
  },
  render: () => (
    <ConfirmationDialogProvider>
      <div className="flex flex-col bg-sidebar py-2 text-sidebar-foreground">
        <SidebarPinnedSection onOpen={() => {}} />
        <SidebarBotsSection onOpenBot={() => {}} />
        <SidebarChatSection onOpenConversation={() => {}} />
      </div>
    </ConfirmationDialogProvider>
  )
})
