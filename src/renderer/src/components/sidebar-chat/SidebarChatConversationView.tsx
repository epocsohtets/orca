import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { NativeChatScriptedSurface } from '@/components/native-chat/scripted/NativeChatScriptedSurface'
import { NativeChatTranscriptColumn } from '@/components/native-chat/NativeChatTranscriptColumn'
import { useAppStore } from '@/store'
import { ChatMeetingLinks } from '@/components/meetings/ChatMeetingLinks'
import { ScheduleMeetingFromChatButton } from '@/components/meetings/ScheduleMeetingFromChatButton'
import { MeetingWhisperLine } from '@/components/meetings/MeetingWhisperLine'
import { personName } from '@/components/meetings/meeting-people'
import { whisperFor } from '@/components/meetings/meeting-whisper'
import { scenarioNow, useMeetings } from '@/components/meetings/meetings-store'
import { SidebarChatAvatar } from './SidebarChatAvatar'
import {
  SIDEBAR_CHAT_CONVERSATIONS,
  SIDEBAR_CHAT_SELF,
  chatAuthorId,
  sendSidebarChatMessage,
  useSidebarChatOpenConversation,
  useSidebarChatSent,
  type SidebarChatConversation
} from './sidebar-chat-mock-data'

/** UI-only PoC: the open mock conversation, drawn over the main area. */
export function SidebarChatConversationMount(): React.JSX.Element | null {
  const openId = useSidebarChatOpenConversation((s) => s.openId)
  const setOpenId = useSidebarChatOpenConversation((s) => s.setOpenId)
  // Going to another page or workspace shows it instead of the conversation.
  useEffect(
    () =>
      useAppStore.subscribe((state, previous) => {
        if (
          state.activeView !== previous.activeView ||
          state.activeWorktreeId !== previous.activeWorktreeId ||
          state.activeWorkspaceKey !== previous.activeWorkspaceKey
        ) {
          setOpenId(null)
        }
      }),
    [setOpenId]
  )
  // The conversation can lie over the page a rail button stands for (Home, without Code): pressing that button
  // changes no view, so the press itself closes the conversation.
  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (event.target instanceof Element && event.target.closest('[data-app-rail-item]')) {
        setOpenId(null)
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [setOpenId])
  const conversation = SIDEBAR_CHAT_CONVERSATIONS.find(({ id }) => id === openId)
  return conversation ? (
    <SidebarChatConversationView
      key={conversation.id}
      conversation={conversation}
      onClose={() => setOpenId(null)}
    />
  ) : null
}

function SidebarChatConversationView({
  conversation,
  onClose
}: {
  conversation: SidebarChatConversation
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const sent = useSidebarChatSent((state) => state.sent[conversation.id])
  const viewerId = useMeetings((state) => state.viewerId)
  const dismissed = useMeetings((state) =>
    state.whisperDismissed.includes(`${viewerId}:${conversation.id}`)
  )
  const handled = useMeetings((state) => state.whisperHandled)
  // Read once per open: the question is about the day this conversation is being read on.
  const [now] = useState(scenarioNow)
  const messages = [...conversation.messages, ...(sent ?? [])]
  const whisper = whisperFor({
    lines: messages.map((message) => ({
      id: message.id,
      authorId: chatAuthorId(message),
      text: message.text
    })),
    viewerId,
    dismissed,
    handledMessageIds: handled
      .filter((key) => key.startsWith(`${conversation.id}:`))
      .map((key) => key.slice(conversation.id.length + 1)),
    now
  })
  const isGroup = conversation.kind === 'group'
  const title = isGroup ? `# ${conversation.name}` : conversation.name
  const presenceLabels = {
    online: t('sidebarChat.presence.online', 'Online'),
    away: t('sidebarChat.presence.away', 'Away'),
    offline: t('sidebarChat.presence.offline', 'Offline')
  }
  const closeLabel = t('sidebarChat.conversation.close', 'Close conversation')
  const send = (text: string): void => {
    sendSidebarChatMessage(conversation.id, {
      author: personName(viewerId),
      authorId: viewerId,
      time: t('sidebarChat.conversation.now', 'Now'),
      text
    })
  }

  return (
    <div
      data-sidebar-chat-conversation={conversation.id}
      // Terminal panes sit at z-10 with no stacking context of their own.
      className="absolute inset-0 z-30 flex flex-col bg-background text-foreground"
    >
      <div
        // The tab strip under this header is a window drag region; hit-testing ignores z-index.
        className="flex h-13 shrink-0 items-center gap-3 border-b border-border px-(--rail-page-gutter) [-webkit-app-region:no-drag]"
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="min-w-0 truncate text-[15px] font-semibold tracking-tight">{title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {isGroup
              ? t('sidebarChat.members', '{{count}} members', {
                  count: conversation.memberIds.length
                })
              : conversation.presence
                ? presenceLabels[conversation.presence]
                : null}
          </span>
        </div>
        <ScheduleMeetingFromChatButton conversationId={conversation.id} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-toolbar"
              aria-label={closeLabel}
              onClick={onClose}
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4}>
            {closeLabel}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col bg-chat-pane">
        <NativeChatScriptedSurface
          id={`people-chat:${conversation.id}`}
          conversationShown={messages.length > 0}
          onSend={send}
        >
          {() => (
            // A room of people: each row carries its author's name and face, as Orca's group chat does.
            <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
              <NativeChatTranscriptColumn className="space-y-5 py-6">
                {messages.map((message) => {
                  const authorId = chatAuthorId(message)
                  // The sample is written from 마코's seat; seen as someone else, "me" is that person.
                  const author = authorId === viewerId ? SIDEBAR_CHAT_SELF : personName(authorId)
                  return (
                    <React.Fragment key={message.id}>
                      <div className="flex gap-2.5" data-sidebar-chat-message={message.id}>
                        <SidebarChatAvatar name={author} kind="dm" />
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold">{author}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {message.time}
                            </span>
                          </div>
                          <div className="text-sm break-words whitespace-pre-wrap">
                            {message.text}
                          </div>
                        </div>
                      </div>
                      {whisper?.messageId === message.id ? (
                        <MeetingWhisperLine conversation={conversation} whisper={whisper} />
                      ) : null}
                    </React.Fragment>
                  )
                })}
                <ChatMeetingLinks conversationId={conversation.id} />
              </NativeChatTranscriptColumn>
            </div>
          )}
        </NativeChatScriptedSurface>
      </div>
    </div>
  )
}
