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
import { MEETING_PEOPLE, personName } from './meeting-people'
import { isParticipant, meetingAccess } from './meeting-rules'
import type { Meeting } from './meeting-types'
import { declineMinutesRequest, requestMinutes, shareMinutes, useMeetings } from './meetings-store'

/**
 * On the minutes, for the people who were in the meeting: who sees what, sharing the minutes by link
 * with someone who was not there, and requests for them waiting on the host.
 */
export function MinutesSharing({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  const tasks = useMeetings((state) => state.tasks)
  const canShare = isParticipant(meeting, viewerId)
  const outside = MEETING_PEOPLE.filter(
    (person) => meetingAccess(meeting, person.id, tasks) !== 'full'
  )
  const pending = meeting.requests.filter((request) => !request.declined)
  const share = (personId: string): void => {
    shareMinutes(meeting.id, personId)
    toast.success(
      t('meetings.share.done', 'The meeting agent sent {{name}} the link to the full minutes.', {
        name: personName(personId)
      })
    )
  }
  return (
    <div className="flex flex-col gap-1.5" data-meeting-sharing="">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 basis-80 text-xs text-muted-foreground">
          {t(
            'meetings.share.scope',
            'The {{count}} people who were in the meeting see the full minutes. An assignee who was not there sees only their task and the sentence it came from.',
            { count: meeting.attendeeIds.length + 1 }
          )}
          {meeting.shares.length > 0
            ? ` ${t('meetings.share.sharedWith', 'Shared by link with {{names}}.', {
                names: meeting.shares.map((entry) => personName(entry.personId)).join(', ')
              })}`
            : ''}
        </p>
        {canShare && outside.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="xs" data-meeting-share="">
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
        ) : null}
      </div>
      {meeting.hostId === viewerId
        ? pending.map((request) => (
            <div
              key={request.personId}
              data-meeting-request={request.personId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-1.5"
            >
              <p className="min-w-0 flex-1 basis-64 text-[13px] text-foreground">
                {t('meetings.share.request', '{{name}} asks to see the full minutes.', {
                  name: personName(request.personId)
                })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => declineMinutesRequest(meeting.id, request.personId)}
              >
                {t('meetings.share.decline', 'Not now')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => share(request.personId)}
              >
                {t('meetings.share.approve', 'Approve')}
              </Button>
            </div>
          ))
        : null}
    </div>
  )
}

/** For an assignee who was not in the meeting: ask the host for the full minutes, and see the answer. */
export function MinutesRequestControl({ meeting }: { meeting: Meeting }): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  const request = meeting.requests.find((entry) => entry.personId === viewerId)
  const host = personName(meeting.hostId)
  return request ? (
    <p className="text-xs text-muted-foreground" data-meeting-request-state="">
      {request.declined
        ? t('meetings.share.requestDeclined', '{{name}} did not share the full minutes.', {
            name: host
          })
        : t('meetings.share.requested', 'Asked. {{name}} sees your request on the minutes.', {
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
