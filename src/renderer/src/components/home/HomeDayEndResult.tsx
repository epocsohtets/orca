import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { InaxStatusBadge } from '@/components/task-page/inax/inax-status-badge'
import { HOME_META_CLASS, HOME_ROW_BUTTON_CLASS } from './HomeCard'
import type { InaxStatus } from './home-task-loop'
import type { HomeProjectId, HomeTask } from './home-board'
import type { HomeProject } from './home-board-mock'
import type { HomeDayEndSaved } from './home-day-end'
import { openInaxTask } from '@/components/task-page/inax/inax-source-selection'
import { openMeeting } from '@/components/meetings/meeting-navigation'
import { personName } from '@/components/meetings/meeting-people'
import { useMeetings } from '@/components/meetings/meetings-store'

export type HomeDayEndResultRow = {
  id: string
  title: string
  /** What went: "progress note", "2 follow-ups assigned". */
  what: string
  status: InaxStatus | null
  /** Who sees it now. */
  viewers: string
  open: () => void
}

/** What I saved, as rows. Records stay with me, so they are not among what colleagues got. */
export function useHomeDayEndRows(
  saved: readonly HomeDayEndSaved[],
  tasks: readonly HomeTask[],
  projects: Record<HomeProjectId, HomeProject>,
  viewerId: string
): HomeDayEndResultRow[] {
  const t = useTranslate()
  const meetings = useMeetings((state) => state.meetings)
  const meetingTasks = useMeetings((state) => state.tasks)
  return saved.flatMap((entry, index) => {
    if (entry.kind === 'task') {
      const task = tasks.find((item) => item.id === entry.id)
      return task
        ? [
            {
              id: `${index}`,
              title: task.title,
              what: entry.noteId ? t('home.dayEnd.sharedNote', 'Progress note') : '',
              status: entry.status,
              viewers: t('home.dayEnd.audienceTask', 'The PM and the team of “{{project}}”', {
                project: projects[task.project].name
              }),
              open: () => openInaxTask(task.id)
            }
          ]
        : []
    }
    if (entry.kind === 'meeting') {
      const assigned = meetingTasks.filter((task) => entry.taskIds.includes(task.id))
      return [
        {
          id: `${index}`,
          title: meetings.find((meeting) => meeting.id === entry.id)?.title ?? '',
          what: t('home.dayEnd.resultAssigned', '{{count}} follow-ups assigned', {
            count: assigned.length
          }),
          status: null,
          viewers: [...new Set(assigned.map((task) => task.assigneeId))]
            .map((id) => (id === viewerId ? t('home.activity.me', 'I') : personName(id)))
            .join(', '),
          open: () => openMeeting(entry.id)
        }
      ]
    }
    return []
  })
}

/** What the day-end cards sent to colleagues: one row per card, what went and who sees it, and one Undo for all. */
export function HomeDayEndResult({
  rows,
  onUndo
}: {
  rows: readonly HomeDayEndResultRow[]
  onUndo: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <section data-home-day-end-result="" className="border-t border-border pt-2">
      <div className="flex items-center gap-2 px-4">
        <h3 className="min-w-0 flex-1 text-xs font-medium text-foreground">
          {t('home.dayEnd.resultTitle', 'Shared today · {{count}}', { count: rows.length })}
        </h3>
        <Button
          type="button"
          variant="ghost-muted"
          size="xs"
          data-home-day-end-undo=""
          onClick={onUndo}
        >
          {t('home.day.undo', 'Undo')}
        </Button>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className={`${HOME_ROW_BUTTON_CLASS} flex flex-col gap-1`}
              onClick={row.open}
            >
              <span className="text-xs font-medium text-foreground">{row.title}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {row.what ? <span className="text-xs text-foreground">{row.what}</span> : null}
                {row.status ? <InaxStatusBadge status={row.status} /> : null}
                <span className={HOME_META_CLASS}>{row.viewers}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
