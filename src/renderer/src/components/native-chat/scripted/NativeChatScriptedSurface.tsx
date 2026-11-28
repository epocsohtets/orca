import React, { useRef } from 'react'
import { NativeChatSurface } from '../NativeChatSurface'
import { useNativeChatSurface } from '../use-native-chat-surface'
import { NativeChatComposer } from '../composer/NativeChatComposer'
import type { NativeChatComposerHandle } from '../composer/native-chat-composer-types'
import type { NativeChatStructuredComposerTransport } from '../composer/submit/native-chat-structured-composer-transport'
import { useNativeChatRevealLatest } from '../messages/actions/use-native-chat-reveal-latest'

const NO_OPTIONS: NativeChatStructuredComposerTransport['optionsSurface'] = {
  getSnapshot: () => [],
  subscribe: () => () => {},
  setOption: async () => ({ snapshot: [] }),
  invokeAction: async () => ({ snapshot: [] })
}

type MessageListRef = ReturnType<typeof useNativeChatRevealLatest>['messageListRef']

/**
 * A conversation with no agent session behind it (a scripted agent, a sample chat) on the chat's own surface
 * and composer, so it looks and behaves as every other chat page. The caller draws the transcript and takes
 * what is sent.
 */
export function NativeChatScriptedSurface({
  id,
  working = false,
  canSend = true,
  conversationShown,
  onSend,
  children,
  ...dataAttributes
}: {
  /** Names the conversation: its draft and its find state are kept under it. */
  id: string
  working?: boolean
  canSend?: boolean
  conversationShown: boolean
  onSend: (text: string) => void
  children: (messageListRef: MessageListRef) => React.ReactNode
} & Record<`data-${string}`, string | undefined>): React.JSX.Element {
  const composerRef = useRef<NativeChatComposerHandle>(null)
  const { messageListRef, revealLatest } = useNativeChatRevealLatest()
  const surface = useNativeChatSurface({
    tabId: id,
    sessionId: id,
    isVisible: true,
    isFocusedGroup: true,
    composerRef,
    transcriptRef: messageListRef,
    fileLinkContext: null,
    composerReady: true,
    conversationShown,
    menu: { showTerminalPaneActions: false },
    sessionHistory: 'workspace'
  })
  const transport: NativeChatStructuredComposerTransport = {
    runtime: 'local',
    sessionId: id,
    runtimeEnvironmentId: null,
    capturePresentation: () => () => true,
    acceptsImages: false,
    optionsSurface: NO_OPTIONS,
    optionSnapshot: [],
    send: (text) => {
      onSend(text)
      revealLatest()
      return true
    },
    dispatchCommand: async () => ({ handled: false, accepted: false, error: null }),
    onError: () => {}
  }
  return (
    <NativeChatSurface surface={surface} working={working} {...dataAttributes}>
      {children(messageListRef)}
      <NativeChatComposer
        ref={composerRef}
        terminalTabId={id}
        paneKey={id}
        draftScopeKey={id}
        targetPtyId={null}
        agent="claude"
        structuredTransport={transport}
        isWorking={working}
        canSend={canSend}
        onStop={() => {}}
        notices={[]}
      />
    </NativeChatSurface>
  )
}
