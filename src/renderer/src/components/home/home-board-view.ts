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
import { homeSampleAsks, withDayEndAsks, type HomeSampleAsk } from './home-board-asks'
import { HOME_LOOP_AGENT_ID, applyHomeTaskLoops } from './home-board-loops'
import { buildHomeLoopScript, inaxStatusLabels } from './home-task-loop-script'
import { buildHomeLoopActivity } from './home-board-loop-activity'
import { buildHomeAgents } from './home-board-agents-mock'
import { buildHomeActivity, type HomeActivity } from './home-board-activity-mock'
import { buildHomeTasks, type HomeSampleContext } from './home-board-mock'
import { buildHomeMeetings, type HomeMeetingsInput } from './home-board-meetings'
import { MAKO, personName } from '@/components/meetings/meeting-people'
import {
  buildHomeDay,
  buildHomeUpcoming,
  placeHomeDayBlocks,
  homeResearchWorkingSince,
  type HomeDayRecord,
  type HomeDayBlock,
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

const BOARD_LABELS = { resumed: '', addedDue: '', addedAgent: '', doneReport: '' }

export type HomeBoardView = {
  tasks: HomeTask[]
  /** The work board's cards: my tasks, or 마코's as a colleague sees them. */
  boardTasks: HomeTask[]
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
  /** My day on its clock: app use, meetings, and records with no task, oldest first. */
  blocks: HomeDayBlock[]
  records: HomeDayRecord[]
  /** The day-end cards still to go through. */
  dayEnd: HomeDayEndCard[]
  /** What the sample's agents asked of me, kept after I answer: the history of each task's item. */
  sampleAsks: Record<string, HomeSampleAsk>
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
    ago: (at) => formatUiRelativeTime(Math.min(-1, at - minutes) * 60_000, intlLocale),
    at: (workdays, clock) => addWorkdays(sampleDay, workdays) + clock * 60_000
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
  const loopAgent = t('taskLoop.agent.name', 'Task agent')
  const withLoops = (list: readonly HomeTask[]): HomeTask[] =>
    applyHomeTaskLoops(list, board, args.now, (task, loop) => buildHomeLoopScript(t, task, loop), {
      working: (count) =>
        count < 1
          ? t('taskLoop.who.justStarted', 'Agent working · just started')
          : t('home.task.researchWho', 'Agent working · {{time}}', { time: args.duration(count) }),
      question: t('taskLoop.who.question', 'Needs me · {{agent}}', {
        agent: loopAgent
      }),
      result: t('taskLoop.who.result', 'Result ready'),
      // A colleague reads 마코's name where she reads "me".
      confirmed: (status) =>
        own
          ? t('taskLoop.who.confirmed', '{{status}} · written by the agent, confirmed by me', {
              status: inaxStatusLabels(t)[status]
            })
          : t(
              'taskLoop.who.confirmedBy',
              '{{status}} · written by the agent, confirmed by {{name}}',
              { status: inaxStatusLabels(t)[status], name: personName(MAKO) }
            )
    })
  // 마코's tasks as inAX holds them: her own list, and what a colleague sees of it on the board.
  const sampleTasks = buildHomeTasks(t, sample)
  const tasks = withLoops([
    ...applyHomeBoardState(own ? sampleTasks : [], board, {
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
            stage: task.loop === 'working' ? 2 : task.loop === 'question' ? 1 : 3,
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
      const task = sampleTasks.find((entry) => entry.id === taskId)
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
    ...buildHomeLoopActivity(t, { board, tasks, minutes, me, agent: loopAgent }),
    ...(fromMeetings.recording
      ? [
          {
            id: 'meeting-started',
            day: 0,
            at: minutes,
            who: me,
            text: t('home.activity.meetingStarted', 'started a recorded meeting'),
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

  const day = own ? buildHomeDay(t, phase, args.app, minutes) : { blocks: [], records: [] }
  const blocks = own
    ? placeHomeDayBlocks(day.blocks, tasks, board.records, { ...args.meetings, sampleDay, minutes })
    : []
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
  const shownTasks = phase === 'evening' ? withDayEndAsks(t, tasks, dayEnd) : tasks
  return {
    tasks: shownTasks,
    sampleAsks: own
      ? homeSampleAsks(sampleTasks, sample.at(0, Math.min(minutes - 30, 10 * 60 + 40)))
      : {},
    // Someone else looking sees 마코's tasks as inAX shows them: status, saved notes, and that an agent is on it.
    boardTasks: own
      ? tasks.filter((task) => !task.meetingId)
      : withLoops(applyHomeBoardState(sampleTasks, board, BOARD_LABELS)).map((task) => ({
          ...task,
          assignee: MAKO,
          question: undefined,
          proposal: undefined,
          whoLabel: task.who === 'agentWorking' ? task.whoLabel : undefined,
          who: task.who === 'agentWorking' ? task.who : null
        })),
    otherTasks: withLoops(fromMeetings.otherTasks),
    recordingMeetingId: fromMeetings.recording?.id ?? null,
    openTasks: tasks.filter((task) => !task.done && !task.meetingId),
    counts: countHomeBoard(shownTasks),
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
    blocks,
    records: day.records,
    dayEnd
  }
}
