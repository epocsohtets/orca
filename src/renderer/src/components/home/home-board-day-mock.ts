import type { Translate } from '@/i18n/use-translate'
import type { HomeProjectId, HomeRecordAnswer, HomeTask } from './home-board'
import { isParticipant } from '@/components/meetings/meeting-rules'
import type { Meeting } from '@/components/meetings/meeting-types'
import {
  addWorkdays,
  calendarDaysBetween,
  formatHomeClock,
  inSameWeek,
  type HomePhase
} from './home-day'

const at = (hour: number, minute = 0): number => hour * 60 + minute

export type HomeUpcomingGroup = 'today' | 'tomorrow' | 'week' | 'nextWeek'
export type HomeUpcoming = {
  id: string
  group: HomeUpcomingGroup
  when: string
  title: string
  project: HomeProjectId
  /** A meeting row; `note` is its state chip, empty when it has none. */
  meeting?: { note: string; recording?: boolean }
  meetingId?: string
  taskId?: string
  /** Its moment, for ordering meetings among deadlines. */
  at: number
}

type UpcomingSeed = Omit<HomeUpcoming, 'group' | 'when' | 'at'> & {
  /** Working days from the sample day. */
  workdays: number
  /** Minutes from midnight, or a word such as "end of day". */
  time: number | string
}

/** The group and the time label follow the real calendar: a Friday's next working day is next week's Monday. */
export function buildHomeUpcoming(
  t: Translate,
  args: {
    sampleDay: number
    minutes: number
    /** Short weekday name of a day start. */
    weekday: (dayStart: number) => string
  }
): HomeUpcoming[] {
  const seeds: UpcomingSeed[] = [
    {
      id: 'due-copy',
      workdays: 0,
      time: at(17),
      title: t('home.task.copy', 'Settle the launch page headline'),
      project: 'campaign',
      taskId: 'copy'
    },
    {
      id: 'due-inquiries',
      workdays: 1,
      time: t('home.upcoming.endOfDay', 'End of day'),
      title: t('home.task.inquiries', 'Sort this month’s customer inquiries by type'),
      project: 'support',
      taskId: 'inquiries'
    }
  ]
  return seeds.flatMap(({ workdays, time, ...item }) => {
    if (workdays === 0 && typeof time === 'number' && time <= args.minutes) {
      return []
    }
    const day = addWorkdays(args.sampleDay, workdays)
    const away = calendarDaysBetween(args.sampleDay, day)
    const group: HomeUpcomingGroup =
      away === 0
        ? 'today'
        : away === 1
          ? 'tomorrow'
          : inSameWeek(args.sampleDay, day)
            ? 'week'
            : 'nextWeek'
    const clock = typeof time === 'number' ? formatHomeClock(time) : time
    return [
      {
        ...item,
        group,
        // A deadline without a clock time sorts at the end of its day.
        at: day + (typeof time === 'number' ? time : 24 * 60 - 1) * 60_000,
        when: group === 'today' || group === 'tomorrow' ? clock : `${args.weekday(day)} ${clock}`
      }
    ]
  })
}

/** When the research agent began its current step, for "working · n min". */
export function homeResearchWorkingSince(phase: HomePhase): number {
  return phase === 'morning' ? at(9, 5) : at(13, 20)
}

/**
 * One stretch of my day on the day column. `record` is a stretch the app could not put on a task: it is the same
 * thing as the record row of that id. `taskId` names the task an app stretch was spent on.
 */
export type HomeDayBlock = {
  id: string
  kind: 'app' | 'meeting' | 'record'
  /** The app or the meeting, as the block names it. */
  label: string
  taskId?: string
  recordId?: string
  /** Minutes from midnight. */
  from: number
  to: number
}
export type HomeDayRecord = { id: string; text: string; suggestTaskId: string }

type AppSeed = {
  app: 'app' | 'browser'
  from: number
  to: number
  taskId?: string
  recordId?: string
}

// The sample day as the app recorded it; a stretch shows once it has begun, cut at the pretend time.
const DAY_SEEDS: AppSeed[] = [
  { app: 'app', from: at(9, 5), to: at(10, 15), taskId: 'copy' },
  { app: 'browser', from: at(10, 20), to: at(10, 40), recordId: 'competitor-pages' },
  { app: 'browser', from: at(10, 45), to: at(11, 50), taskId: 'research' },
  { app: 'app', from: at(13, 10), to: at(13, 35), recordId: 'app-block' },
  { app: 'app', from: at(13, 35), to: at(14, 40), taskId: 'review' },
  { app: 'browser', from: at(14, 40), to: at(15), taskId: 'notice' },
  { app: 'app', from: at(16), to: at(17), taskId: 'review' },
  { app: 'browser', from: at(17), to: at(17, 50), taskId: 'inquiries' }
]

/** `app` is the first app registered in Settings > My apps; no app block without one. */
export function buildHomeDay(
  t: Translate,
  phase: HomePhase,
  app: string | undefined,
  minutes: number
): { blocks: HomeDayBlock[]; records: HomeDayRecord[] } {
  const browser = t('home.day.browser', 'Browser')
  // A record is worded by its clock range, never by what I was doing around it.
  const range = (from: number, to: number): string =>
    `${formatHomeClock(from)}–${formatHomeClock(to)}`
  const records: HomeDayRecord[] =
    phase === 'morning'
      ? []
      : [
          {
            id: 'competitor-pages',
            text: t(
              'home.day.recordBrowser',
              'Browser · 3 competitor promotion pages · {{range}}',
              {
                range: range(at(10, 20), at(10, 40))
              }
            ),
            suggestTaskId: 'research'
          },
          ...(app
            ? [
                {
                  id: 'app-block',
                  text: t('home.day.recordApp', '{{app}} · {{range}}', {
                    app,
                    range: range(at(13, 10), at(13, 35))
                  }),
                  suggestTaskId: 'review'
                }
              ]
            : [])
        ]
  const blocks = DAY_SEEDS.flatMap((seed, index): HomeDayBlock[] => {
    const label = seed.app === 'app' ? app : browser
    if (!label || seed.from >= minutes) {
      return []
    }
    if (seed.recordId && !records.some((record) => record.id === seed.recordId)) {
      return []
    }
    return [
      {
        id: `day-${index}`,
        kind: seed.recordId ? 'record' : 'app',
        label,
        taskId: seed.taskId,
        recordId: seed.recordId,
        from: seed.from,
        to: Math.min(seed.to, minutes)
      }
    ]
  })
  return { blocks, records }
}

const clockOf = (timestamp: number): number => {
  const date = new Date(timestamp)
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * The day column's blocks: the app's stretches with their task named, and today's meetings I am in, up to now. A
 * record I put on a task reads as that task's block; one I called "not work" keeps only its app.
 */
export function placeHomeDayBlocks(
  blocks: readonly HomeDayBlock[],
  tasks: readonly HomeTask[],
  answers: Readonly<Record<string, HomeRecordAnswer>>,
  args: { meetings: readonly Meeting[]; viewerId: string; sampleDay: number; minutes: number }
): HomeDayBlock[] {
  const meetingBlocks = args.meetings.flatMap((meeting): HomeDayBlock[] => {
    const from = clockOf(meeting.startsAt)
    if (
      !isParticipant(meeting, args.viewerId) ||
      new Date(meeting.startsAt).setHours(0, 0, 0, 0) !== args.sampleDay ||
      from >= args.minutes
    ) {
      return []
    }
    const to = meeting.recordingStartedAt !== null ? args.minutes : clockOf(meeting.endsAt)
    return [
      {
        id: `meeting-${meeting.id}`,
        kind: 'meeting',
        label: meeting.title,
        from,
        to: Math.min(to, args.minutes)
      }
    ]
  })
  return [
    ...blocks.map((block): HomeDayBlock => {
      const answer = block.recordId ? answers[block.recordId] : undefined
      const taskId = answer && answer !== 'notWork' ? answer.taskId : block.taskId
      const title = tasks.find((task) => task.id === taskId)?.title
      return {
        ...block,
        kind: block.kind === 'record' && answer ? 'app' : block.kind,
        label: title ? `${block.label} · ${title}` : block.label
      }
    }),
    ...meetingBlocks
  ].sort((a, b) => a.from - b.from)
}
