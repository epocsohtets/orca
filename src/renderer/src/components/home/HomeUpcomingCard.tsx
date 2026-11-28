import React from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HOME_META_CLASS, HOME_ROW_BUTTON_CLASS, HomeCard, HomeProjectDot } from './HomeCard'
import type { HomeProjectId } from './home-board'
import type { HomeProject } from './home-board-mock'
import type { HomeUpcoming, HomeUpcomingGroup } from './home-board-day-mock'

const GROUPS: HomeUpcomingGroup[] = ['today', 'tomorrow', 'week', 'nextWeek']

/** Deadlines and meetings together. A deadline jumps to its task; a meeting opens that meeting. */
export function HomeUpcomingCard({
  items,
  projects,
  onRevealTask,
  onOpenMeeting,
  onOpenCalendar
}: {
  items: readonly HomeUpcoming[]
  projects: Record<HomeProjectId, HomeProject>
  onRevealTask: (taskId: string) => void
  /** Prep before the meeting, minutes after it. */
  onOpenMeeting: (meetingId: string) => void
  onOpenCalendar: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const groupLabels: Record<HomeUpcomingGroup, string> = {
    today: t('home.upcoming.today', 'Today'),
    tomorrow: t('home.upcoming.tomorrow', 'Tomorrow'),
    week: t('home.upcoming.week', 'This week'),
    nextWeek: t('home.upcoming.nextWeek', 'Next week')
  }

  return (
    <HomeCard
      title={t('home.upcoming.title', 'Coming up')}
      data-home-card="upcoming"
      action={
        <Button
          type="button"
          variant="ghost-muted"
          size="xs"
          data-home-calendar=""
          onClick={onOpenCalendar}
        >
          <CalendarDays aria-hidden />
          {t('home.upcoming.calendar', 'Calendar')}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {GROUPS.map((group) => {
          const rows = items.filter((item) => item.group === group)
          if (rows.length === 0) {
            return null
          }
          return (
            <section key={group} aria-label={groupLabels[group]}>
              <h3 className="flex items-baseline gap-2 px-4 py-1 text-xs font-medium text-muted-foreground">
                {groupLabels[group]}
                <span className="tabular-nums">{rows.length}</span>
              </h3>
              <ul>
                {rows.map((item) => {
                  return (
                    <li key={item.id} data-home-upcoming={item.id}>
                      <button
                        type="button"
                        className={`${HOME_ROW_BUTTON_CLASS} flex items-start gap-3`}
                        onClick={() => {
                          if (item.taskId) {
                            onRevealTask(item.taskId)
                          } else if (item.meetingId) {
                            onOpenMeeting(item.meetingId)
                          }
                        }}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="line-clamp-2 text-[13px] text-foreground">
                            {item.title}
                          </span>
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <HomeProjectDot project={projects[item.project]} />
                            {item.meeting ? (
                              <span className="text-xs font-medium text-foreground">
                                {item.meeting.note}
                              </span>
                            ) : (
                              <span className={HOME_META_CLASS}>
                                {t('home.upcoming.deadline', 'Deadline')}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className={`shrink-0 pt-px tabular-nums ${HOME_META_CLASS}`}>
                          {item.when}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </HomeCard>
  )
}
