import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { HOME_GROUP_CLASS, HomeRow, HomeRowMenu, HomeStateIcon } from './HomeCard'
import { inaxStatusLabels } from './home-task-loop-script'
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
  const statusLabels = inaxStatusLabels(t)
  return (
    <section data-home-day-end-result="" className="mt-3">
      <h3 className={`mx-4 border-t border-border px-0 ${HOME_GROUP_CLASS}`}>
        {t('home.dayEnd.resultTitle', 'What the team sees today · {{count}}', {
          count: rows.length
        })}
      </h3>
      <ul className="mx-4">
        {rows.map((row) => (
          <HomeRow
            key={row.id}
            button={{ 'data-home-day-end-row': '' }}
            icon={<HomeStateIcon state="done" />}
            title={row.title}
            tip={[row.what, row.status ? statusLabels[row.status] : null, row.viewers]
              .filter(Boolean)
              .join(' · ')}
            onClick={row.open}
            action={
              <HomeRowMenu
                label={t('meetings.followUps.more', 'Menu for “{{text}}”', { text: row.title })}
              >
                <DropdownMenuItem data-home-day-end-undo="" onSelect={row.undo}>
                  {t('home.day.undo', 'Undo')}
                </DropdownMenuItem>
              </HomeRowMenu>
            }
          />
        ))}
      </ul>
    </section>
  )
}
