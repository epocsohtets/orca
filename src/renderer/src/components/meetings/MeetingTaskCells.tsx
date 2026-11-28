import React from 'react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { openMeeting } from './meeting-navigation'
import { useMeetingText } from './MeetingParts'
import { useMeetings } from './meetings-store'

/** On a follow-up task: the meeting it came from, and the way back to the sentence. */
export function MeetingTaskOrigin({
  taskId,
  plain
}: {
  taskId: string
  /** Words only, for a row that is itself a button. */
  plain?: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const task = useMeetings((state) => state.tasks.find((entry) => entry.id === taskId))
  const meeting = useMeetings((state) => state.meetings.find((m) => m.id === task?.meetingId))
  if (!task || !meeting) {
    return null
  }
  const turnId = meeting.followUps.find((f) => f.id === task.followUpId)?.turnId
  return (
    <span
      data-meeting-task-origin={taskId}
      className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"
    >
      <span>
        {t('meetings.task.from', 'From the meeting “{{title}}” · {{day}}', {
          title: meeting.title,
          day: text.day(meeting.startsAt)
        })}
      </span>
      {plain ? null : (
        <Button
          type="button"
          variant="link"
          size="inlineText"
          onClick={(event) => {
            event.stopPropagation()
            openMeeting(meeting.id, turnId ? { turnId } : undefined)
          }}
        >
          {t('meetings.task.source', 'See where it was said')}
        </Button>
      )}
    </span>
  )
}
