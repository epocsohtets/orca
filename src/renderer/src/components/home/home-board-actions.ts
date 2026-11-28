import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { decideHomeProposal } from './home-board-loops'
import { useHomeBoardStore } from './home-board-store'
import type { HomeRecordAnswer } from './home-board'
import { sayToHomeLoop, type HomeProposal } from './home-task-loop'
import {
  HOME_RECORD_NOT_WORK,
  saveHomeDayEndTask,
  undoHomeDayEnd,
  type HomeDayEndSave
} from './home-day-end'
import { assignFollowUps, useMeetings } from '@/components/meetings/meetings-store'

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

/** Saves one day-end card: from here colleagues see it. */
export function saveHomeDayEnd(save: HomeDayEndSave): void {
  if (save.kind === 'task') {
    useHomeBoardStore.setState((state) => saveHomeDayEndTask(state, { ...save, at: Date.now() }))
  } else if (save.kind === 'meeting') {
    if (save.rows.length === 0) {
      return
    }
    const before = new Set(useMeetings.getState().tasks.map((task) => task.id))
    assignFollowUps(save.meetingId, save.rows)
    const taskIds = useMeetings
      .getState()
      .tasks.filter((task) => !before.has(task.id))
      .map((task) => task.id)
    useHomeBoardStore.setState((state) => ({
      dayEnd: [...state.dayEnd, { kind: 'meeting', id: save.meetingId, taskIds }]
    }))
  } else {
    useHomeBoardStore.setState((state) => ({
      records: {
        ...state.records,
        ...Object.fromEntries(
          save.answers.map(({ recordId, answer }) => [
            recordId,
            answer === HOME_RECORD_NOT_WORK ? ('notWork' as const) : { taskId: answer }
          ])
        )
      },
      dayEnd: [
        ...state.dayEnd,
        { kind: 'records', id: 'records', recordIds: save.answers.map((entry) => entry.recordId) }
      ]
    }))
  }
}

/** Takes back what one saved day-end card sent. */
export function undoHomeDayEndAt(index: number): void {
  const undone = undoHomeDayEnd(useHomeBoardStore.getState(), index)
  const taken = undone.meetingTaskIds
  // The follow-up tasks go, and each follow-up is open again, as before it was assigned.
  useMeetings.setState((state) => ({
    tasks: state.tasks.filter((task) => !taken.includes(task.id)),
    meetings: state.meetings.map((meeting) => ({
      ...meeting,
      followUps: meeting.followUps.map((followUp) =>
        followUp.taskId && taken.includes(followUp.taskId)
          ? { ...followUp, taskId: null }
          : followUp
      )
    }))
  }))
  useHomeBoardStore.setState(undone.state)
}

/** My answer to a day record; null takes the answer back. */
export function answerHomeRecord(recordId: string, answer: HomeRecordAnswer | null): void {
  useHomeBoardStore.setState((state) => {
    const records = { ...state.records }
    delete records[recordId]
    if (answer) {
      records[recordId] = answer
    }
    return { records }
  })
}
