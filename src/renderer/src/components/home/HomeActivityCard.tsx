import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HOME_META_CLASS, HOME_ROW_BUTTON_CLASS, HomeAvatar, HomeCard } from './HomeCard'
import type { HomeActivity } from './home-board-day-mock'

const SHORT = 5

/** The day's log, newest first. A line jumps to the task or agent it is about. */
export function HomeActivityCard({
  entries,
  filter,
  onFilterChange,
  clock,
  onReveal
}: {
  entries: readonly HomeActivity[]
  filter: 'all' | 'agents'
  onFilterChange: (filter: 'all' | 'agents') => void
  clock: (at: number) => string
  onReveal: (entry: HomeActivity) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [showAll, setShowAll] = useState(false)
  const filtered = filter === 'agents' ? entries.filter((entry) => entry.byAgent) : entries
  const shown = showAll ? filtered : filtered.slice(0, SHORT)

  return (
    <HomeCard
      title={t('home.activity.title', 'Recent activity')}
      data-home-card="activity"
      action={
        filtered.length > SHORT ? (
          <Button
            type="button"
            variant="ghost-muted"
            size="xs"
            aria-expanded={showAll}
            onClick={() => setShowAll((all) => !all)}
          >
            {showAll
              ? t('home.activity.less', 'Show fewer')
              : t('home.activity.all', 'View all {{count}}', { count: filtered.length })}
          </Button>
        ) : undefined
      }
    >
      <div className="px-4 pb-2">
        <Tabs
          value={filter}
          onValueChange={(value) => onFilterChange(value === 'agents' ? 'agents' : 'all')}
        >
          <TabsList size="sm" aria-label={t('home.activity.filter', 'Whose activity')}>
            <TabsTrigger value="all">{t('home.activity.filterAll', 'Everyone')}</TabsTrigger>
            <TabsTrigger value="agents" data-home-activity-filter="agents">
              {t('home.activity.filterAgents', 'Agents')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {shown.length === 0 ? (
        <p className={`px-4 py-3 ${HOME_META_CLASS}`}>
          {t('home.activity.empty', 'Nothing has happened yet today.')}
        </p>
      ) : (
        <ol className="border-t border-border">
          {shown.map((entry) => {
            const body = (
              <>
                <HomeAvatar name={entry.who} />
                <span className="min-w-0 flex-1 text-xs text-foreground">
                  <span className="font-medium">{entry.who}</span> {entry.text}
                </span>
                <span className={`shrink-0 tabular-nums ${HOME_META_CLASS}`}>
                  {clock(entry.at)}
                </span>
              </>
            )
            return (
              <li key={entry.id}>
                {entry.taskId || entry.agentId ? (
                  <button
                    type="button"
                    className={`${HOME_ROW_BUTTON_CLASS} flex items-start gap-2`}
                    onClick={() => onReveal(entry)}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex items-start gap-2 px-4 py-2">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </HomeCard>
  )
}
