import React, { useState } from 'react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { HOME_META_CLASS, HomeAvatar, HomeCard, HomeWhoMarker } from '@/components/home/HomeCard'
import { InaxStatusBadge } from '@/components/task-page/inax/inax-status-badge'
import { openMeeting, openMeetingTask } from './meeting-navigation'
import { MEETING_PEOPLE, personName } from './meeting-people'
import { followUpCounts, followUpState, isParticipant, type FollowUpState } from './meeting-rules'
import { useMeetingText } from './MeetingParts'
import type { Meeting, MeetingFollowUp } from './meeting-types'
import { acceptFollowUp, assignFollowUps, setFollowUpDeclined, useMeetings } from './meetings-store'

// The table style of Home's "Agents and bots".
const HEAD_CLASS =
  'px-4 py-2 text-left text-2xs font-medium whitespace-nowrap uppercase tracking-wider'
const CELL_CLASS = 'px-4 py-2 align-middle'

/** The one state of a follow-up: its task's status, or where the offer stands. */
function FollowUpStateCell({
  state,
  asked = true,
  ownerId
}: {
  state: FollowUpState
  /** False when the suggested owner was not in the meeting: the agent offers only to people who were. */
  asked?: boolean
  /** Whose answer an offer waits for; left out on a list of my own offers. */
  ownerId?: string
}): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((store) => store.viewerId)
  if (state.kind === 'proposed' && !asked) {
    return (
      <HomeWhoMarker
        who="waiting"
        label={t('meetings.followUps.stateUnasked', 'Not assigned yet')}
      />
    )
  }
  return state.kind === 'task' ? (
    <InaxStatusBadge status={state.task.status} />
  ) : state.kind === 'declined' ? (
    <Badge variant="warning">{t('meetings.followUps.stateDeclined', 'Says not theirs')}</Badge>
  ) : (
    <HomeWhoMarker
      who="waiting"
      label={
        ownerId && ownerId !== viewerId
          ? t('meetings.followUps.stateWaiting', 'Waiting for {{name}}’s answer', {
              name: personName(ownerId)
            })
          : t('meetings.tiles.mineOpenOne', 'Waiting for my answer')
      }
    />
  )
}

function Person({ id }: { id: string }): React.JSX.Element {
  const name = personName(id)
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-foreground">
      <HomeAvatar name={name} />
      {name}
    </span>
  )
}

/** Take or decline what the meeting agent offered me. */
function MyAnswer({
  meeting,
  followUp,
  state
}: {
  meeting: Meeting
  followUp: MeetingFollowUp
  state: FollowUpState
}): React.JSX.Element | null {
  const t = useTranslate()
  if (state.kind === 'proposed') {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setFollowUpDeclined(meeting.id, followUp.id, true)}
        >
          {t('home.task.offerDecline', 'Not mine')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          data-meeting-accept={followUp.id}
          onClick={() => acceptFollowUp(meeting.id, followUp.id)}
        >
          {t('home.task.offerAccept', 'Add to My work')}
        </Button>
      </>
    )
  }
  return state.kind === 'declined' ? (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => acceptFollowUp(meeting.id, followUp.id)}
    >
      {t('home.task.offerAccept', 'Add to My work')}
    </Button>
  ) : null
}

/** In Key points: what is mine from this meeting, where I answer the offer in place. */
export function MeetingMyPart({ meeting }: { meeting: Meeting }): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  const mine = meeting.followUps
    .map((followUp) => ({ followUp, state: followUpState(followUp, tasks) }))
    .filter(({ followUp, state }) =>
      state.kind === 'task'
        ? state.task.assigneeId === viewerId
        : followUp.suggestedOwnerId === viewerId
    )
  return (
    <section aria-label={t('meetings.followUps.mine', 'Mine')} data-meeting-my-part="">
      <h3 className="flex items-baseline gap-2 px-4 py-1 text-xs font-medium text-muted-foreground">
        {t('meetings.followUps.mine', 'Mine')}
        <span className="tabular-nums">{mine.length}</span>
      </h3>
      {mine.length === 0 ? (
        <p className={`px-4 py-2 ${HOME_META_CLASS}`}>
          {t('meetings.bot.noProposals', 'Nothing in this meeting looks like yours.')}
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {mine.map(({ followUp, state }) => (
            <li
              key={followUp.id}
              data-meeting-my-follow-up={state.kind}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2"
            >
              <span className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                <span className="text-[13px] font-medium text-foreground">{followUp.text}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <FollowUpStateCell state={state} />
                  <span className={HOME_META_CLASS}>{text.due(followUp.due)}</span>
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="link"
                  size="inlineText"
                  className="mr-1.5"
                  onClick={() => openMeeting(meeting.id, { turnId: followUp.turnId })}
                >
                  {t('meetings.source', 'Where it was said')}
                </Button>
                {state.kind === 'task' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => openMeetingTask(state.task.id)}
                  >
                    {t('meetings.openTask', 'Open task')}
                  </Button>
                ) : (
                  <MyAnswer meeting={meeting} followUp={followUp} state={state} />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Every follow-up and where it stands, as a table (my own are answered under Key points). Each is one task: the owner takes the agent's offer, or the
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
  const ownerOf = (followUp: MeetingFollowUp): string =>
    owners[followUp.id] ?? (followUp.declined ? '' : followUp.suggestedOwnerId)
  const batch = meeting.followUps
    .filter((f) => followUpState(f, tasks).kind !== 'task' && !skipped.includes(f.id))
    .map((f) => ({ followUpId: f.id, assigneeId: ownerOf(f) }))
    .filter((row) => row.assigneeId)
  const ownerCount = new Set(batch.map((row) => row.assigneeId)).size
  const organising = isHost && counts.open > 0

  return (
    <HomeCard
      title={t('meetings.followUps.title', 'Follow-up tasks')}
      aside={
        <span data-meeting-follow-up-counts="">
          {t(
            'meetings.followUps.counts',
            '{{total}} in all · To do {{todo}} · In progress {{inProgress}} · Done {{done}} · Not settled yet {{open}}',
            counts
          )}
        </span>
      }
      data-meeting-card="follow-ups"
    >
      <div className="scrollbar-sleek overflow-x-auto border-t border-border">
        <table className="w-full min-w-[40rem] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className={HEAD_CLASS}>
                {t('meetings.followUps.colTask', 'Task')}
              </th>
              <th scope="col" className={HEAD_CLASS}>
                {t('meetings.followUps.colOwner', 'Owner')}
              </th>
              <th scope="col" className={HEAD_CLASS}>
                {t('home.agents.colState', 'State')}
              </th>
              <th scope="col" className={HEAD_CLASS}>
                {t('taskLoop.detail.due', 'Due')}
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-right`}>
                <span className="sr-only">{t('meetings.followUps.colActions', 'Actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {meeting.followUps.map((followUp) => {
              const state = followUpState(followUp, tasks)
              const included = !skipped.includes(followUp.id)
              return (
                <tr key={followUp.id} data-meeting-follow-up={state.kind}>
                  <td className={CELL_CLASS}>
                    <span className="flex items-start gap-2.5">
                      {organising ? (
                        state.kind === 'task' ? (
                          <span aria-hidden className="size-4 shrink-0" />
                        ) : (
                          <Checkbox
                            className="mt-0.5"
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
                        )
                      ) : null}
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-medium text-foreground">{followUp.text}</span>
                        <span className={HOME_META_CLASS}>
                          {state.kind === 'task'
                            ? state.task.route === 'accepted'
                              ? t('meetings.followUps.accepted', 'Taken by the owner')
                              : isHost
                                ? t('meetings.followUps.assignedByMe', 'Assigned by me')
                                : t('meetings.excerpt.assignedBy', 'Assigned by {{name}}', {
                                    name: personName(meeting.hostId)
                                  })
                            : isParticipant(meeting, followUp.suggestedOwnerId)
                              ? t('meetings.followUps.proposedTo', 'Offered by the meeting agent')
                              : t(
                                  'meetings.followUps.suggestedOutside',
                                  '{{name}} was not in the meeting',
                                  { name: personName(followUp.suggestedOwnerId) }
                                )}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className={CELL_CLASS}>
                    {state.kind === 'task' ? (
                      <Person id={state.task.assigneeId} />
                    ) : isHost ? (
                      <Select
                        value={ownerOf(followUp)}
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
                    ) : (
                      <Person id={followUp.suggestedOwnerId} />
                    )}
                  </td>
                  <td className={`${CELL_CLASS} whitespace-nowrap`} data-meeting-follow-up-state="">
                    <FollowUpStateCell
                      state={state}
                      asked={isParticipant(meeting, followUp.suggestedOwnerId)}
                      ownerId={followUp.suggestedOwnerId}
                    />
                  </td>
                  <td className={`${CELL_CLASS} whitespace-nowrap ${HOME_META_CLASS}`}>
                    {text.dueDate(followUp.due)}
                  </td>
                  <td className={`${CELL_CLASS} text-right whitespace-nowrap`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="link"
                        size="inlineText"
                        className="mr-1.5"
                        onClick={() => openMeeting(meeting.id, { turnId: followUp.turnId })}
                      >
                        {t('meetings.source', 'Where it was said')}
                      </Button>
                      {state.kind === 'task' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => openMeetingTask(state.task.id)}
                        >
                          {t('meetings.openTask', 'Open task')}
                        </Button>
                      ) : null}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {organising ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 pt-3 pb-1">
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
                  '{{count}} tasks created. {{people}} owners were told.',
                  { count: batch.length, people: ownerCount }
                )
              )
            }}
          >
            {t('meetings.followUps.assignAll', 'Create {{count}} tasks and assign', {
              count: batch.length
            })}
          </Button>
          <p className={`min-w-0 flex-1 basis-64 ${HOME_META_CLASS}`} data-meeting-assign-help="">
            {t(
              'meetings.followUps.assignWho',
              'The meeting agent tells the {{people}} owners. Change the owner of a wrong line, or untick it.',
              { people: ownerCount }
            )}
          </p>
        </div>
      ) : null}
    </HomeCard>
  )
}
