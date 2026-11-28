import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { homeSampleMoment } from '@/components/home/home-day'
import { MEETING_PEOPLE, MAKO } from './meeting-people'
import { answerQuestion, botItemsFor, nextInaxTaskId } from './meeting-rules'
import { askAnswersFor, sampleResult, seedMeetings } from './meeting-sample-seed'
import { scenarioDay } from './meeting-schedule'
import type {
  Meeting,
  MeetingAsk,
  MeetingMaterial,
  MeetingTask,
  MeetingTaskStatus
} from './meeting-types'

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
  composing: { conversationId: string | null; startNow?: boolean } | null
  depth: MinutesDepth
  /** The transcript turn to show and mark; `nonce` re-triggers the same turn. */
  focus: { meetingId: string; turnId: string; nonce: number } | null
  /** Counts what happened after a meeting, so later messages sort after earlier ones. */
  tick: number
}

function initialState(): MeetingsState {
  const day = scenarioDay(Date.now())
  return {
    day,
    viewerId: MAKO,
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
    tick: 0
  }
}

// Mock state kept in localStorage so the path survives a reload; replace with real stores when meetings are real.
export const useMeetings = create<MeetingsState>()(
  persist(initialState, {
    name: 'orca.poc.meetings.v2',
    version: 3,
    // The sample's shape changed; an older saved sample starts over.
    migrate: () => initialState(),
    partialize: ({ focus: _focus, composing: _composing, ...kept }) => kept
  })
)

const set = useMeetings.setState
const get = useMeetings.getState

// The sample is written for one working day; on another day it starts over from that day.
if (get().day !== scenarioDay(Date.now())) {
  set(initialState())
}

/** One clock for Home and Meetings: the real moment as the sample day shows it. */
export const scenarioNow = (): number => homeSampleMoment(Date.now())

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
  | 'title'
  | 'attendeeIds'
  | 'startsAt'
  | 'endsAt'
  | 'place'
  | 'outline'
  | 'materials'
  | 'sample'
  | 'project'
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
        followUps: [],
        responses: {},
        shares: [],
        requests: []
      }
    ],
    selectedId: id,
    composing: null
  })
  return id
}

export function saveOutline(id: string, outline: string, materials: MeetingMaterial[]): void {
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
    const used = state.tasks.map((task) => task.id)
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
          (meeting.minutesSentAt ?? meeting.endsAt) + (state.tick + created.length + 1) * MINUTE
      })
    }
    return {
      tick: state.tick + created.length,
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

/** Answers an invitation; the host sees it on the meeting. */
export function respondToInvitation(meetingId: string, answer: 'yes' | 'no'): void {
  const { viewerId } = get()
  patchMeeting(meetingId, (m) => ({ responses: { ...m.responses, [viewerId]: answer } }))
}

/** Gives someone who was not in the meeting the full minutes; the meeting bot sends them the link. */
export function shareMinutes(meetingId: string, personId: string): void {
  const { viewerId, tick } = get()
  patchMeeting(meetingId, (m) =>
    m.shares.some((entry) => entry.personId === personId)
      ? {}
      : {
          shares: [
            ...m.shares,
            { personId, byId: viewerId, at: (m.minutesSentAt ?? m.endsAt) + (tick + 1) * MINUTE }
          ],
          requests: m.requests.filter((entry) => entry.personId !== personId)
        }
  )
  set({ tick: tick + 1 })
}

/** An assignee who was not in the meeting asks its host for the full minutes. */
export function requestMinutes(meetingId: string): void {
  const { viewerId } = get()
  patchMeeting(meetingId, (m) => ({
    requests: [
      ...m.requests.filter((entry) => entry.personId !== viewerId),
      { personId: viewerId, declined: false }
    ]
  }))
}

export function declineMinutesRequest(meetingId: string, personId: string): void {
  patchMeeting(meetingId, (m) => ({
    requests: m.requests.map((entry) =>
      entry.personId === personId ? { ...entry, declined: true } : entry
    )
  }))
}
