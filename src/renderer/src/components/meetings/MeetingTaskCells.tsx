import React, { useEffect, useRef, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import type { InaxMockTask } from '@/components/task-page/inax/inax-mock-tasks'
import { openMeeting } from './meeting-navigation'
import { personName } from './meeting-people'
import { meetingAccess } from './meeting-rules'
import { useMeetingText } from './MeetingParts'
import type { MeetingTaskStatus } from './meeting-types'
import { setTaskStatus, useMeetings } from './meetings-store'

const STATUSES: MeetingTaskStatus[] = ['todo', 'inProgress', 'done']
const INAX_STATUS = { todo: 'open', inProgress: 'inProgress', done: 'done' } as const

/** Follow-up tasks the viewer may see, newest first, in the inAX list's row shape. */
export function useMeetingTaskRows(): InaxMockTask[] {
  const tasks = useMeetings((state) => state.tasks)
  const meetings = useMeetings((state) => state.meetings)
  const viewerId = useMeetings((state) => state.viewerId)
  // The sample runs on a scenario clock; against the wall clock these rows are simply recent.
  const [updatedAt] = useState(() => new Date(Date.now() - 120_000).toISOString())
  return tasks
    .filter((task) => {
      const meeting = meetings.find((m) => m.id === task.meetingId)
      return meeting && meetingAccess(meeting, viewerId, tasks) !== 'none'
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((task) => ({
      id: task.id,
      title: task.title,
      project: '',
      author: '',
      labels: [],
      assignee: personName(task.assigneeId),
      status: INAX_STATUS[task.status],
      updatedAt
    }))
}

/** Under a follow-up task's title: the meeting it came from, and the way back to the sentence. */
export function MeetingTaskOrigin({ taskId }: { taskId: string }): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const task = useMeetings((state) => state.tasks.find((entry) => entry.id === taskId))
  const meeting = useMeetings((state) => state.meetings.find((m) => m.id === task?.meetingId))
  const focused = useMeetings((state) => state.focusTaskId === taskId)
  const anchor = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (focused) {
      anchor.current?.scrollIntoView({ block: 'center', behavior: motionSafeScrollBehavior() })
    }
  }, [focused])
  if (!task || !meeting) {
    return null
  }
  const turnId = meeting.followUps.find((f) => f.id === task.followUpId)?.turnId
  return (
    <div
      ref={anchor}
      data-meeting-task-origin={taskId}
      data-focused={focused || undefined}
      className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"
    >
      <span>
        {t('meetings.task.from', 'From the meeting “{{title}}” · {{day}}', {
          title: meeting.title,
          day: text.day(meeting.startsAt)
        })}
        {' · '}
        {text.due(task.due)}
      </span>
      <Button
        type="button"
        variant="link"
        size="inlineText"
        onClick={() => openMeeting(meeting.id, turnId ? { turnId } : undefined)}
      >
        {t('meetings.task.source', 'See where it was said')}
      </Button>
    </div>
  )
}

/** The status of a follow-up task. The minutes read it from here, so they follow by themselves. */
export function MeetingTaskStatusSelect({ taskId }: { taskId: string }): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const task = useMeetings((state) => state.tasks.find((entry) => entry.id === taskId))
  if (!task) {
    return null
  }
  return (
    <Select
      value={task.status}
      onValueChange={(value) => {
        const next = STATUSES.find((status) => status === value)
        if (next) {
          setTaskStatus(taskId, next)
        }
      }}
    >
      <SelectTrigger
        size="xs"
        data-meeting-task-status={taskId}
        aria-label={t('meetings.task.status', 'Status of “{{title}}”', { title: task.title })}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {text.status[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
