import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { decideHomeProposal } from './home-board-loops'
import { useHomeBoardStore } from './home-board-store'
import { sayToHomeLoop, type HomeProposal } from './home-task-loop'

/** Hands a task to its agent. Starting again keeps the conversation that exists. */
export function startHomeLoop(taskId: string): void {
  useHomeBoardStore.setState((state) =>
    state.loops[taskId]
      ? state
      : { loops: { ...state.loops, [taskId]: { startedAt: Date.now(), said: [] } } }
  )
}

export function answerHomeLoop(taskId: string, choiceId: string): void {
  useHomeBoardStore.setState((state) => {
    const loop = state.loops[taskId]
    return loop
      ? { loops: { ...state.loops, [taskId]: { ...loop, answer: { choiceId, at: Date.now() } } } }
      : state
  })
}

export function sayHomeLoop(taskId: string, text: string): void {
  useHomeBoardStore.setState((state) => {
    const loop = state.loops[taskId]
    return loop
      ? { loops: { ...state.loops, [taskId]: sayToHomeLoop(loop, text, Date.now()) } }
      : state
  })
}

/** My answer to a proposal; a confirmation says once where it went and who sees it. */
export function decideHomeLoop(
  taskId: string,
  step: 'start' | 'final',
  proposal: HomeProposal | null,
  project: string
): void {
  useHomeBoardStore.setState((state) =>
    decideHomeProposal(
      state,
      taskId,
      step,
      proposal ? { kind: 'confirmed', proposal } : { kind: 'declined' },
      Date.now()
    )
  )
  if (proposal) {
    toast.success(translate('taskLoop.applied.title', 'It is on inAX now.'), {
      description: proposal.note
        ? translate(
            'taskLoop.applied.note',
            'The PM and the team of “{{project}}” can see the status and this progress note.',
            { project }
          )
        : translate(
            'taskLoop.applied.status',
            'The PM and the team of “{{project}}” can see the new status.',
            { project }
          )
    })
  }
}

/** A task I finished myself. */
export function finishHomeTask(taskId: string): void {
  useHomeBoardStore.setState((state) => ({
    doneTaskIds: [...state.doneTaskIds, taskId],
    inax: {
      ...state.inax,
      [taskId]: { notes: state.inax[taskId]?.notes ?? [], status: 'done' }
    }
  }))
}
