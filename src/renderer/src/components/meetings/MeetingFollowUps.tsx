import React from 'react'
import { ChevronDown, MoreHorizontal, UserRound } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HOME_META_CLASS, HomeAvatar, HomeCard } from '@/components/home/HomeCard'
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
// One row height for every row, whatever its cells hold.
const CELL_CLASS = 'h-11 px-4 py-0 align-middle'
const STATE_PILL_CLASS =
  'inline-flex shrink-0 items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs leading-none font-medium whitespace-nowrap text-muted-foreground'

/** The one state of a follow-up: its task's status, or why it has no task. */
function FollowUpStateCell({ state }: { state: FollowUpState }): React.JSX.Element {
  const t = useTranslate()
  return state.kind === 'task' ? (
    <InaxStatusBadge status={state.task.status} />
  ) : state.kind === 'declined' ? (
    <Badge variant="warning">{t('meetings.followUps.stateDeclined', 'Says not theirs')}</Badge>
  ) : (
    // The same pill as a task's status: a warning mark here read as an error of the row.
    <span className={STATE_PILL_CLASS}>{t('meetings.followUps.stateUnasked', 'No owner')}</span>
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

/** Whether I can take a task the meeting agent made back, while nobody has started it: its owner can, and the host. */
function takeBack(
  meeting: Meeting,
  state: FollowUpState,
  viewerId: string
): { taskId: string; mine: boolean } | null {
  if (state.kind !== 'task' || state.task.route !== 'heard' || state.task.status !== 'todo') {
    return null
  }
  const mine = state.task.assigneeId === viewerId
  return mine || meeting.hostId === viewerId ? { taskId: state.task.id, mine } : null
}

/** A row's other actions, in Orca's row menu: where it was said, and the way back. */
function RowMenu({
  meeting,
  followUp,
  state
}: {
  meeting: Meeting
  followUp: Meeting['followUps'][number]
  state: FollowUpState
}): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((store) => store.viewerId)
  const back = takeBack(meeting, state, viewerId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost-muted"
          size="icon-xs"
          aria-label={t('meetings.followUps.more', 'Menu for “{{text}}”', { text: followUp.text })}
          data-meeting-follow-up-menu=""
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => openMeeting(meeting.id, { turnId: followUp.turnId })}>
          {t('meetings.source', 'Where it was said')}
        </DropdownMenuItem>
        {back ? (
          <DropdownMenuItem
            data-meeting-take-back={back.taskId}
            onSelect={() => takeBackTask(back.taskId, back.mine)}
          >
            {back.mine
              ? t('home.task.offerDecline', 'Not mine')
              : t('meetings.followUps.unassign', 'Remove owner')}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A follow-up's words on one line; the whole text shows on hover or focus. */
function OneLine({ text }: { text: string }): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="block truncate rounded-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="max-w-sm">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

/** In Key points: what this meeting offers me that is not a task yet, answered in place. */
export function MeetingMyPart({ meeting }: { meeting: Meeting }): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  // A follow-up that is my task already is a row of the table below; saying it twice gave two places to act.
  const offers = meeting.followUps
    .map((followUp) => ({ followUp, state: followUpState(followUp, tasks) }))
    .filter(
      ({ followUp, state }) => state.kind !== 'task' && followUp.suggestedOwnerId === viewerId
    )
  if (offers.length === 0) {
    return null
  }
  return (
    <section aria-label={t('meetings.followUps.mine', 'Mine')} data-meeting-my-part="">
      <h3 className="flex items-baseline gap-2 px-4 py-1 text-xs font-medium text-muted-foreground">
        {t('meetings.followUps.mine', 'Mine')}
        <span className="tabular-nums">{offers.length}</span>
      </h3>
      <ul className="divide-y divide-border border-t border-border">
        {offers.map(({ followUp, state }) => (
          <li
            key={followUp.id}
            data-meeting-my-follow-up={state.kind}
            className="flex h-11 items-center gap-3 px-4"
          >
            <span className="min-w-0 flex-1 text-[13px]">
              <OneLine text={followUp.text} />
            </span>
            <span className={`shrink-0 ${HOME_META_CLASS}`}>{text.due(followUp.due)}</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              data-meeting-accept={followUp.id}
              onClick={() => acceptFollowUp(meeting.id, followUp.id)}
            >
              {t('home.task.offerAccept', 'Add to My work')}
            </Button>
            <RowMenu meeting={meeting} followUp={followUp} state={state} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Every follow-up and where it stands, as a table. What the meeting settled is a task from the moment the minutes
 * went out; what it left open has no owner until the host picks one, here or in the day-end cards. Statuses are
 * read from the tasks, never copied. A row has one visible action (open its task, or give it an owner); the rest
 * is in its menu.
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
  const rows = meeting.followUps.map((followUp) => ({
    followUp,
    state: followUpState(followUp, tasks)
  }))
  // Said once for the table when the meeting agent made every task; a row made another way says so itself.
  const made = rows.flatMap(({ state }) => (state.kind === 'task' ? [state.task.route] : []))
  const allHeard = made.length > 0 && made.every((route) => route === 'heard')

  return (
    <HomeCard
      title={t('meetings.followUps.title', 'Follow-up tasks')}
      aside={
        allHeard ? (
          <span data-meeting-follow-up-maker="">
            {t('meetings.followUps.heard', 'Made by the meeting agent')}
          </span>
        ) : undefined
      }
      data-meeting-card="follow-ups"
    >
      <div className="scrollbar-sleek overflow-x-auto border-t border-border">
        <table className="w-full min-w-[34rem] table-fixed border-collapse text-[13px]">
          <colgroup>
            <col />
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-32" />
          </colgroup>
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
            {rows.map(({ followUp, state }) => {
              const route = state.kind === 'task' && !allHeard ? state.task.route : null
              return (
                <tr key={followUp.id} data-meeting-follow-up={state.kind}>
                  <td className={CELL_CLASS}>
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="min-w-0">
                        <OneLine text={followUp.text} />
                      </span>
                      {route ? (
                        <span className={`shrink-0 ${HOME_META_CLASS}`}>
                          {route === 'heard'
                            ? t('meetings.followUps.heard', 'Made by the meeting agent')
                            : route === 'accepted'
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            data-meeting-follow-up-owner=""
                            aria-label={t('meetings.followUps.owner', 'Owner of “{{text}}”', {
                              text: followUp.text
                            })}
                            className="-ml-1 flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 whitespace-nowrap text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                              <UserRound aria-hidden className="size-3" />
                            </span>
                            {t('meetings.followUps.chooseOwner', 'Choose owner')}
                            <ChevronDown aria-hidden className="size-3 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {MEETING_PEOPLE.map((person) => (
                            <DropdownMenuItem
                              key={person.id}
                              onSelect={() =>
                                assignFollowUps(meeting.id, [
                                  { followUpId: followUp.id, assigneeId: person.id }
                                ])
                              }
                            >
                              <HomeAvatar name={person.name} />
                              {person.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : followUp.suggestedOwnerId ? (
                      <Person id={followUp.suggestedOwnerId} />
                    ) : null}
                  </td>
                  <td className={CELL_CLASS} data-meeting-follow-up-state="">
                    <FollowUpStateCell state={state} />
                  </td>
                  <td className={`${CELL_CLASS} whitespace-nowrap ${HOME_META_CLASS}`}>
                    {text.dueDate(followUp.due)}
                  </td>
                  <td className={`${CELL_CLASS} text-right whitespace-nowrap`}>
                    <span className="inline-flex items-center gap-1">
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
                      <RowMenu meeting={meeting} followUp={followUp} state={state} />
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
