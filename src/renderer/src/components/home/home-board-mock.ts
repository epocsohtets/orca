import type { Translate } from '@/i18n/use-translate'
import { REPO_COLORS } from '../../../../shared/repository/appearance/repo-badge-color'
import type { HomeProjectId, HomeTask } from './home-board'
import type { HomePhase } from './home-day'

// shortcut: one working day of a marketing and operations team, all sample; each part names its real source in
// the PoC report. Names of tasks, projects, meetings and people must stay consistent across this file, and no name
// may carry a season or a month: the page shows the real date. The one exception is the year-end promotion, which
// the meeting sample is about.

export type HomeProject = { name: string; color: string }

/** Project dots use Orca's own project colours, as the sidebar's project headers do. */
export function buildHomeProjects(t: Translate): Record<HomeProjectId, HomeProject> {
  return {
    campaign: {
      name: t('home.project.campaign', 'Product launch campaign'),
      color: REPO_COLORS[2]
    },
    promo: { name: t('home.project.promo', 'Year-end promotion'), color: REPO_COLORS[3] },
    support: { name: t('home.project.support', 'Customer support'), color: REPO_COLORS[5] },
    brand: { name: t('home.project.brand', 'Brand renewal'), color: REPO_COLORS[6] }
  }
}

export type HomeSampleContext = {
  phase: HomePhase
  /** How long the research agent has been on its current step, already formatted. */
  working: string
  /** Words a day `workdays` away from the sample day: "tomorrow", "yesterday", or its weekday. */
  dayName: (workdays: number) => string
  /** Words a time of the sample day as how long ago it was. */
  ago: (at: number) => string
  /** The moment `minutes` past midnight on the working day `workdays` away from the sample day. */
  at: (workdays: number, minutes: number) => number
}

export function buildHomeTasks(t: Translate, sample: HomeSampleContext): HomeTask[] {
  const researchDone = sample.phase === 'evening'
  return [
    {
      id: 'copy',
      title: t('home.task.copy', 'Settle the launch page headline'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.copyDue', 'Today 17:00'),
      done: false,
      who: 'waiting',
      whoLabel: t('home.task.copyWho', 'Needs me · Writing agent'),
      agentId: 'writer',
      question: t('home.task.copyQuestion', 'Which headline should the page use?'),
      // Saved on earlier days: the log a day-end save adds to.
      notes: [
        {
          id: 'copy-note-1',
          at: sample.at(-3, 17 * 60 + 40),
          text: t('home.note.copy1', 'Narrowed the headline down to three directions.'),
          status: 'inProgress',
          by: 'me'
        },
        {
          id: 'copy-note-2',
          at: sample.at(-2, 17 * 60 + 20),
          text: t('home.note.copy2', 'Started drafts for two of the three directions.'),
          status: 'inProgress',
          by: 'agentConfirmed',
          statusChanged: false
        },
        {
          id: 'copy-note-3',
          at: sample.at(-1, 10 * 60),
          text: t('home.note.copy3', 'Compared the drafts with competitors’ headlines.'),
          status: 'inProgress',
          by: 'agentConfirmed',
          statusChanged: false
        },
        {
          id: 'copy-note-4',
          at: sample.at(-1, 18 * 60 + 5),
          text: t('home.note.copy4', 'Took out a phrase that needs a legal review.'),
          status: 'inProgress',
          by: 'me',
          statusChanged: false
        }
      ],
      choices: [
        { id: 'a', label: t('home.task.copyA', 'A · The first way to meet it') },
        { id: 'b', label: t('home.task.copyB', 'B · Before anyone else, now') },
        { id: 'redo', label: t('home.task.copyRedo', 'Write both again') }
      ],
      detail: t(
        'home.task.copyDetail',
        'The writing agent drafted two headlines. Once you choose, it matches the body text and the button to it.'
      ),
      report: t(
        'home.report.copy',
        'The writing agent drafted two headlines. It is my turn to choose.'
      )
    },
    {
      id: 'research',
      title: t('home.task.research', 'Survey competitors’ promotions'),
      project: 'promo',
      due: 'today',
      dueLabel: t('home.task.today', 'Today'),
      done: false,
      who: researchDone ? 'draft' : 'agentWorking',
      whoLabel: researchDone
        ? t('home.task.researchReady', 'Result ready · Research agent')
        : t('home.task.researchWho', 'Agent working · {{time}}', { time: sample.working }),
      agentId: 'research',
      detail: researchDone
        ? t(
            'home.task.researchDoneDetail',
            'The research agent put three competitors’ promotions into one table. Read it and correct only what is wrong.'
          )
        : t(
            'home.task.researchDetail',
            'The research agent is putting three competitors’ promotions into one table.'
          ),
      report: researchDone
        ? t(
            'home.report.researchDone',
            'I put three competitors’ promotions into one table. Please review it.'
          )
        : t(
            'home.report.research',
            'The research agent has two of three competitors’ promotions in a table. My check is left.'
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
        'Choi Hyunwoo uploaded two drafts. Leave your comments before the 15:00 draft review.'
      )
    },
    {
      id: 'inquiries',
      title: t('home.task.inquiries', 'Sort this month’s customer inquiries by type'),
      project: 'support',
      due: 'tomorrow',
      dueLabel: sample.dayName(1),
      done: false,
      who: 'draft',
      whoLabel: t('home.task.inquiriesWho', 'Draft ready · Inquiry agent'),
      detail: t(
        'home.task.inquiriesDetail',
        'The inquiry agent sorted 214 inquiries into 6 types. Read the draft and correct only what is wrong.'
      ),
      report: t('home.report.inquiries', 'I sorted 214 inquiries into 6 types. Please review them.')
    },
    {
      id: 'notice',
      title: t('home.task.notice', 'Revise the delivery delay notice'),
      project: 'support',
      due: 'overdue',
      dueLabel: t('home.task.dueWas', 'Due {{day}}', { day: sample.dayName(-1) }),
      done: false,
      who: 'blocked',
      whoLabel: t('home.task.noticeWho', 'Awaiting a reply · logistics team'),
      agentId: 'triage',
      detail: t(
        'home.task.noticeDetail',
        'The notice needs the new delivery dates. Lee Mina asked the logistics team again this morning.'
      ),
      report: t(
        'home.report.notice',
        'The inquiry agent cannot continue until the logistics team sends the new delivery dates. The deadline has passed.'
      )
    },
    {
      id: 'report',
      title: t('home.task.report', 'Share last month’s campaign report'),
      project: 'campaign',
      due: 'overdue',
      dueLabel: t('home.task.dueWas', 'Due {{day}}', { day: sample.dayName(-2) }),
      done: false,
      who: null,
      detail: t(
        'home.task.reportDetail',
        'Put last month’s campaign results into a report and share it. Kim Jiwoo asked for it this week.'
      )
    },
    {
      id: 'newsletter',
      title: t('home.task.newsletter', 'Check this month’s newsletter mailing list'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.finishedOn', 'Finished {{day}}', { day: sample.dayName(-1) }),
      done: true,
      who: null,
      detail: t('home.task.newsletterDetail', 'You checked 1,240 addresses and removed 12.')
    },
    {
      id: 'budget',
      title: t('home.task.budget', 'Update the campaign budget sheet'),
      project: 'campaign',
      due: 'today',
      dueLabel: t('home.task.finishedOn', 'Finished {{day}}', { day: sample.dayName(-4) }),
      done: true,
      who: null,
      detail: t(
        'home.task.budgetDetail',
        'The writing agent updated it; you confirmed the numbers.'
      )
    }
  ]
}
