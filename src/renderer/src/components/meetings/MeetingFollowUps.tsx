import React, { useState } from 'react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { openMeeting, openMeetingTask } from './meeting-navigation'
import { MEETING_PEOPLE, personName } from './meeting-people'
import { followUpCounts, followUpState } from './meeting-rules'
import { MeetingSection, useMeetingText } from './MeetingParts'
import type { Meeting } from './meeting-types'
import { acceptFollowUp, assignFollowUps, setFollowUpDeclined, useMeetings } from './meetings-store'

/**
 * Follow-ups and where each one stands. Each is one task: the owner takes the bot's proposal, or the
 * host creates and assigns the rest in one go. Statuses are read from the tasks, never copied.
 */
export function MeetingFollowUps({ meeting }: { meeting: Meeting }): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  const isHost = meeting.hostId === viewerId
  // The host's edits to the agent's draft: a different owner, or a follow-up left out.
  const [owners, setOwners] = useState<Record<string, string>>({})
  const [skipped, setSkipped] = useState<string[]>([])
  const counts = followUpCounts(meeting.followUps, tasks)
  if (counts.total === 0) {
    return null
  }
  const ownerOf = (id: string, suggested: string, declined: boolean): string =>
    owners[id] ?? (declined ? '' : suggested)
  const batch = meeting.followUps
    .filter((f) => followUpState(f, tasks).kind !== 'task' && !skipped.includes(f.id))
    .map((f) => ({ followUpId: f.id, assigneeId: ownerOf(f.id, f.suggestedOwnerId, f.declined) }))
    .filter((row) => row.assigneeId)

  return (
    <MeetingSection title={t('meetings.followUps.title', 'Follow-up tasks')}>
      <p className="mb-1 text-xs text-muted-foreground" data-meeting-follow-up-counts="">
        {t(
          'meetings.followUps.counts',
          '{{total}} in all · To do {{todo}} · In progress {{inProgress}} · Done {{done}} · Not a task yet {{open}}',
          counts
        )}
      </p>
      <ul className="divide-y divide-border">
        {/* The reader's own follow-ups come first: 30 seconds is the decisions and "mine". */}
        {[...meeting.followUps]
          .sort(
            (a, b) =>
              Number(b.suggestedOwnerId === viewerId) - Number(a.suggestedOwnerId === viewerId)
          )
          .map((followUp) => {
            const state = followUpState(followUp, tasks)
            const mine = followUp.suggestedOwnerId === viewerId
            const owner = personName(followUp.suggestedOwnerId)
            const included = !skipped.includes(followUp.id)
            return (
              <li
                key={followUp.id}
                data-meeting-follow-up={state.kind}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5"
              >
                {isHost && state.kind !== 'task' ? (
                  <Checkbox
                    checked={included}
                    aria-label={t('meetings.followUps.include', 'Make “{{text}}” a task', {
                      text: followUp.text
                    })}
                    onCheckedChange={(checked) =>
                      setSkipped((current) =>
                        checked
                          ? current.filter((id) => id !== followUp.id)
                          : [...current, followUp.id]
                      )
                    }
                  />
                ) : null}
                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-[13px] font-medium text-foreground">{followUp.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {mine ? (
                      <span className="font-medium text-foreground">
                        {t('meetings.followUps.mine', 'Mine')}
                        {' · '}
                      </span>
                    ) : null}
                    {state.kind === 'task'
                      ? `${personName(state.task.assigneeId)} · ${text.status[state.task.status]} · ${
                          state.task.route === 'accepted'
                            ? t('meetings.followUps.accepted', 'Taken by the owner')
                            : t('meetings.followUps.assigned', 'Assigned by the host')
                        }`
                      : state.kind === 'declined'
                        ? t('meetings.followUps.declined', '{{name}} said it is not theirs', {
                            name: owner
                          })
                        : t('meetings.followUps.proposed', 'Proposed to {{name}} · no answer yet', {
                            name: owner
                          })}
                    {' · '}
                    {text.due(followUp.due)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => openMeeting(meeting.id, { turnId: followUp.turnId })}
                  >
                    {t('meetings.source', 'Where it was said')}
                  </Button>
                  {state.kind === 'task' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => openMeetingTask(state.task.id)}
                    >
                      {t('meetings.openTask', 'Open task')}
                    </Button>
                  ) : isHost ? (
                    <Select
                      value={ownerOf(followUp.id, followUp.suggestedOwnerId, followUp.declined)}
                      onValueChange={(value) =>
                        setOwners((current) => ({ ...current, [followUp.id]: value }))
                      }
                    >
                      <SelectTrigger
                        size="xs"
                        aria-label={t('meetings.followUps.owner', 'Owner of “{{text}}”', {
                          text: followUp.text
                        })}
                      >
                        <SelectValue
                          placeholder={t('meetings.followUps.chooseOwner', 'Choose owner')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_PEOPLE.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : mine && state.kind === 'proposed' ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setFollowUpDeclined(meeting.id, followUp.id, true)}
                      >
                        {t('meetings.notMine', 'Not mine')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => acceptFollowUp(meeting.id, followUp.id)}
                      >
                        {t('meetings.accept', 'Take it')}
                      </Button>
                    </>
                  ) : mine && state.kind === 'declined' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => acceptFollowUp(meeting.id, followUp.id)}
                    >
                      {t('meetings.acceptAfterAll', 'Take it after all')}
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
      </ul>
      {isHost && counts.open > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Button
            type="button"
            size="sm"
            disabled={batch.length === 0}
            data-meeting-assign-all=""
            onClick={() => {
              assignFollowUps(meeting.id, batch)
              toast.success(
                t(
                  'meetings.followUps.assignedToast',
                  '{{count}} tasks created in To do. The meeting bot tells each owner.',
                  { count: batch.length }
                )
              )
            }}
          >
            {t('meetings.followUps.assignAll', 'Create {{count}} tasks and assign', {
              count: batch.length
            })}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t(
              'meetings.followUps.assignHelp',
              'The agent drafted these from the meeting. Change an owner or untick a line that is wrong.'
            )}
          </p>
        </div>
      ) : null}
    </MeetingSection>
  )
}
