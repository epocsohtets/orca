import React, { useEffect, useState } from 'react'
import { SendHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
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
  const [draft, setDraft] = useState('')
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
  const sendLabel = t('sidebarChat.conversation.send', 'Send')
  const send = (): void => {
    const text = draft.trim()
    if (!text) {
      return
    }
    sendSidebarChatMessage(conversation.id, {
      author: personName(viewerId),
      authorId: viewerId,
      time: t('sidebarChat.conversation.now', 'Now'),
      text
    })
    setDraft('')
  }

  return (
    <div
      data-sidebar-chat-conversation={conversation.id}
      // Terminal panes sit at z-10 with no stacking context of their own.
      className="absolute inset-0 z-30 flex flex-col bg-background text-foreground"
    >
      <div
        // The tab strip under this header is a window drag region; hit-testing ignores z-index.
        className="flex h-(--app-header-height) shrink-0 items-center gap-2 border-b border-border px-4 [-webkit-app-region:no-drag]"
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
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
      <div className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
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
                  <div className="text-sm break-words whitespace-pre-wrap">{message.text}</div>
                </div>
              </div>
              {whisper?.messageId === message.id ? (
                <MeetingWhisperLine conversation={conversation} whisper={whisper} />
              ) : null}
            </React.Fragment>
          )
        })}
        <ChatMeetingLinks conversationId={conversation.id} />
      </div>
      <form
        className="flex shrink-0 items-end gap-2 border-t border-border px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <Textarea
          autoFocus
          rows={1}
          className="max-h-40 min-h-9 resize-none"
          value={draft}
          placeholder={t('sidebarChat.conversation.placeholder', 'Message {{name}}', {
            name: title
          })}
          aria-label={t('sidebarChat.conversation.placeholder', 'Message {{name}}', {
            name: title
          })}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="submit" size="icon" aria-label={sendLabel} disabled={!draft.trim()}>
              <SendHorizontal />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {sendLabel}
          </TooltipContent>
        </Tooltip>
      </form>
    </div>
  )
}
