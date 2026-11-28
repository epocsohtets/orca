import React, { useState } from 'react'
import { Quote } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TabsContent } from '@/components/ui/tabs'
import {
  HOME_GROUP_CLASS,
  HOME_META_CLASS,
  HOME_ROW_BUTTON_CLASS,
  HomeCard
} from '@/components/home/HomeCard'
import { openMeeting } from './meeting-navigation'
import { MeetingAsk } from './MeetingAsk'
import { MeetingMyPart } from './MeetingFollowUps'
import { useMeetingText } from './MeetingParts'
import { MeetingTranscript } from './MeetingTranscript'
import type { Meeting, MeetingMinutes as Minutes } from './meeting-types'
import { useMeetings, type MinutesDepth } from './meetings-store'

const DEPTHS: MinutesDepth[] = ['brief', 'summary', 'full', 'ask']

/** The minutes by what each view holds: key points, summary by topic, the transcript, or a question. */
export function MeetingMinutes({
  meeting,
  minutes
}: {
  meeting: Meeting
  minutes: Minutes
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
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
  const saidAt = (turnId: string): string => {
    const turn = minutes.transcript.find((entry) => entry.id === turnId)
    return turn ? text.time(meeting.startsAt + turn.at * 1000) : ''
  }
  const markedTurnId = focus?.meetingId === meeting.id ? focus.turnId : null
  const labels: Record<MinutesDepth, string> = {
    brief: t('meetings.minutes.brief', 'Key points'),
    summary: t('meetings.minutes.summary', 'Summary'),
    full: t('meetings.minutes.full', 'Transcript'),
    ask: t('meetings.minutes.ask', 'Ask the agent')
  }
  // Key points holds two lists, each with its own count, so the tab itself carries none.
  const counts: Partial<Record<MinutesDepth, number>> = {
    summary: minutes.topics.length,
    full: minutes.transcript.length
  }
  const sourceLabel = t('meetings.source', 'Where it was said')

  return (
    <HomeCard
      title={t('meetings.minutes.card', 'Minutes')}
      data-meeting-card="minutes"
      tabs={{
        label: t('meetings.minutes.depth', 'What to read'),
        value: depth,
        onValueChange: (value) => {
          const next = DEPTHS.find((id) => id === value)
          if (next) {
            useMeetings.setState({ depth: next })
          }
        },
        items: DEPTHS.map((id) => ({
          value: id,
          label: labels[id],
          count: counts[id],
          data: { 'data-meeting-depth': id }
        }))
      }}
    >
      <>
        <TabsContent value="brief">
          <div className="flex flex-col gap-2">
            <section aria-label={t('meetings.minutes.decisions', 'Decisions')}>
              <h3 className={HOME_GROUP_CLASS}>{t('meetings.minutes.decisions', 'Decisions')}</h3>
              <ul className="mx-4">
                {minutes.decisions.map((decision) => (
                  <li
                    key={decision.turnId}
                    className="group/home-row flex min-h-9 items-center gap-2 border-t border-border pt-[7px] pb-2"
                  >
                    <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-5 text-foreground">
                      {decision.text}
                    </span>
                    {/* Why the span: the button owns its own effects; the row shows and hides it from outside. */}
                    <span className="-my-1 flex shrink-0 opacity-0 group-hover/home-row:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                      <Button
                        type="button"
                        variant="ghost-muted"
                        size="icon-toolbar"
                        aria-label={sourceLabel}
                        title={sourceLabel}
                        onClick={() => source(decision.turnId)}
                      >
                        <Quote />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <MeetingMyPart meeting={meeting} />
          </div>
        </TabsContent>
        <TabsContent value="summary">
          <div className="flex flex-col gap-2">
            {minutes.topics.map((topic) => (
              <section key={topic.title} aria-label={topic.title}>
                <h3 className={HOME_GROUP_CLASS}>{topic.title}</h3>
                <ul>
                  {topic.points.map((point) => (
                    <li key={point.turnId}>
                      <button
                        type="button"
                        data-meeting-summary-point={point.turnId}
                        className={`${HOME_ROW_BUTTON_CLASS} flex items-baseline gap-3 text-[13px] leading-5 text-foreground`}
                        onClick={() => source(point.turnId)}
                      >
                        <span className="min-w-0 flex-1">{point.text}</span>
                        {/* The time it was said, as on the transcript: it is where the row leads. */}
                        <span className={`shrink-0 tabular-nums underline ${HOME_META_CLASS}`}>
                          {saidAt(point.turnId)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="full">
          <div className="flex flex-col gap-3 px-4">
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
                  ? t('meetings.minutes.found', '{{count}} of {{total}} remarks', {
                      count: found.length,
                      total: minutes.transcript.length
                    })
                  : t('meetings.minutes.turns', '{{total}} remarks', {
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
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="ask">
          <div className="px-4">
            <MeetingAsk meeting={meeting} />
          </div>
        </TabsContent>
      </>
    </HomeCard>
  )
}
