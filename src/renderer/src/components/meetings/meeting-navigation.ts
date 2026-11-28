import { useAppStore } from '@/store'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { openInaxTask } from '@/components/task-page/inax/inax-source-selection'
import { useMeetings, type MeetingComposing, type MinutesDepth } from './meetings-store'

/** Opens a meeting; `turnId` lands on that sentence of the transcript. */
export function openMeeting(id: string, target?: { turnId?: string; depth?: MinutesDepth }): void {
  const { focus } = useMeetings.getState()
  useMeetings.setState({
    selectedId: id,
    composing: null,
    ...(target?.turnId
      ? {
          depth: 'full',
          focus: { meetingId: id, turnId: target.turnId, nonce: (focus?.nonce ?? 0) + 1 }
        }
      : target?.depth
        ? { depth: target.depth }
        : {})
  })
  useAppStore.getState().openMeetingsPage()
}

/** Opens the creation form; from a chat, that conversation becomes the meeting's origin. */
export function openScheduleForm(
  conversationId: string | null,
  options: Omit<MeetingComposing, 'conversationId'> = {}
): void {
  useMeetings.setState({ composing: { conversationId, ...options } })
  useAppStore.getState().openMeetingsPage()
}

export function openMeetingBot(): void {
  useAppStore.getState().openMeetingBotPage()
}

/** Opens a follow-up task's own page: it is an ordinary task. */
export function openMeetingTask(taskId: string): void {
  // The mock inAX account is the same person the meeting agent already knows, so the task opens signed in.
  useInaxMockAccount.setState({ signedIn: true })
  openInaxTask(taskId)
}

/** Opens the schedule view of Meetings. */
export function openMeetingSchedule(): void {
  useMeetings.setState({ selectedId: null, composing: null, pane: 'agenda' })
  useAppStore.getState().openMeetingsPage()
}
