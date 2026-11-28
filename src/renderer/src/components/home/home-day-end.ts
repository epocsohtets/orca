import { followUpState } from '@/components/meetings/meeting-rules'
import type { Meeting, MeetingTask } from '@/components/meetings/meeting-types'
import type { HomeBoardState, HomeProjectId, HomeRecordAnswer, HomeTask } from './home-board'
import type { InaxStatus } from './home-task-loop'

/** One line of a card's "Recent": who did what, when. */
export type HomeDayEndLine = {
  id: string
  /** Working days before the sample day (0 or negative). */
  day: number
  who: string
  text: string
  when: string
  taskId?: string
  meetingId?: string
}

export type HomeDayEndCard =
  | {
      kind: 'task'
      id: string
      task: HomeTask
      timeline: HomeDayEndLine[]
      /** The progress line the agent wrote ahead; null when it does not know one. */
      suggestion: string | null
      /** The status the agent proposes; null when it proposes none. */
      proposed: InaxStatus | null
    }
  | {
      kind: 'meeting'
      id: string
      title: string
      project: HomeProjectId
      timeline: HomeDayEndLine[]
      followUps: { id: string; text: string; suggestedOwnerId: string }[]
      /** Who can take a follow-up: the host and the attendees. */
      peopleIds: string[]
    }
  | {
      kind: 'records'
      id: 'records'
      records: { id: string; text: string; suggestTaskId: string }[]
    }

/** What one saved card put where; enough to take exactly that back. */
export type HomeDayEndSaved =
  | {
      kind: 'task'
      id: string
      noteId: string | null
      /** The status the card set; null when it left the status alone. */
      status: InaxStatus | null
      /** What inAX held before, to restore; null when the task had no record of its own. */
      prevStatus: InaxStatus | null
      /** The save also answered the agent's waiting proposal. */
      closedLoop: boolean
    }
  | { kind: 'meeting'; id: string; taskIds: string[] }
  | { kind: 'records'; id: 'records'; recordIds: string[] }

export const HOME_RECORD_YES = 'yes'
export const HOME_RECORD_NOT_WORK = 'notWork'

/** What I changed on a card before saving it. `picks`: follow-up to person, or record to answer. */
export type HomeDayEndDraft = { text?: string; status?: InaxStatus; picks?: Record<string, string> }

/** What a save carries: the card and my draft of it, with the agent's suggestions filled in where I left them. */
export type HomeDayEndSave =
  | {
      kind: 'task'
      taskId: string
      text: string
      byAgent: boolean
      status: InaxStatus | null
      /** The status the task shows before the save. */
      current: InaxStatus
    }
  | { kind: 'meeting'; meetingId: string; rows: { followUpId: string; assigneeId: string }[] }
  | { kind: 'records'; answers: { recordId: string; answer: string }[] }

const SHOWN_LINES = 4

/**
 * The day-end cards: one per task of mine that moved today, one per meeting I host with follow-ups nobody has,
 * and one for day records the app could not place. A card I saved does not come back.
 */
export function planHomeDayEnd(args: {
  tasks: readonly HomeTask[]
  /** Newest first. */
  activity: readonly HomeDayEndLine[]
  records: readonly { id: string; text: string; suggestTaskId: string }[]
  recordAnswers: Readonly<Record<string, HomeRecordAnswer | undefined>>
  viewerId: string
  meetings: readonly Meeting[]
  meetingTasks: readonly MeetingTask[]
  saved: readonly HomeDayEndSaved[]
  suggestion: (task: HomeTask) => string | null
}): HomeDayEndCard[] {
  // A meeting's card and the records card stay while something of theirs is still open.
  const saved = new Set(args.saved.flatMap((entry) => (entry.kind === 'task' ? [entry.id] : [])))
  const cards: HomeDayEndCard[] = []
  for (const task of args.tasks) {
    const lines = args.activity.filter((line) => line.taskId === task.id)
    // "Moved today": someone (me, an agent, a colleague) did something on it today.
    if (
      task.meetingId ||
      task.assignee ||
      saved.has(task.id) ||
      !lines.some((line) => line.day === 0)
    ) {
      continue
    }
    cards.push({
      kind: 'task',
      id: task.id,
      task,
      timeline: lines.slice(0, SHOWN_LINES),
      suggestion: task.proposal?.note || args.suggestion(task),
      // A finished draft that still reads "in progress" is the one change the agent proposes by itself.
      proposed:
        task.proposal?.status ??
        (task.who === 'draft' && task.status === 'inProgress' ? 'review' : null)
    })
  }
  for (const meeting of args.meetings) {
    const open = meeting.followUps.filter(
      (followUp) => followUpState(followUp, args.meetingTasks).kind !== 'task'
    )
    if (meeting.hostId !== args.viewerId || !meeting.minutes || open.length === 0) {
      continue
    }
    cards.push({
      kind: 'meeting',
      id: meeting.id,
      title: meeting.title,
      project: meeting.project,
      timeline: args.activity.filter((line) => line.meetingId === meeting.id).slice(0, SHOWN_LINES),
      followUps: open.map(({ id, text, suggestedOwnerId }) => ({ id, text, suggestedOwnerId })),
      peopleIds: [meeting.hostId, ...meeting.attendeeIds]
    })
  }
  const unplaced = args.records.filter((record) => args.recordAnswers[record.id] === undefined)
  if (unplaced.length > 0) {
    cards.push({ kind: 'records', id: 'records', records: unplaced })
  }
  return cards
}

type DayEndState = Pick<HomeBoardState, 'inax' | 'loops' | 'records' | 'dayEnd'>

/**
 * Saving a task card is the one moment its line and status reach colleagues. Nothing to say and no status
 * change saves nothing: the card was skipped.
 */
export function saveHomeDayEndTask(
  state: DayEndState,
  args: {
    taskId: string
    text: string
    /** The agent's line, taken as it was. */
    byAgent: boolean
    /** The status to set; null leaves it alone. */
    status: InaxStatus | null
    /** The status the task shows now, stamped on the note. */
    current: InaxStatus
    at: number
  }
): DayEndState {
  const text = args.text.trim()
  if (!text && args.status === null) {
    return state
  }
  const record = state.inax[args.taskId]
  const noteId = text ? `note-${args.at}` : null
  const loop = state.loops[args.taskId]
  // The agent's closing proposal waits on this task: the save is my answer to it.
  const closedLoop = Boolean(loop?.start && loop.answer && !loop.final)
  return {
    ...state,
    loops:
      closedLoop && loop
        ? { ...state.loops, [args.taskId]: { ...loop, final: { kind: 'confirmed', at: args.at } } }
        : state.loops,
    inax: {
      ...state.inax,
      [args.taskId]: {
        status: args.status ?? record?.status,
        notes: noteId
          ? [
              ...(record?.notes ?? []),
              {
                id: noteId,
                at: args.at,
                text,
                status: args.status ?? args.current,
                by: args.byAgent ? 'agentConfirmed' : 'me',
                statusChanged: args.status !== null
              }
            ]
          : (record?.notes ?? [])
      }
    },
    dayEnd: [
      ...state.dayEnd,
      {
        kind: 'task',
        id: args.taskId,
        noteId,
        status: args.status,
        prevStatus: record?.status ?? null,
        closedLoop
      }
    ]
  }
}

/** Takes back everything the day-end cards saved. `meetingTaskIds` are the follow-up tasks to remove. */
export function undoHomeDayEnd(state: DayEndState): {
  state: DayEndState
  meetingTaskIds: string[]
} {
  const inax = { ...state.inax }
  const loops = { ...state.loops }
  const records = { ...state.records }
  const meetingTaskIds: string[] = []
  // Newest first, so a task saved twice ends at its first "before".
  for (const entry of state.dayEnd.toReversed()) {
    if (entry.kind === 'meeting') {
      meetingTaskIds.push(...entry.taskIds)
    } else if (entry.kind === 'records') {
      for (const id of entry.recordIds) {
        delete records[id]
      }
    } else {
      const record = inax[entry.id]
      const notes = (record?.notes ?? []).filter((note) => note.id !== entry.noteId)
      const status = entry.status === null ? record?.status : (entry.prevStatus ?? undefined)
      if (notes.length === 0 && status === undefined) {
        delete inax[entry.id]
      } else {
        inax[entry.id] = { status, notes }
      }
      const loop = loops[entry.id]
      if (entry.closedLoop && loop) {
        loops[entry.id] = { ...loop, final: undefined }
      }
    }
  }
  return { state: { inax, loops, records, dayEnd: [] }, meetingTaskIds }
}
