import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { INAX_MOCK_TASKS } from '@/components/task-page/inax/inax-mock-tasks'
import { MEETING_PEOPLE, SEOYEON } from './meeting-people'
import { answerQuestion, botItemsFor, nextInaxTaskId } from './meeting-rules'
import { askAnswersFor, sampleResult, seedMeetings } from './meeting-sample-seed'
import { atTime, scenarioDay } from './meeting-schedule'
import type { Meeting, MeetingAsk, MeetingTask, MeetingTaskStatus } from './meeting-types'

const MINUTE = 60_000

export type MeetingsPane = 'list' | 'agenda'
export type MinutesDepth = 'brief' | 'summary' | 'full' | 'ask'

type MeetingsState = {
  /** The scenario's "today": sample times are relative to it, not to the wall clock. */
  day: number
  /** Whose eyes the app is seen through. */
  viewerId: string
  meetings: Meeting[]
  tasks: MeetingTask[]
  asks: MeetingAsk[]
  /** `${viewerId}:${key}` of bot messages read and notices closed. */
  seen: string[]
  selectedId: string | null
  pane: MeetingsPane
  /** Set while the schedule form is open; the chat it was opened from, if any. */
  composing: { conversationId: string | null } | null
  depth: MinutesDepth
  /** The transcript turn to show and mark; `nonce` re-triggers the same turn. */
  focus: { meetingId: string; turnId: string; nonce: number } | null
  /** The task row the Tasks view should mark after a jump from a meeting. */
  focusTaskId: string | null
}

function initialState(): MeetingsState {
  const day = scenarioDay(Date.now())
  return {
    day,
    viewerId: SEOYEON,
    ...seedMeetings(day),
    asks: [],
    // Last week's minutes were read long ago; only what happens from here on arrives as new.
    seen: MEETING_PEOPLE.flatMap(({ id }) => [
      `${id}:minutes:newsletter-review`,
      `${id}:assigned:INAX-130`
    ]),
    selectedId: null,
    pane: 'list',
    composing: null,
    depth: 'brief',
    focus: null,
    focusTaskId: null
  }
}

// Mock state kept in localStorage so the path survives a reload; replace with real stores when meetings are real.
export const useMeetings = create<MeetingsState>()(
  persist(initialState, {
    name: 'orca.poc.meetings.v2',
    version: 1,
    partialize: ({ focus: _focus, focusTaskId: _task, composing: _composing, ...kept }) => kept
  })
)

const set = useMeetings.setState
const get = useMeetings.getState

/** The scenario clock: five minutes before the 14:00 slot on the scenario day. */
export const scenarioNow = (day: number): number => atTime(day, 13, 55)

function patchMeeting(id: string, patch: (meeting: Meeting) => Partial<Meeting>): void {
  set((state) => ({
    meetings: state.meetings.map((m) => (m.id === id ? { ...m, ...patch(m) } : m))
  }))
}

export function resetMeetingsSample(): void {
  set({ ...initialState(), viewerId: get().viewerId })
}

export function setViewer(viewerId: string): void {
  // Another person starts from their own first view, not from where the last one was reading.
  set({ viewerId, selectedId: null, composing: null, focus: null, depth: 'brief', pane: 'list' })
}

export function markSeen(keys: string[]): void {
  const { viewerId, seen } = get()
  const added = keys.map((key) => `${viewerId}:${key}`).filter((key) => !seen.includes(key))
  if (added.length > 0) {
    set({ seen: [...seen, ...added] })
  }
}

export const isSeen = (state: Pick<MeetingsState, 'seen' | 'viewerId'>, key: string): boolean =>
  state.seen.includes(`${state.viewerId}:${key}`)

export function unreadBotItemCount(state: MeetingsState): number {
  return botItemsFor(state.viewerId, state.meetings, state.tasks).filter(
    (item) => !isSeen(state, item.key)
  ).length
}

export type ScheduleInput = Pick<
  Meeting,
  'title' | 'attendeeIds' | 'startsAt' | 'endsAt' | 'place' | 'outline' | 'materials' | 'sample'
> & { originConversationId: string | null; startNow: boolean }

export function scheduleMeeting({ startNow, ...input }: ScheduleInput): string {
  const { viewerId, meetings } = get()
  const id = `meeting-${meetings.length + 1}-${input.startsAt}`
  set({
    meetings: [
      ...meetings,
      {
        ...input,
        id,
        hostId: viewerId,
        recordingStartedAt: startNow ? Date.now() : null,
        minutes: null,
        minutesSentAt: null,
        followUps: []
      }
    ],
    selectedId: id,
    composing: null
  })
  return id
}

export function saveOutline(id: string, outline: string, materials: string[]): void {
  patchMeeting(id, () => ({ outline, materials }))
}

export function startRecording(id: string): void {
  patchMeeting(id, () => ({ recordingStartedAt: Date.now() }))
}

/** Simulated: stopping produces the prepared minutes and the bot sends them to every attendee. */
export function stopRecording(id: string): void {
  patchMeeting(id, (m) => ({
    recordingStartedAt: null,
    minutesSentAt: m.endsAt + 2 * MINUTE,
    ...sampleResult(m)
  }))
  set({ depth: 'brief' })
}

function createTasks(
  meetingId: string,
  rows: { followUpId: string; assigneeId: string }[],
  route: MeetingTask['route']
): void {
  set((state) => {
    const meeting = state.meetings.find((m) => m.id === meetingId)
    if (!meeting) {
      return state
    }
    const used = [...INAX_MOCK_TASKS.map((task) => task.id), ...state.tasks.map((task) => task.id)]
    const created: MeetingTask[] = []
    for (const row of rows) {
      const followUp = meeting.followUps.find((f) => f.id === row.followUpId)
      // One follow-up is one task: a second route never makes another.
      if (!followUp || followUp.taskId) {
        continue
      }
      const id = nextInaxTaskId([...used, ...created.map((task) => task.id)])
      created.push({
        id,
        title: followUp.text,
        assigneeId: row.assigneeId,
        status: 'todo',
        due: followUp.due,
        meetingId,
        followUpId: followUp.id,
        route,
        createdAt:
          (meeting.minutesSentAt ?? meeting.endsAt) +
          (state.tasks.length + created.length + 1) * MINUTE
      })
    }
    return {
      tasks: [...state.tasks, ...created],
      meetings: state.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              followUps: m.followUps.map((f) => {
                const task = created.find((entry) => entry.followUpId === f.id)
                return task ? { ...f, taskId: task.id, declined: false } : f
              })
            }
          : m
      )
    }
  })
}

/** Route 1: the person takes the bot's proposal. */
export function acceptFollowUp(meetingId: string, followUpId: string): void {
  createTasks(meetingId, [{ followUpId, assigneeId: get().viewerId }], 'accepted')
}

/** Route 2: the host creates and assigns the rest in one go. */
export function assignFollowUps(
  meetingId: string,
  rows: { followUpId: string; assigneeId: string }[]
): void {
  createTasks(meetingId, rows, 'assigned')
}

export function setFollowUpDeclined(
  meetingId: string,
  followUpId: string,
  declined: boolean
): void {
  patchMeeting(meetingId, (m) => ({
    followUps: m.followUps.map((f) => (f.id === followUpId && !f.taskId ? { ...f, declined } : f))
  }))
}

export function setTaskStatus(taskId: string, status: MeetingTaskStatus): void {
  set((state) => ({
    tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
  }))
}

/** Asks the meeting bot. Answers are prepared per sample; `fallback` is used when none fits. */
export function askMeetingBot(meetingId: string, question: string, fallback: string): void {
  set((state) => {
    const meeting = state.meetings.find((m) => m.id === meetingId)
    if (!meeting) {
      return state
    }
    const found = answerQuestion(askAnswersFor(meeting), question)
    return {
      asks: [
        ...state.asks,
        {
          id: `ask-${state.asks.length + 1}`,
          meetingId,
          askerId: state.viewerId,
          question,
          answer: found?.answer ?? fallback,
          turnId: found?.turnId ?? null,
          at: (meeting.minutesSentAt ?? meeting.endsAt) + (30 + state.asks.length * 2) * MINUTE
        }
      ]
    }
  })
}
