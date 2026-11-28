import React from 'react'
import { CalendarDays, Flag, Mic, Users } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HOME_GROUP_CLASS, HomeCard, HomeRow } from './HomeCard'
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
      {GROUPS.map((group) => {
        const rows = items.filter((item) => item.group === group)
        if (rows.length === 0) {
          return null
        }
        return (
          <section key={group} aria-label={groupLabels[group]}>
            <h3 className={HOME_GROUP_CLASS}>
              {groupLabels[group]}
              <span className="tabular-nums">{rows.length}</span>
            </h3>
            <ul className="mx-4">
              {rows.map((item) => (
                <HomeRow
                  key={item.id}
                  data-home-upcoming={item.id}
                  icon={
                    item.meeting?.recording ? (
                      <Mic aria-hidden className="text-destructive" />
                    ) : item.meeting ? (
                      <Users aria-hidden />
                    ) : (
                      <Flag aria-hidden />
                    )
                  }
                  title={item.title}
                  tip={[
                    item.title,
                    projects[item.project].name,
                    item.meeting?.recording
                      ? t('home.upcoming.recording', 'Recording now')
                      : item.meeting
                        ? item.meeting.note
                        : t('home.upcoming.deadline', 'Deadline')
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  chip={item.meeting?.note || undefined}
                  project={projects[item.project]}
                  date={item.when}
                  onClick={() => {
                    if (item.taskId) {
                      onRevealTask(item.taskId)
                    } else if (item.meetingId) {
                      onOpenMeeting(item.meetingId)
                    }
                  }}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </HomeCard>
  )
}
