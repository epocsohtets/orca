import { Bot } from 'lucide-react'
import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HomeCard, HomeRow, HomeStateIcon } from '@/components/home/HomeCard'
import type { HomeProjectId, HomeTask } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { botItemsFor } from './meeting-rules'
import { openHomeNeedsYou } from '@/components/home/home-task-items-host'
import { taskItemUid } from '@/components/home/home-task-item-model'
import { useMeetingText } from './MeetingParts'
import { useMeetings } from './meetings-store'

/** What waits on me: the same rows as Home's 내 확인 필요. Each opens its item in Home's panel. */
export function MeetingWaitingCard({
  rows,
  projects
}: {
  rows: readonly HomeTask[]
  projects: Record<HomeProjectId, HomeProject>
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <HomeCard
      title={t('home.tiles.waiting', 'Needs me')}
      aside={<span className="tabular-nums">{rows.length}</span>}
      data-meeting-card="waiting"
    >
      {rows.length === 0 ? null : (
        <ul className="mx-4">
          {rows.map((row) => {
            const open = (): void => openHomeNeedsYou(taskItemUid(row.id))
            return (
              <HomeRow
                key={row.id}
                button={{ 'data-meeting-waiting': row.id }}
                icon={<HomeStateIcon state="waiting" />}
                title={row.title}
                tip={[row.title, row.whoLabel, projects[row.project].name]
                  .filter(Boolean)
                  .join(' · ')}
                chip={t('home.chip.waiting', 'Needs me')}
                onClick={open}
                action={
                  <Button type="button" variant="outline" size="xs" onClick={open}>
                    {t('home.tasks.answer', 'Answer')}
                  </Button>
                }
              />
            )
          })}
        </ul>
      )}
    </HomeCard>
  )
}

/** What the meeting agent sent me last; the whole conversation is one click away. */
export function MeetingAgentCard({ onOpen }: { onOpen: () => void }): React.JSX.Element {
  const t = useTranslate()
  const text = useMeetingText()
  const name = t('meetings.bot.name', 'Meeting agent')
  const state = useMeetings()
  const items = botItemsFor(state.viewerId, state.meetings, state.tasks).toReversed().slice(0, 4)
  return (
    <HomeCard
      title={name}
      aside={t('meetings.agent.aside', 'What it sent me')}
      data-meeting-card="agent"
      action={
        <Button type="button" variant="ghost-muted" size="xs" onClick={onOpen}>
          {t('meetings.agent.open', 'Open the conversation')}
        </Button>
      }
    >
      {items.length === 0 ? null : (
        <ul className="mx-4">
          {items.map((item) => {
            const title =
              item.kind === 'minutes'
                ? t('meetings.bot.rowMinutes', 'Minutes: {{title}}', {
                    title: item.meeting.title
                  })
                : item.kind === 'shared'
                  ? t('meetings.bot.rowShared', 'Shared minutes: {{title}}', {
                      title: item.meeting.title
                    })
                  : t('meetings.bot.rowTask', 'New task: {{title}}', {
                      title: item.task.title
                    })
            return (
              <HomeRow
                key={item.key}
                button={{ 'data-meeting-agent-item': item.key }}
                icon={<Bot aria-hidden />}
                title={title}
                tip={`${title} · ${text.day(item.at)} ${text.time(item.at)}`}
                chip={
                  item.kind === 'minutes' && item.proposals.length > 0
                    ? t('meetings.chip.mine', 'Mine: {{count}}', {
                        count: item.proposals.length
                      })
                    : undefined
                }
                date={text.whenShort({ startsAt: item.at })}
                onClick={onOpen}
              />
            )
          })}
        </ul>
      )}
    </HomeCard>
  )
}
