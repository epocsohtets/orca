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
import { MAKO, personName } from '@/components/meetings/meeting-people'
import { useMeetings } from '@/components/meetings/meetings-store'
import { undoHomeDayEndAt } from './home-board-actions'

export type HomeDayEndResultRow = {
  id: string
  title: string
  /** What went: "progress note", "2 follow-ups assigned". */
  what: string
  status: InaxStatus | null
  /** Who sees it now. */
  viewers: string
  open: () => void
  undo: () => void
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
  // The cards are 마코's: seen as someone else, the board holds none of them.
  return (viewerId === MAKO ? saved : []).flatMap((entry, index) => {
    if (entry.kind === 'task') {
      const task = tasks.find((item) => item.id === entry.id)
      return task
        ? [
            {
              id: `${index}`,
              title: task.title,
              what: entry.noteId ? t('home.dayEnd.progress', 'Progress note') : '',
              status: entry.status,
              viewers: t('home.dayEnd.audienceTask', 'The PM and the team of “{{project}}”', {
                project: projects[task.project].name
              }),
              open: () => openInaxTask(task.id),
              undo: () => undoHomeDayEndAt(index)
            }
          ]
        : []
    }
    if (entry.kind === 'meeting') {
      const meeting = meetings.find((item) => item.id === entry.id)
      return [
        {
          id: `${index}`,
          title: meeting?.title ?? '',
          what: t('home.dayEnd.sharedOwners', 'Owners of {{count}} follow-ups', {
            count: entry.taskIds.length
          }),
          status: null,
          // Everyone in the meeting sees who has its follow-ups.
          viewers: (meeting ? [meeting.hostId, ...meeting.attendeeIds] : [])
            .map((id) => (id === viewerId ? t('home.activity.me', 'I') : personName(id)))
            .join(', '),
          open: () => openMeeting(entry.id),
          undo: () => undoHomeDayEndAt(index)
        }
      ]
    }
    return []
  })
}

/** What the day-end cards sent to colleagues: one row per card, what went, who sees it, and its Undo. */
export function HomeDayEndResult({
  rows
}: {
  rows: readonly HomeDayEndResultRow[]
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <section data-home-day-end-result="" className="border-t border-border pt-2">
      <h3 className="px-4 text-xs font-medium text-foreground">
        {t('home.dayEnd.resultTitle', 'What the team sees today · {{count}}', {
          count: rows.length
        })}
      </h3>
      <ul>
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-2 pr-4">
            <button
              type="button"
              data-home-day-end-row=""
              className={`${HOME_ROW_BUTTON_CLASS} flex flex-1 flex-col gap-1`}
              onClick={row.open}
            >
              <span className="text-xs font-medium text-foreground">{row.title}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {row.what ? <span className="text-xs text-foreground">{row.what}</span> : null}
                {row.status ? <InaxStatusBadge status={row.status} /> : null}
                <span className={HOME_META_CLASS}>{row.viewers}</span>
              </span>
            </button>
            <Button
              type="button"
              variant="ghost-muted"
              size="xs"
              data-home-day-end-undo=""
              onClick={row.undo}
            >
              {t('home.day.undo', 'Undo')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
