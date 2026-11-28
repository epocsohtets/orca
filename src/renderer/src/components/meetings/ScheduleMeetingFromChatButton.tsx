import React from 'react'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { openScheduleForm } from './meeting-navigation'

/** "Set up a meeting" in a chat's header: the chat becomes the meeting's origin, not its owner. */
export function ScheduleMeetingFromChatButton({
  conversationId
}: {
  conversationId: string
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <Button
      type="button"
      variant="outline"
      size="toolbar"
      data-meeting-schedule-from-chat=""
      onClick={() => openScheduleForm(conversationId)}
    >
      <CalendarPlus aria-hidden />
      {t('meetings.schedule', 'Create meeting')}
    </Button>
  )
}
