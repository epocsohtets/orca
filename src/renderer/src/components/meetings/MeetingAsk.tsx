import React, { useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

/** Ask the meeting agent about one meeting. Answers point at the sentence they rest on. */
export function MeetingAsk({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const t = useTranslate()
  const fallback = useAskFallback()
  const viewerId = useMeetings((state) => state.viewerId)
  const asks = useMeetings((state) => state.asks).filter(
    (ask) => ask.meetingId === meeting.id && ask.askerId === viewerId
  )
  const [question, setQuestion] = useState('')
  const ask = (value: string): void => {
    if (value.trim()) {
      askMeetingBot(meeting.id, value.trim(), fallback)
      setQuestion('')
    }
  }
  const label = t('meetings.ask.label', 'Ask the meeting agent about this meeting')
  return (
    <div className="flex max-w-prose flex-col gap-4">
      {asks.length > 0 ? (
        <ol className="flex flex-col gap-4">
          {asks.map((entry) => (
            <li key={entry.id} data-meeting-ask="">
              <p className="text-[13px] font-medium text-foreground">{entry.question}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground">{entry.answer}</p>
              {entry.turnId ? (
                <Button
                  type="button"
                  variant="link"
                  size="inlineText"
                  className="mt-1"
                  onClick={() => openMeeting(meeting.id, { turnId: entry.turnId ?? undefined })}
                >
                  {t('meetings.source', 'Where it was said')}
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-start gap-1.5">
          <p className="text-xs text-muted-foreground">
            {t('meetings.ask.suggestions', 'For example:')}
          </p>
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
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          ask(question)
        }}
      >
        <Input
          value={question}
          aria-label={label}
          placeholder={label}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!question.trim()}
          aria-label={t('meetings.ask.send', 'Ask')}
        >
          <SendHorizontal aria-hidden />
        </Button>
      </form>
    </div>
  )
}
