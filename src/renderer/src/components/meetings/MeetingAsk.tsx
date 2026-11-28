import React, { useMemo } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { homeSampleMoment } from '@/components/home/home-day'
import { NativeChatClockContext } from '@/components/native-chat/messages/rows/NativeChatMessageTimestamp'
import { NativeChatMessageList } from '@/components/native-chat/NativeChatMessageList'
import { NativeChatScriptedSurface } from '@/components/native-chat/scripted/NativeChatScriptedSurface'
import type { NativeChatTimedRow } from '@/components/native-chat/conversation/slots/native-chat-timed-rows'
import type { NativeChatLiveSession } from '@/components/native-chat/session/terminal/read/native-chat-live-session-contract'
import type { NativeChatMessage } from '../../../../shared/native-chat/native-chat-types'
import { openMeeting } from './meeting-navigation'
import { askSuggestionsFor } from './meeting-sample-seed'
import type { Meeting } from './meeting-types'
import { askMeetingBot, useMeetings } from './meetings-store'

export function useAskFallback(): string {
  const t = useTranslate()
  return t(
    'meetings.ask.noAnswer',
    'I did not find that in this meeting. Try a word that was said, or search the full transcript.'
  )
}

const message = (
  id: string,
  role: NativeChatMessage['role'],
  timestamp: number,
  text: string
): NativeChatMessage => ({
  id,
  role,
  source: 'transcript',
  timestamp,
  blocks: [{ type: 'text', text }]
})

/**
 * Ask the meeting agent about one meeting, on the chat's own rows and composer: my question is my message,
 * the answer is the agent's, and an answer points at the sentence it rests on.
 */
export function MeetingAsk({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const t = useTranslate()
  const fallback = useAskFallback()
  const viewerId = useMeetings((state) => state.viewerId)
  const allAsks = useMeetings((state) => state.asks)
  const asks = useMemo(
    () => allAsks.filter((ask) => ask.meetingId === meeting.id && ask.askerId === viewerId),
    [allAsks, meeting.id, viewerId]
  )
  const ask = (value: string): void => {
    if (value.trim()) {
      askMeetingBot(meeting.id, value.trim(), fallback)
    }
  }
  const id = `meeting-ask:${meeting.id}:${viewerId}`
  const session = useMemo<NativeChatLiveSession>(
    () => ({
      messages: asks.flatMap((entry) => [
        message(`${entry.id}-q`, 'user', entry.at, entry.question),
        message(`${entry.id}-a`, 'assistant', entry.at + 1, entry.answer)
      ]),
      agent: 'claude',
      sessionId: id,
      status: 'ready',
      readPhase: 'ready',
      hasMore: false,
      loadingEarlier: false,
      olderHistoryGeneration: 0,
      loadEarlier: async () => 'applied'
    }),
    [asks, id]
  )
  const timedRows = useMemo<NativeChatTimedRow[]>(
    () =>
      asks.flatMap((entry) => {
        const turnId = entry.turnId
        return turnId
          ? [
              {
                key: `${entry.id}:source`,
                at: entry.at + 2,
                node: (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openMeeting(meeting.id, { turnId })}
                  >
                    {t('meetings.source', 'Where it was said')}
                  </Button>
                )
              }
            ]
          : []
      }),
    [asks, meeting.id, t]
  )
  const name = t('meetings.bot.name', 'Meeting agent')
  return (
    <div
      className="flex h-[26rem] min-h-0 flex-col overflow-hidden rounded-md bg-chat-pane"
      data-meeting-ask-chat=""
    >
      <NativeChatClockContext.Provider value={homeSampleMoment}>
        <NativeChatScriptedSurface
          id={id}
          conversationShown={asks.length > 0}
          placeholder={t('meetings.ask.label', 'Ask the meeting agent about this meeting')}
          onSend={ask}
        >
          {(messageListRef) =>
            asks.length > 0 ? (
              <NativeChatMessageList
                ref={messageListRef}
                session={session}
                isWorking={false}
                expandSignal={false}
                timedRows={timedRows}
                turnBot={{ name, src: null, fallback: name.charAt(0) }}
              />
            ) : (
              // Before the first question: questions this meeting can answer, one press each.
              <div className="flex min-h-0 flex-1 flex-col items-start justify-end gap-1.5 p-3">
                {askSuggestionsFor(meeting).map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => ask(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )
          }
        </NativeChatScriptedSurface>
      </NativeChatClockContext.Provider>
    </div>
  )
}
