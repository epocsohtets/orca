import React from 'react'
import { FileText, Mic, Users } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { HomeAvatarStack, HomeRow } from '@/components/home/HomeCard'
import type { HomeProjectId } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { personName } from './meeting-people'
import { invitedToAnswer, meetingAccess } from './meeting-rules'
import { MeetingAnswerMenu } from './MeetingAnswerMenu'
import { useMeetingState, useMeetingText } from './MeetingParts'
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

/** Meetings as Home lists tasks: state, title, state chip, project, who, when. A row opens its meeting. */
export function MeetingList({
  meetings,
  projects,
  onSelect
}: {
  meetings: readonly Meeting[]
  projects: Record<HomeProjectId, HomeProject>
  onSelect: (id: string) => void
}): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const stateOf = useMeetingState()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  if (meetings.length === 0) {
    return null
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
    <ul className="mx-4" onKeyDown={(event) => moveRowFocus(event, '[data-meeting-row]')}>
      {meetings.map((meeting) => {
        const state = stateOf(meeting)
        return (
          <HomeRow
            key={meeting.id}
            button={{ 'data-meeting-row': meeting.id }}
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
            tip={[state.label, roleOf(meeting), text.when(meeting)].join(' · ')}
            chip={state.chip}
            project={projects[meeting.project]}
            people={
              // Why two spans: a display class on one span would win over the container rule that hides it.
              <span className="@max-[38rem]/home-card:hidden" data-meeting-people-stack="">
                <span className="flex w-[60px]">
                  <HomeAvatarStack
                    names={[meeting.hostId, ...meeting.attendeeIds].map(personName)}
                  />
                </span>
              </span>
            }
            date={text.whenShort(meeting)}
            onClick={() => onSelect(meeting.id)}
            // The one button a row may carry: an invitation waiting on my answer (R3).
            action={
              invitedToAnswer(meeting, viewerId) ? (
                <MeetingAnswerMenu meetingId={meeting.id} />
              ) : null
            }
          />
        )
      })}
    </ul>
  )
}
