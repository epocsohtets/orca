import React from 'react'
import { Plus } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { INAX_MOCK_TASKS } from '@/components/task-page/inax/inax-mock-tasks'
import { isOpenFollowUp } from './meeting-follow-ups'
import { formatDueDate, formatMeetingDay, formatMeetingTime } from './meeting-time-format'
import { InaxTaskChip, inaxTaskStatus, MeetingSection, useInaxStatusLabels } from './MeetingParts'
import { linkTask } from './meetings-mock'
import type { Meeting } from './meeting-types'

const ROW = 'flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 py-1.5'
const QUIET = 'text-xs text-muted-foreground'

export function MeetingPrepTab({
  meeting,
  previous
}: {
  meeting: Meeting
  previous: Meeting | null
}): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const statusLabels = useInaxStatusLabels()
  const carried = previous?.followUps.filter((f) => isOpenFollowUp(f, inaxTaskStatus)) ?? []
  const linked = INAX_MOCK_TASKS.filter((task) => meeting.linkedTaskIds.includes(task.id))
  const linkable = INAX_MOCK_TASKS.filter((task) => !meeting.linkedTaskIds.includes(task.id))

  return (
    <div className="flex flex-col gap-6">
      <MeetingSection title={t('meetings.prep.note', 'Prep note')}>
        {meeting.prepNote ? (
          <>
            <p className="max-w-prose text-sm leading-relaxed text-foreground">
              {meeting.prepNote}
            </p>
            <p className={`mt-1.5 ${QUIET}`}>
              {t(
                'meetings.prep.noteSource',
                'Written by an agent from the linked tasks and the last meeting.'
              )}
            </p>
          </>
        ) : (
          <p className={QUIET}>
            {t(
              'meetings.prep.noNote',
              'No prep note. Link a task and an agent has something to write one from.'
            )}
          </p>
        )}
      </MeetingSection>

      {previous ? (
        <MeetingSection
          title={t('meetings.prep.carried', 'Open from the last meeting ({{day}})', {
            day: formatMeetingDay(previous.startsAt, intlLocale)
          })}
        >
          {carried.length > 0 ? (
            <ul className="divide-y divide-border">
              {carried.map((followUp) => {
                const due = formatDueDate(followUp.due, intlLocale)
                const status = followUp.taskId ? inaxTaskStatus(followUp.taskId) : undefined
                return (
                  <li key={followUp.id} className={ROW}>
                    <span className="min-w-0 flex-1 basis-56 text-[13px] text-foreground">
                      {followUp.title}
                    </span>
                    <span className={QUIET}>
                      {followUp.owner}
                      {due ? ` · ${t('meetings.due', 'Due {{date}}', { date: due })}` : ''}
                    </span>
                    {followUp.taskId ? (
                      <>
                        <InaxTaskChip taskId={followUp.taskId} />
                        {status ? <span className={QUIET}>{statusLabels[status]}</span> : null}
                      </>
                    ) : (
                      <span className={QUIET}>{t('meetings.prep.noTaskYet', 'No task yet')}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={QUIET}>
              {t('meetings.prep.nothingCarried', 'Nothing is open from the last meeting.')}
            </p>
          )}
        </MeetingSection>
      ) : null}

      <MeetingSection
        title={t('meetings.prep.linkedTasks', 'Linked tasks')}
        action={
          linkable.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="xs">
                  <Plus aria-hidden />
                  {t('meetings.prep.linkTask', 'Link task')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-w-80">
                {linkable.map((task) => (
                  <DropdownMenuItem key={task.id} onSelect={() => linkTask(meeting.id, task.id)}>
                    <span className="font-mono text-2xs text-muted-foreground">{task.id}</span>
                    <span className="truncate">{task.title}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
      >
        {linked.length > 0 ? (
          <ul className="divide-y divide-border">
            {linked.map((task) => (
              <li key={task.id} className={ROW}>
                <InaxTaskChip taskId={task.id} />
                <span className="min-w-0 flex-1 basis-56 text-[13px] text-foreground">
                  {task.title}
                </span>
                <span className={QUIET}>{statusLabels[task.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={QUIET}>
            {t('meetings.prep.noLinkedTasks', 'No linked tasks. This meeting works without one.')}
          </p>
        )}
      </MeetingSection>

      <MeetingSection title={t('meetings.prep.schedule', 'Schedule')}>
        {meeting.calendar ? (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[13px]">
            <dt className="text-muted-foreground">{t('meetings.prep.when', 'When')}</dt>
            <dd>
              {formatMeetingDay(meeting.startsAt, intlLocale)}
              {' · '}
              {formatMeetingTime(meeting.startsAt, intlLocale)}
              {' – '}
              {formatMeetingTime(meeting.calendar.endsAt, intlLocale)}
            </dd>
            <dt className="text-muted-foreground">{t('meetings.prep.where', 'Where')}</dt>
            <dd>{meeting.calendar.location}</dd>
            <dt className="text-muted-foreground">{t('meetings.prep.attendees', 'Attendees')}</dt>
            <dd>{meeting.attendees.join(', ')}</dd>
          </dl>
        ) : (
          <p className={QUIET}>
            {t(
              'meetings.prep.noCalendar',
              'No calendar entry. This meeting was started in the app at {{time}}.',
              { time: formatMeetingTime(meeting.startsAt, intlLocale) }
            )}
          </p>
        )}
      </MeetingSection>
    </div>
  )
}
