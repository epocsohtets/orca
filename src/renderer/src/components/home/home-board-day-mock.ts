import type { Translate } from '@/i18n/use-translate'
import type { HomeProjectId } from './home-board'
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
  /** A meeting row; `note` says what is ready. */
  meeting?: { note: string }
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

export type HomeDaySegment = { id: 'app' | 'browser' | 'meeting'; label: string; minutes: number }
export type HomeDayRecord = { id: string; text: string; suggestTaskId: string }

const DAY_MINUTES: Record<HomePhase, [number, number, number]> = {
  morning: [10, 5, 30],
  day: [80, 45, 30],
  evening: [150, 70, 90]
}

/** `app` is the first app registered in Settings > My apps; no app block without one. */
export function buildHomeDay(
  t: Translate,
  phase: HomePhase,
  app: string | undefined
): { segments: HomeDaySegment[]; records: HomeDayRecord[] } {
  const [appMinutes, browser, meeting] = DAY_MINUTES[phase]
  const segments: HomeDaySegment[] = [
    ...(app ? [{ id: 'app' as const, label: app, minutes: appMinutes }] : []),
    { id: 'browser', label: t('home.day.browser', 'Browser'), minutes: browser },
    { id: 'meeting', label: t('home.day.meetings', 'Meetings'), minutes: meeting }
  ]
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
  return { segments: segments.filter((segment) => segment.minutes > 0), records }
}
