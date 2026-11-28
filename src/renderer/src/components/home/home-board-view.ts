import type { Translate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import {
  applyHomeBoardState,
  countHomeBoard,
  orderHomeAgents,
  type HomeAgent,
  type HomeBoardCounts,
  type HomeBoardState,
  type HomeTask
} from './home-board'
import { planHomeDayEnd, type HomeDayEndCard } from './home-day-end'
import { HOME_LOOP_AGENT_ID, applyHomeTaskLoops } from './home-board-loops'
import { buildHomeLoopScript, inaxStatusLabels } from './home-task-loop-script'
import { buildHomeAgents } from './home-board-agents-mock'
import { buildHomeActivity, type HomeActivity } from './home-board-activity-mock'
import { buildHomeTasks, type HomeSampleContext } from './home-board-mock'
import { buildHomeMeetings, type HomeMeetingsInput } from './home-board-meetings'
import { MAKO, personName } from '@/components/meetings/meeting-people'
import {
  buildHomeDay,
  buildHomeUpcoming,
  homeResearchWorkingSince,
  type HomeDayRecord,
  type HomeDaySegment,
  type HomeUpcoming
} from './home-board-day-mock'
import {
  addWorkdays,
  calendarDaysBetween,
  formatHomeClock,
  inSameWeek,
  type HomePhase
} from './home-day'

const WEEKDAY_LONG: Intl.DateTimeFormatOptions = { weekday: 'long' }
const WEEKDAY_SHORT: Intl.DateTimeFormatOptions = { weekday: 'short' }

export type HomeActivityRow = HomeActivity & { when: string }

export type HomeBoardView = {
  tasks: HomeTask[]
  /** Follow-up tasks of meetings I can see that belong to someone else. */
  otherTasks: HomeTask[]
  /** The meeting of mine being recorded now, if any. */
  recordingMeetingId: string | null
  /** Tasks a day record can be linked to. */
  openTasks: HomeTask[]
  counts: HomeBoardCounts
  agents: HomeAgent[]
  activity: HomeActivityRow[]
  /** Work agents finished this week, and how much of it I have confirmed. */
  agentFinished: number
  agentConfirmed: number
  upcoming: HomeUpcoming[]
  segments: HomeDaySegment[]
  records: HomeDayRecord[]
  /** The day-end cards still to go through. */
  dayEnd: HomeDayEndCard[]
}

/** The whole sample board for one moment: the sample day, the pretend time, and what I have done so far. */
export function buildHomeBoardView(
  t: Translate,
  args: {
    board: HomeBoardState
    minutes: number
    /** The real clock, which my conversations with agents run on. */
    now: number
    phase: HomePhase
    sampleDay: number
    intlLocale: string
    signedIn: boolean
    app: string | undefined
    duration: (minutes: number) => string
    meetings: HomeMeetingsInput
  }
): HomeBoardView {
  const { board, minutes, phase, sampleDay, intlLocale } = args
  const weekday = (dayStart: number, options = WEEKDAY_SHORT): string =>
    uiDateTimeFormat(options, intlLocale).format(dayStart)
  const sample: HomeSampleContext = {
    phase,
    working: args.duration(Math.max(1, minutes - homeResearchWorkingSince(phase))),
    dayName: (workdays) => {
      const day = addWorkdays(sampleDay, workdays)
      const away = calendarDaysBetween(sampleDay, day)
      if (away === 1) {
        return t('home.day.tomorrow', 'tomorrow')
      }
      return away === -1 ? t('home.day.yesterday', 'yesterday') : weekday(day, WEEKDAY_LONG)
    },
    ago: (at) => formatUiRelativeTime(Math.min(-1, at - minutes) * 60_000, intlLocale)
  }
  // The written sample is 마코's day. Seen as someone else, the board holds only what the meetings give them.
  const own = args.meetings.viewerId === MAKO
  const dayLabel = (dayStart: number): string => {
    const away = calendarDaysBetween(sampleDay, dayStart)
    return away === 0
      ? t('home.task.today', 'Today')
      : away === 1
        ? t('home.day.tomorrow', 'tomorrow')
        : away === -1
          ? t('home.day.yesterday', 'yesterday')
          : weekday(dayStart, WEEKDAY_LONG)
  }
  const fromMeetings = buildHomeMeetings(t, args.meetings, {
    sampleDay,
    minutes,
    personName,
    dayLabel,
    weekday
  })
  const baseTasks = own ? buildHomeTasks(t, sample) : []
  const loopAgent = t('taskLoop.agent.name', 'Task agent')
  const withLoops = (list: readonly HomeTask[]): HomeTask[] =>
    applyHomeTaskLoops(list, board, args.now, (task, loop) => buildHomeLoopScript(t, task, loop), {
      working: (count) =>
        count < 1
          ? t('taskLoop.who.justStarted', 'Agent working · just started')
          : t('home.task.researchWho', 'Agent working · {{time}}', { time: args.duration(count) }),
      question: t('taskLoop.who.question', 'Waiting for my answer · {{agent}}', {
        agent: loopAgent
      }),
      proposal: t('taskLoop.who.proposal', 'Waiting for my confirmation · {{agent}}', {
        agent: loopAgent
      }),
      confirmed: (status) =>
        t('taskLoop.who.confirmed', '{{status}} · written by the agent, confirmed by me', {
          status: inaxStatusLabels(t)[status]
        }),
      declined: t('taskLoop.who.declined', 'Draft ready · waiting for my confirmation')
    })
  const tasks = withLoops([
    ...applyHomeBoardState(baseTasks, board, {
      resumed: t('home.task.resumed', 'Agent working · picked up my answer'),
      addedDue: t('home.task.today', 'Today'),
      addedAgent: t('home.task.addedAgent', 'Agent working · just handed over'),
      doneReport: t('home.report.done', 'I finished this task.')
    }),
    ...fromMeetings.waiting,
    ...fromMeetings.tasks
  ])
  const recording = fromMeetings.recording !== null
  const loopAgents: HomeAgent[] = tasks.flatMap((task) =>
    task.loop
      ? [
          {
            id: `${HOME_LOOP_AGENT_ID}:${task.id}`,
            name: loopAgent,
            taskId: task.id,
            doing: task.title,
            state:
              task.loop === 'working' ? 'working' : task.who === 'waiting' ? 'waiting' : 'idle',
            stage:
              task.loop === 'working'
                ? 2
                : task.loop === 'question' || task.proposalStep === 'start'
                  ? 1
                  : 3,
            last: t('home.agent.justNow', 'Just now'),
            lines: []
          }
        ]
      : []
  )
  const agents = orderHomeAgents(
    [
      ...loopAgents,
      ...buildHomeAgents(t, tasks, sample, fromMeetings.agent).filter(
        (agent) => own || agent.id === 'meeting'
      )
    ],
    tasks,
    recording,
    {
      resumedLast: t('home.agent.justNow', 'Just now'),
      recording: fromMeetings.agent.doing
    }
  )

  const me = t('home.activity.me', 'I')
  const mine: HomeActivity[] = [
    ...Object.entries(board.answers).map(([taskId, choiceId]) => {
      const task = baseTasks.find((entry) => entry.id === taskId)
      const choice = task?.choices?.find((entry) => entry.id === choiceId)
      return {
        id: `answer-${taskId}`,
        day: 0,
        at: minutes,
        who: me,
        text: t('home.activity.answered', 'answered: {{choice}}', { choice: choice?.label ?? '' }),
        byAgent: false,
        taskId
      }
    }),
    ...Object.entries(board.loops).flatMap(([taskId, loop]) =>
      loop.final?.kind === 'confirmed'
        ? [
            {
              id: `loop-confirmed-${taskId}`,
              day: 0,
              at: minutes,
              who: loopAgent,
              text: t(
                'taskLoop.activity.confirmed',
                '· drafted “{{title}}”; the status and the progress note I confirmed are on inAX',
                { title: tasks.find((task) => task.id === taskId)?.title ?? '' }
              ),
              byAgent: true,
              // Sent for review is work done, not work finished: only Done counts in the tile.
              finished: board.inax[taskId]?.status === 'done',
              confirmed: true,
              taskId
            }
          ]
        : []
    ),
    ...(fromMeetings.recording
      ? [
          {
            id: 'meeting-started',
            day: 0,
            at: minutes,
            who: me,
            text: t(
              'home.activity.meetingStarted',
              'started a meeting; the meeting agent is recording'
            ),
            byAgent: false,
            meetingId: fromMeetings.recording.id
          }
        ]
      : [])
  ]
  // My answer is the confirmation of the work that asked for it.
  const confirmedByAnswer: Record<string, boolean> = {
    'copy-draft': board.answers.copy !== undefined
  }
  const activity: HomeActivityRow[] = [
    ...(own ? mine : mine.filter((entry) => entry.id === 'meeting-started')),
    ...(own ? buildHomeActivity(t) : []),
    ...fromMeetings.activity
  ]
    .filter((entry) =>
      entry.day === 0
        ? entry.at <= minutes
        : inSameWeek(sampleDay, addWorkdays(sampleDay, entry.day))
    )
    .sort((a, b) => b.day - a.day || b.at - a.at)
    .map((entry) => ({
      ...entry,
      confirmed: entry.confirmed === true || confirmedByAnswer[entry.id] === true,
      when: entry.day === 0 ? formatHomeClock(entry.at) : weekday(addWorkdays(sampleDay, entry.day))
    }))
  const finished = activity.filter((entry) => entry.finished)

  const day = own ? buildHomeDay(t, phase, args.app) : { segments: [], records: [] }
  const dayEnd = own
    ? planHomeDayEnd({
        tasks,
        activity,
        records: day.records,
        recordAnswers: board.records,
        viewerId: args.meetings.viewerId,
        meetings: args.meetings.meetings,
        meetingTasks: args.meetings.tasks,
        saved: board.dayEnd,
        // Only what the agent knows: a task nobody reported on gets no line written for it.
        suggestion: (task) =>
          task.id === 'copy' && board.answers.copy !== undefined
            ? t(
                'home.report.copyChosen',
                'The writing agent drafted two headlines and I chose one. It is matching the body text and the button to it.'
              )
            : (task.report ?? null)
      })
    : []
  return {
    tasks,
    otherTasks: withLoops(fromMeetings.otherTasks),
    recordingMeetingId: fromMeetings.recording?.id ?? null,
    openTasks: tasks.filter((task) => !task.done && !task.meetingId),
    counts: countHomeBoard(tasks),
    agents,
    activity,
    agentFinished: finished.length,
    agentConfirmed: finished.filter((entry) => entry.confirmed).length,
    upcoming: [
      ...(own ? buildHomeUpcoming(t, { sampleDay, minutes, weekday }) : []),
      ...fromMeetings.upcoming
    ]
      .filter((item) => args.signedIn || !item.taskId)
      .sort((a, b) => a.at - b.at),
    segments: day.segments,
    records: day.records,
    dayEnd
  }
}
