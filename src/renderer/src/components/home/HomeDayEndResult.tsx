import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { HOME_GROUP_RULED_CLASS, HomeRow, HomeRowMenu, HomeStateIcon } from './HomeCard'
import { inaxStatusLabels } from './home-task-loop-script'
import type { InaxStatus } from './home-task-loop'
import type { HomeProjectId, HomeTask } from './home-board'
import type { HomeProject } from './home-board-mock'
import type { HomeDayEndSaved } from './home-day-end'
import { openInaxTask } from '@/components/task-page/inax/inax-source-selection'
import { openMeeting } from '@/components/meetings/meeting-navigation'
import { MAKO } from '@/components/meetings/meeting-people'
import { formatHomeClock, homeSampleDay, homeSampleMoment } from './home-day'
import { useMeetings } from '@/components/meetings/meetings-store'
import { undoHomeDayEndAt } from './home-board-actions'

export type HomeDayEndResultRow = {
  id: string
  title: string
  /** What went: "progress note", "2 follow-ups assigned". */
  what: string
  status: InaxStatus | null
  project: HomeProject | undefined
  /** When I saved it, on the sample day's clock. */
  time: string
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
  const timeOf = (at: number | undefined): string =>
    at === undefined
      ? ''
      : formatHomeClock(Math.floor((homeSampleMoment(at) - homeSampleDay(at)) / 60_000))
  // The cards are 마코's: seen as someone else, the board holds none of them.
  return (viewerId === MAKO ? saved : []).flatMap((entry, index): HomeDayEndResultRow[] => {
    if (entry.kind === 'task') {
      const task = tasks.find((item) => item.id === entry.id)
      return task
        ? [
            {
              id: `${index}`,
              title: task.title,
              what: entry.noteId ? t('home.dayEnd.progress', 'Progress note') : '',
              status: entry.status,
              project: projects[task.project],
              time: timeOf(entry.at),
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
          project: meeting ? projects[meeting.project] : undefined,
          time: timeOf(entry.at),
          open: () => openMeeting(entry.id),
          undo: () => undoHomeDayEndAt(index)
        }
      ]
    }
    return []
  })
}

/** What I saved today from the day-end cards: one row per card, its project and time; Undo in the row's menu. */
export function HomeDayEndResult({
  rows
}: {
  rows: readonly HomeDayEndResultRow[]
}): React.JSX.Element {
  const t = useTranslate()
  const statusLabels = inaxStatusLabels(t)
  return (
    <section data-home-day-end-result="" className="mt-3">
      <h3 className={HOME_GROUP_RULED_CLASS}>{t('home.dayEnd.resultTitle', 'Saved today')}</h3>
      <ul className="mx-4">
        {rows.map((row) => (
          <HomeRow
            key={row.id}
            button={{ 'data-home-day-end-row': '' }}
            icon={<HomeStateIcon state="done" />}
            title={row.title}
            project={row.project}
            date={row.time}
            tip={[row.what, row.status ? statusLabels[row.status] : null]
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
