import type { HomeBoardState, HomeChoice, HomeTask } from './home-board'
import {
  confirmHomeProposal,
  homeLoopOpenProposal,
  homeLoopPhase,
  type HomeProposal,
  type HomeTaskLoop,
  type InaxStatus
} from './home-task-loop'

export const HOME_LOOP_AGENT_ID = 'task-agent'

/**
 * Tasks as inAX and my conversations leave them. A status comes only from the sample or from a proposal I
 * confirmed; a conversation changes who has the task, never its status.
 */
export function applyHomeTaskLoops(
  tasks: readonly HomeTask[],
  state: Pick<HomeBoardState, 'loops' | 'inax'>,
  now: number,
  script: (
    task: HomeTask,
    loop: HomeTaskLoop
  ) => { question: string; choices: HomeChoice[]; note: string; basis: string[] },
  labels: {
    working: (minutes: number) => string
    question: string
    proposal: string
    confirmed: (status: InaxStatus) => string
    declined: string
  }
): HomeTask[] {
  return tasks.map((task) => {
    const record = state.inax[task.id]
    const status: InaxStatus =
      record?.status ??
      task.status ??
      (task.done ? 'done' : task.who === null || task.meetingId ? 'todo' : 'inProgress')
    const loop = state.loops[task.id]
    const base = { ...task, status, done: status === 'done', notes: record?.notes ?? [] }
    if (!loop) {
      return base
    }
    const phase = homeLoopPhase(loop, now)
    const mine = {
      ...base,
      loop: phase,
      agentId: `${HOME_LOOP_AGENT_ID}:${task.id}`,
      question: undefined
    }
    if (phase === 'working') {
      const since = loop.answer?.at ?? loop.start?.at ?? loop.startedAt
      return {
        ...mine,
        who: 'agentWorking',
        whoLabel: labels.working(Math.floor((now - since) / 60_000))
      }
    }
    const { question, choices, note, basis } = script(task, loop)
    if (phase === 'question') {
      return { ...mine, who: 'waiting', whoLabel: labels.question, question, choices }
    }
    if (phase === 'proposal') {
      const proposal = homeLoopOpenProposal(loop, now, note)
      return {
        ...mine,
        who: 'waiting',
        whoLabel: labels.proposal,
        proposal: proposal ? { status: proposal.status, note: proposal.note } : undefined,
        proposalStep: proposal?.step,
        proposalBasis: basis,
        hasDraft: proposal?.step === 'final'
      }
    }
    return {
      ...mine,
      hasDraft: true,
      who: 'draft',
      whoLabel: phase === 'confirmed' ? labels.confirmed(status) : labels.declined
    }
  })
}

/** My answer to a proposal. Only "confirmed" touches what inAX holds. */
export function decideHomeProposal(
  state: Pick<HomeBoardState, 'loops' | 'inax'>,
  taskId: string,
  step: 'start' | 'final',
  decision: { kind: 'confirmed'; proposal: HomeProposal } | { kind: 'declined' },
  at: number
): Pick<HomeBoardState, 'loops' | 'inax'> {
  const loop = state.loops[taskId]
  if (!loop) {
    return state
  }
  return {
    loops: { ...state.loops, [taskId]: { ...loop, [step]: { kind: decision.kind, at } } },
    inax:
      decision.kind === 'confirmed'
        ? {
            ...state.inax,
            [taskId]: confirmHomeProposal(state.inax[taskId], decision.proposal, at)
          }
        : state.inax
  }
}
