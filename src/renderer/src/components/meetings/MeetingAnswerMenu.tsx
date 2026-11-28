import React from 'react'
import { Check } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { openHomeNeedsYou } from '@/components/home/home-task-items-host'
import { taskItemUid } from '@/components/home/home-task-item-model'
import { HomeRowMenu } from '@/components/home/HomeCard'
import { respondToInvitation, useMeetings } from './meetings-store'

/** A row's answer to an invitation: the 답변 button while there is none, the row menu to change it once there is. */
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
  // Unanswered, it is a row of 내 확인 필요: answered where every decision is, in Home's panel.
  return response ? (
    <HomeRowMenu label={label}>{answers}</HomeRowMenu>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="xs"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        openHomeNeedsYou(taskItemUid(`invitation:${meeting.id}`))
      }}
    >
      {t('home.tasks.answer', 'Answer')}
    </Button>
  )
}
