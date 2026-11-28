import type { HomeBoardState, HomeChoice, HomeTask } from './home-board'
import { homeLoopPhase, type HomeTaskLoop, type InaxStatus } from './home-task-loop'

export const HOME_LOOP_AGENT_ID = 'task-agent'

/**
 * Tasks as inAX and my conversations leave them. A status comes from the sample, from my own hand (starting a
 * task, moving its card) or from a day-end card I saved; an agent never changes it.
 */
export function applyHomeTaskLoops(
  tasks: readonly HomeTask[],
  state: Pick<HomeBoardState, 'loops' | 'inax'>,
  now: number,
  script: (
    task: HomeTask,
    loop: HomeTaskLoop
  ) => {
    question: string
    choices: HomeChoice[]
    /** Null when nothing was prepared for the task: the agent then has nothing to propose. */
    draft: string | null
    note: string
  },
  labels: {
    working: (minutes: number) => string
    question: string
    result: string
    confirmed: (status: InaxStatus) => string
  }
): HomeTask[] {
  return tasks.map((task) => {
    const record = state.inax[task.id]
    const status: InaxStatus =
      record?.status ??
      task.status ??
      (task.done ? 'done' : task.who === null || task.meetingId ? 'todo' : 'inProgress')
    const loop = state.loops[task.id]
    const base = {
      ...task,
      status,
      statusAt: record?.statusAt,
      done: status === 'done',
      notes: record?.notes ?? []
    }
    if (!loop) {
      return base
    }
    const scripted = script(task, loop)
    const reached = homeLoopPhase(loop, now)
    // With no draft there is no result: after my answer the agent keeps working.
    const phase =
      scripted.draft === null && loop.answer && reached !== 'question' ? 'working' : reached
    const mine = {
      ...base,
      loop: phase,
      folder: loop.folder,
      agentId: `${HOME_LOOP_AGENT_ID}:${task.id}`,
      question: undefined
    }
    if (phase === 'working') {
      const since = loop.answer?.at ?? loop.startedAt
      return {
        ...mine,
        who: 'agentWorking',
        whoLabel: labels.working(Math.floor((now - since) / 60_000))
      }
    }
    if (phase === 'question') {
      const { question, choices } = scripted
      return { ...mine, who: 'waiting', whoLabel: labels.question, question, choices }
    }
    if (phase === 'result') {
      // Not "waiting": the proposal asks nothing of me until I open the day-end cards.
      return {
        ...mine,
        who: 'draft',
        whoLabel: labels.result,
        hasDraft: true,
        proposal: { status: 'review', note: scripted.note }
      }
    }
    return { ...mine, hasDraft: true, who: 'draft', whoLabel: labels.confirmed(status) }
  })
}
