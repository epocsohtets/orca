import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  HOME_META_CLASS,
  HOME_ROW_BUTTON_CLASS,
  HomeAvatar,
  HomeCard,
  HomeProjectDot,
  HomeWhoMarker
} from '@/components/home/HomeCard'
import type { HomeProjectId, HomeTask } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { botItemsFor } from './meeting-rules'
import { useMeetingText } from './MeetingParts'
import { isSeen, useMeetings } from './meetings-store'

/** What meetings wait on me for: the same rows Home lists under Needs me. Each opens its meeting. */
export function MeetingWaitingCard({
  rows,
  projects,
  onSelect
}: {
  rows: readonly HomeTask[]
  projects: Record<HomeProjectId, HomeProject>
  onSelect: (meetingId: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <HomeCard
      title={t('home.tiles.waiting', 'Needs me')}
      aside={<span className="tabular-nums">{rows.length}</span>}
      data-meeting-card="waiting"
    >
      {rows.length === 0 ? (
        <p className={`px-4 py-2 ${HOME_META_CLASS}`}>
          {t('home.tasks.emptyWaiting', 'Nothing is waiting for you.')}
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                data-meeting-waiting={row.id}
                className={`${HOME_ROW_BUTTON_CLASS} flex flex-col gap-1`}
                onClick={() => row.meetingId && onSelect(row.meetingId)}
              >
                <span className="line-clamp-2 text-[13px] font-medium text-foreground">
                  {row.title}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  {row.who && row.whoLabel ? (
                    <HomeWhoMarker who={row.who} label={row.whoLabel} />
                  ) : null}
                  <HomeProjectDot project={projects[row.project]} />
                </span>
              </button>
            </li>
          ))}
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
      {items.length === 0 ? (
        <p className={`px-4 py-2 ${HOME_META_CLASS}`}>
          {t('meetings.bot.rowEmpty', 'Minutes and your tasks arrive here')}
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                data-meeting-agent-item={item.key}
                className={`${HOME_ROW_BUTTON_CLASS} flex items-start gap-2`}
                onClick={onOpen}
              >
                <HomeAvatar name={name} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={`line-clamp-2 text-[13px] text-foreground ${isSeen(state, item.key) ? '' : 'font-medium'}`}
                  >
                    {item.kind === 'minutes'
                      ? t('meetings.bot.rowMinutes', 'Minutes: {{title}}', {
                          title: item.meeting.title
                        })
                      : item.kind === 'shared'
                        ? t('meetings.bot.rowShared', 'Shared minutes: {{title}}', {
                            title: item.meeting.title
                          })
                        : t('meetings.bot.rowTask', 'New task: {{title}}', {
                            title: item.task.title
                          })}
                  </span>
                  {item.kind === 'minutes' && item.proposals.length > 0 ? (
                    <span className={HOME_META_CLASS}>
                      {t('meetings.agent.proposals', '{{count}} items looked like mine', {
                        count: item.proposals.length
                      })}
                    </span>
                  ) : null}
                </span>
                <span className={`shrink-0 pt-px tabular-nums ${HOME_META_CLASS}`}>
                  {text.day(item.at)} {text.time(item.at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  )
}
