import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HomeAvatar, HomeCard, HomeRow } from './HomeCard'
import type { HomeActivityRow } from './home-board-view'

const SHORT = 5

export type HomeActivityFilter = 'all' | 'finished'

/** One line of a log: who (as the avatar), what they did, when. The whole sentence is the tooltip. */
export function HomeActivityItem({
  entry,
  onClick
}: {
  entry: Pick<HomeActivityRow, 'who' | 'text' | 'when'> &
    Partial<Pick<HomeActivityRow, 'finished' | 'confirmed'>>
  onClick?: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <HomeRow
      icon={<HomeAvatar name={entry.who} />}
      // The sample's lines start with the separator that stood after the name.
      title={entry.text.replace(/^·\s*/, '')}
      tip={[
        `${entry.who} ${entry.text}`,
        entry.finished
          ? entry.confirmed
            ? t('home.activity.confirmed', 'Confirmed by me')
            : t('home.activity.unconfirmed', 'Not confirmed by me yet')
          : null
      ]
        .filter(Boolean)
        .join(' · ')}
      date={entry.when}
      onClick={onClick}
    />
  )
}

/** This week's log, newest first. A line jumps to the task, agent or meeting it is about. */
export function HomeActivityCard({
  entries,
  filter,
  onFilterChange,
  showAll,
  onShowAllChange,
  onReveal
}: {
  entries: readonly HomeActivityRow[]
  filter: HomeActivityFilter
  onFilterChange: (filter: HomeActivityFilter) => void
  showAll: boolean
  onShowAllChange: (showAll: boolean) => void
  onReveal: (entry: HomeActivityRow) => void
}): React.JSX.Element {
  const t = useTranslate()
  const finished = entries.filter((entry) => entry.finished)
  const filtered = filter === 'finished' ? finished : entries
  const shown = showAll ? filtered : filtered.slice(0, SHORT)

  return (
    <HomeCard
      title={t('home.activity.title', 'Recent activity')}
      titleTip={t('home.activity.aside', 'This week')}
      aside={t('home.activity.aside', 'This week')}
      data-home-card="activity"
      tabs={{
        label: t('home.activity.filter', 'Activity type'),
        value: filter,
        onValueChange: (value) => onFilterChange(value === 'finished' ? 'finished' : 'all'),
        items: [
          {
            value: 'all',
            label: t('home.activity.filterAll', 'Everything'),
            count: entries.length
          },
          {
            value: 'finished',
            label: t('home.activity.filterFinished', 'Finished by agents'),
            count: finished.length,
            data: { 'data-home-activity-filter': 'finished' }
          }
        ]
      }}
      action={
        filtered.length > SHORT ? (
          <Button
            type="button"
            variant="ghost-muted"
            size="xs"
            aria-expanded={showAll}
            data-home-activity-all=""
            onClick={() => onShowAllChange(!showAll)}
          >
            {showAll
              ? t('home.activity.less', 'Show fewer')
              : t('home.activity.all', 'View all {{count}}', { count: filtered.length })}
          </Button>
        ) : undefined
      }
    >
      {shown.length === 0 ? null : (
        <ol className="mx-4" data-home-activity-list="">
          {shown.map((entry) => (
            <HomeActivityItem
              key={entry.id}
              entry={entry}
              onClick={
                entry.taskId || entry.agentId || entry.meetingId ? () => onReveal(entry) : undefined
              }
            />
          ))}
        </ol>
      )}
    </HomeCard>
  )
}
