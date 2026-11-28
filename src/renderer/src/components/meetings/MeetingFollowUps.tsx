import React from 'react'
import { Bot, UserRound, UserRoundCheck } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  HOME_GROUP_CLASS,
  HOME_META_CLASS,
  HomeAvatar,
  HomeCard,
  HomeRow,
  HomeRowMenu,
  HomeStateIcon
} from '@/components/home/HomeCard'
import { InaxStatusBadge } from '@/components/task-page/inax/inax-status-badge'
import { openMeeting, openMeetingTask } from './meeting-navigation'
import { MEETING_PEOPLE, personName } from './meeting-people'
import { followUpCounts, followUpState, type FollowUpState } from './meeting-rules'
import { useMeetingText } from './MeetingParts'
import type { Meeting } from './meeting-types'
import { acceptFollowUp, assignFollowUps, takeBackTask, useMeetings } from './meetings-store'

// 업무 · 담당자 · 상태 · 마감 · menu. A narrow card drops the status, then the owner's name; the task keeps 280px.
const ROW_CLASS =
  'grid grid-cols-[minmax(280px,1fr)_120px_88px_88px_32px] items-center gap-x-3 border-t border-border @max-[700px]/home-card:grid-cols-[minmax(280px,1fr)_120px_88px_32px] @max-[590px]/home-card:grid-cols-[minmax(280px,1fr)_28px_88px_32px] @max-[470px]/home-card:grid-cols-[minmax(0,1fr)_28px_88px_32px]'
const STATE_CELL_CLASS = 'min-w-0 @max-[700px]/home-card:hidden'
const OWNER_NAME_CLASS = '@max-[590px]/home-card:hidden'
const STATE_PILL_CLASS =
  'inline-flex shrink-0 items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs leading-none whitespace-nowrap text-muted-foreground'

/** The one state of a follow-up: its task's status, or that it has no owner. */
function FollowUpStateCell({ state }: { state: FollowUpState }): React.JSX.Element {
  const t = useTranslate()
  return state.kind === 'task' ? (
    <InaxStatusBadge status={state.task.status} />
  ) : (
    // The same pill as a task's status: a warning mark here read as an error of the row.
    <span
      className={STATE_PILL_CLASS}
      title={
        state.kind === 'declined'
          ? t('meetings.followUps.stateDeclined', 'Says not theirs')
          : undefined
      }
    >
      {t('meetings.followUps.stateUnasked', 'No owner')}
    </span>
  )
}

function Person({ id }: { id: string }): React.JSX.Element {
  const name = personName(id)
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-foreground">
      <HomeAvatar name={name} />
      <span className={`truncate ${OWNER_NAME_CLASS}`}>{name}</span>
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

/** A row's actions, in Orca's row menu: its task, where it was said, and the way back. */
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
    <HomeRowMenu
      label={t('meetings.followUps.more', 'Menu for “{{text}}”', { text: followUp.text })}
      data-meeting-follow-up-menu=""
    >
      {state.kind === 'task' ? (
        <DropdownMenuItem onSelect={() => openMeetingTask(state.task.id)}>
          {t('meetings.openTask', 'Open task')}
        </DropdownMenuItem>
      ) : null}
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
    </HomeRowMenu>
  )
}

/** Words on one line; the whole text shows on hover or focus. */
function OneLine({ text }: { text: string }): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="block truncate rounded-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
      <h3 className={HOME_GROUP_CLASS}>
        {t('meetings.followUps.mine', 'Mine')}
        <span className="tabular-nums">{offers.length}</span>
      </h3>
      <ul className="mx-4">
        {offers.map(({ followUp, state }) => (
          <HomeRow
            key={followUp.id}
            data-meeting-my-follow-up={state.kind}
            icon={<HomeStateIcon state="waiting" />}
            title={followUp.text}
            tip={followUp.text}
            chip={t('home.chip.waiting', 'Needs my answer')}
            date={text.dueDate(followUp.due)}
            action={
              <Button
                type="button"
                variant="outline"
                size="xs"
                data-meeting-accept={followUp.id}
                onClick={() => acceptFollowUp(meeting.id, followUp.id)}
              >
                {t('home.task.offerAccept', 'Add to My work')}
              </Button>
            }
          />
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
  const head = `min-w-0 truncate ${HOME_META_CLASS}`

  return (
    <HomeCard
      title={t('meetings.followUps.title', 'Follow-up tasks')}
      data-meeting-card="follow-ups"
    >
      <div role="table" className="mx-4 text-[13px] leading-5">
        <div role="row" className={`h-8 ${ROW_CLASS}`}>
          <span role="columnheader" className={head}>
            {t('meetings.followUps.colTask', 'Task')}
          </span>
          <span role="columnheader" className={`${head} ${OWNER_NAME_CLASS}`}>
            {t('meetings.followUps.colOwner', 'Owner')}
          </span>
          {/* Why the empty header: under 590px the owner column holds only the avatar. */}
          <span aria-hidden className="@min-[590px]/home-card:hidden" />
          <span role="columnheader" className={`${head} ${STATE_CELL_CLASS}`}>
            {t('home.agents.colState', 'State')}
          </span>
          <span role="columnheader" className={`${head} text-right`}>
            {t('taskLoop.detail.due', 'Due')}
          </span>
          <span role="columnheader">
            <span className="sr-only">{t('meetings.followUps.colActions', 'Actions')}</span>
          </span>
        </div>
        {rows.map(({ followUp, state }) => {
          const route = state.kind === 'task' ? state.task.route : null
          const RouteIcon = route === 'heard' ? Bot : UserRoundCheck
          const routeLabel =
            route === 'heard'
              ? t('meetings.followUps.heard', 'Made by the meeting agent')
              : route === 'accepted'
                ? t('meetings.followUps.accepted', 'Taken by the owner')
                : isHost
                  ? t('meetings.followUps.assignedByMe', 'Assigned by me')
                  : t('meetings.excerpt.assignedBy', 'Assigned by {{name}}', {
                      name: personName(meeting.hostId)
                    })
          return (
            <div
              key={followUp.id}
              role="row"
              data-meeting-follow-up={state.kind}
              className={`group/home-row h-10 ${ROW_CLASS}`}
            >
              <span role="cell" className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0">
                  <OneLine text={followUp.text} />
                </span>
                {route ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        role="img"
                        aria-label={routeLabel}
                        data-meeting-follow-up-maker={route}
                        className="shrink-0 text-muted-foreground"
                      >
                        <RouteIcon aria-hidden className="size-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4}>
                      {routeLabel}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </span>
              <span role="cell" className="flex min-w-0 items-center">
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
                        className="group/owner flex min-w-0 items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/60 text-muted-foreground">
                          <UserRound aria-hidden className="size-3" />
                        </span>
                        {/* Why two spans: a display class on the label would win over the container rule that hides it. */}
                        <span className={OWNER_NAME_CLASS}>
                          <span className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs whitespace-nowrap text-foreground group-hover/owner:bg-accent dark:border-input dark:bg-input/30">
                            {t('meetings.followUps.chooseOwner', 'Choose owner')}
                          </span>
                        </span>
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
                ) : followUp.suggestedOwnerId && state.kind !== 'declined' ? (
                  <Person id={followUp.suggestedOwnerId} />
                ) : (
                  <span
                    aria-hidden
                    className="size-5 rounded-full border border-dashed border-muted-foreground/60"
                  />
                )}
              </span>
              <span role="cell" className={STATE_CELL_CLASS} data-meeting-follow-up-state="">
                <FollowUpStateCell state={state} />
              </span>
              <span
                role="cell"
                className="min-w-0 text-right text-xs leading-4 whitespace-nowrap text-muted-foreground tabular-nums"
              >
                {text.dueDate(followUp.due)}
              </span>
              <span role="cell" className="flex justify-end">
                <RowMenu meeting={meeting} followUp={followUp} state={state} />
              </span>
            </div>
          )
        })}
      </div>
    </HomeCard>
  )
}
