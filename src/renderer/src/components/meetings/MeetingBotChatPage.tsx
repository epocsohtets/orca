import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, SendHorizontal } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { InaxDemoNote } from '@/components/task-page/inax/InaxDemoNote'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { homeSampleMoment } from '@/components/home/home-day'
import { NativeChatClockContext } from '@/components/native-chat/messages/rows/NativeChatMessageTimestamp'
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
import { useMeetingText } from './MeetingParts'
import { askMeetingBot, isSeen, markSeen, useMeetings } from './meetings-store'

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
 * cards are the chat's own components, the meeting agent is not in the bot catalog and no agent runs behind it.
 */
export default function MeetingBotChatPage(): React.JSX.Element {
  const t = useTranslate()
  const fallback = useAskFallback()
  const text = useMeetingText()
  const meetings = useMeetings((state) => state.meetings)
  const tasks = useMeetings((state) => state.tasks)
  const asks = useMeetings((state) => state.asks)
  const viewerId = useMeetings((state) => state.viewerId)
  const [draft, setDraft] = useState('')
  const items = useMemo(() => botItemsFor(viewerId, meetings, tasks), [viewerId, meetings, tasks])
  const itemKeys = items.map((item) => item.key).join(',')
  const chat = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const keys = itemKeys ? itemKeys.split(',') : []
    const state = useMeetings.getState()
    // Open on the oldest message not read yet, else on the newest one.
    const target = keys.find((key) => !isSeen(state, key)) ?? keys.at(-1)
    markSeen(keys)
    // After the transcript's own scroll to the end has run.
    const timer = setTimeout(() => {
      chat.current
        ?.querySelector(`[data-meeting-bot-item="${target}"]`)
        ?.scrollIntoView({ block: 'center' })
    }, 400)
    return () => clearTimeout(timer)
  }, [itemKeys, viewerId])

  // Questions go to the newest meeting the reader has minutes for.
  const askable = [...meetings]
    .filter((m) => m.minutes && isParticipant(m, viewerId))
    .sort((a, b) => (b.minutesSentAt ?? 0) - (a.minutesSentAt ?? 0))[0]
  const myAsks = useMemo(() => asks.filter((ask) => ask.askerId === viewerId), [asks, viewerId])

  const session = useMemo<NativeChatLiveSession>(() => {
    const rows: NativeChatMessage[] = []
    for (const item of items) {
      // Each message starts with its meeting and day, so a long conversation reads meeting by meeting.
      const heading = `### ${item.meeting.title} · ${text.date(item.meeting.startsAt)}`
      const body =
        item.kind === 'minutes'
          ? `${t('meetings.bot.minutesReady', 'The minutes of **{{title}}** are ready.', {
              title: item.meeting.title
            })}\n\n${(item.meeting.minutes?.summary ?? []).map((line) => `- ${line}`).join('\n')}\n\n${
              // The offers below carry their own heading.
              item.proposals.length > 0
                ? ''
                : t('meetings.bot.noProposals', 'Nothing in this meeting looks like yours.')
            }`
          : item.kind === 'shared'
            ? t(
                'meetings.bot.sharedMessage',
                '{{name}} shared the full minutes of **{{title}}** with you.',
                { name: personName(item.byId), title: item.meeting.title }
              )
            : item.task.route === 'heard'
              ? t(
                  'meetings.bot.heardMessage',
                  'A task for you came out of **{{title}}**. Here is the part it came from.',
                  { title: item.meeting.title }
                )
              : t(
                  'meetings.bot.assignedMessage',
                  '{{name}} assigned you a task from **{{title}}**. Here is the part it came from.',
                  { name: personName(item.meeting.hostId), title: item.meeting.title }
                )
      rows.push(message(item.key, 'assistant', item.at, `${heading}\n\n${body}`))
    }
    for (const ask of myAsks) {
      rows.push(message(`${ask.id}-q`, 'user', ask.at, ask.question))
      rows.push(message(`${ask.id}-a`, 'assistant', ask.at + 1, ask.answer))
    }
    return {
      // Strictly by time: the newest is always at the bottom.
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
  }, [items, myAsks, viewerId, t, text])

  const timedRows = useMemo<NativeChatTimedRow[]>(() => {
    const rows: NativeChatTimedRow[] = []
    for (const item of items) {
      const card =
        item.kind === 'assigned' ? (
          <AssignedTaskCard meeting={item.meeting} task={item.task} />
        ) : (
          <MinutesLinkCard
            meeting={item.meeting}
            sharedBy={item.kind === 'shared' ? item.byId : undefined}
          />
        )
      rows.push({
        key: `${item.key}:card`,
        at: item.at + 1,
        node: <div data-meeting-bot-item={item.key}>{card}</div>
      })
      if (item.kind === 'minutes') {
        item.proposals.forEach((followUp, index) =>
          rows.push({
            key: `${item.key}:${followUp.id}`,
            at: item.at + 2 + index,
            node: <ProposalCard meeting={item.meeting} followUp={followUp} />
          })
        )
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
  const name = t('meetings.bot.name', 'Meeting agent')
  const askLabel = askable
    ? t('meetings.bot.askAbout', 'Ask about “{{title}}”', { title: askable.title })
    : ''

  return (
    <RailPage as="main" aria-label={name}>
      <RailPageBand>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <Bot aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{name}</h1>
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {/* Says what this person actually gets: someone outside a meeting has no minutes yet. */}
            {items.some((item) => item.kind !== 'assigned') || items.length === 0
              ? t('meetings.bot.about', 'Sends you the minutes and the items that look like yours')
              : t(
                  'meetings.bot.aboutOutside',
                  'Sends you assigned tasks and the part they came from'
                )}
          </span>
        </div>
        <InaxDemoNote className="self-center" />
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
          ref={chat}
          className="native-chat-appearance flex min-h-0 flex-1 flex-col bg-chat-pane"
          data-meeting-bot-chat=""
        >
          <NativeChatClockContext.Provider value={homeSampleMoment}>
            <NativeChatMessageList
              session={session}
              isWorking={false}
              expandSignal={false}
              timedRows={timedRows}
              turnBot={{ name, src: null, fallback: name.charAt(0) }}
            />
          </NativeChatClockContext.Provider>
        </div>
      )}
      {askable ? (
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
      ) : null}
    </RailPage>
  )
}
