import type { InaxTaskStatus } from '@/components/task-page/inax/inax-mock-tasks'

export type MeetingFollowUpState = 'suggested' | 'created' | 'dismissed'

export type MeetingFollowUp = {
  id: string
  title: string
  owner: string
  /** YYYY-MM-DD, or empty when the meeting set no date. */
  due: string
  state: MeetingFollowUpState
  /** The inAX task the follow-up became; set when state is 'created'. */
  taskId?: string
}

/** Open means someone still owes work: not dismissed, and its task (if any) is not done. */
export function isOpenFollowUp(
  followUp: MeetingFollowUp,
  taskStatus: (taskId: string) => InaxTaskStatus | undefined
): boolean {
  if (followUp.state === 'dismissed') {
    return false
  }
  return !(followUp.taskId && taskStatus(followUp.taskId) === 'done')
}

/** The next free INAX number after every id already in use. */
export function nextInaxTaskId(usedIds: readonly string[]): string {
  const highest = usedIds.reduce((max, id) => {
    const number = Number(/^INAX-(\d+)$/.exec(id)?.[1])
    return Number.isFinite(number) && number > max ? number : max
  }, 0)
  return `INAX-${highest + 1}`
}
