import React, { useEffect, useMemo, useState } from 'react'
import { Bot, SendHorizontal } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { NativeChatMessageList } from '@/components/native-chat/NativeChatMessageList'
import type { NativeChatTimedRow } from '@/components/native-chat/conversation/slots/native-chat-timed-rows'
import type { NativeChatLiveSession } from '@/components/native-chat/session/terminal/read/native-chat-live-session-contract'
import { RailPage } from '@/components/rail-page/RailPage'
import { RailPageBand } from '@/components/rail-page/RailPageHeader'
import type { NativeChatMessage } from '../../../../shared/native-chat/native-chat-types'
import { openMeeting } from './meeting-navigation'
import { personName } from './meeting-people'
import { botItemsFor, isParticipant } from './meeting-rules'
import { useAskFallback } from './MeetingAsk'
import { AssignedTaskCard, MinutesLinkCard, ProposalCard } from './MeetingBotCards'
import { askMeetingBot, markSeen, useMeetings } from './meetings-store'

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
 * The meeting bot's direct messages to the person looking. A sample conversation: the transcript and
 * cards are the chat's own components, the bot is not in the bot catalog and no agent runs behind it.
 */
export default function MeetingBotChatPage(): React.JSX.Element {
  const t = useTranslate()
  const fallback = useAskFallback()
  const meetings = useMeetings((state) => state.meetings)
  const tasks = useMeetings((state) => state.tasks)
  const asks = useMeetings((state) => state.asks)
  const viewerId = useMeetings((state) => state.viewerId)
  const [draft, setDraft] = useState('')
  const items = useMemo(() => botItemsFor(viewerId, meetings, tasks), [viewerId, meetings, tasks])
  const itemKeys = items.map((item) => item.key).join(',')
  useEffect(() => {
    markSeen(itemKeys ? itemKeys.split(',') : [])
  }, [itemKeys, viewerId])

  // Questions go to the newest meeting the reader has minutes for.
  const askable = [...meetings]
    .filter((m) => m.minutes && isParticipant(m, viewerId))
    .sort((a, b) => (b.minutesSentAt ?? 0) - (a.minutesSentAt ?? 0))[0]
  const myAsks = useMemo(() => asks.filter((ask) => ask.askerId === viewerId), [asks, viewerId])

  const session = useMemo<NativeChatLiveSession>(() => {
    const rows: NativeChatMessage[] = []
    for (const item of items) {
      rows.push(
        message(
          item.key,
          'assistant',
          item.at,
          item.kind === 'minutes'
            ? `${t('meetings.bot.minutesReady', 'The minutes of **{{title}}** are ready.', {
                title: item.meeting.title
              })}\n\n${(item.meeting.minutes?.summary ?? []).map((line) => `- ${line}`).join('\n')}\n\n${
                item.proposals.length > 0
                  ? t(
                      'meetings.bot.proposalsFollow',
                      'Below is what looks like yours. Take it and it becomes your task in To do.'
                    )
                  : t('meetings.bot.noProposals', 'Nothing in this meeting looks like yours.')
              }`
            : t(
                'meetings.bot.assignedMessage',
                '{{name}} assigned you a task from **{{title}}**. You were not in the meeting, so I am sending the part it came from.',
                { name: personName(item.meeting.hostId), title: item.meeting.title }
              )
        )
      )
    }
    for (const ask of myAsks) {
      rows.push(message(`${ask.id}-q`, 'user', ask.at, ask.question))
      rows.push(message(`${ask.id}-a`, 'assistant', ask.at + 1, ask.answer))
    }
    return {
      messages: rows.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
      agent: 'claude',
      sessionId: `meeting-bot-${viewerId}`,
      status: 'ready',
      readPhase: 'ready',
      hasMore: false,
      loadingEarlier: false,
      olderHistoryGeneration: 0,
      loadEarlier: async () => 'applied'
    }
  }, [items, myAsks, viewerId, t])

  const timedRows = useMemo<NativeChatTimedRow[]>(() => {
    const rows: NativeChatTimedRow[] = []
    for (const item of items) {
      if (item.kind === 'minutes') {
        rows.push({
          key: `${item.key}:link`,
          at: item.at + 1,
          node: <MinutesLinkCard meeting={item.meeting} />
        })
        item.proposals.forEach((followUp, index) =>
          rows.push({
            key: `${item.key}:${followUp.id}`,
            at: item.at + 2 + index,
            node: <ProposalCard meeting={item.meeting} followUp={followUp} />
          })
        )
      } else {
        rows.push({
          key: `${item.key}:task`,
          at: item.at + 1,
          node: <AssignedTaskCard meeting={item.meeting} task={item.task} />
        })
      }
    }
    for (const ask of myAsks) {
      if (ask.turnId) {
        const turnId = ask.turnId
        rows.push({
          key: `${ask.id}:source`,
          at: ask.at + 2,
          node: (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openMeeting(ask.meetingId, { turnId })}
            >
              {t('meetings.source', 'Where it was said')}
            </Button>
          )
        })
      }
    }
    return rows
  }, [items, myAsks, t])

  const send = (): void => {
    if (askable && draft.trim()) {
      askMeetingBot(askable.id, draft.trim(), fallback)
      setDraft('')
    }
  }
  const name = t('meetings.bot.name', 'Meeting bot')
  const askLabel = askable
    ? t('meetings.bot.askAbout', 'Ask about “{{title}}”', { title: askable.title })
    : t('meetings.bot.askNone', 'You can ask once you have minutes')

  return (
    <RailPage as="main" aria-label={name}>
      <RailPageBand>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <Bot aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{name}</h1>
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {t(
              'meetings.bot.about',
              'Sends {{name}} the minutes and the tasks that look like theirs',
              {
                name: personName(viewerId)
              }
            )}
          </span>
        </div>
        <Badge variant="outline">{t('meetings.bot.sample', 'Sample conversation')}</Badge>
      </RailPageBand>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-start gap-1 p-6">
          <p className="text-sm font-medium text-foreground">
            {t('meetings.bot.emptyTitle', 'No messages yet')}
          </p>
          <p className="max-w-prose text-xs text-muted-foreground">
            {t(
              'meetings.bot.emptyDetail',
              'When a meeting you are in ends its recording, the minutes come here. So do tasks assigned to you from a meeting.'
            )}
          </p>
        </div>
      ) : (
        <div
          className="native-chat-appearance flex min-h-0 flex-1 flex-col bg-chat-pane"
          data-meeting-bot-chat=""
        >
          <NativeChatMessageList
            session={session}
            isWorking={false}
            expandSignal={false}
            timedRows={timedRows}
            turnBot={{ name, src: null, fallback: name.charAt(0) }}
          />
        </div>
      )}
      <form
        // Why pr-20: the floating workspace button sits over this corner on every page.
        className="flex shrink-0 items-end gap-2 border-t border-border py-3 pr-20 pl-(--rail-page-gutter)"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <Textarea
          rows={1}
          className="max-h-40 min-h-9 resize-none"
          value={draft}
          disabled={!askable}
          placeholder={askLabel}
          aria-label={askLabel}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!askable || !draft.trim()}
          aria-label={t('meetings.ask.send', 'Ask')}
        >
          <SendHorizontal aria-hidden />
        </Button>
      </form>
    </RailPage>
  )
}
