import type { HomeProjectId } from '@/components/home/home-board'

export type MeetingPerson = { id: string; name: string; role: string }

export type MeetingTurn = { id: string; at: number; speakerId: string; text: string }

/** A line of the minutes and the transcript turn it rests on. */
export type MeetingSourcedLine = { text: string; turnId: string }

export type MeetingFollowUp = {
  id: string
  text: string
  /** The sentence in the transcript this follow-up came from. */
  turnId: string
  /** Who the agent thinks owns it; the meeting agent proposes it to them. */
  suggestedOwnerId: string
  /** YYYY-MM-DD. */
  due: string
  /** One follow-up is one task: set once by whichever route creates it. */
  taskId: string | null
  /** The suggested owner answered "not mine". */
  declined: boolean
}

export type MeetingMinutes = {
  summary: [string, string]
  decisions: MeetingSourcedLine[]
  topics: { title: string; points: MeetingSourcedLine[] }[]
  transcript: MeetingTurn[]
}

export type MeetingAskAnswer = { keywords: string[]; answer: string; turnId: string }

/** A file or a link the host attached. A file keeps its name and size; nothing is uploaded in this build. */
export type MeetingMaterial =
  | { kind: 'file'; name: string; size: number }
  | { kind: 'link'; name: string; url: string }

export type Meeting = {
  id: string
  title: string
  hostId: string
  attendeeIds: string[]
  startsAt: number
  endsAt: number
  place: string
  /** Where it was set up, if a chat: a link only, the meeting does not belong to it. */
  originConversationId: string | null
  outline: string
  materials: MeetingMaterial[]
  /** The project the meeting belongs to; its colour dot is the same one Home and Tasks draw. */
  project: HomeProjectId
  recordingStartedAt: number | null
  minutes: MeetingMinutes | null
  /** When the meeting agent sent the minutes to every attendee. */
  minutesSentAt: number | null
  followUps: MeetingFollowUp[]
  /** Attendees' answers to the invitation; no entry means no answer yet. */
  responses: Record<string, 'yes' | 'no'>
  /** People outside the meeting who were given the full minutes by link. */
  shares: { personId: string; byId: string; at: number }[]
  /** People outside the meeting who asked the host for the full minutes. */
  requests: { personId: string; declined: boolean }[]
  /** Which prepared sample the simulated recording produces. */
  sample: 'promo' | 'generic'
}

export type MeetingTaskStatus = 'todo' | 'inProgress' | 'done'

/** A follow-up task. It is a task from the start, in the todo status. */
export type MeetingTask = {
  id: string
  title: string
  assigneeId: string
  status: MeetingTaskStatus
  due: string
  meetingId: string
  followUpId: string
  /** 'accepted': the owner took the agent's proposal. 'assigned': the host created and assigned it. */
  route: 'accepted' | 'assigned'
  createdAt: number
}

export type MeetingAsk = {
  id: string
  meetingId: string
  askerId: string
  question: string
  answer: string
  turnId: string | null
  at: number
}
