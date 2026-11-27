import React, { useRef } from 'react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { Button } from '@/components/ui/button'
import { HOME_LABEL_CLASS, HOME_META_CLASS } from './HomeSection'
import type { HomeEntryAnswer, HomeTimelineEntry } from './home-day'

const CLOCK_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

/** The day as the app recorded it: a plain log. Only entries the app is unsure about ask for anything. */
export function HomeTimeline({
  entries,
  answers,
  onAnswer,
  dayStart
}: {
  entries: readonly HomeTimelineEntry[]
  answers: Readonly<Record<string, HomeEntryAnswer>>
  onAnswer: (id: string, answer: HomeEntryAnswer | null) => void
  /** Today's midnight, in ms. */
  dayStart: number
}): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  // Answering removes the two buttons; focus goes to Undo so the keyboard keeps its place.
  const focusUndoFor = useRef<string | null>(null)
  const clock = (at: number): string => {
    const time = uiDateTimeFormat(CLOCK_OPTIONS, intlLocale).format(dayStart + at * 60_000)
    return at < 0 ? t('home.timeline.yesterdayAt', 'Yesterday {{time}}', { time }) : time
  }

  return (
    <ol className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3" data-home-timeline="">
      {entries.map((entry) => {
        const answer = answers[entry.id]
        const excluded = answer === 'notWork'
        const task = answer === 'linked' ? entry.suggestTask : entry.task
        return (
          <li
            key={entry.id}
            data-home-entry={entry.suggestTask && !answer ? 'unconfirmed' : undefined}
            className="col-span-2 grid grid-cols-subgrid"
          >
            <span className={`pt-px whitespace-nowrap tabular-nums ${HOME_META_CLASS}`}>
              {clock(entry.at)}
            </span>
            <div className="flex min-w-0 flex-col gap-1 border-l border-border pb-3 pl-3">
              <p
                className={
                  excluded ? 'text-[13px] text-muted-foreground' : 'text-[13px] text-foreground'
                }
              >
                {entry.text}
              </p>
              <p className={HOME_META_CLASS}>{[entry.actor, task].filter(Boolean).join(' · ')}</p>
              {entry.suggestTask ? (
                <div className="flex flex-wrap items-center gap-2" role="status">
                  {answer ? (
                    <>
                      <span className={HOME_META_CLASS}>
                        {excluded
                          ? t(
                              'home.timeline.excluded',
                              'Marked as not work. It will not be reported.'
                            )
                          : t('home.timeline.linked', 'Linked to {{task}}', {
                              task: entry.suggestTask
                            })}
                      </span>
                      <Button
                        ref={(element) => {
                          if (element && focusUndoFor.current === entry.id) {
                            element.focus()
                            focusUndoFor.current = null
                          }
                        }}
                        type="button"
                        variant="ghost-muted"
                        size="xs"
                        onClick={() => onAnswer(entry.id, null)}
                      >
                        {t('home.timeline.undo', 'Undo')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className={HOME_LABEL_CLASS}>
                        {t('home.timeline.unconfirmed', 'Unconfirmed')}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          focusUndoFor.current = entry.id
                          onAnswer(entry.id, 'linked')
                        }}
                      >
                        {t('home.timeline.link', 'Link to {{task}}', { task: entry.suggestTask })}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          focusUndoFor.current = entry.id
                          onAnswer(entry.id, 'notWork')
                        }}
                      >
                        {t('home.timeline.notWork', 'Not work')}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
