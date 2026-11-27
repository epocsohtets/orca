/** A task's status as inAX holds it. */
export type InaxStatus = 'todo' | 'inProgress' | 'review' | 'done'
export const INAX_STATUSES: readonly InaxStatus[] = ['todo', 'inProgress', 'review', 'done']

/** What an agent asks to put on inAX. Nothing of it is on the task until I confirm it. */
export type HomeProposal = { status: InaxStatus; note: string }

export type HomeTaskNote = {
  id: string
  at: number
  text: string
  status: InaxStatus
  /** Who wrote it and who let it through. */
  by: 'agentConfirmed'
}

/** What inAX holds for a task beyond the sample: only confirmed changes get here. */
export type HomeTaskRecord = { status?: InaxStatus; notes: HomeTaskNote[] }

export type HomeLoopDecision = { kind: 'confirmed' | 'declined'; at: number }

/** One task's conversation with its agent, as far as I have taken it. */
export type HomeTaskLoop = {
  startedAt: number
  /** My answer to the first proposal ("in progress"). */
  start?: HomeLoopDecision
  /** My answer to the agent's one question. */
  answer?: { choiceId: string; at: number }
  /** My answer to the closing proposal; saying something after "not yet" clears it. */
  final?: HomeLoopDecision
  /** What I typed, and which scripted reply it got. */
  said: { at: number; text: string; reply: 'noted' | 'repropose' }[]
}

export type HomeLoopPhase = 'working' | 'question' | 'proposal' | 'confirmed' | 'declined'

// shortcut: the scripted agent "works" for seconds, not minutes, so the loop can be walked in one sitting; a
// real agent reports its own progress.
export const HOME_LOOP_FIRST_WORK_MS = 25_000
export const HOME_LOOP_SECOND_WORK_MS = 20_000

export function homeLoopQuestionAt(loop: HomeTaskLoop): number {
  return loop.startedAt + HOME_LOOP_FIRST_WORK_MS
}

/** When the draft and the closing proposal arrive; null until I have answered the question. */
export function homeLoopDraftAt(loop: HomeTaskLoop): number | null {
  return loop.answer ? loop.answer.at + HOME_LOOP_SECOND_WORK_MS : null
}

export function homeLoopPhase(loop: HomeTaskLoop, now: number): HomeLoopPhase {
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
  return loop.final ? loop.final.kind : 'proposal'
}

/** The proposal waiting for my answer right now, if any. The first one never blocks the agent. */
export function homeLoopOpenProposal(
  loop: HomeTaskLoop,
  now: number,
  finalNote: string
): (HomeProposal & { step: 'start' | 'final' }) | null {
  if (homeLoopPhase(loop, now) === 'proposal') {
    return { step: 'final', status: 'review', note: finalNote }
  }
  return loop.start || loop.final ? null : { step: 'start', status: 'inProgress', note: '' }
}

/**
 * The only way an agent's proposal reaches a task: I confirmed it, as proposed or as I edited it. The status
 * changes, and a non-empty note is stored with who wrote it and who let it through.
 */
export function confirmHomeProposal(
  record: HomeTaskRecord | undefined,
  proposal: HomeProposal,
  at: number
): HomeTaskRecord {
  const note = proposal.note.trim()
  return {
    status: proposal.status,
    notes: note
      ? [
          ...(record?.notes ?? []),
          { id: `note-${at}`, at, text: note, status: proposal.status, by: 'agentConfirmed' }
        ]
      : (record?.notes ?? [])
  }
}

/** Typing after "not yet" asks the agent to propose again; at any other time it is only noted. */
export function sayToHomeLoop(loop: HomeTaskLoop, text: string, at: number): HomeTaskLoop {
  const repropose = loop.final?.kind === 'declined'
  return {
    ...loop,
    final: repropose ? undefined : loop.final,
    said: [...loop.said, { at, text, reply: repropose ? 'repropose' : 'noted' }]
  }
}
