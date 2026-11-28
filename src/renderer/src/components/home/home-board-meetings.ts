import type { Translate } from '@/i18n/use-translate'
import { followUpState, isParticipant, meetingAccess } from '@/components/meetings/meeting-rules'
import type { Meeting, MeetingTask } from '@/components/meetings/meeting-types'
import type { HomeActivity } from './home-board-activity-mock'
import type { HomeUpcoming, HomeUpcomingGroup } from './home-board-day-mock'
import { addWorkdays, calendarDaysBetween, formatHomeClock, inSameWeek } from './home-day'
import type { HomeAgent, HomeDue, HomeTask } from './home-board'

export const HOME_ACCEPT_FOLLOW_UPS = 'accept'
export const HOME_DECLINE_FOLLOW_UPS = 'decline'

export type HomeMeetingsInput = {
  viewerId: string
  meetings: readonly Meeting[]
  tasks: readonly MeetingTask[]
}

export type HomeMeetingsBoard = {
  /** Follow-up tasks assigned to me: ordinary tasks from here on. */
  tasks: HomeTask[]
  /** Follow-up tasks of meetings I can see that belong to someone else; they open, read only. */
  otherTasks: HomeTask[]
  /** What a meeting waits on me for: the agent's offers, and a host's follow-ups and requests. */
  waiting: HomeTask[]
  upcoming: HomeUpcoming[]
  activity: HomeActivity[]
  agent: Pick<HomeAgent, 'doing' | 'state' | 'stage' | 'taskId'>
  /** The meeting of mine that is being recorded now. */
  recording: Meeting | null
}

const startOfDay = (timestamp: number): number => new Date(timestamp).setHours(0, 0, 0, 0)
const minuteOfDay = (timestamp: number): number => {
  const date = new Date(timestamp)
  return date.getHours() * 60 + date.getMinutes()
}

/** Working days from the sample day back to `dayStart` (0 or negative); null when it is further than two weeks. */
function workdaysBack(sampleDay: number, dayStart: number): number | null {
  for (let back = 0; back >= -10; back -= 1) {
    if (addWorkdays(sampleDay, back) === dayStart) {
      return back
    }
  }
  return null
}

/**
 * Everything Home shows that comes from meetings, for the person looking. Nothing here is a copy: the rows are
 * read from the meetings and their tasks each time, so Home and Meetings cannot disagree.
 */
export function buildHomeMeetings(
  t: Translate,
  input: HomeMeetingsInput,
  args: {
    sampleDay: number
    /** Minutes from midnight on the sample day. */
    minutes: number
    personName: (id: string) => string
    /** "today", "tomorrow", or the weekday of a day start. */
    dayLabel: (dayStart: number) => string
    weekday: (dayStart: number) => string
  }
): HomeMeetingsBoard {
  const { viewerId, meetings, tasks } = input
  const agentName = t('home.agent.meeting', 'Meeting agent')
  const mine = meetings.filter((meeting) => isParticipant(meeting, viewerId))

  const toHomeTask = (task: MeetingTask): HomeTask | null => {
    const meeting = meetings.find((entry) => entry.id === task.meetingId)
    if (!meeting || meetingAccess(meeting, viewerId, tasks) === 'none') {
      return null
    }
    const [year, month, dayOfMonth] = task.due.split('-').map(Number)
    const dueDay = new Date(year, month - 1, dayOfMonth).getTime()
    const away = calendarDaysBetween(args.sampleDay, dueDay)
    const done = task.status === 'done'
    const due: HomeDue =
      away < 0 ? 'overdue' : away === 0 ? 'today' : away === 1 ? 'tomorrow' : 'week'
    const own = task.assigneeId === viewerId
    return {
      id: task.id,
      title: task.title,
      project: meeting.project,
      due,
      dueLabel:
        due === 'overdue' && !done
          ? t('home.task.dueWas', 'Due {{day}}', { day: args.dayLabel(dueDay) })
          : args.dayLabel(dueDay),
      done,
      who: null,
      status: task.status,
      origin: {
        meetingId: meeting.id,
        turnId: meeting.followUps.find((entry) => entry.id === task.followUpId)?.turnId ?? null
      },
      assignee: own ? undefined : args.personName(task.assigneeId),
      detail:
        task.route === 'accepted'
          ? t(
              'home.task.fromMeetingAccepted',
              'A follow-up from the meeting “{{title}}”. The meeting agent offered it and {{name}} took it.',
              { title: meeting.title, name: args.personName(task.assigneeId) }
            )
          : t(
              'home.task.fromMeetingAssigned',
              'A follow-up from the meeting “{{title}}”. {{host}} assigned it to {{name}}.',
              {
                title: meeting.title,
                host: args.personName(meeting.hostId),
                name: args.personName(task.assigneeId)
              }
            )
    }
  }
  const followUpTasks = tasks.flatMap((task) => toHomeTask(task) ?? [])

  const waitingRow = (
    id: string,
    meeting: Meeting,
    patch: Pick<HomeTask, 'title' | 'whoLabel' | 'detail'> & Partial<HomeTask>
  ): HomeTask => ({
    id,
    project: meeting.project,
    due: 'today',
    dueLabel: t('home.task.today', 'Today'),
    done: false,
    who: 'waiting',
    agentId: 'meeting',
    meetingId: meeting.id,
    ...patch
  })
  const waiting: HomeTask[] = []
  for (const meeting of mine) {
    if (!meeting.minutes) {
      continue
    }
    const open = meeting.followUps.filter(
      (followUp) => followUpState(followUp, tasks).kind !== 'task'
    )
    const offered = open.filter(
      (followUp) => followUp.suggestedOwnerId === viewerId && !followUp.declined
    )
    if (offered.length > 0) {
      waiting.push(
        waitingRow(`offer:${meeting.id}`, meeting, {
          title: t('home.task.offer', 'My {{count}} items from “{{title}}”', {
            count: offered.length,
            title: meeting.title
          }),
          whoLabel: t('home.task.offerWho', 'Waiting for my answer · Meeting agent'),
          question: t(
            'home.task.offerQuestion',
            'Add the {{count}} items the minutes give you to My work?',
            { count: offered.length }
          ),
          choices: [
            { id: HOME_ACCEPT_FOLLOW_UPS, label: t('home.task.offerAccept', 'Add to My work') },
            { id: HOME_DECLINE_FOLLOW_UPS, label: t('home.task.offerDecline', 'Not mine') }
          ],
          detail: offered.map((followUp) => followUp.text).join(' · ')
        })
      )
    }
    if (meeting.hostId !== viewerId) {
      continue
    }
    const others = open.filter((followUp) => !offered.includes(followUp))
    if (others.length > 0) {
      waiting.push(
        waitingRow(`organise:${meeting.id}`, meeting, {
          title: t('home.task.organise', 'Sort {{count}} follow-ups of “{{title}}”', {
            count: others.length,
            title: meeting.title
          }),
          whoLabel: t('home.task.organiseWho', 'Waiting for me to sort them · Meeting agent'),
          detail: others.map((followUp) => followUp.text).join(' · ')
        })
      )
    }
    for (const request of meeting.requests.filter((entry) => !entry.declined)) {
      waiting.push(
        waitingRow(`request:${meeting.id}:${request.personId}`, meeting, {
          title: t('home.task.request', '{{name}} asks to see the minutes of “{{title}}”', {
            name: args.personName(request.personId),
            title: meeting.title
          }),
          whoLabel: t('home.task.requestWho', 'Waiting for my approval'),
          detail: ''
        })
      )
    }
  }

  const recording = mine.find((meeting) => meeting.recordingStartedAt !== null) ?? null
  const upcoming: HomeUpcoming[] = []
  for (const meeting of [...mine].sort((a, b) => a.startsAt - b.startsAt)) {
    const day = startOfDay(meeting.startsAt)
    const away = calendarDaysBetween(args.sampleDay, day)
    const waitsOnMe = waiting.some((row) => row.meetingId === meeting.id)
    const over = meeting.minutes !== null
    // Past days are history; a meeting that ended today stays while something of it waits on me.
    if (away < 0 || away > 9 || (over && !waitsOnMe)) {
      continue
    }
    const group: HomeUpcomingGroup =
      away === 0
        ? 'today'
        : away === 1
          ? 'tomorrow'
          : inSameWeek(args.sampleDay, day)
            ? 'week'
            : 'nextWeek'
    const clock = formatHomeClock(minuteOfDay(meeting.startsAt))
    const offer = waiting.find((row) => row.id === `offer:${meeting.id}`)
    upcoming.push({
      id: meeting.id,
      group,
      when: group === 'today' || group === 'tomorrow' ? clock : `${args.weekday(day)} ${clock}`,
      at: meeting.startsAt,
      title: meeting.title,
      project: meeting.project,
      meetingId: meeting.id,
      meeting: {
        note:
          meeting.recordingStartedAt !== null
            ? t('home.upcoming.recording', 'Recording now')
            : over
              ? offer
                ? t('home.upcoming.minutesMine', 'Minutes arrived · {{count}} items for me', {
                    count: offer.detail.split(' · ').length
                  })
                : t('home.upcoming.minutesWaiting', 'Minutes arrived · waiting for me')
              : meeting.outline || meeting.materials.length > 0
                ? t('home.upcoming.prepReady', 'Prep ready')
                : t('home.upcoming.noPrep', 'No prep yet')
      }
    })
  }

  const activity: HomeActivity[] = []
  for (const meeting of meetings) {
    if (meeting.minutesSentAt === null || meetingAccess(meeting, viewerId, tasks) !== 'full') {
      continue
    }
    const day = workdaysBack(args.sampleDay, startOfDay(meeting.minutesSentAt))
    if (day === null) {
      continue
    }
    activity.push({
      id: `minutes:${meeting.id}`,
      day,
      at: minuteOfDay(meeting.minutesSentAt),
      who: agentName,
      text: t('home.activity.minutesSent', 'sent the minutes of “{{title}}” to {{count}} people', {
        title: meeting.title,
        count: meeting.attendeeIds.length + 1
      }),
      byAgent: true,
      finished: true,
      // Nothing of it waits on me any more: that is my check of the agent's work.
      confirmed: !waiting.some((row) => row.meetingId === meeting.id),
      meetingId: meeting.id
    })
  }
  for (const task of tasks) {
    const meeting = meetings.find((entry) => entry.id === task.meetingId)
    const day = workdaysBack(args.sampleDay, startOfDay(task.createdAt))
    if (!meeting || day === null || task.assigneeId !== viewerId) {
      continue
    }
    activity.push({
      id: `task:${task.id}`,
      day,
      at: minuteOfDay(task.createdAt),
      who: task.route === 'accepted' ? t('home.activity.me', 'I') : args.personName(meeting.hostId),
      text:
        task.route === 'accepted'
          ? t('home.activity.tookFollowUp', 'took “{{task}}” from the meeting “{{title}}”', {
              task: task.title,
              title: meeting.title
            })
          : t(
              'home.activity.assignedFollowUp',
              'assigned me “{{task}}” from the meeting “{{title}}”',
              { task: task.title, title: meeting.title }
            ),
      byAgent: false,
      taskId: task.id
    })
  }

  return {
    tasks: followUpTasks.filter((task) => task.assignee === undefined),
    otherTasks: followUpTasks.filter((task) => task.assignee !== undefined),
    waiting,
    upcoming,
    activity,
    recording,
    agent: recording
      ? {
          doing: t('home.agent.recording', 'Recording “{{title}}”', { title: recording.title }),
          state: 'working',
          stage: 2
        }
      : waiting[0]
        ? { doing: waiting[0].title, state: 'waiting', stage: 3, taskId: waiting[0].id }
        : { doing: t('home.agent.calendarDoing', 'Nothing assigned'), state: 'idle', stage: 0 }
  }
}
