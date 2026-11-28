import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { ensureTaskWorkspace } from '@/components/work/work-task-workspace'
import { homeStatusMovedLine } from './home-task-loop-script'
import { useHomeBoardStore } from './home-board-store'
import type { HomeBoardState, HomeRecordAnswer } from './home-board'
import type { InaxStatus } from './home-task-loop'
import {
  HOME_RECORD_NOT_WORK,
  saveHomeDayEndTask,
  undoHomeDayEnd,
  type HomeDayEndSave
} from './home-day-end'
import { assignFollowUps, useMeetings } from '@/components/meetings/meetings-store'

/** A status I set by hand goes to inAX at once: no card, no confirmation. */
function withStatus(
  state: HomeBoardState,
  taskId: string,
  status: InaxStatus,
  at: number
): Pick<HomeBoardState, 'inax' | 'doneTaskIds'> {
  const done = state.doneTaskIds.filter((id) => id !== taskId)
  return {
    doneTaskIds: status === 'done' ? [...done, taskId] : done,
    inax: {
      ...state.inax,
      [taskId]: { notes: state.inax[taskId]?.notes ?? [], status, statusAt: at }
    }
  }
}

/** Moves a task's card: the board's status is the task's status on inAX. */
export function setHomeTaskStatus(taskId: string, status: InaxStatus, title?: string): void {
  // shortcut: inAX is this window's sample store, so "sync" is this write; with a backend it is the call the
  // board's Linear sync makes (workspace-board-task-status-sync), and a failure puts the card back.
  useHomeBoardStore.setState((state) => withStatus(state, taskId, status, Date.now()))
  if (title) {
    toast.success(homeStatusMovedLine(translate, title, status))
  }
}

/**
 * Hands a task to its agent: the conversation starts, a "to do" task is in progress at once, and its
 * workspace is made. Starting again keeps the conversation that exists.
 */
export function startHomeLoop(taskId: string, title: string, status: InaxStatus = 'todo'): void {
  if (useHomeBoardStore.getState().loops[taskId]) {
    return
  }
  const at = Date.now()
  useHomeBoardStore.setState((state) => ({
    loops: { ...state.loops, [taskId]: { startedAt: at, said: [] } },
    ...(status === 'todo' ? withStatus(state, taskId, 'inProgress', at) : {})
  }))
  void ensureTaskWorkspace(taskId, title)
}

/** My answer to the agent's question: one of its choices, or my own words. */
export function answerHomeLoop(taskId: string, choiceId: string | null, text?: string): void {
  useHomeBoardStore.setState((state) => {
    const loop = state.loops[taskId]
    return loop
      ? {
          loops: {
            ...state.loops,
            [taskId]: { ...loop, answer: { choiceId, text, at: Date.now() } }
          }
        }
      : state
  })
}

/**
 * What I write on a task, from its item's comment box or its chat: one progress note on inAX, and my line in
 * the conversation when the task has one. Returns the note's id.
 */
export function commentHomeTask(taskId: string, text: string, at = Date.now()): string {
  const id = `note-${at}`
  useHomeBoardStore.setState((state) => {
    const record = state.inax[taskId]
    const loop = state.loops[taskId]
    return {
      inax: {
        ...state.inax,
        [taskId]: {
          ...record,
          notes: [
            ...(record?.notes ?? []),
            { id, at, text, status: record?.status ?? 'inProgress', by: 'me', statusChanged: false }
          ]
        }
      },
      ...(loop
        ? { loops: { ...state.loops, [taskId]: { ...loop, said: [...loop.said, { at, text }] } } }
        : {})
    }
  })
  return id
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
      dayEnd: [...state.dayEnd, { kind: 'meeting', id: save.meetingId, taskIds, at: Date.now() }]
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
        {
          kind: 'records',
          id: 'records',
          recordIds: save.answers.map((entry) => entry.recordId),
          at: Date.now()
        }
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
