import React, { useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HOME_META_CLASS, HOME_ROW_BUTTON_CLASS, HomeProjectDot } from '@/components/home/HomeCard'
import type { HomeProjectId } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { personName } from './meeting-people'
import { isParticipant } from './meeting-rules'
import { sameDay, workWeek } from './meeting-schedule'
import { moveRowFocus } from './MeetingList'
import { MeetingStateMarker, useMeetingState, useMeetingText } from './MeetingParts'
import { respondToInvitation, useMeetings } from './meetings-store'

/** The viewer's own schedule: one working week, a day at a time, as Home groups what is coming up. */
export function MeetingAgenda({
  projects,
  onSelect
}: {
  projects: Record<HomeProjectId, HomeProject>
  onSelect: (id: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const stateOf = useMeetingState()
  const meetings = useMeetings((state) => state.meetings)
  const viewerId = useMeetings((state) => state.viewerId)
  const today = useMeetings((state) => state.day)
  const [weekOffset, setWeekOffset] = useState(0)
  const days = workWeek(today, weekOffset)
  const mine = meetings
    .filter((meeting) => isParticipant(meeting, viewerId))
    .sort((a, b) => a.startsAt - b.startsAt)

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-2" data-meeting-agenda="">
      <div className="flex items-center gap-1 px-4">
        <span className="min-w-0 flex-1 truncate text-[13px] leading-5 text-foreground tabular-nums">
          {text.date(days[0])} – {text.date(days[4])}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t('meetings.agenda.previousWeek', 'Previous week')}
          onClick={() => setWeekOffset((value) => value - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset(0)}
        >
          {t('meetings.agenda.thisWeek', 'This week')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t('meetings.agenda.nextWeek', 'Next week')}
          onClick={() => setWeekOffset((value) => value + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <ol
        className="flex flex-col gap-2"
        onKeyDown={(event) => moveRowFocus(event, '[data-meeting-agenda-entry]')}
      >
        {days.map((day) => {
          const entries = mine.filter((meeting) => sameDay(day, meeting.startsAt))
          const isToday = sameDay(day, today)
          return (
            <li key={day}>
              <h3 className="flex items-baseline gap-2 px-4 py-1 text-xs leading-4 text-muted-foreground">
                <span className={isToday ? 'text-foreground' : undefined}>{text.date(day)}</span>
                {isToday ? <span>{t('meetings.day.today', 'Today')}</span> : null}
                <span className="tabular-nums">{entries.length}</span>
              </h3>
              {entries.length === 0 ? (
                <p className={`px-4 py-1 ${HOME_META_CLASS}`}>
                  {t('meetings.agenda.noMeetings', 'No meetings')}
                </p>
              ) : (
                <ul>
                  {entries.map((meeting) => {
                    // An invited person answers until the meeting starts; the host sees it on the meeting.
                    const answerable =
                      meeting.hostId !== viewerId &&
                      !meeting.minutes &&
                      meeting.recordingStartedAt === null
                    return (
                      <li key={meeting.id} className="flex items-stretch">
                        <button
                          type="button"
                          data-meeting-agenda-entry={meeting.id}
                          onClick={() => onSelect(meeting.id)}
                          className={`${HOME_ROW_BUTTON_CLASS} grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-3 @min-[38rem]/home-card:grid-cols-[6.5rem_minmax(0,1fr)_9rem]`}
                        >
                          <span className={`pt-px tabular-nums ${HOME_META_CLASS}`}>
                            {text.time(meeting.startsAt)}–{text.time(meeting.endsAt)}
                          </span>
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="line-clamp-2 text-[13px] leading-5 text-foreground">
                              {meeting.title}
                            </span>
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className={HOME_META_CLASS}>
                                {t('meetings.agenda.host', 'Host {{name}}', {
                                  name: personName(meeting.hostId)
                                })}
                              </span>
                              <MeetingStateMarker state={stateOf(meeting)} />
                            </span>
                          </span>
                          <span className="min-w-0 pt-px @max-[38rem]/home-card:hidden">
                            <HomeProjectDot project={projects[meeting.project]} />
                          </span>
                        </button>
                        {answerable ? (
                          <div
                            className="flex shrink-0 items-center gap-1.5 pr-4"
                            role="group"
                            aria-label={t(
                              'meetings.response.label',
                              'Will you come to “{{title}}”?',
                              { title: meeting.title }
                            )}
                            data-meeting-response={meeting.responses[viewerId] ?? 'none'}
                          >
                            {(['yes', 'no'] as const).map((answer) => (
                              <Button
                                key={answer}
                                type="button"
                                size="xs"
                                variant={
                                  meeting.responses[viewerId] === answer ? 'secondary' : 'outline'
                                }
                                aria-pressed={meeting.responses[viewerId] === answer}
                                onClick={() => respondToInvitation(meeting.id, answer)}
                              >
                                {meeting.responses[viewerId] === answer ? (
                                  <Check aria-hidden />
                                ) : null}
                                {answer === 'yes'
                                  ? t('meetings.response.yes', 'Coming')
                                  : t('meetings.response.no', 'Not coming')}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
