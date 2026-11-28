import React from 'react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { Label } from '@/components/ui/label'
import {
  HOME_FOCUS_RING_CLASS,
  HOME_META_CLASS,
  HomeAvatar,
  HomeWhoMarker
} from '@/components/home/HomeCard'
import type { HomeTaskWho } from '@/components/home/home-board'
import { personName } from './meeting-people'
import { followUpCounts, followUpState, meetingAccess } from './meeting-rules'
import { dayDistance } from './meeting-schedule'
import type { Meeting, MeetingTaskStatus } from './meeting-types'
import { useMeetings } from './meetings-store'

// One focus ring for Home and Meetings.
export const MEETING_FOCUS_RING = HOME_FOCUS_RING_CLASS

export type MeetingState = { who: NonNullable<HomeTaskWho> | null; label: string }

/**
 * Where a meeting stands for the person looking, in Home's own state words and glyphs: recording, waiting on
 * me, minutes ready, or scheduled.
 */
export function useMeetingState(): (meeting: Meeting) => MeetingState {
  const t = useTranslate()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  return (meeting) => {
    if (meeting.recordingStartedAt !== null) {
      return { who: 'agentWorking', label: t('meetings.state.recording', 'Recording now') }
    }
    if (!meeting.minutes) {
      return {
        who: null,
        label:
          meeting.outline || meeting.materials.length > 0
            ? t('meetings.state.scheduledPrep', 'Scheduled · prep ready')
            : t('meetings.state.scheduledNoPrep', 'Scheduled')
      }
    }
    if (meetingAccess(meeting, viewerId, tasks) === 'excerpt') {
      return {
        who: null,
        label: t('meetings.state.myTasks', 'My tasks from it: {{count}}', {
          count: tasks.filter(
            (task) => task.meetingId === meeting.id && task.assigneeId === viewerId
          ).length
        })
      }
    }
    const open = meeting.followUps.filter((f) => followUpState(f, tasks).kind !== 'task')
    const mine = open.filter((f) => f.suggestedOwnerId === viewerId && !f.declined).length
    const toSort = meeting.hostId === viewerId ? open.length - mine : 0
    if (mine > 0) {
      return {
        who: 'waiting',
        label: t('meetings.state.waitingMine', 'Needs me · {{count}} items for me', { count: mine })
      }
    }
    if (toSort > 0) {
      return {
        who: 'waiting',
        label: t('meetings.state.waitingSort', 'Needs me · {{count}} follow-ups to sort', {
          count: toSort
        })
      }
    }
    const counts = followUpCounts(meeting.followUps, tasks)
    return {
      who: 'draft',
      label:
        counts.total === 0
          ? t('meetings.state.minutes', 'Minutes ready')
          : t(
              'meetings.state.minutesFollowUps',
              'Minutes ready · {{done}} of {{total}} follow-ups done',
              { done: counts.done, total: counts.total }
            )
    }
  }
}

/** A meeting's state as Home draws a task's: the agent state glyph, then words. */
export function MeetingStateMarker({ state }: { state: MeetingState }): React.JSX.Element {
  return state.who ? (
    <HomeWhoMarker who={state.who} label={state.label} />
  ) : (
    <span className={`truncate ${HOME_META_CLASS}`}>{state.label}</span>
  )
}

/** Small avatars of a meeting's people, host first; past three they become a count. */
export function MeetingPeopleStack({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const ids = [meeting.hostId, ...meeting.attendeeIds]
  return (
    <span className="flex items-center gap-0.5" data-meeting-people-stack="">
      {ids.slice(0, 3).map((id) => (
        <HomeAvatar key={id} name={personName(id)} />
      ))}
      {ids.length > 3 ? (
        <span className={`ml-0.5 tabular-nums ${HOME_META_CLASS}`}>+{ids.length - 3}</span>
      ) : null}
    </span>
  )
}

const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
const DAY: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'short' }

export type MeetingText = {
  time: (timestamp: number) => string
  /** "Today" / "Tomorrow" / "Yesterday" by the scenario day, else the date. */
  day: (timestamp: number) => string
  date: (timestamp: number) => string
  when: (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>) => string
  /** As `when`, with the weekday beside "today" and "tomorrow" too: "Tomorrow (Tue) 15:00–15:30". */
  whenWithWeekday: (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>) => string
  due: (dateKey: string) => string
  /** The date of a due day alone, for a column that is already headed "Due". */
  dueDate: (dateKey: string) => string
  status: Record<MeetingTaskStatus, string>
  /** A length with its units, such as "12 min 40 sec": never read as a time of day. */
  elapsed: (seconds: number) => string
}

export function useMeetingText(): MeetingText {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const today = useMeetings((state) => state.day)
  const time = (timestamp: number): string => uiDateTimeFormat(TIME, intlLocale).format(timestamp)
  const date = (timestamp: number): string => uiDateTimeFormat(DAY, intlLocale).format(timestamp)
  const day = (timestamp: number): string => {
    const distance = dayDistance(today, timestamp)
    return distance === 0
      ? t('meetings.day.today', 'Today')
      : distance === 1
        ? t('meetings.day.tomorrow', 'Tomorrow')
        : distance === -1
          ? t('meetings.day.yesterday', 'Yesterday')
          : date(timestamp)
  }
  const dueDate = (dateKey: string): string => {
    const [year, month, dayOfMonth] = dateKey.split('-').map(Number)
    return day(new Date(year, month - 1, dayOfMonth).getTime())
  }
  // A meeting that ends on another day says so.
  const span = (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>): string =>
    dayDistance(meeting.startsAt, meeting.endsAt) === 0
      ? `${time(meeting.startsAt)}–${time(meeting.endsAt)}`
      : `${time(meeting.startsAt)} – ${day(meeting.endsAt)} ${time(meeting.endsAt)}`
  const when = (meeting: Pick<Meeting, 'startsAt' | 'endsAt'>): string =>
    `${day(meeting.startsAt)} ${span(meeting)}`
  return {
    time,
    day,
    date,
    when,
    whenWithWeekday: (meeting) => {
      const near = Math.abs(dayDistance(today, meeting.startsAt)) <= 1
      const weekday = uiDateTimeFormat({ weekday: 'short' }, intlLocale).format(meeting.startsAt)
      return near ? `${day(meeting.startsAt)}(${weekday}) ${span(meeting)}` : when(meeting)
    },
    due: (dateKey) => t('meetings.due', 'Due {{date}}', { date: dueDate(dateKey) }),
    dueDate,
    elapsed: (seconds) => {
      const whole = Math.max(0, Math.floor(seconds))
      const [h, m, s] = [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60]
      return h > 0
        ? t('meetings.elapsed.hours', '{{h}} hr {{m}} min', { h, m })
        : m > 0
          ? t('meetings.elapsed.minutes', '{{m}} min {{s}} sec', { m, s })
          : t('meetings.elapsed.seconds', '{{s}} sec', { s })
    },
    status: {
      todo: t('meetings.status.todo', 'To do'),
      inProgress: t('meetings.status.inProgress', 'In progress'),
      done: t('meetings.status.done', 'Done')
    }
  }
}

/** One titled block; `action` sits at the end of the heading row. */
export function MeetingSection({
  title,
  action,
  children
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="min-w-0">
      <div className="mb-1 flex min-h-6 items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Label above the control, help under the label, error under the control. */
export function MeetingFormField({
  id,
  label,
  description,
  error,
  children
}: {
  id: string
  label: string
  description?: string
  error?: string | null
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p id={`${id}-description`} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** The aria wiring a control inside MeetingFormField needs. */
export function fieldAria(
  id: string,
  error: string | null | undefined,
  hasDescription = false
): { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined } {
  return {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : hasDescription ? `${id}-description` : undefined
  }
}
