import React from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { openMeeting } from './meeting-navigation'
import { personName } from './meeting-people'
import { isParticipant } from './meeting-rules'
import { MeetingStateMarker, useMeetingState, useMeetingText } from './MeetingParts'
import { useMeetings } from './meetings-store'

/**
 * In a chat: the meetings that were created from it, as a line everyone in the chat sees. A quiet line between
 * messages, like the meeting agent's question, so the chat leads to the meeting too.
 */
export function ChatMeetingLinks({
  conversationId
}: {
  conversationId: string
}): React.JSX.Element | null {
  const t = useTranslate()
  const text = useMeetingText()
  const stateOf = useMeetingState()
  const viewerId = useMeetings((state) => state.viewerId)
  const meetings = useMeetings((state) => state.meetings).filter(
    (meeting) => meeting.originConversationId === conversationId && isParticipant(meeting, viewerId)
  )
  if (meetings.length === 0) {
    return null
  }
  return (
    <ul className="flex flex-col gap-3">
      {meetings.map((meeting) => (
        <li
          key={meeting.id}
          data-chat-meeting-link={meeting.id}
          className="ml-[42px] flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 border-border py-1 pl-3"
        >
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              <CalendarClock aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              {t('meetings.chat.setUp', '{{name}} created a meeting: {{title}}', {
                name: personName(meeting.hostId),
                title: meeting.title
              })}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">{text.whenWithWeekday(meeting)}</span>
              <MeetingStateMarker state={stateOf(meeting)} />
            </p>
          </div>
          <Button type="button" variant="outline" size="xs" onClick={() => openMeeting(meeting.id)}>
            {t('meetings.chat.open', 'Open the meeting')}
          </Button>
        </li>
      ))}
    </ul>
  )
}
