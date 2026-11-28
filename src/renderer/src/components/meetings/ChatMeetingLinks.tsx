import React from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { openMeeting } from './meeting-navigation'
import { personName } from './meeting-people'
import { isParticipant } from './meeting-rules'
import { useMeetingStateLine } from './MeetingList'
import { useMeetingText } from './MeetingParts'
import { useMeetings } from './meetings-store'

/** In a chat: the meetings that were set up from it, so the chat leads to the meeting too. */
export function ChatMeetingLinks({
  conversationId
}: {
  conversationId: string
}): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const stateLine = useMeetingStateLine()
  const viewerId = useMeetings((state) => state.viewerId)
  const tasks = useMeetings((state) => state.tasks)
  const meetings = useMeetings((state) => state.meetings).filter(
    (meeting) => meeting.originConversationId === conversationId && isParticipant(meeting, viewerId)
  )
  if (meetings.length === 0) {
    return null
  }
  return (
    <ul className="flex flex-col gap-2">
      {meetings.map((meeting) => (
        <li
          key={meeting.id}
          data-chat-meeting-link={meeting.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2"
        >
          <CalendarClock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm font-medium text-foreground">
              {t('meetings.chat.setUp', '{{name}} set up a meeting: {{title}}', {
                name: personName(meeting.hostId),
                title: meeting.title
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {text.when(meeting)} · {stateLine(meeting, tasks)}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => openMeeting(meeting.id)}>
            {t('meetings.chat.open', 'Open the meeting')}
          </Button>
        </li>
      ))}
    </ul>
  )
}
