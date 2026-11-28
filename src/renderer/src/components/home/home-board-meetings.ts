import type { Translate } from '@/i18n/use-translate'
import { isParticipant, meetingAccess } from '@/components/meetings/meeting-rules'
import type { Meeting, MeetingTask } from '@/components/meetings/meeting-types'
import type { HomeActivity } from './home-board-activity-mock'
import type { HomeUpcoming, HomeUpcomingGroup } from './home-board-day-mock'
import { addWorkdays, calendarDaysBetween, formatHomeClock, inSameWeek } from './home-day'
import type { HomeAgent, HomeDue, HomeTask } from './home-board'

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
  /** What a meeting waits on me for: requests to see its minutes. */
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
        task.route === 'heard'
          ? t(
              'home.task.fromMeetingHeard',
              'A follow-up task from the meeting “{{title}}”. {{name}} agreed to take it in the meeting.',
              { title: meeting.title, name: args.personName(task.assigneeId) }
            )
          : task.route === 'accepted'
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
    // Follow-ups never wait on anyone during the day: what the meeting settled is a task already, and what it
    // left open waits in the host's day-end cards.
    if (meeting.hostId !== viewerId) {
      continue
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
    upcoming.push({
      id: meeting.id,
      group,
      when: group === 'today' || group === 'tomorrow' ? clock : `${args.weekday(day)} ${clock}`,
      at: meeting.startsAt,
      title: meeting.title,
      project: meeting.project,
      meetingId: meeting.id,
      meeting: {
        recording: meeting.recordingStartedAt !== null,
        note:
          meeting.recordingStartedAt !== null
            ? ''
            : over
              ? t('home.chip.waiting', 'Needs my answer')
              : meeting.outline || meeting.materials.length > 0
                ? t('home.chip.prep', 'Prep')
                : ''
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
      // What followed a meeting is stamped a little after it; it is never shown as still to come.
      at:
        day === 0
          ? Math.min(minuteOfDay(meeting.minutesSentAt), args.minutes)
          : minuteOfDay(meeting.minutesSentAt),
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
      at:
        day === 0
          ? Math.min(minuteOfDay(task.createdAt), args.minutes)
          : minuteOfDay(task.createdAt),
      // I am "I" in my own log, also when I assigned the task to myself as the host.
      who:
        task.route === 'heard'
          ? agentName
          : task.route === 'accepted' || meeting.hostId === viewerId
            ? t('home.activity.me', 'I')
            : args.personName(meeting.hostId),
      text:
        task.route === 'heard'
          ? t(
              'home.activity.heardFollowUp',
              'put “{{task}}” from the meeting “{{title}}” into My work',
              { task: task.title, title: meeting.title }
            )
          : task.route === 'accepted'
            ? t('home.activity.tookFollowUp', 'took “{{task}}” from the meeting “{{title}}”', {
                task: task.title,
                title: meeting.title
              })
            : t(
                'home.activity.assignedFollowUp',
                'assigned me “{{task}}” from the meeting “{{title}}”',
                { task: task.title, title: meeting.title }
              ),
      byAgent: task.route === 'heard',
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
