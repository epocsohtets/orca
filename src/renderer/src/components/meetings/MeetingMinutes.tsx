import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RAIL_PAGE_GUTTER_X } from '@/components/rail-page/RailPage'
import { cn } from '@/lib/class-names'
import { openMeeting } from './meeting-navigation'
import { MeetingAsk } from './MeetingAsk'
import { MeetingFollowUps } from './MeetingFollowUps'
import { MEETING_FOCUS_RING, MeetingSection } from './MeetingParts'
import { MeetingPrep } from './MeetingPrep'
import { MeetingTranscript } from './MeetingTranscript'
import type { Meeting, MeetingMinutes as Minutes } from './meeting-types'
import { useMeetings, type MinutesDepth } from './meetings-store'

const DEPTHS = ['brief', 'summary', 'full', 'ask'] as const

// The panel scrolls in a plain wrapper: TabsContent owns its own spacing and focus style.
const PANEL = cn(
  'h-full overflow-y-auto pt-2 pb-6 scrollbar-sleek in-focus-visible:ring-2 in-focus-visible:ring-ring in-focus-visible:ring-inset',
  RAIL_PAGE_GUTTER_X
)

/** The minutes at the depth the reader picks: key points, summary, transcript, or a question. */
export function MeetingMinutes({
  meeting,
  minutes
}: {
  meeting: Meeting
  minutes: Minutes
}): React.JSX.Element {
  const t = useTranslate()
  const depth = useMeetings((state) => state.depth)
  const focus = useMeetings((state) => state.focus)
  const isHost = useMeetings((state) => state.viewerId === meeting.hostId)
  const [query, setQuery] = useState('')
  const found = query.trim()
    ? minutes.transcript.filter((turn) => turn.text.includes(query.trim()))
    : minutes.transcript
  const source = (turnId: string): void => {
    setQuery('')
    openMeeting(meeting.id, { turnId })
  }
  const markedTurnId = focus?.meetingId === meeting.id ? focus.turnId : null

  return (
    <Tabs
      value={depth}
      onValueChange={(value) => {
        const next = DEPTHS.find((id) => id === value)
        if (next) {
          useMeetings.setState({ depth: next satisfies MinutesDepth })
        }
      }}
      className="min-h-0 flex-1"
    >
      <div className={cn('shrink-0 overflow-x-auto border-b border-border', RAIL_PAGE_GUTTER_X)}>
        <TabsList
          variant="line"
          className="-mx-2"
          aria-label={t('meetings.minutes.depth', 'How much to read')}
        >
          <TabsTrigger value="brief">{t('meetings.minutes.brief', 'Key points')}</TabsTrigger>
          <TabsTrigger value="summary">{t('meetings.minutes.summary', 'Summary')}</TabsTrigger>
          <TabsTrigger value="full">{t('meetings.minutes.full', 'Transcript')}</TabsTrigger>
          <TabsTrigger value="ask">{t('meetings.minutes.ask', 'Ask')}</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="brief" className="min-h-0">
        <div className={cn(PANEL, 'flex flex-col gap-6')}>
          <MeetingSection title={t('meetings.minutes.decisions', 'Decisions')}>
            <ul className="flex max-w-prose flex-col">
              {minutes.decisions.map((decision) => (
                <li key={decision.turnId} className="flex items-baseline gap-2 py-1">
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                    {decision.text}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => source(decision.turnId)}
                  >
                    {t('meetings.source', 'Where it was said')}
                  </Button>
                </li>
              ))}
            </ul>
          </MeetingSection>
          <MeetingFollowUps meeting={meeting} />
          <MeetingPrep meeting={meeting} isHost={isHost} />
        </div>
      </TabsContent>
      <TabsContent value="summary" className="min-h-0">
        <div className={cn(PANEL, 'flex flex-col gap-5')}>
          <p className="text-xs text-muted-foreground">
            {t(
              'meetings.minutes.summaryHelp',
              'Select a sentence to go to the moment it was said.'
            )}
          </p>
          {minutes.topics.map((topic) => (
            <MeetingSection key={topic.title} title={topic.title}>
              <ul className="-mx-2 flex max-w-prose flex-col">
                {topic.points.map((point) => (
                  <li key={point.turnId}>
                    <button
                      type="button"
                      data-meeting-summary-point={point.turnId}
                      className={cn(
                        'w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm leading-relaxed text-foreground transition-colors hover:bg-accent',
                        MEETING_FOCUS_RING
                      )}
                      onClick={() => source(point.turnId)}
                    >
                      {point.text}
                    </button>
                  </li>
                ))}
              </ul>
            </MeetingSection>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="full" className="min-h-0">
        <div className={cn(PANEL, 'flex flex-col gap-4')}>
          <div className="flex max-w-prose items-center gap-3">
            <Input
              type="search"
              className="max-w-64"
              value={query}
              aria-label={t('meetings.minutes.find', 'Find in the transcript')}
              placeholder={t('meetings.minutes.find', 'Find in the transcript')}
              onChange={(event) => setQuery(event.target.value)}
            />
            <p className="text-xs text-muted-foreground" role="status">
              {query.trim()
                ? t('meetings.minutes.found', '{{count}} of {{total}} turns', {
                    count: found.length,
                    total: minutes.transcript.length
                  })
                : t('meetings.minutes.turns', '{{total}} turns', {
                    total: minutes.transcript.length
                  })}
            </p>
          </div>
          {found.length > 0 ? (
            <MeetingTranscript
              turns={found}
              startsAt={meeting.startsAt}
              markedTurnId={markedTurnId}
              markNonce={focus?.nonce}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('meetings.minutes.notFound', 'Nothing said matches. Try a shorter word.')}
            </p>
          )}
        </div>
      </TabsContent>
      <TabsContent value="ask" className="min-h-0">
        <div className={PANEL}>
          <MeetingAsk meeting={meeting} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
