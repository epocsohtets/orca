import React from 'react'
import { EyeOff, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SidebarChatConversation } from '@/components/sidebar-chat/sidebar-chat-mock-data'
import { openScheduleForm } from './meeting-navigation'
import { personName } from './meeting-people'
import { whisperMeetingDraft, type MeetingWhisper } from './meeting-whisper'
import { useMeetingText } from './MeetingParts'
import { dismissWhisper, scheduleMeeting, useMeetings } from './meetings-store'

const DETAILS = '\u0000'

/**
 * The meeting agent's question inside a chat, to one person. Not a message: a quiet line between messages that
 * nobody else in the chat gets.
 */
export function MeetingWhisperLine({
  conversation,
  whisper
}: {
  conversation: SidebarChatConversation
  whisper: MeetingWhisper
}): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const viewerId = useMeetings((state) => state.viewerId)
  const draft = whisperMeetingDraft(conversation, whisper.talk, viewerId)
  const who =
    conversation.kind === 'group'
      ? t('meetings.whisper.whoGroup', 'the {{count}} people in this chat', {
          count: conversation.memberIds.length
        })
      : t('meetings.whisper.whoDm', '{{name}} and me', {
          name: personName(draft.attendeeIds[0] ?? viewerId)
        })
  // The sentence's word order is the translator's; the details stay one bold run inside it.
  const [before, after] = t('meetings.whisper.question', 'Create a meeting for {{details}}?', {
    details: DETAILS
  }).split(DETAILS)
  return (
    <div
      role="note"
      data-meeting-whisper={whisper.messageId}
      className="ml-[42px] flex flex-col items-start gap-2 border-l-2 border-border py-1 pl-3"
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles aria-hidden className="size-3.5" />
        <span className="font-medium">{t('meetings.bot.name', 'Meeting agent')}</span>
        <Badge variant="outline">
          <EyeOff aria-hidden />
          {t('meetings.whisper.onlyMe', 'Only I see this')}
        </Badge>
      </div>
      <p className="max-w-prose text-[13px] leading-relaxed text-foreground">
        {t('meetings.whisper.lead', 'This looks like setting up a meeting.')} {before}
        <strong className="font-semibold">
          {text.whenWithWeekday(draft)}, {who}
        </strong>
        {after}
      </p>
      <p className="text-xs text-muted-foreground">
        {t('meetings.whisper.title', 'Title: “{{title}}”.', { title: draft.title })}{' '}
        {whisper.talk.timeGuessed
          ? t(
              'meetings.whisper.guessed',
              'The line gave no time, so this time is only a first offer.'
            )
          : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="xs"
          data-meeting-whisper-create=""
          onClick={() => {
            scheduleMeeting({
              ...draft,
              originConversationId: conversation.id,
              startNow: false,
              whisperMessageId: whisper.messageId
            })
            toast.success(
              t(
                'meetings.whisper.created',
                'Meeting created. It is on {{count}} people’s schedule.',
                {
                  count: draft.attendeeIds.length + 1
                }
              )
            )
          }}
        >
          {t('meetings.whisper.create', 'Create')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          data-meeting-whisper-edit=""
          onClick={() =>
            openScheduleForm(conversation.id, { draft, whisperMessageId: whisper.messageId })
          }
        >
          {t('meetings.whisper.edit', 'Edit, then create')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          data-meeting-whisper-dismiss=""
          onClick={() => dismissWhisper(conversation.id)}
        >
          {t('meetings.whisper.dismiss', 'No thanks')}
        </Button>
      </div>
    </div>
  )
}
