import React from 'react'
import { Check } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { HomeRowMenu } from '@/components/home/HomeCard'
import { respondToInvitation, useMeetings } from './meetings-store'

/**
 * A row's answer to an invitation: the 답변 button while there is none, the row menu once there is one. Both
 * offer the same two answers.
 */
export function MeetingAnswerMenu({ meetingId }: { meetingId: string }): React.JSX.Element | null {
  const t = useTranslate()
  const meeting = useMeetings((state) => state.meetings.find((entry) => entry.id === meetingId))
  const viewerId = useMeetings((state) => state.viewerId)
  if (!meeting) {
    return null
  }
  const response = meeting.responses[viewerId]
  const label = t('meetings.response.label', 'Will you come to “{{title}}”?', {
    title: meeting.title
  })
  const answers = (['yes', 'no'] as const).map((answer) => (
    <DropdownMenuItem key={answer} onSelect={() => respondToInvitation(meeting.id, answer)}>
      {response === answer ? <Check aria-hidden /> : null}
      {answer === 'yes'
        ? t('meetings.response.yes', 'Coming')
        : t('meetings.response.no', 'Not coming')}
    </DropdownMenuItem>
  ))
  return response ? (
    <HomeRowMenu label={label}>{answers}</HomeRowMenu>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="xs" aria-label={label}>
          {t('home.tasks.answer', 'Answer')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{answers}</DropdownMenuContent>
    </DropdownMenu>
  )
}
