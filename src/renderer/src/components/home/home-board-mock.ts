import type { Translate } from '@/i18n/use-translate'
import { REPO_COLORS } from '../../../../shared/repository/appearance/repo-badge-color'
import {
  HOME_ACCEPT_FOLLOW_UPS,
  type HomeAgent,
  type HomeProjectId,
  type HomeTask
} from './home-board'

// shortcut: one working day of a marketing and operations team, all sample; each part names its real source in
// the PoC report. Names of tasks, projects, meetings and people must stay consistent across this file.

export type HomeProject = { name: string; color: string }

/** Project dots use Orca's own project colours, as the sidebar's project headers do. */
export function buildHomeProjects(t: Translate): Record<HomeProjectId, HomeProject> {
  return {
    campaign: { name: t('home.project.campaign', 'Spring campaign'), color: REPO_COLORS[2] },
    support: { name: t('home.project.support', 'Customer support'), color: REPO_COLORS[5] },
    brand: { name: t('home.project.brand', 'Brand renewal'), color: REPO_COLORS[6] }
  }
}

/** `working` is how long the research agent has been at it, already formatted. */
export function buildHomeTasks(t: Translate, working = ''): HomeTask[] {
  return [
    {
      id: 'copy',
      title: t('home.task.copy', 'Settle the landing page headline'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.copyDue', 'Today 17:00'),
      done: false,
      who: 'waiting',
      whoLabel: t('home.task.copyWho', 'Waiting for my answer · Writing agent'),
      agentId: 'writer',
      question: t('home.task.copyQuestion', 'Which headline should the page use?'),
      choices: [
        { id: 'a', label: t('home.task.copyA', 'A · The first way to meet spring') },
        { id: 'b', label: t('home.task.copyB', 'B · This spring, before anyone else') },
        { id: 'redo', label: t('home.task.copyRedo', 'Write both again') }
      ],
      detail: t(
        'home.task.copyDetail',
        'The writing agent drafted two headlines. Once you choose, it matches the body text and the button to it.'
      )
    },
    {
      id: 'research',
      title: t('home.task.research', 'Survey competitors’ spring promotions'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.today', 'Today'),
      done: false,
      who: 'agentWorking',
      whoLabel: t('home.task.researchWho', 'Agent working · {{time}}', { time: working }),
      agentId: 'research',
      detail: t(
        'home.task.researchDetail',
        'The research agent is putting three competitors’ promotions into one table.'
      )
    },
    {
      id: 'review',
      title: t('home.task.review', 'Comment on the brand guide drafts'),
      project: 'brand',
      due: 'today',
      dueLabel: t('home.task.reviewDue', 'Today, before 15:00'),
      done: false,
      who: null,
      detail: t(
        'home.task.reviewDetail',
        'Park Seoyeon uploaded two drafts. Leave your comments before the 15:00 draft review.'
      )
    },
    {
      id: 'offer',
      title: t('home.task.offer', 'Take my 2 items from the weekly meeting'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.today', 'Today'),
      done: false,
      who: 'waiting',
      whoLabel: t('home.task.offerWho', 'Waiting for my answer · Meeting bot'),
      agentId: 'meeting',
      meetingId: 'weekly',
      question: t('home.task.offerQuestion', 'Add the 2 items the minutes give you to My work?'),
      choices: [
        { id: HOME_ACCEPT_FOLLOW_UPS, label: t('home.task.offerAccept', 'Add to My work') },
        { id: 'decline', label: t('home.task.offerDecline', 'Not mine') }
      ],
      detail: t(
        'home.task.offerDetail',
        'From the spring campaign weekly meeting: compare two vendor quotes; move next week’s dates into the campaign schedule.'
      )
    },
    {
      id: 'inquiries',
      title: t('home.task.inquiries', 'Sort March customer inquiries by type'),
      project: 'support',
      due: 'tomorrow',
      dueLabel: t('home.task.tomorrow', 'Tomorrow'),
      done: false,
      who: 'draft',
      whoLabel: t('home.task.inquiriesWho', 'Draft ready · Inquiry agent'),
      detail: t(
        'home.task.inquiriesDetail',
        'The inquiry agent sorted 214 inquiries into 6 types. Read the draft and correct only what is wrong.'
      )
    },
    {
      id: 'notice',
      title: t('home.task.notice', 'Revise the delivery delay notice'),
      project: 'support',
      due: 'overdue',
      dueLabel: t('home.task.noticeDue', 'Due yesterday'),
      done: false,
      who: 'blocked',
      whoLabel: t('home.task.noticeWho', 'Blocked · waiting for the logistics team'),
      agentId: 'triage',
      detail: t(
        'home.task.noticeDetail',
        'The notice needs the new delivery dates. Lee Doyun asked the logistics team again this morning.'
      )
    },
    {
      id: 'report',
      title: t('home.task.report', 'Share the February campaign report'),
      project: 'campaign',
      due: 'overdue',
      dueLabel: t('home.task.reportDue', 'Due 2 days ago'),
      done: false,
      who: null,
      detail: t(
        'home.task.reportDetail',
        'The report is written. Kim Jiwoo asked for it before Friday.'
      )
    },
    {
      id: 'newsletter',
      title: t('home.task.newsletter', 'Check the March newsletter mailing list'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.newsletterDue', 'Finished yesterday'),
      done: true,
      who: null,
      detail: t('home.task.newsletterDetail', 'You checked 1,240 addresses and removed 12.')
    },
    {
      id: 'budget',
      title: t('home.task.budget', 'Update the campaign budget sheet'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.budgetDue', 'Finished Monday · confirmed by me'),
      done: true,
      who: null,
      detail: t(
        'home.task.budgetDetail',
        'The writing agent updated it; you confirmed the numbers.'
      )
    }
  ]
}

/** What the meeting bot offers; they become tasks only when I accept. */
export function buildHomeFollowUps(t: Translate): HomeTask[] {
  const detail = t('home.task.followDetail', 'From the spring campaign weekly meeting.')
  return [
    {
      id: 'quotes',
      title: t('home.task.quotes', 'Compare two vendor quotes'),
      project: 'campaign',
      due: 'tomorrow',
      dueLabel: t('home.task.tomorrow', 'Tomorrow'),
      done: false,
      who: null,
      detail
    },
    {
      id: 'schedule',
      title: t('home.task.schedule', 'Move next week’s dates into the campaign schedule'),
      project: 'campaign',
      due: 'week',
      dueLabel: t('home.task.friday', 'Friday'),
      done: false,
      who: null,
      detail
    }
  ]
}

/** `ago` words a time of day (minutes from midnight) as how long ago it was. */
export function buildHomeAgents(
  t: Translate,
  tasks: readonly HomeTask[],
  ago: (at: number) => string
): HomeAgent[] {
  const title = (id: string): string => tasks.find((task) => task.id === id)?.title ?? ''
  return [
    {
      id: 'research',
      name: t('home.agent.research', 'Research agent'),
      taskId: 'research',
      doing: title('research'),
      state: 'working',
      stage: 2,
      last: t('home.agent.justNow', 'Just now'),
      lines: [
        t(
          'home.agent.researchLine',
          'Two competitors are done. I am checking the discount terms of the last one.'
        )
      ]
    },
    {
      id: 'writer',
      name: t('home.agent.writer', 'Writing agent'),
      taskId: 'copy',
      doing: title('copy'),
      state: 'waiting',
      stage: 3,
      last: ago(9 * 60 + 40),
      lines: [
        t(
          'home.agent.writerLine1',
          'I uploaded two headlines. A leads with the season, B with speed.'
        ),
        t(
          'home.agent.writerLine2',
          'When you choose, I will match the body text and the button to it.'
        )
      ]
    },
    {
      id: 'meeting',
      name: t('home.agent.meeting', 'Meeting bot'),
      taskId: 'offer',
      doing: t('home.agent.meetingDoing', 'Minutes of the spring campaign weekly meeting'),
      state: 'waiting',
      stage: 3,
      last: ago(9 * 60 + 35),
      lines: [t('home.agent.meetingLine', 'The minutes are ready. Two items are yours.')]
    },
    {
      id: 'triage',
      name: t('home.agent.triage', 'Inquiry agent'),
      taskId: 'notice',
      doing: title('notice'),
      state: 'blocked',
      stage: 2,
      last: ago(8 * 60 + 55),
      lines: [
        t('home.agent.triageLine1', 'I need the new delivery dates to revise the notice.'),
        t(
          'home.agent.triageLine2',
          'Lee Doyun asked the logistics team again. I continue when they reply.'
        )
      ]
    },
    {
      id: 'calendar',
      name: t('home.agent.calendar', 'Schedule bot'),
      doing: t('home.agent.calendarDoing', 'Nothing assigned'),
      state: 'idle',
      stage: 0,
      last: t('home.agent.yesterday', 'Yesterday'),
      lines: [t('home.agent.calendarLine', 'I will tell you when next week’s schedule changes.')]
    }
  ]
}
