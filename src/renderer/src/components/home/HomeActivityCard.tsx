import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HOME_META_CLASS, HOME_ROW_BUTTON_CLASS, HomeAvatar, HomeCard } from './HomeCard'
import type { HomeActivityRow } from './home-board-view'

const SHORT = 5

export type HomeActivityFilter = 'all' | 'finished'

/** This week's log, newest first. A line jumps to the task or agent it is about. */
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
      aside={t('home.activity.aside', 'This week')}
      data-home-card="activity"
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
      <div className="px-4 pb-2">
        <Tabs
          value={filter}
          onValueChange={(value) => onFilterChange(value === 'finished' ? 'finished' : 'all')}
        >
          <TabsList aria-label={t('home.activity.filter', 'Which activity')}>
            <TabsTrigger value="all">
              {t('home.activity.filterAll', 'Everything')}
              <span className="tabular-nums">{entries.length}</span>
            </TabsTrigger>
            <TabsTrigger value="finished" data-home-activity-filter="finished">
              {t('home.activity.filterFinished', 'Finished by agents')}
              <span className="tabular-nums">{finished.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {shown.length === 0 ? (
        <p className={`px-4 py-3 ${HOME_META_CLASS}`}>
          {t('home.activity.empty', 'Nothing has happened yet this week.')}
        </p>
      ) : (
        <ol className="border-t border-border" data-home-activity-list="">
          {shown.map((entry) => {
            const body = (
              <>
                <HomeAvatar name={entry.who} />
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-foreground">
                  <span>
                    <span className="font-medium">{entry.who}</span> {entry.text}
                  </span>
                  {entry.finished ? (
                    <span className={HOME_META_CLASS}>
                      {entry.confirmed
                        ? t('home.activity.confirmed', 'Confirmed by me')
                        : t('home.activity.unconfirmed', 'Not confirmed by me yet')}
                    </span>
                  ) : null}
                </span>
                <span className={`shrink-0 tabular-nums ${HOME_META_CLASS}`}>{entry.when}</span>
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
