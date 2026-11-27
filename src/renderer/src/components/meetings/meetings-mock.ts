import { create } from 'zustand'
import { INAX_MOCK_TASKS } from '@/components/task-page/inax/inax-mock-tasks'
import { nextInaxTaskId, type MeetingFollowUp } from './meeting-follow-ups'
import type { Meeting } from './meeting-types'
import { dueDate, INITIAL_MEETINGS, meeting } from './meetings-mock-meetings'
import { ME, RECORDED_SAMPLE } from './meetings-mock-results'

// shortcut: meetings are in-memory mock state and reset on reload; replace with a meetings store when recording is real.
export const useMeetingsMock = create<{ meetings: Meeting[]; selectedId: string | null }>(() => ({
  meetings: INITIAL_MEETINGS,
  selectedId: 'sso-review'
}))

function patchMeeting(id: string, patch: (meeting: Meeting) => Partial<Meeting>): void {
  useMeetingsMock.setState((state) => ({
    meetings: state.meetings.map((m) => (m.id === id ? { ...m, ...patch(m) } : m))
  }))
}

export function selectMeeting(id: string): void {
  useMeetingsMock.setState({ selectedId: id })
}

/** An ad-hoc meeting: no calendar entry, no linked task; recording starts with it. */
export function startAdHocMeeting(title: string): void {
  const now = Date.now()
  const id = `adhoc-${now}`
  useMeetingsMock.setState((state) => ({
    meetings: [
      ...state.meetings,
      meeting({ id, title, startsAt: now, phase: 'recording', recordingStartedAt: now })
    ],
    selectedId: id
  }))
}

export function startRecording(id: string): void {
  patchMeeting(id, () => ({ phase: 'recording', recordingStartedAt: Date.now() }))
}

export function stopRecording(id: string): void {
  patchMeeting(id, (m) => ({
    phase: 'stopped',
    recordingStartedAt: null,
    recordedSeconds: Math.round((Date.now() - (m.recordingStartedAt ?? Date.now())) / 1000)
  }))
}

/** Mock processing: two timed stages, then the sample transcript, minutes and follow-ups. */
export function createMinutes(id: string): void {
  patchMeeting(id, () => ({ phase: 'processing', processingStage: 'transcribing' }))
  setTimeout(() => patchMeeting(id, () => ({ processingStage: 'writing' })), 1800)
  setTimeout(
    () =>
      patchMeeting(id, (m) => ({
        phase: 'ready',
        result: RECORDED_SAMPLE,
        attendees: [
          ...new Set([...m.attendees, ...RECORDED_SAMPLE.transcript.map((t) => t.speaker)])
        ],
        followUps: [
          {
            id: `${id}-1`,
            title: 'Track the public API as separate work',
            owner: ME,
            due: dueDate(5),
            state: 'suggested'
          },
          {
            id: `${id}-2`,
            title: 'Share the draft with Sora and ask for comments',
            owner: ME,
            due: dueDate(1),
            state: 'suggested'
          }
        ]
      })),
    3600
  )
}

export function linkTask(id: string, taskId: string): void {
  patchMeeting(id, (m) => ({ linkedTaskIds: [...m.linkedTaskIds, taskId] }))
}

function patchFollowUp(
  meetingId: string,
  followUpId: string,
  patch: Partial<MeetingFollowUp>
): void {
  patchMeeting(meetingId, (m) => ({
    followUps: m.followUps.map((f) => (f.id === followUpId ? { ...f, ...patch } : f))
  }))
}

export function editFollowUp(
  meetingId: string,
  followUpId: string,
  fields: Pick<MeetingFollowUp, 'title' | 'owner' | 'due'>
): void {
  patchFollowUp(meetingId, followUpId, fields)
}

export function setFollowUpDismissed(
  meetingId: string,
  followUpId: string,
  dismissed: boolean
): void {
  patchFollowUp(meetingId, followUpId, { state: dismissed ? 'dismissed' : 'suggested' })
}

/** Turns a suggested follow-up into a mock inAX task reference; nothing is written to a tracker. */
export function createTaskFromFollowUp(meetingId: string, followUpId: string): void {
  const used = [
    ...INAX_MOCK_TASKS.map((task) => task.id),
    ...useMeetingsMock.getState().meetings.flatMap((m) => m.followUps.map((f) => f.taskId ?? ''))
  ]
  patchFollowUp(meetingId, followUpId, { state: 'created', taskId: nextInaxTaskId(used) })
}
