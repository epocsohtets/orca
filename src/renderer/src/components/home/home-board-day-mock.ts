import type { Translate } from '@/i18n/use-translate'
import type { HomeProjectId } from './home-board'
import type { HomePhase } from './home-day'

const at = (hour: number, minute = 0): number => hour * 60 + minute

export type HomeUpcomingGroup = 'today' | 'tomorrow' | 'week'
export type HomeUpcoming = {
  id: string
  group: HomeUpcomingGroup
  /** Minutes from midnight for today's items; later days sort as listed. */
  at?: number
  when: string
  title: string
  project: HomeProjectId
  /** A meeting row; `note` says what is ready. */
  meeting?: { note: string; detail: string }
  taskId?: string
}

export function buildHomeUpcoming(
  t: Translate,
  minutes: number,
  offerOpen: boolean
): HomeUpcoming[] {
  const weeklyOver = minutes >= at(9, 30)
  const items: HomeUpcoming[] = [
    {
      id: 'weekly',
      group: 'today',
      at: at(9),
      when: '09:00',
      title: t('home.upcoming.weekly', 'Spring campaign weekly meeting'),
      project: 'campaign',
      meeting: weeklyOver
        ? {
            note: offerOpen
              ? t('home.upcoming.weeklyMinutes', 'Minutes arrived · 2 items for me')
              : t('home.upcoming.weeklyMinutesDone', 'Minutes arrived'),
            detail: t(
              'home.upcoming.weeklyMinutesDetail',
              'Decided: launch on 21 March. Kim Jiwoo approves the headline; you choose it first.'
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
      group: 'today',
      at: at(15),
      when: '15:00',
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
      group: 'today',
      at: at(17),
      when: '17:00',
      title: t('home.task.copy', 'Settle the landing page headline'),
      project: 'campaign',
      taskId: 'copy'
    },
    {
      id: 'ops-weekly',
      group: 'tomorrow',
      when: '11:00',
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
      group: 'tomorrow',
      when: t('home.upcoming.endOfDay', 'End of day'),
      title: t('home.task.inquiries', 'Sort March customer inquiries by type'),
      project: 'support',
      taskId: 'inquiries'
    },
    {
      id: 'mid-check',
      group: 'week',
      when: t('home.upcoming.friday14', 'Fri 14:00'),
      title: t('home.upcoming.midCheck', 'Spring campaign mid-point check'),
      project: 'campaign',
      meeting: {
        note: t('home.upcoming.noPrep', 'No prep yet'),
        detail: t(
          'home.upcoming.midCheckDetail',
          'The meeting bot prepares the agenda on Thursday.'
        )
      }
    }
  ]
  // A finished meeting stays only while it still has something for me.
  return items.filter(
    (item) => item.at === undefined || item.at > minutes || (item.id === 'weekly' && weeklyOver)
  )
}

export type HomeActivity = {
  id: string
  at: number
  who: string
  text: string
  byAgent: boolean
  taskId?: string
  agentId?: string
}

export function buildHomeActivity(t: Translate): HomeActivity[] {
  const research = t('home.agent.research', 'Research agent')
  const writer = t('home.agent.writer', 'Writing agent')
  const triage = t('home.agent.triage', 'Inquiry agent')
  const meeting = t('home.agent.meeting', 'Meeting bot')
  return [
    {
      id: 'inquiries-draft',
      at: at(8, 50),
      who: triage,
      text: t('home.activity.inquiriesDraft', 'drafted “Sort March customer inquiries by type”'),
      byAgent: true,
      taskId: 'inquiries'
    },
    {
      id: 'research-start',
      at: at(9, 5),
      who: research,
      text: t('home.activity.researchStart', 'started “Survey competitors’ spring promotions”'),
      byAgent: true,
      taskId: 'research'
    },
    {
      id: 'copy-draft',
      at: at(9, 40),
      who: writer,
      text: t(
        'home.activity.copyDraft',
        'drafted two landing page headlines and asked me to choose'
      ),
      byAgent: true,
      taskId: 'copy'
    },
    {
      id: 'minutes',
      at: at(9, 35),
      who: meeting,
      text: t('home.activity.minutes', 'wrote the weekly meeting minutes · 2 items for me'),
      byAgent: true,
      agentId: 'meeting'
    },
    {
      id: 'drafts-up',
      at: at(11, 40),
      who: t('home.person.seoyeon', 'Park Seoyeon'),
      text: t('home.activity.draftsUp', 'uploaded two brand guide drafts'),
      byAgent: false,
      taskId: 'review'
    },
    {
      id: 'notice-stop',
      at: at(8, 55),
      who: triage,
      text: t(
        'home.activity.noticeStop',
        'stopped “Revise the delivery delay notice”: no reply from logistics'
      ),
      byAgent: true,
      taskId: 'notice'
    },
    {
      id: 'research-table',
      at: at(13, 20),
      who: research,
      text: t('home.activity.researchTable', 'put two competitors’ promotions into a table'),
      byAgent: true,
      taskId: 'research'
    },
    {
      id: 'review-minutes',
      at: at(16, 10),
      who: meeting,
      text: t('home.activity.reviewMinutes', 'wrote the draft review minutes'),
      byAgent: true,
      agentId: 'meeting'
    }
  ]
}

export type HomeDaySegment = { id: 'app' | 'browser' | 'meeting'; label: string; minutes: number }
export type HomeDayRecord = { id: string; text: string; suggestTaskId: string }

const DAY_MINUTES: Record<HomePhase, [number, number, number]> = {
  morning: [10, 5, 0],
  day: [80, 45, 60],
  evening: [150, 70, 110]
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
  const records: HomeDayRecord[] =
    phase === 'morning'
      ? []
      : [
          {
            id: 'competitor-pages',
            text: t('home.day.recordBrowser', 'Browser · 3 competitor promotion pages · 20 min'),
            suggestTaskId: 'research'
          },
          ...(app
            ? [
                {
                  id: 'app-block',
                  text: t('home.day.recordApp', '{{app}} · 25 min after lunch', { app }),
                  suggestTaskId: 'review'
                }
              ]
            : [])
        ]
  return { segments: segments.filter((segment) => segment.minutes > 0), records }
}
