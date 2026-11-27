import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { followUpCounts, meetingAccess } from './meeting-rules'
import { MEETING_FOCUS_RING, useMeetingText } from './MeetingParts'
import type { Meeting, MeetingTask } from './meeting-types'
import { scenarioNow, useMeetings } from './meetings-store'

/** Up/Down/Home/End move between the rows of one list; the list is a single tab stop. */
export function moveRowFocus(event: React.KeyboardEvent<HTMLElement>, selector: string): void {
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(selector))
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

/** What a meeting is waiting for, in words a visitor understands without the app's states. */
export function useMeetingStateLine(): (meeting: Meeting, tasks: readonly MeetingTask[]) => string {
  const t = useTranslate()
  return (meeting, tasks) => {
    if (meeting.recordingStartedAt !== null) {
      return t('meetings.state.recording', 'Recording now')
    }
    if (!meeting.minutes) {
      return t('meetings.state.scheduled', 'Scheduled')
    }
    const counts = followUpCounts(meeting.followUps, tasks)
    return counts.total === 0
      ? t('meetings.state.minutes', 'Minutes ready')
      : t(
          'meetings.state.minutesFollowUps',
          'Minutes ready · {{done}} of {{total}} follow-ups done',
          {
            done: counts.done,
            total: counts.total
          }
        )
  }
}

/** Upcoming soonest first, then past newest first. */
function byNearness(now: number): (a: Meeting, b: Meeting) => number {
  return (a, b) => {
    const aPast = a.endsAt < now && a.recordingStartedAt === null
    const bPast = b.endsAt < now && b.recordingStartedAt === null
    return aPast === bPast
      ? aPast
        ? b.startsAt - a.startsAt
        : a.startsAt - b.startsAt
      : aPast
        ? 1
        : -1
  }
}

export function MeetingList({
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
  const day = useMeetings((state) => state.day)
  const sorted = [...meetings].sort(byNearness(scenarioNow(day)))
  const groups = [
    {
      id: 'hosting',
      title: t('meetings.list.hosting', 'Meetings I host'),
      meetings: sorted.filter((m) => m.hostId === viewerId)
    },
    {
      id: 'attending',
      title: t('meetings.list.attending', 'Meetings I attend'),
      meetings: sorted.filter((m) => m.attendeeIds.includes(viewerId))
    },
    {
      id: 'shared',
      title: t('meetings.list.shared', 'Minutes shared with me'),
      meetings: sorted.filter((m) => m.shares.some((entry) => entry.personId === viewerId))
    },
    {
      id: 'assigned',
      title: t('meetings.list.assigned', 'Meetings my tasks came from'),
      meetings: sorted.filter((m) => meetingAccess(m, viewerId, tasks) === 'excerpt')
    }
  ].filter((group) => group.meetings.length > 0)
  const tabStopId = selectedId ?? groups[0]?.meetings[0]?.id

  if (groups.length === 0) {
    return (
      <p className="px-4 py-6 text-xs text-muted-foreground">
        {t(
          'meetings.list.empty',
          'No meetings yet. A meeting you host or are invited to appears here and on your schedule.'
        )}
      </p>
    )
  }
  return (
    <div
      className="flex flex-col gap-3 px-2 py-3"
      onKeyDown={(event) => moveRowFocus(event, '[data-meeting-row]')}
    >
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`meetings-group-${group.id}`}>
          <h2
            id={`meetings-group-${group.id}`}
            className="px-2 pb-1 text-2xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            {group.title}
          </h2>
          <ul>
            {group.meetings.map((meeting) => {
              const current = meeting.id === selectedId
              const recording = meeting.recordingStartedAt !== null
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
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {meeting.title}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {text.when(meeting)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {recording ? (
                        <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
                      ) : null}
                      <span className={recording ? 'text-foreground' : undefined}>
                        {group.id === 'assigned'
                          ? // Someone who was not there sees their own part, not the meeting's totals.
                            t('meetings.state.myTasks', 'My tasks from it: {{count}}', {
                              count: tasks.filter(
                                (task) =>
                                  task.meetingId === meeting.id && task.assigneeId === viewerId
                              ).length
                            })
                          : stateLine(meeting, tasks)}
                      </span>
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
