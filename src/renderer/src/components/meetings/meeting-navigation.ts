import { useAppStore } from '@/store'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { useInaxSourceSelection } from '@/components/task-page/inax/inax-source-selection'
import { useMeetings, type MinutesDepth } from './meetings-store'

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

/** Opens the schedule form; from a chat, that conversation becomes the meeting's origin. */
export function openScheduleForm(conversationId: string | null): void {
  useMeetings.setState({ composing: { conversationId } })
  useAppStore.getState().openMeetingsPage()
}

export function openMeetingBot(): void {
  useAppStore.getState().openMeetingBotPage()
}

/** Opens the task in the Tasks view's inAX list and marks its row. */
export function openMeetingTask(taskId: string): void {
  // The mock inAX account is the same person the meeting bot already knows, so the list opens signed in.
  useInaxMockAccount.setState({ signedIn: true })
  useInaxSourceSelection.setState({ selected: true })
  useMeetings.setState({ focusTaskId: taskId })
  useAppStore.getState().openTaskPage()
}
