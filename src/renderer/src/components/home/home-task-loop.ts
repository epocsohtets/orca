/** A task's status: the board's column, and what inAX holds. */
export type InaxStatus = 'todo' | 'inProgress' | 'review' | 'done'
export const INAX_STATUSES: readonly InaxStatus[] = ['todo', 'inProgress', 'review', 'done']

/** What an agent would put on inAX. Nothing of it is on the task until I save its day-end card. */
export type HomeProposal = { status: InaxStatus; note: string }

export type HomeTaskNote = {
  id: string
  at: number
  text: string
  status: InaxStatus
  /** Who wrote it and who let it through: the agent's words as I confirmed them, or my own. */
  by: 'agentConfirmed' | 'me'
  /** False for a note saved without a status change. */
  statusChanged?: boolean
}

/** What inAX holds for a task beyond the sample: a status I set by hand, and what I saved at day end. */
export type HomeTaskRecord = {
  status?: InaxStatus
  /** When the status last went to inAX. */
  statusAt?: number
  notes: HomeTaskNote[]
}

/** One task's conversation with its agent, as far as I have taken it. */
export type HomeTaskLoop = {
  startedAt: number
  /** The folder made for the task when it started. */
  folder?: string
  /** The Orca workspace that holds the task's conversation, opened on that folder. */
  workspaceId?: string
  /** My answer to the agent's one question: a choice, or my own words. */
  answer?: { choiceId: string | null; text?: string; at: number }
  /** Set when I saved the day-end card that held the agent's closing proposal. */
  final?: { at: number }
  /** What I typed in the conversation. */
  said: { at: number; text: string }[]
  /** Opened by a line I wrote on a task I had not handed over: no plan, no question, no draft. */
  chatOnly?: true
}

/**
 * Where a conversation stands. Only `question` waits on me, and it asks for information, never for
 * permission; `result` is a finished draft whose proposal waits, unannounced, for the day-end cards.
 */
export type HomeLoopPhase = 'working' | 'question' | 'result' | 'confirmed'

// shortcut: the scripted agent "works" for seconds, not minutes, so the loop can be walked in one sitting; a
// real agent reports its own progress.
export const HOME_LOOP_FIRST_WORK_MS = 25_000
export const HOME_LOOP_SECOND_WORK_MS = 20_000

export function homeLoopQuestionAt(loop: HomeTaskLoop): number {
  return loop.startedAt + HOME_LOOP_FIRST_WORK_MS
}

/** When the result arrives; null until I have answered the question. */
export function homeLoopDraftAt(loop: HomeTaskLoop): number | null {
  return loop.answer ? loop.answer.at + HOME_LOOP_SECOND_WORK_MS : null
}

export function homeLoopPhase(loop: HomeTaskLoop, now: number): HomeLoopPhase {
  if (loop.chatOnly) {
    return 'confirmed'
  }
  if (now < homeLoopQuestionAt(loop)) {
    return 'working'
  }
  const draftAt = homeLoopDraftAt(loop)
  if (draftAt === null) {
    return 'question'
  }
  if (now < draftAt) {
    return 'working'
  }
  return loop.final ? 'confirmed' : 'result'
}
