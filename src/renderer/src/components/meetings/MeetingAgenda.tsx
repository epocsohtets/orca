import React, { useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/class-names'
import { personName } from './meeting-people'
import { isParticipant } from './meeting-rules'
import { sameDay, workWeek } from './meeting-schedule'
import { moveRowFocus, useMeetingStateLine } from './MeetingList'
import { MEETING_FOCUS_RING, useMeetingText } from './MeetingParts'
import { respondToInvitation, useMeetings } from './meetings-store'

/** The viewer's own schedule: one working week, a day at a time. */
export function MeetingAgenda({
  selectedId,
  onSelect
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const stateLine = useMeetingStateLine()
  const meetings = useMeetings((state) => state.meetings)
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  const today = useMeetings((state) => state.day)
  const [weekOffset, setWeekOffset] = useState(0)
  const days = workWeek(today, weekOffset)
  const mine = meetings
    .filter((meeting) => isParticipant(meeting, viewerId))
    .sort((a, b) => a.startsAt - b.startsAt)
  const firstId = mine.find((meeting) => days.some((day) => sameDay(day, meeting.startsAt)))?.id
  const tabStopId = mine.some(
    (m) => m.id === selectedId && days.some((d) => sameDay(d, m.startsAt))
  )
    ? selectedId
    : firstId

  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      <div className="flex items-center gap-1 px-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
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
              <h2 className="flex items-baseline gap-1.5 px-2 pb-0.5 text-xs">
                <span
                  className={isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                >
                  {text.date(day)}
                </span>
                {isToday ? (
                  <span className="text-muted-foreground">{t('meetings.day.today', 'Today')}</span>
                ) : null}
              </h2>
              {entries.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">
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
                    const current = meeting.id === selectedId
                    return (
                      <li key={meeting.id}>
                        <button
                          type="button"
                          data-meeting-agenda-entry={meeting.id}
                          data-current={current || undefined}
                          aria-current={current ? 'true' : undefined}
                          tabIndex={meeting.id === tabStopId ? 0 : -1}
                          onClick={() => onSelect(meeting.id)}
                          className={cn(
                            'grid w-full cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent data-current:bg-accent',
                            MEETING_FOCUS_RING
                          )}
                        >
                          <span className="text-xs leading-5 text-muted-foreground tabular-nums">
                            {text.time(meeting.startsAt)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-foreground">
                              {meeting.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {t('meetings.agenda.host', 'Host {{name}}', {
                                name: personName(meeting.hostId)
                              })}
                              {' · '}
                              {stateLine(meeting, tasks)}
                            </span>
                          </span>
                        </button>
                        {answerable ? (
                          <div
                            className="flex items-center gap-1.5 pb-1 pl-[3.75rem]"
                            role="group"
                            aria-label={t(
                              'meetings.response.label',
                              'Will you come to “{{title}}”?',
                              {
                                title: meeting.title
                              }
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
