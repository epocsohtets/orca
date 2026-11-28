import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { HOME_META_CLASS, HOME_ROW_BUTTON_CLASS, HomeProjectDot } from '@/components/home/HomeCard'
import type { HomeProjectId } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { meetingAccess } from './meeting-rules'
import {
  MeetingPeopleStack,
  MeetingStateMarker,
  useMeetingState,
  useMeetingText
} from './MeetingParts'
import type { Meeting } from './meeting-types'
import { useMeetings } from './meetings-store'

/** Up/Down/Home/End move between the rows of one list. */
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

/** Meetings as Home lists tasks: title and state, project, who, when. A row opens its meeting. */
export function MeetingList({
  meetings,
  projects,
  empty,
  onSelect
}: {
  meetings: readonly Meeting[]
  projects: Record<HomeProjectId, HomeProject>
  empty: string
  onSelect: (id: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const stateOf = useMeetingState()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  if (meetings.length === 0) {
    return <p className={`px-4 py-3 ${HOME_META_CLASS}`}>{empty}</p>
  }
  const roleOf = (meeting: Meeting): string =>
    meeting.hostId === viewerId
      ? t('meetings.role.host', 'I host')
      : meeting.attendeeIds.includes(viewerId)
        ? t('meetings.role.attendee', 'I attend')
        : meetingAccess(meeting, viewerId, tasks) === 'full'
          ? t('meetings.role.shared', 'Shared with me')
          : t('meetings.role.assignee', 'My task')
  return (
    <ul
      className="divide-y divide-border border-t border-border"
      onKeyDown={(event) => moveRowFocus(event, '[data-meeting-row]')}
    >
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <button
            type="button"
            data-meeting-row={meeting.id}
            className={`${HOME_ROW_BUTTON_CLASS} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 @min-[38rem]/home-card:grid-cols-[minmax(0,1fr)_8.5rem_4.5rem_3.5rem_9.5rem]`}
            onClick={() => onSelect(meeting.id)}
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="line-clamp-2 text-[13px] font-medium text-foreground">
                {meeting.title}
              </span>
              <MeetingStateMarker state={stateOf(meeting)} />
            </span>
            <span className="min-w-0 @max-[38rem]/home-card:hidden">
              <HomeProjectDot project={projects[meeting.project]} />
            </span>
            <span className="@max-[38rem]/home-card:hidden">
              <MeetingPeopleStack meeting={meeting} />
            </span>
            <span className={`truncate @max-[38rem]/home-card:hidden ${HOME_META_CLASS}`}>
              {roleOf(meeting)}
            </span>
            <span className={`text-right tabular-nums ${HOME_META_CLASS}`}>
              {text.when(meeting)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
