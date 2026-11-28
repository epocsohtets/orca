import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Mic, Users } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HOME_GROUP_CLASS, HomeRow } from '@/components/home/HomeCard'
import type { HomeProjectId } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { personName } from './meeting-people'
import { invitedToAnswer, isParticipant } from './meeting-rules'
import { MeetingAnswerMenu } from './MeetingAnswerMenu'
import { sameDay, workWeek } from './meeting-schedule'
import { moveRowFocus } from './MeetingList'
import { useMeetingState, useMeetingText } from './MeetingParts'
import { useMeetings } from './meetings-store'

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
    <div className="flex flex-col border-t border-border pt-2" data-meeting-agenda="">
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
      <ol onKeyDown={(event) => moveRowFocus(event, '[data-meeting-agenda-entry]')}>
        {days.map((day) => {
          const entries = mine.filter((meeting) => sameDay(day, meeting.startsAt))
          const isToday = sameDay(day, today)
          return (
            <li key={day}>
              <h3 className={HOME_GROUP_CLASS}>
                <span className={isToday ? 'text-foreground' : undefined}>{text.date(day)}</span>
                {isToday ? <span>{t('meetings.day.today', 'Today')}</span> : null}
              </h3>
              {entries.length === 0 ? null : (
                <ul className="mx-4">
                  {entries.map((meeting) => {
                    const state = stateOf(meeting)
                    const answerable = invitedToAnswer(meeting, viewerId)
                    const response = meeting.responses[viewerId]
                    return (
                      <HomeRow
                        key={meeting.id}
                        button={{ 'data-meeting-agenda-entry': meeting.id }}
                        data-meeting-response={answerable ? (response ?? 'none') : 'host'}
                        icon={
                          state.kind === 'recording' ? (
                            <Mic aria-hidden className="text-destructive" />
                          ) : state.kind === 'minutes' ? (
                            <FileText aria-hidden />
                          ) : (
                            <Users aria-hidden />
                          )
                        }
                        title={meeting.title}
                        tip={[
                          state.label,
                          t('meetings.agenda.host', 'Host {{name}}', {
                            name: personName(meeting.hostId)
                          }),
                          text.when(meeting),
                          answerable
                            ? response === 'yes'
                              ? t('meetings.response.yes', 'Coming')
                              : response === 'no'
                                ? t('meetings.response.no', 'Not coming')
                                : t('meetings.response.none', 'Not answered')
                            : null
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        chip={state.chip}
                        project={projects[meeting.project]}
                        date={text.time(meeting.startsAt)}
                        onClick={() => onSelect(meeting.id)}
                        action={answerable ? <MeetingAnswerMenu meetingId={meeting.id} /> : null}
                      />
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
