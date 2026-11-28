import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  NativeChatCardActions,
  NativeChatCardFrame,
  NativeChatCardStatus
} from '@/components/native-chat/NativeChatCardFrame'
import { openMeeting, openMeetingTask } from './meeting-navigation'
import { personName } from './meeting-people'
import { followUpState, meetingAccess } from './meeting-rules'
import { MinutesRequestControl } from './MeetingSharing'
import { InaxStatusBadge } from '@/components/task-page/inax/inax-status-badge'
import { HOME_META_CLASS, HomeProjectDot } from '@/components/home/HomeCard'
import { buildHomeProjects } from '@/components/home/home-board-mock'
import { useMeetingText } from './MeetingParts'
import type { Meeting, MeetingFollowUp, MeetingTask } from './meeting-types'
import { acceptFollowUp, takeBackTask, useMeetings } from './meetings-store'

/** The sentence a follow-up came from, as the bot quotes it. */
function SourceQuote({
  meeting,
  turnId
}: {
  meeting: Meeting
  turnId: string
}): React.JSX.Element | null {
  const turn = meeting.minutes?.transcript.find((entry) => entry.id === turnId)
  return turn ? (
    <p className="mt-1 text-xs text-muted-foreground">
      {personName(turn.speakerId)}: “{turn.text}”
    </p>
  ) : null
}

export function MinutesLinkCard({
  meeting,
  sharedBy
}: {
  meeting: Meeting
  /** Set when the reader was not in the meeting and got the minutes by link. */
  sharedBy?: string
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  return (
    <NativeChatCardFrame
      heading={t('meetings.bot.minutesCard', 'Minutes')}
      title={meeting.title}
      footer={
        <NativeChatCardActions>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-meeting-bot-open-minutes={meeting.id}
            onClick={() => openMeeting(meeting.id, { depth: 'brief' })}
          >
            {t('meetings.bot.openMinutes', 'Open the minutes')}
          </Button>
        </NativeChatCardActions>
      }
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <HomeProjectDot project={buildHomeProjects(t)[meeting.project]} />
        <span className={`tabular-nums ${HOME_META_CLASS}`}>{text.when(meeting)}</span>
      </p>
      <p className={`mt-1 ${HOME_META_CLASS}`}>
        {sharedBy
          ? t('meetings.bot.sharedBy', 'Shared with you by {{name}}', {
              name: personName(sharedBy)
            })
          : t('meetings.bot.sentTo', 'Sent to all {{count}} people in the meeting', {
              count: meeting.attendeeIds.length + 1
            })}
      </p>
    </NativeChatCardFrame>
  )
}

/** A follow-up the meeting named me for: my task from the moment the minutes went out, with the way back. */
export function ProposalCard({
  meeting,
  followUp
}: {
  meeting: Meeting
  followUp: MeetingFollowUp
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  const state = followUpState(followUp, tasks)
  const mine = state.kind === 'task' && state.task.assigneeId === viewerId
  const source = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => openMeeting(meeting.id, { turnId: followUp.turnId })}
    >
      {t('meetings.source', 'Where it was said')}
    </Button>
  )
  const status =
    state.kind === 'task' ? (
      mine ? (
        <NativeChatCardStatus tone="success">
          {state.task.route === 'assigned'
            ? t('meetings.bot.assignedByHost', 'Assigned by {{name}} · {{status}}', {
                name: personName(meeting.hostId),
                status: text.status[state.task.status]
              })
            : t('meetings.bot.taken', 'Yours · {{status}}', {
                status: text.status[state.task.status]
              })}
        </NativeChatCardStatus>
      ) : (
        <NativeChatCardStatus tone="muted">
          {t('meetings.bot.givenToOther', 'Assigned to {{name}}', {
            name: personName(state.task.assigneeId)
          })}
        </NativeChatCardStatus>
      )
    ) : (
      <NativeChatCardStatus tone="muted">
        {t('meetings.bot.declined', 'You said this is not yours')}
      </NativeChatCardStatus>
    )
  return (
    <div data-meeting-bot-proposal={state.kind}>
      <NativeChatCardFrame
        heading={t('meetings.bot.proposalCard', 'My task from this meeting')}
        status={status}
        title={followUp.text}
        footer={
          <NativeChatCardActions start={source}>
            {state.kind === 'task' ? (
              mine ? (
                <>
                  {state.task.route === 'heard' && state.task.status === 'todo' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-meeting-take-back={state.task.id}
                      onClick={() => takeBackTask(state.task.id, true)}
                    >
                      {t('home.task.offerDecline', 'Not mine')}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openMeetingTask(state.task.id)}
                  >
                    {t('meetings.openTask', 'Open task')}
                  </Button>
                </>
              ) : null
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-meeting-bot-accept={followUp.id}
                onClick={() => acceptFollowUp(meeting.id, followUp.id)}
              >
                {t('home.task.offerAccept', 'Add to My work')}
              </Button>
            )}
          </NativeChatCardActions>
        }
      >
        <p className="text-xs text-muted-foreground">{text.due(followUp.due)}</p>
        <SourceQuote meeting={meeting} turnId={followUp.turnId} />
        {state.kind === 'task' ? null : (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('meetings.bot.declinedHelp', '{{name}} sees your answer: “Not mine”.', {
              name: personName(meeting.hostId)
            })}
          </p>
        )}
      </NativeChatCardFrame>
    </div>
  )
}

/** A task the host assigned to someone the bot had not proposed it to, such as a person who was not there. */
export function AssignedTaskCard({
  meeting,
  task
}: {
  meeting: Meeting
  task: MeetingTask
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const turnId = meeting.followUps.find((f) => f.id === task.followUpId)?.turnId ?? ''
  const access = useMeetings((state) => meetingAccess(meeting, state.viewerId, state.tasks))
  return (
    <div data-meeting-bot-assigned={task.id}>
      <NativeChatCardFrame
        heading={t('meetings.bot.assignedCard', 'A task for you from “{{title}}”', {
          title: meeting.title
        })}
        status={<InaxStatusBadge status={task.status} />}
        title={task.title}
        footer={
          <NativeChatCardActions
            start={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openMeeting(meeting.id, { turnId })}
              >
                {t('meetings.source', 'Where it was said')}
              </Button>
            }
          >
            <Button type="button" size="sm" onClick={() => openMeetingTask(task.id)}>
              {t('meetings.openTask', 'Open task')}
            </Button>
          </NativeChatCardActions>
        }
      >
        <p className="text-xs text-muted-foreground">
          {task.route === 'heard'
            ? t('meetings.followUps.heard', 'Made by the meeting agent')
            : t('meetings.excerpt.assignedBy', 'Assigned by {{name}}', {
                name: personName(meeting.hostId)
              })}
          {' · '}
          {text.due(task.due)}
        </p>
        <SourceQuote meeting={meeting} turnId={turnId} />
        {access === 'excerpt' ? (
          <div className="mt-2">
            <MinutesRequestControl meeting={meeting} />
          </div>
        ) : null}
      </NativeChatCardFrame>
    </div>
  )
}
