import type { MeetingFollowUp } from './meeting-follow-ups'

export type MeetingTurn = { at: number; speaker: string; text: string }
export type MeetingResult = {
  transcript: MeetingTurn[]
  summary: string
  decisions: string[]
  minutes: { topic: string; points: string[] }[]
}
export type MeetingPhase = 'idle' | 'recording' | 'stopped' | 'processing' | 'ready'
export type Meeting = {
  id: string
  title: string
  startsAt: number
  /** Null for a meeting started in the app with no calendar entry. */
  calendar: { endsAt: number; location: string } | null
  attendees: string[]
  linkedTaskIds: string[]
  previousMeetingId: string | null
  prepNote: string | null
  phase: MeetingPhase
  recordingStartedAt: number | null
  recordedSeconds: number
  processingStage: 'transcribing' | 'writing'
  result: MeetingResult | null
  followUps: MeetingFollowUp[]
}
