import type {
  Meeting,
  MeetingAskAnswer,
  MeetingFollowUp,
  MeetingTask,
  MeetingTaskStatus,
  MeetingTurn
} from './meeting-types'

export const isParticipant = (meeting: Meeting, personId: string): boolean =>
  meeting.hostId === personId || meeting.attendeeIds.includes(personId)

/** An invited person (not the host) answers the invitation until the meeting starts. */
export const invitedToAnswer = (meeting: Meeting, personId: string): boolean =>
  meeting.hostId !== personId &&
  meeting.attendeeIds.includes(personId) &&
  !meeting.minutes &&
  meeting.recordingStartedAt === null

/** An invitation with no answer yet: it waits on that person, and is counted with what does. */
export const awaitsAnswer = (meeting: Meeting, personId: string): boolean =>
  invitedToAnswer(meeting, personId) && meeting.responses[personId] === undefined

/** Attendees see everything; an assignee who did not attend sees only what their task rests on. */
export function meetingAccess(
  meeting: Meeting,
  viewerId: string,
  tasks: readonly MeetingTask[]
): 'full' | 'excerpt' | 'none' {
  if (isParticipant(meeting, viewerId) || meeting.shares.some((s) => s.personId === viewerId)) {
    return 'full'
  }
  return tasks.some((task) => task.meetingId === meeting.id && task.assigneeId === viewerId)
    ? 'excerpt'
    : 'none'
}

export type FollowUpState =
  | { kind: 'task'; task: MeetingTask }
  | { kind: 'declined' }
  | { kind: 'proposed' }

/** One follow-up is one task: once a task exists, both routes show that task. */
export function followUpState(
  followUp: MeetingFollowUp,
  tasks: readonly MeetingTask[]
): FollowUpState {
  const task = followUp.taskId ? tasks.find((entry) => entry.id === followUp.taskId) : undefined
  return task
    ? { kind: 'task', task }
    : followUp.declined
      ? { kind: 'declined' }
      : { kind: 'proposed' }
}

export type FollowUpCounts = Record<MeetingTaskStatus, number> & { total: number; open: number }

/** Every count on screen comes from here, so they cannot disagree. `open` has no task yet. */
export function followUpCounts(
  followUps: readonly MeetingFollowUp[],
  tasks: readonly MeetingTask[]
): FollowUpCounts {
  const counts: FollowUpCounts = {
    total: followUps.length,
    open: 0,
    todo: 0,
    inProgress: 0,
    done: 0
  }
  for (const followUp of followUps) {
    const state = followUpState(followUp, tasks)
    if (state.kind === 'task') {
      counts[state.task.status] += 1
    } else {
      counts.open += 1
    }
  }
  return counts
}

/** The turn a line rests on with one turn of context each side, in transcript order. */
export function excerptAround(
  transcript: readonly MeetingTurn[],
  turnIds: readonly string[]
): MeetingTurn[] {
  const keep = new Set<number>()
  transcript.forEach((turn, index) => {
    if (turnIds.includes(turn.id)) {
      for (const near of [index - 1, index, index + 1]) {
        keep.add(near)
      }
    }
  })
  return transcript.filter((_, index) => keep.has(index))
}

/** The first prepared answer with a keyword in the question; null when none matches. */
export function answerQuestion(
  answers: readonly MeetingAskAnswer[],
  question: string
): MeetingAskAnswer | null {
  // The longest word that matches decides: "언제까지" names the question better than "언제" or "문구" alone.
  let best: { answer: MeetingAskAnswer; length: number } | null = null
  for (const answer of answers) {
    for (const keyword of answer.keywords) {
      if (question.includes(keyword) && (!best || keyword.length > best.length)) {
        best = { answer, length: keyword.length }
      }
    }
  }
  return best?.answer ?? null
}

/** The next free INAX number after every id already in use. */
export function nextInaxTaskId(usedIds: readonly string[]): string {
  const highest = usedIds.reduce((max, id) => {
    const number = Number(/^INAX-(\d+)$/.exec(id)?.[1])
    return Number.isFinite(number) && number > max ? number : max
  }, 0)
  return `INAX-${highest + 1}`
}

export type MeetingBotItem =
  | { kind: 'minutes'; key: string; at: number; meeting: Meeting; proposals: MeetingFollowUp[] }
  | { kind: 'assigned'; key: string; at: number; meeting: Meeting; task: MeetingTask }
  | { kind: 'shared'; key: string; at: number; meeting: Meeting; byId: string }

/** What the meeting agent has sent one person, oldest first. */
export function botItemsFor(
  viewerId: string,
  meetings: readonly Meeting[],
  tasks: readonly MeetingTask[]
): MeetingBotItem[] {
  const items: MeetingBotItem[] = []
  for (const meeting of meetings) {
    if (!meeting.minutes || meeting.minutesSentAt === null) {
      continue
    }
    const attended = isParticipant(meeting, viewerId)
    if (attended) {
      items.push({
        kind: 'minutes',
        key: `minutes:${meeting.id}`,
        at: meeting.minutesSentAt,
        meeting,
        proposals: meeting.followUps.filter((followUp) => followUp.suggestedOwnerId === viewerId)
      })
    }
    const share = meeting.shares.find((entry) => entry.personId === viewerId)
    if (share) {
      items.push({
        kind: 'shared',
        key: `shared:${meeting.id}`,
        at: share.at,
        meeting,
        byId: share.byId
      })
    }
    for (const task of tasks) {
      const proposedToViewer =
        attended &&
        meeting.followUps.some((f) => f.id === task.followUpId && f.suggestedOwnerId === viewerId)
      // A task of someone who was named in the meeting rides with their minutes; it is not a second message.
      if (
        task.meetingId === meeting.id &&
        task.assigneeId === viewerId &&
        task.route !== 'accepted' &&
        !proposedToViewer
      ) {
        items.push({
          kind: 'assigned',
          key: `assigned:${task.id}`,
          at: task.createdAt,
          meeting,
          task
        })
      }
    }
  }
  return items.sort((a, b) => a.at - b.at)
}
