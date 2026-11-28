import React, { useMemo } from 'react'
import { ListTodo } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { NativeChatMessageList } from '@/components/native-chat/NativeChatMessageList'
import { NativeChatScriptedSurface } from '@/components/native-chat/scripted/NativeChatScriptedSurface'
import { NativeChatEventRow } from '@/components/native-chat/messages/events/NativeChatEventRow'
import { NativeChatUserBubble } from '@/components/native-chat/messages/rows/NativeChatUserBubble'
import { NATIVE_CHAT_INLINE_CHIP } from '@/components/native-chat/messages/events/native-chat-inline-chip'
import type { NativeChatTimedRow } from '@/components/native-chat/conversation/slots/native-chat-timed-rows'
import type { NativeChatLiveSession } from '@/components/native-chat/session/terminal/read/native-chat-live-session-contract'
import { BotItemStatusIcon } from '@/components/bots/items/BotItemStatusIcon'
import type { HomeTask } from '@/components/home/home-board'
import type { HomeTaskLoop } from '@/components/home/home-task-loop'
import {
  HOME_LOOP_ANSWER_ROW,
  HOME_LOOP_ASKED_ROW,
  HOME_LOOP_MOVED_ROW,
  buildHomeLoopScript,
  buildHomeLoopTranscript,
  homeLoopAnswerText,
  homeLoopEventTimes,
  homeStatusMovedLine
} from '@/components/home/home-task-loop-script'

/**
 * A task's conversation in its workspace's chat tab, on the chat's own surface, transcript and composer. The
 * agent behind it is scripted (home-task-loop-script); what it asks of me is an item ask, answered in the
 * right sidebar, and the transcript only says that it asked.
 */
export function WorkTaskChat({
  task,
  loop,
  agentName,
  now,
  isVisible,
  isFocusedGroup,
  onOpenQuestion,
  onSay
}: {
  task: HomeTask
  /** My conversation with the task's agent. */
  loop: HomeTaskLoop
  agentName: string
  now: number
  isVisible: boolean
  isFocusedGroup: boolean
  onOpenQuestion: () => void
  onSay: (text: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const tabId = `work:${task.id}`
  const working = task.loop === 'working'
  const session = useMemo<NativeChatLiveSession>(
    () => ({
      messages: buildHomeLoopTranscript(t, task, loop, now),
      // The transcript needs a provider to parse rows as; none is named on screen.
      agent: 'claude',
      sessionId: tabId,
      status: 'ready',
      readPhase: 'ready',
      hasMore: false,
      loadingEarlier: false,
      olderHistoryGeneration: 0,
      loadEarlier: async () => 'exhausted'
    }),
    [loop, task, now, tabId, t]
  )
  const timedRows = useMemo<NativeChatTimedRow[]>(() => {
    const times = homeLoopEventTimes(loop, now)
    const rows: NativeChatTimedRow[] = [
      {
        key: HOME_LOOP_MOVED_ROW,
        at: times[HOME_LOOP_MOVED_ROW],
        node: (
          <div data-work-chat-moved="">
            <NativeChatEventRow
              // Whose act the line is: a line with no subject under the agent's turn read as the agent's.
              icon={
                <span className="flex size-4 items-center justify-center rounded-full bg-chat-foreground/[0.12] text-[10px] leading-none font-medium text-chat-foreground">
                  {t('home.activity.me', 'I')}
                </span>
              }
              timestamp={times[HOME_LOOP_MOVED_ROW]}
            >
              {homeStatusMovedLine(t, task.title, 'inProgress')}
            </NativeChatEventRow>
          </div>
        )
      }
    ]
    const question = buildHomeLoopScript(t, task, loop).question
    const chip = (answered: boolean): React.JSX.Element => (
      <button
        type="button"
        className={`${NATIVE_CHAT_INLINE_CHIP} max-w-full flex-none`}
        onClick={onOpenQuestion}
      >
        <BotItemStatusIcon status={answered ? 'working' : 'needs_you'} />
        {/* The item's words here are the question: the task's title read as if it were the question. */}
        <span className="min-w-0 truncate">{question}</span>
      </button>
    )
    if (times[HOME_LOOP_ASKED_ROW] !== undefined) {
      const [before, after] = t('taskLoop.chat.asked', 'Asked you about {{items}}', {
        items: '\u0000'
      }).split('\u0000')
      rows.push({
        key: HOME_LOOP_ASKED_ROW,
        at: times[HOME_LOOP_ASKED_ROW],
        node: (
          <div data-work-chat-asked="">
            <NativeChatEventRow
              icon={<ListTodo className="size-3.5" aria-hidden />}
              timestamp={times[HOME_LOOP_ASKED_ROW]}
            >
              {before ? <span className="shrink-0">{before.trim()}</span> : null}
              {chip(loop.answer !== undefined)}
              {after ? <span className="shrink-0">{after.trim()}</span> : null}
            </NativeChatEventRow>
          </div>
        )
      })
    }
    if (loop.answer) {
      rows.push({
        key: HOME_LOOP_ANSWER_ROW,
        at: loop.answer.at,
        node: (
          // My answer to an item's question: my own message, headed by the item, as the chat draws it.
          <div className="mt-3.5 flex flex-col items-end gap-1" data-work-chat-answer="">
            <NativeChatUserBubble className="flex flex-col items-start gap-1.5">
              {chip(true)}
              <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                {homeLoopAnswerText(buildHomeLoopScript(t, task, loop), loop)}
              </div>
            </NativeChatUserBubble>
          </div>
        )
      })
    }
    return rows
  }, [loop, task, now, t, onOpenQuestion])
  return (
    <NativeChatScriptedSurface
      id={tabId}
      working={working}
      conversationShown={session.messages.length > 0}
      isVisible={isVisible}
      isFocusedGroup={isFocusedGroup}
      placeholder={t('home.chat.placeholder', 'Message')}
      onSend={onSay}
      data-work-chat={task.id}
    >
      {(messageListRef) => (
        <NativeChatMessageList
          ref={messageListRef}
          session={session}
          isWorking={working}
          workingStartedAt={loop.answer?.at ?? loop.startedAt}
          expandSignal={false}
          timedRows={timedRows}
          turnBot={{ name: agentName, src: null, fallback: agentName.charAt(0) }}
        />
      )}
    </NativeChatScriptedSurface>
  )
}
