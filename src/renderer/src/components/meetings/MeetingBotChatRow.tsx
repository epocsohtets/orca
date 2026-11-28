import React from 'react'
import { Bot } from 'lucide-react'
import { WORKTREE_CARD_SURFACE_CLASS_NAME } from '@/components/sidebar/workspace-card/surface/worktree-card-surface'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useAppStore } from '@/store'
import { openMeetingBot } from './meeting-navigation'
import { botItemsFor } from './meeting-rules'
import { unreadBotItemCount, useMeetings } from './meetings-store'

/** The meeting agent among the direct messages: where its minutes and task proposals arrive. */
export function MeetingBotChatRow(): React.JSX.Element {
  const t = useTranslate()
  const active = useAppStore((state) => state.activeView === 'meetingBot')
  const unread = useMeetings(unreadBotItemCount)
  // Selected apart: a derived object from one selector is new on every read and would loop.
  const viewerId = useMeetings((state) => state.viewerId)
  const meetings = useMeetings((state) => state.meetings)
  const tasks = useMeetings((state) => state.tasks)
  const last = botItemsFor(viewerId, meetings, tasks).at(-1)
  return (
    <button
      type="button"
      data-worktree-card-surface="true"
      data-worktree-card-active={active ? 'primary' : undefined}
      data-meeting-bot-row=""
      className={cn(
        WORKTREE_CARD_SURFACE_CLASS_NAME,
        'flex w-[calc(100%-0.25rem)] shrink-0 items-center gap-2 py-1.25 pl-1.25 text-left focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        !active && 'worktree-sidebar-card-hover'
      )}
      onClick={openMeetingBot}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        <Bot aria-hidden className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className={cn('truncate text-[13px] leading-5', unread > 0 && 'font-semibold')}>
          {t('meetings.bot.name', 'Meeting agent')}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {last
              ? last.kind === 'minutes'
                ? t('meetings.bot.rowMinutes', 'Minutes: {{title}}', { title: last.meeting.title })
                : last.kind === 'shared'
                  ? t('meetings.bot.rowShared', 'Shared minutes: {{title}}', {
                      title: last.meeting.title
                    })
                  : t('meetings.bot.rowTask', 'New task: {{title}}', { title: last.task.title })
              : t('meetings.bot.rowEmpty', 'Minutes and your tasks arrive here')}
          </span>
          {unread > 0 ? (
            <span
              className="shrink-0 rounded-full bg-primary px-1.5 py-px text-3xs font-semibold text-primary-foreground tabular-nums"
              aria-label={t('sidebarChat.unread', '{{count}} unread', { count: unread })}
            >
              {unread}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  )
}
