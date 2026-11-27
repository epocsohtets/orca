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
  meeting?: { note: string; detail: string }
  taskId?: string
}

type UpcomingSeed = Omit<HomeUpcoming, 'group' | 'when'> & {
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
    offerOpen: boolean
    /** Short weekday name of a day start. */
    weekday: (dayStart: number) => string
  }
): HomeUpcoming[] {
  const weeklyOver = args.minutes >= at(9, 30)
  const seeds: UpcomingSeed[] = [
    {
      id: 'weekly',
      workdays: 0,
      time: at(9),
      title: t('home.upcoming.weekly', 'Campaign weekly meeting'),
      project: 'campaign',
      meeting: weeklyOver
        ? {
            note: t('home.upcoming.weeklyMinutes', 'Minutes arrived · 2 items for me'),
            detail: t(
              'home.upcoming.weeklyMinutesDetail',
              'Decided: launch on the 5th of next month. Kim Jiwoo approves the headline; you choose it first.'
            )
          }
        : {
            note: t('home.upcoming.weeklyPrep', 'Agenda ready'),
            detail: t(
              'home.upcoming.weeklyPrepDetail',
              'Agenda: launch date, headline, vendor quotes. The meeting bot will take the minutes.'
            )
          }
    },
    {
      id: 'draft-review',
      workdays: 0,
      time: at(15),
      title: t('home.upcoming.draftReview', 'Brand renewal draft review'),
      project: 'brand',
      meeting: {
        note: t('home.upcoming.prepReady', 'Prep ready'),
        detail: t(
          'home.upcoming.draftReviewDetail',
          'Prep: Park Seoyeon’s two drafts and the three decisions from the last review.'
        )
      }
    },
    {
      id: 'due-copy',
      workdays: 0,
      time: at(17),
      title: t('home.task.copy', 'Settle the launch page headline'),
      project: 'campaign',
      taskId: 'copy'
    },
    {
      id: 'ops-weekly',
      workdays: 1,
      time: at(11),
      title: t('home.upcoming.opsWeekly', 'Operations weekly check'),
      project: 'support',
      meeting: {
        note: t('home.upcoming.prepReady', 'Prep ready'),
        detail: t(
          'home.upcoming.opsWeeklyDetail',
          'Prep: last week’s inquiry counts and the open delivery delay notice.'
        )
      }
    },
    {
      id: 'due-inquiries',
      workdays: 1,
      time: t('home.upcoming.endOfDay', 'End of day'),
      title: t('home.task.inquiries', 'Sort this month’s customer inquiries by type'),
      project: 'support',
      taskId: 'inquiries'
    },
    {
      id: 'mid-check',
      workdays: 3,
      time: at(14),
      title: t('home.upcoming.midCheck', 'Campaign mid-point check'),
      project: 'campaign',
      meeting: {
        note: t('home.upcoming.noPrep', 'No prep yet'),
        detail: t(
          'home.upcoming.midCheckDetail',
          'The meeting bot prepares the agenda the day before.'
        )
      }
    }
  ]
  return seeds.flatMap(({ workdays, time, ...item }) => {
    if (workdays === 0 && typeof time === 'number' && time <= args.minutes) {
      // A finished meeting stays only while it still has something for me.
      if (!(item.id === 'weekly' && weeklyOver && args.offerOpen)) {
        return []
      }
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
