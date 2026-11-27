import React from 'react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { isOpenFollowUp } from './meeting-follow-ups'
import { groupMeetingsByDay, type MeetingListGroupId } from './meeting-list-groups'
import { formatMeetingShortDay, formatMeetingTime } from './meeting-time-format'
import { inaxTaskStatus, MEETING_FOCUS_RING } from './MeetingParts'
import type { Meeting, MeetingPhase } from './meeting-types'

const ROW_SELECTOR = '[data-meeting-row]'

export function useMeetingPhaseLabel(): (meeting: Meeting) => string {
  const t = useTranslate()
  const labels: Record<MeetingPhase, string> = {
    idle: t('meetings.state.notRecorded', 'Not recorded'),
    recording: t('meetings.state.recording', 'Recording'),
    stopped: t('meetings.state.recorded', 'Recorded'),
    processing: t('meetings.state.processing', 'Processing'),
    ready: t('meetings.state.minutesReady', 'Minutes ready')
  }
  return (meeting) =>
    meeting.phase === 'idle' && meeting.calendar
      ? t('meetings.state.scheduled', 'Scheduled')
      : labels[meeting.phase]
}

export function MeetingList({
  meetings,
  selectedId,
  now,
  onSelect
}: {
  meetings: Meeting[]
  selectedId: string | null
  now: number
  onSelect: (id: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const phaseLabel = useMeetingPhaseLabel()
  const groupLabels: Record<MeetingListGroupId, string> = {
    today: t('meetings.group.today', 'Today'),
    upcoming: t('meetings.group.upcoming', 'Upcoming'),
    past: t('meetings.group.past', 'Past')
  }
  const groups = groupMeetingsByDay(meetings, now)
  // One tab stop for the list: the current row, or the first when none is current.
  const tabStopId = selectedId ?? groups[0]?.meetings[0]?.id

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ROW_SELECTOR))
    const index = event.target instanceof HTMLElement ? rows.indexOf(event.target) : -1
    const next =
      event.key === 'ArrowDown'
        ? index + 1
        : event.key === 'ArrowUp'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? rows.length - 1
              : -1
    if (index === -1 || !rows[next]) {
      return
    }
    event.preventDefault()
    rows[next].focus()
  }

  return (
    <div className="flex flex-col gap-3 px-2 py-3" onKeyDown={handleKeyDown}>
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`meetings-group-${group.id}`}>
          <h2
            id={`meetings-group-${group.id}`}
            className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {groupLabels[group.id]}
          </h2>
          <ul>
            {group.meetings.map((meeting) => {
              const current = meeting.id === selectedId
              const open = meeting.followUps.filter((f) => isOpenFollowUp(f, inaxTaskStatus)).length
              const time = formatMeetingTime(meeting.startsAt, intlLocale)
              return (
                <li key={meeting.id}>
                  <button
                    type="button"
                    data-meeting-row={meeting.id}
                    data-current={current || undefined}
                    aria-current={current ? 'true' : undefined}
                    tabIndex={meeting.id === tabStopId ? 0 : -1}
                    onClick={() => onSelect(meeting.id)}
                    className={cn(
                      'flex w-full cursor-pointer flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent data-current:bg-accent',
                      MEETING_FOCUS_RING
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                        {meeting.title}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {/* Other days show the day only; the detail header has the time. */}
                        {group.id === 'today'
                          ? time
                          : formatMeetingShortDay(meeting.startsAt, intlLocale)}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      {meeting.phase === 'recording' ? (
                        <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
                      ) : null}
                      <span
                        className={meeting.phase === 'recording' ? 'text-foreground' : undefined}
                      >
                        {phaseLabel(meeting)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>
                        {t('meetings.attendeeCount', 'Attendees {{count}}', {
                          count: meeting.attendees.length
                        })}
                      </span>
                      {open > 0 ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="text-foreground">
                            {t('meetings.openFollowUpCount', 'Open follow-ups {{count}}', {
                              count: open
                            })}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
