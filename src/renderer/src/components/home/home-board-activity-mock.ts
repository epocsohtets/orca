import type { Translate } from '@/i18n/use-translate'

const at = (hour: number, minute = 0): number => hour * 60 + minute

export type HomeActivity = {
  id: string
  /** Working days before the sample day (0 or negative). */
  day: number
  at: number
  who: string
  text: string
  byAgent: boolean
  /** A piece of work an agent finished; `confirmed` once I have checked it. */
  finished?: boolean
  confirmed?: boolean
  taskId?: string
  agentId?: string
  meetingId?: string
}

export function buildHomeActivity(t: Translate): HomeActivity[] {
  const research = t('home.agent.research', 'Research agent')
  const writer = t('home.agent.writer', 'Writing agent')
  const triage = t('home.agent.triage', 'Inquiry agent')
  return [
    {
      id: 'budget-done',
      day: -4,
      at: at(15, 20),
      who: writer,
      text: t('home.activity.budgetDone', 'updated the campaign budget sheet'),
      byAgent: true,
      finished: true,
      confirmed: true,
      taskId: 'budget'
    },
    {
      id: 'quarter-summary',
      day: -3,
      at: at(11, 10),
      who: research,
      text: t('home.activity.quarterSummary', 'summarised last quarter’s campaign results'),
      byAgent: true,
      finished: true,
      confirmed: true
    },
    {
      id: 'inquiry-counts',
      day: -2,
      at: at(16, 30),
      who: triage,
      text: t('home.activity.inquiryCounts', 'put last week’s inquiry counts into a table'),
      byAgent: true,
      finished: true,
      confirmed: true
    },
    {
      id: 'inquiries-draft',
      day: 0,
      at: at(8, 50),
      who: triage,
      text: t(
        'home.activity.inquiriesDraft',
        'drafted “Sort this month’s customer inquiries by type”'
      ),
      byAgent: true,
      finished: true,
      taskId: 'inquiries'
    },
    {
      id: 'notice-stop',
      day: 0,
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
      id: 'research-start',
      day: 0,
      at: at(9, 5),
      who: research,
      text: t('home.activity.researchStart', 'started “Survey competitors’ promotions”'),
      byAgent: true,
      taskId: 'research'
    },
    {
      id: 'copy-draft',
      day: 0,
      at: at(9, 40),
      who: writer,
      text: t(
        'home.activity.copyDraft',
        'drafted two launch page headlines and asked me to choose'
      ),
      byAgent: true,
      finished: true,
      taskId: 'copy'
    },
    {
      id: 'drafts-up',
      day: 0,
      at: at(11, 40),
      who: t('home.person.hyunwoo', 'Choi Hyunwoo'),
      text: t('home.activity.draftsUp', 'uploaded two brand guide drafts'),
      byAgent: false,
      taskId: 'review'
    },
    {
      id: 'research-table',
      day: 0,
      at: at(13, 20),
      who: research,
      text: t('home.activity.researchTable', 'put two competitors’ promotions into a table'),
      byAgent: true,
      taskId: 'research'
    },
    {
      id: 'research-done',
      day: 0,
      at: at(17, 10),
      who: research,
      text: t('home.activity.researchDone', 'finished “Survey competitors’ promotions”'),
      byAgent: true,
      finished: true,
      taskId: 'research'
    }
  ]
}
