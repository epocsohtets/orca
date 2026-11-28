import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { followUpCounts, followUpState, type FollowUpState } from './meeting-rules'
import { useMeetingText } from './MeetingParts'
import type { Meeting } from './meeting-types'
import { acceptFollowUp, assignFollowUps, takeBackTask, useMeetings } from './meetings-store'

// The table style of Home's "Agents and bots".
const HEAD_CLASS =
  'px-4 py-2 text-left text-2xs font-medium whitespace-nowrap uppercase tracking-wider'
const CELL_CLASS = 'px-4 py-2 align-middle'

/** The one state of a follow-up: its task's status, or why it has no task. */
function FollowUpStateCell({ state }: { state: FollowUpState }): React.JSX.Element {
  const t = useTranslate()
  return state.kind === 'task' ? (
    <InaxStatusBadge status={state.task.status} />
  ) : state.kind === 'declined' ? (
    <Badge variant="warning">{t('meetings.followUps.stateDeclined', 'Says not theirs')}</Badge>
  ) : (
    <HomeWhoMarker who="waiting" label={t('meetings.followUps.stateUnasked', 'Not assigned yet')} />
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

/** The way back for a task the meeting agent made, while nobody has started it: the owner's, or the host's. */
function TakeBack({
  meeting,
  state
}: {
  meeting: Meeting
  state: FollowUpState
}): React.JSX.Element | null {
  const t = useTranslate()
  const viewerId = useMeetings((store) => store.viewerId)
  if (state.kind !== 'task' || state.task.route !== 'heard' || state.task.status !== 'todo') {
    return null
  }
  const mine = state.task.assigneeId === viewerId
  return mine || meeting.hostId === viewerId ? (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      data-meeting-take-back={state.task.id}
      onClick={() => takeBackTask(state.task.id, mine)}
    >
      {mine ? t('home.task.offerDecline', 'Not mine') : t('home.day.undo', 'Undo')}
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
                <TakeBack meeting={meeting} state={state} />
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
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    data-meeting-accept={followUp.id}
                    onClick={() => acceptFollowUp(meeting.id, followUp.id)}
                  >
                    {t('home.task.offerAccept', 'Add to My work')}
                  </Button>
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
 * Every follow-up and where it stands, as a table. What the meeting settled is a task from the moment the minutes
 * went out; what it left open has no owner until the host picks one, here or in the day-end cards. Statuses are
 * read from the tasks, never copied.
 */
export function MeetingFollowUps({ meeting }: { meeting: Meeting }): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  const isHost = meeting.hostId === viewerId
  const counts = followUpCounts(meeting.followUps, tasks)
  if (counts.total === 0) {
    return null
  }

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
              return (
                <tr key={followUp.id} data-meeting-follow-up={state.kind}>
                  <td className={CELL_CLASS}>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium text-foreground">{followUp.text}</span>
                      {state.kind === 'task' ? (
                        <span className={HOME_META_CLASS}>
                          {state.task.route === 'heard'
                            ? t('meetings.followUps.heard', 'Created by the meeting agent')
                            : state.task.route === 'accepted'
                              ? t('meetings.followUps.accepted', 'Taken by the owner')
                              : isHost
                                ? t('meetings.followUps.assignedByMe', 'Assigned by me')
                                : t('meetings.excerpt.assignedBy', 'Assigned by {{name}}', {
                                    name: personName(meeting.hostId)
                                  })}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className={CELL_CLASS}>
                    {state.kind === 'task' ? (
                      <Person id={state.task.assigneeId} />
                    ) : isHost ? (
                      // Picking a person is the assignment: it is the host's own act, so it applies at once.
                      <Select
                        value=""
                        onValueChange={(value) =>
                          assignFollowUps(meeting.id, [
                            { followUpId: followUp.id, assigneeId: value }
                          ])
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
                    ) : followUp.suggestedOwnerId ? (
                      <Person id={followUp.suggestedOwnerId} />
                    ) : null}
                  </td>
                  <td className={`${CELL_CLASS} whitespace-nowrap`} data-meeting-follow-up-state="">
                    <FollowUpStateCell state={state} />
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
                      <TakeBack meeting={meeting} state={state} />
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
    </HomeCard>
  )
}
