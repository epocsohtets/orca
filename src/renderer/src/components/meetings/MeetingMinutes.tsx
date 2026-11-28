import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HOME_META_CLASS, HOME_ROW_BUTTON_CLASS, HomeCard } from '@/components/home/HomeCard'
import { openMeeting } from './meeting-navigation'
import { MeetingAsk } from './MeetingAsk'
import { MeetingMyPart } from './MeetingFollowUps'
import { MeetingTranscript } from './MeetingTranscript'
import type { Meeting, MeetingMinutes as Minutes } from './meeting-types'
import { useMeetings, type MinutesDepth } from './meetings-store'

const DEPTHS: MinutesDepth[] = ['brief', 'summary', 'full', 'ask']
const GROUP_HEADING = 'px-4 py-1 text-xs font-medium text-muted-foreground'

/** The minutes by what each view holds: key points, summary by topic, the transcript, or a question. */
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
  const [query, setQuery] = useState('')
  const found = query.trim()
    ? minutes.transcript.filter((turn) => turn.text.includes(query.trim()))
    : minutes.transcript
  const source = (turnId: string): void => {
    setQuery('')
    openMeeting(meeting.id, { turnId })
  }
  const markedTurnId = focus?.meetingId === meeting.id ? focus.turnId : null
  const labels: Record<MinutesDepth, string> = {
    brief: t('meetings.minutes.brief', 'Key points'),
    summary: t('meetings.minutes.summary', 'Summary'),
    full: t('meetings.minutes.full', 'Transcript'),
    ask: t('meetings.minutes.ask', 'Ask')
  }
  const counts: Partial<Record<MinutesDepth, number>> = {
    brief: minutes.decisions.length,
    summary: minutes.topics.length,
    full: minutes.transcript.length
  }
  const sourceLabel = t('meetings.source', 'Where it was said')

  return (
    <HomeCard title={t('meetings.minutes.card', 'Minutes')} data-meeting-card="minutes">
      <Tabs
        value={depth}
        onValueChange={(value) => {
          const next = DEPTHS.find((id) => id === value)
          if (next) {
            useMeetings.setState({ depth: next })
          }
        }}
      >
        <div className="overflow-x-auto px-4 pb-2">
          <TabsList aria-label={t('meetings.minutes.depth', 'What to read')}>
            {DEPTHS.map((id) => (
              <TabsTrigger key={id} value={id} data-meeting-depth={id}>
                {labels[id]}
                {counts[id] === undefined ? null : (
                  <span className="tabular-nums">{counts[id]}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="brief">
          <div className="flex flex-col gap-2">
            <p className="max-w-prose px-4 text-[13px] leading-relaxed text-foreground">
              {minutes.summary.join(' ')}
            </p>
            <section aria-label={t('meetings.minutes.decisions', 'Decisions')}>
              <h3 className={`flex items-baseline gap-2 ${GROUP_HEADING}`}>
                {t('meetings.minutes.decisions', 'Decisions')}
                <span className="tabular-nums">{minutes.decisions.length}</span>
              </h3>
              <ul className="divide-y divide-border border-t border-border">
                {minutes.decisions.map((decision) => (
                  <li key={decision.turnId} className="flex items-center gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1 text-[13px] text-foreground">
                      {decision.text}
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      size="inlineText"
                      className="shrink-0"
                      onClick={() => source(decision.turnId)}
                    >
                      {sourceLabel}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
            <MeetingMyPart meeting={meeting} />
          </div>
        </TabsContent>
        <TabsContent value="summary">
          <div className="flex flex-col gap-2">
            <p className={`px-4 ${HOME_META_CLASS}`}>
              {t(
                'meetings.minutes.summaryHelp',
                'Select a sentence to go to the moment it was said.'
              )}
            </p>
            {minutes.topics.map((topic) => (
              <section key={topic.title} aria-label={topic.title}>
                <h3 className={`flex items-baseline gap-2 ${GROUP_HEADING}`}>
                  {topic.title}
                  <span className="tabular-nums">{topic.points.length}</span>
                </h3>
                <ul>
                  {topic.points.map((point) => (
                    <li key={point.turnId}>
                      <button
                        type="button"
                        data-meeting-summary-point={point.turnId}
                        className={`${HOME_ROW_BUTTON_CLASS} text-[13px] text-foreground`}
                        onClick={() => source(point.turnId)}
                      >
                        {point.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="full">
          <div className="flex flex-col gap-3 px-4 pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="search"
                className="h-8 max-w-64"
                value={query}
                aria-label={t('meetings.minutes.find', 'Find in the transcript')}
                placeholder={t('meetings.minutes.find', 'Find in the transcript')}
                onChange={(event) => setQuery(event.target.value)}
              />
              <p className={`tabular-nums ${HOME_META_CLASS}`} role="status">
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
              <p className={HOME_META_CLASS}>
                {t('meetings.minutes.notFound', 'Nothing said matches. Try a shorter word.')}
              </p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="ask">
          <div className="px-4 pb-2">
            <MeetingAsk meeting={meeting} />
          </div>
        </TabsContent>
      </Tabs>
    </HomeCard>
  )
}
