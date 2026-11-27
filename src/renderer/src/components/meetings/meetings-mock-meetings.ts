import type { Meeting } from './meeting-types'
import { DANIEL, GATEWAY_PREVIOUS, JIWOO, ME, SORA, SSO_REVIEW } from './meetings-mock-results'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

function dayStart(offsetDays: number): number {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date.getTime()
}
const onDay = (offsetDays: number, hour: number, minute = 0): number =>
  dayStart(offsetDays) + hour * HOUR + minute * MINUTE
const halfHour = (timestamp: number): number => Math.floor(timestamp / (30 * MINUTE)) * 30 * MINUTE
// Clamped to today so the Today group always holds one finished and one coming meeting.
const earlierToday = Math.max(dayStart(0) + 30 * MINUTE, halfHour(Date.now() - 3 * HOUR))
const laterToday = Math.min(dayStart(1) - HOUR, halfHour(Date.now() + 2 * HOUR) + 30 * MINUTE)
export const dueDate = (offsetDays: number): string => {
  const date = new Date(dayStart(offsetDays))
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const meeting = (
  patch: Partial<Meeting> & Pick<Meeting, 'id' | 'title' | 'startsAt'>
): Meeting => ({
  calendar: null,
  attendees: [ME],
  linkedTaskIds: [],
  previousMeetingId: null,
  prepNote: null,
  phase: 'idle',
  recordingStartedAt: null,
  recordedSeconds: 0,
  processingStage: 'transcribing',
  result: null,
  followUps: [],
  ...patch
})

export const INITIAL_MEETINGS: Meeting[] = [
  meeting({
    id: 'sso-review',
    title: 'SSO rollout review',
    startsAt: earlierToday,
    calendar: { endsAt: earlierToday + 45 * MINUTE, location: 'Room Baltic' },
    attendees: [ME, JIWOO, SORA, DANIEL],
    linkedTaskIds: ['INAX-128', 'INAX-119'],
    prepNote:
      'INAX-128 moved to In progress yesterday; the login flow passes on staging. Open question for this meeting: remove or keep the legacy callback URL. INAX-119 (role picker focus) is marked done but has not been checked on the SSO role mapping screen.',
    phase: 'ready',
    recordedSeconds: 41 * 60 + 12,
    result: SSO_REVIEW,
    followUps: [
      {
        id: 'sso-1',
        title: 'Add a usage counter and deprecation notice for the legacy callback URL',
        owner: ME,
        due: dueDate(3),
        state: 'suggested'
      },
      {
        id: 'sso-2',
        title: 'Test the role picker focus fix on the SSO role mapping screen',
        owner: JIWOO,
        due: dueDate(2),
        state: 'suggested'
      },
      {
        id: 'sso-3',
        title: 'Write an audit log entry when an SSO role mapping changes',
        owner: ME,
        due: dueDate(7),
        state: 'suggested'
      },
      {
        id: 'sso-4',
        title: 'Send the pilot note to Northwind, Kestrel and Alder admins',
        owner: DANIEL,
        due: dueDate(1),
        state: 'suggested'
      },
      {
        id: 'sso-5',
        title: 'Collect requests for a per-tenant session lifetime',
        owner: DANIEL,
        due: '',
        state: 'dismissed'
      }
    ]
  }),
  meeting({
    id: 'gateway-sync',
    title: 'Gateway reliability sync',
    startsAt: laterToday,
    calendar: { endsAt: laterToday + 30 * MINUTE, location: 'Video call' },
    attendees: [ME, JIWOO, SORA],
    linkedTaskIds: ['INAX-127', 'INAX-112'],
    previousMeetingId: 'gateway-sync-previous',
    prepNote:
      'Since the last sync: INAX-127 (SFTP retry) is still Open with no commits this week, so the retry decision has not shipped. INAX-112 (webhook rate limit) is Done. The failure dashboard asked for last time has no task yet. Suggested focus: unblock INAX-127 and decide who owns the dashboard.'
  }),
  meeting({
    id: 'billing-planning',
    title: 'Billing usage planning',
    startsAt: onDay(1, 11),
    calendar: { endsAt: onDay(1, 12), location: 'Room Aegean' },
    attendees: [ME, SORA, DANIEL, 'Hana Seo', 'Minho Choi'],
    linkedTaskIds: ['INAX-124'],
    prepNote:
      'INAX-124 has no assignee. The billing page already loads per-tenant totals; what is missing is the breakdown by product. Bring a proposal for who takes it.'
  }),
  meeting({
    id: 'one-on-one',
    title: 'Mako / Sora 1:1',
    startsAt: onDay(3, 15),
    calendar: { endsAt: onDay(3, 15, 30), location: 'Video call' },
    attendees: [ME, SORA]
  }),
  meeting({
    id: 'audit-log-hallway',
    title: 'Audit log migration: quick call',
    startsAt: onDay(-1, 17, 20),
    attendees: [ME, SORA],
    linkedTaskIds: ['INAX-121'],
    phase: 'processing',
    recordedSeconds: 12 * 60 + 40
  }),
  meeting({
    id: 'docs-review',
    title: 'xRS export docs review',
    startsAt: onDay(-2, 14),
    calendar: { endsAt: onDay(-2, 14, 30), location: 'Video call' },
    attendees: [ME, JIWOO],
    linkedTaskIds: ['INAX-115'],
    phase: 'stopped',
    recordedSeconds: 23 * 60 + 5
  }),
  meeting({
    id: 'gateway-sync-previous',
    title: 'Gateway reliability sync',
    startsAt: onDay(-7, 16),
    calendar: { endsAt: onDay(-7, 16, 30), location: 'Video call' },
    attendees: [ME, JIWOO, SORA],
    linkedTaskIds: ['INAX-127', 'INAX-112'],
    phase: 'ready',
    recordedSeconds: 27 * 60 + 48,
    result: GATEWAY_PREVIOUS,
    followUps: [
      {
        id: 'gw-1',
        title: 'Retry failed SFTP uploads with backoff',
        owner: JIWOO,
        due: dueDate(-1),
        state: 'created',
        taskId: 'INAX-127'
      },
      {
        id: 'gw-2',
        title: 'Build a per-tenant upload failure dashboard',
        owner: SORA,
        due: dueDate(0),
        state: 'suggested'
      },
      {
        id: 'gw-3',
        title: 'Rate-limit webhook deliveries per tenant',
        owner: ME,
        due: dueDate(-3),
        state: 'created',
        taskId: 'INAX-112'
      }
    ]
  })
]
