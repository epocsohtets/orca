/** Who is on a task right now. Null is "mine to do". */
export type HomeTaskWho = 'agentWorking' | 'waiting' | 'draft' | 'blocked' | null
export type HomeDue = 'overdue' | 'today' | 'tomorrow' | 'week'
export type HomeProjectId = 'campaign' | 'support' | 'brand'
export type HomeTaskTab = 'today' | 'waiting' | 'late' | 'done'
export type HomeAgentState = 'waiting' | 'working' | 'blocked' | 'idle'

export type HomeChoice = { id: string; label: string }

export type HomeTask = {
  id: string
  title: string
  project: HomeProjectId
  due: HomeDue
  dueLabel: string
  done: boolean
  who: HomeTaskWho
  /** The line beside the title: who has it and for how long. */
  whoLabel?: string
  agentId?: string
  /** A question waiting on me; the row answers it in place. */
  question?: string
  choices?: HomeChoice[]
  /** A meeting's follow-ups offered to me: listed under Needs me, not counted as a task. */
  meetingId?: string
  detail: string
  /** Today's one-line update for this task, as it would be reported. */
  report?: string
}

export type HomeAgent = {
  id: string
  name: string
  taskId?: string
  doing: string
  state: HomeAgentState
  /** 0 none, 1 plan, 2 work, 3 review. */
  stage: 0 | 1 | 2 | 3
  last: string
  /** The end of its conversation, shown when the row opens. */
  lines: string[]
}

export type HomeRecordAnswer = { taskId: string } | 'notWork'

/** What survives a reload. */
export type HomeBoardState = {
  /** Task id to the choice I gave. */
  answers: Record<string, string>
  records: Record<string, HomeRecordAnswer>
  addedTasks: { id: string; title: string; agent?: boolean }[]
  doneTaskIds: string[]
  meetingStartedAt: number | null
  wrapUp: { count: number } | null
}

export const EMPTY_HOME_BOARD_STATE: HomeBoardState = {
  answers: {},
  records: {},
  addedTasks: [],
  doneTaskIds: [],
  meetingStartedAt: null,
  wrapUp: null
}

export const HOME_ACCEPT_FOLLOW_UPS = 'accept'

/**
 * The task list as it stands after what I did: an answered question hands the task back to its agent, accepted
 * follow-ups and tasks I added join the list, and tasks I finished are done.
 */
export function applyHomeBoardState(
  tasks: readonly HomeTask[],
  followUps: readonly HomeTask[],
  state: HomeBoardState,
  labels: {
    resumed: string
    addedDue: string
    addedDetail: string
    addedAgent: string
    doneReport: string
  }
): HomeTask[] {
  const next: HomeTask[] = []
  for (const task of tasks) {
    const answered = state.answers[task.id] !== undefined
    if (task.meetingId) {
      // An answered offer leaves the list; accepting it adds the follow-ups as real tasks.
      if (!answered) {
        next.push(task)
      } else if (state.answers[task.id] === HOME_ACCEPT_FOLLOW_UPS) {
        next.push(...followUps)
      }
      continue
    }
    next.push(
      answered && task.who === 'waiting'
        ? { ...task, who: 'agentWorking', whoLabel: labels.resumed, question: undefined }
        : task
    )
  }
  for (const added of state.addedTasks) {
    next.push({
      id: added.id,
      title: added.title,
      project: 'campaign',
      due: 'today',
      dueLabel: labels.addedDue,
      done: false,
      who: added.agent ? 'agentWorking' : null,
      whoLabel: added.agent ? labels.addedAgent : undefined,
      detail: labels.addedDetail
    })
  }
  // A task I finished today reports that I did, in my own words.
  return next.map((task) =>
    state.doneTaskIds.includes(task.id) ? { ...task, done: true, report: labels.doneReport } : task
  )
}

const DUE_ORDER: Record<HomeDue, number> = { today: 0, overdue: 1, tomorrow: 2, week: 3 }

/** What waits on me first, then due today, then what is late, then later days. */
export function sortHomeTasks(tasks: readonly HomeTask[]): HomeTask[] {
  const rank = (task: HomeTask): number =>
    (task.who === 'waiting' && !task.done ? 0 : 10) + DUE_ORDER[task.due]
  return [...tasks].sort((a, b) => rank(a) - rank(b))
}

export function homeTaskTab(task: HomeTask): HomeTaskTab[] {
  if (task.done) {
    return ['done']
  }
  const tabs: HomeTaskTab[] = []
  // "Today" is everything open on my plate, a meeting's offer included, so its count is the My work tile's number.
  tabs.push('today')
  if (task.who === 'waiting') {
    tabs.push('waiting')
  }
  if (task.due === 'overdue' || task.who === 'blocked') {
    tabs.push('late')
  }
  return tabs
}

export type HomeBoardCounts = {
  open: number
  dueToday: number
  waiting: number
  waitingAgents: number
  waitingMeetings: number
  late: number
}

export function countHomeBoard(tasks: readonly HomeTask[]): HomeBoardCounts {
  const open = tasks.filter((task) => !task.done)
  const waiting = open.filter((task) => task.who === 'waiting')
  return {
    open: open.length,
    dueToday: open.filter((task) => task.due === 'today' && !task.meetingId).length,
    waiting: waiting.length,
    waitingAgents: waiting.filter((task) => !task.meetingId).length,
    waitingMeetings: waiting.filter((task) => task.meetingId).length,
    late: open.filter((task) => task.due === 'overdue' || task.who === 'blocked').length
  }
}

const AGENT_ORDER: Record<HomeAgentState, number> = { waiting: 0, blocked: 1, working: 2, idle: 3 }

/** Agents with their state after my answers; the ones waiting on me come first. */
export function orderHomeAgents(
  agents: readonly HomeAgent[],
  tasks: readonly HomeTask[],
  meetingRecording: boolean,
  labels: { resumedLast: string; recording: string }
): HomeAgent[] {
  const stillWaiting = new Set(
    tasks.filter((task) => task.who === 'waiting').map((task) => task.agentId)
  )
  return agents
    .map((agent): HomeAgent => {
      if (agent.id === 'meeting' && meetingRecording) {
        return {
          ...agent,
          state: 'working',
          stage: 2,
          doing: labels.recording,
          last: labels.resumedLast
        }
      }
      return agent.state === 'waiting' && !stillWaiting.has(agent.id)
        ? { ...agent, state: 'working', stage: 2, last: labels.resumedLast }
        : agent
    })
    .sort((a, b) => AGENT_ORDER[a.state] - AGENT_ORDER[b.state])
}

export type HomeWrapUpPlan<DayRecord> = {
  /** One update per task: tasks with a written update, and tasks I linked a day record to. */
  items: { task: HomeTask; linkedRecords: number }[]
  /** Records I have not answered. They are never part of the report. */
  unanswered: DayRecord[]
}

/**
 * What Wrap up today may report. A day record reaches the report only through the task I linked it to, and only
 * as a count beside that task's update; a record I ruled out or never answered is not in it.
 */
export function planHomeWrapUp<DayRecord extends { id: string }>(
  tasks: readonly HomeTask[],
  records: readonly DayRecord[],
  answers: Readonly<Record<string, HomeRecordAnswer | undefined>>
): HomeWrapUpPlan<DayRecord> {
  const linked = new Map<string, number>()
  const unanswered: DayRecord[] = []
  for (const record of records) {
    const answer = answers[record.id]
    if (answer === undefined) {
      unanswered.push(record)
    } else if (answer !== 'notWork') {
      linked.set(answer.taskId, (linked.get(answer.taskId) ?? 0) + 1)
    }
  }
  return {
    items: tasks
      .filter((task) => !task.meetingId && (task.report !== undefined || linked.has(task.id)))
      .map((task) => ({ task, linkedRecords: linked.get(task.id) ?? 0 })),
    unanswered
  }
}
