import React from 'react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { HOME_META_CLASS, HomeAvatar, HomeCard } from '@/components/home/HomeCard'
import { MEETING_PEOPLE, personName } from './meeting-people'
import { isParticipant, meetingAccess } from './meeting-rules'
import type { Meeting } from './meeting-types'
import { declineMinutesRequest, requestMinutes, shareMinutes } from './meeting-sharing-actions'
import { useMeetings } from './meetings-store'

function useShare(meeting: Meeting): (personId: string) => void {
  const t = useTranslate()
  return (personId) => {
    shareMinutes(meeting.id, personId)
    toast.success(
      t('meetings.share.done', 'The meeting agent sent {{name}} the link to the full minutes.', {
        name: personName(personId)
      })
    )
  }
}

/** Shares the minutes by link with someone who was not in the meeting. */
export function MinutesShareButton({ meeting }: { meeting: Meeting }): React.JSX.Element | null {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  const tasks = useMeetings((state) => state.tasks)
  const share = useShare(meeting)
  const outside = MEETING_PEOPLE.filter(
    (person) => meetingAccess(meeting, person.id, tasks) !== 'full'
  )
  if (!isParticipant(meeting, viewerId) || outside.length === 0) {
    return null
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" data-meeting-share="">
          {t('meetings.share.button', 'Share link')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {outside.map((person) => (
          <DropdownMenuItem key={person.id} onSelect={() => share(person.id)}>
            {person.name}
            <span className="text-muted-foreground">{person.role}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** On the minutes: who sees what, who got them by link, and requests waiting on the host. */
export function MinutesScopeCard({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  const share = useShare(meeting)
  const pending = meeting.requests.filter((request) => !request.declined)
  // People with a task from this meeting who were not in it and have not been given the minutes.
  const outside = useMeetings((state) => state.tasks)
    .filter((task) => task.meetingId === meeting.id)
    .map((task) => task.assigneeId)
    .filter(
      (id, index, all) =>
        all.indexOf(id) === index &&
        !isParticipant(meeting, id) &&
        !meeting.shares.some((entry) => entry.personId === id)
    )
  return (
    <HomeCard title={t('meetings.share.card', 'Who sees what')} data-meeting-card="scope">
      <div data-meeting-sharing="">
        <ul className="mx-4 text-[13px] leading-5">
          {[
            ...[meeting.hostId, ...meeting.attendeeIds].map((id) => ({ id, part: false })),
            ...meeting.shares.map((entry) => ({ id: entry.personId, part: false })),
            ...outside.map((id) => ({ id, part: true }))
          ].map((row) => (
            <li
              key={row.id}
              data-meeting-scope={row.id}
              className="flex h-9 items-center justify-between gap-4 border-t border-border"
            >
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                <HomeAvatar name={personName(row.id)} />
                <span className="truncate">{personName(row.id)}</span>
              </span>
              <span className={`shrink-0 ${HOME_META_CLASS}`}>
                {row.part
                  ? t('meetings.share.excerpt', 'Excerpt')
                  : t('meetings.share.whole', 'Full minutes')}
              </span>
            </li>
          ))}
        </ul>
        {meeting.hostId === viewerId && pending.length > 0 ? (
          <ul className="mx-4">
            {pending.map((request) => (
              <li
                key={request.personId}
                data-meeting-request={request.personId}
                className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border py-1.5"
              >
                <span className="flex min-w-0 flex-1 basis-48 items-center gap-2">
                  <HomeAvatar name={personName(request.personId)} />
                  <span className="text-[13px] leading-5 text-foreground">
                    {t('meetings.notice.requestTitle', '{{name}} asks to see the minutes', {
                      name: personName(request.personId)
                    })}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => declineMinutesRequest(meeting.id, request.personId)}
                  >
                    {t('meetings.share.decline', 'Decline')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => share(request.personId)}
                  >
                    {t('meetings.share.approve', 'Approve')}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </HomeCard>
  )
}

/** For an assignee who was not in the meeting: ask the host for the full minutes, and see the answer. */
export function MinutesRequestControl({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  const request = meeting.requests.find((entry) => entry.personId === viewerId)
  const host = personName(meeting.hostId)
  return request ? (
    <p className={HOME_META_CLASS} data-meeting-request-state="">
      {request.declined
        ? t('meetings.share.requestDeclined', '{{name}} did not share the full minutes.', {
            name: host
          })
        : t('meetings.share.requested', 'Asked {{name}}.', {
            name: host
          })}
    </p>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-meeting-request-minutes=""
      onClick={() => requestMinutes(meeting.id)}
    >
      {t('meetings.share.requestButton', 'Ask to see the full minutes')}
    </Button>
  )
}
