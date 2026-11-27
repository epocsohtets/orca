import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { HOME_META_CLASS, HomeCard } from './HomeCard'
import type { HomeRecordAnswer, HomeTask } from './home-board'
import type { HomeDayRecord, HomeDaySegment } from './home-board-day-mock'

const SEGMENT_CLASS: Record<HomeDaySegment['id'], string> = {
  app: 'bg-foreground',
  browser: 'bg-foreground/60',
  meeting: 'bg-foreground/30'
}

function RecordRow({
  record,
  answer,
  tasks,
  onAnswer
}: {
  record: HomeDayRecord
  answer: HomeRecordAnswer | undefined
  tasks: readonly HomeTask[]
  onAnswer: (answer: HomeRecordAnswer | null) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [taskId, setTaskId] = useState(record.suggestTaskId)
  const linked =
    answer && answer !== 'notWork' ? tasks.find((task) => task.id === answer.taskId) : null
  return (
    <li className="flex flex-col gap-2 px-4 py-2" data-home-record={answer ? 'answered' : 'open'}>
      <p
        className={`text-xs ${answer === 'notWork' ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        {record.text}
      </p>
      {answer ? (
        <div className="flex flex-wrap items-center gap-2" role="status">
          <span className={HOME_META_CLASS}>
            {answer === 'notWork'
              ? t('home.day.excluded', 'Not work. It is never reported.')
              : t('home.day.linked', 'Linked to “{{task}}”', { task: linked?.title ?? '' })}
          </span>
          <Button type="button" variant="ghost-muted" size="xs" onClick={() => onAnswer(null)}>
            {t('home.day.undo', 'Undo')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={taskId} onValueChange={setTaskId}>
            <SelectTrigger
              size="xs"
              className="min-w-0 flex-1"
              aria-label={t('home.day.pickTask', 'Task to link this record to')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="xs" onClick={() => onAnswer({ taskId })}>
            {t('home.day.link', 'Link')}
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => onAnswer('notWork')}>
            {t('home.day.notWork', 'Not work')}
          </Button>
        </div>
      )}
    </li>
  )
}

/** My day as the app recorded it. Only I see it; the sentence beside the title says so. */
export function HomeMyDayCard({
  segments,
  duration,
  records,
  answers,
  tasks,
  onAnswer,
  wrappedUp,
  prominent,
  hasApp,
  onRegisterApp,
  onWrapUp
}: {
  segments: readonly HomeDaySegment[]
  duration: (minutes: number) => string
  records: readonly HomeDayRecord[]
  answers: Readonly<Record<string, HomeRecordAnswer>>
  tasks: readonly HomeTask[]
  onAnswer: (recordId: string, answer: HomeRecordAnswer | null) => void
  wrappedUp: number | null
  /** Evening: wrapping up is the point of the visit. */
  prominent: boolean
  hasApp: boolean
  onRegisterApp: () => void
  onWrapUp: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const total = segments.reduce((sum, segment) => sum + segment.minutes, 0)
  const summary = segments
    .map((segment) => `${segment.label} ${duration(segment.minutes)}`)
    .join(' · ')
  const open = records.filter((record) => !answers[record.id]).length

  return (
    <HomeCard
      title={t('home.day.title', 'My day')}
      aside={t(
        'home.day.privacy',
        'Only I see this. Only what I confirm in Wrap up today is reported to the team.'
      )}
      data-home-card="day"
    >
      <div className="flex flex-col gap-2 px-4 pb-2">
        <p className="text-[13px] font-medium text-foreground">
          {total > 0 ? summary : t('home.day.nothing', 'Nothing recorded yet today.')}
        </p>
        {total > 0 ? (
          <div role="img" aria-label={summary} className="flex h-2 overflow-hidden rounded-full">
            {segments.map((segment) => (
              <span
                key={segment.id}
                className={SEGMENT_CLASS[segment.id]}
                style={{ width: `${(segment.minutes / total) * 100}%` }}
              />
            ))}
          </div>
        ) : null}
        <p className={HOME_META_CLASS}>
          {t(
            'home.day.scope',
            'Recorded: time in apps I registered, page titles in this app’s browser, and meeting times. Never screen content.'
          )}
        </p>
        {hasApp ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <span className={HOME_META_CLASS}>
              {t('home.day.noApp', 'No app is registered, so app time is not recorded.')}
            </span>
            <Button type="button" variant="outline" size="xs" onClick={onRegisterApp}>
              {t('home.day.registerApp', 'Register an app')}
            </Button>
          </div>
        )}
      </div>
      {records.length > 0 ? (
        <section aria-label={t('home.day.unconfirmed', 'Unconfirmed')}>
          <h3 className="flex items-baseline gap-2 border-t border-border px-4 pt-2 text-xs font-medium text-foreground">
            {t('home.day.unconfirmed', 'Unconfirmed')}
            <span className="tabular-nums text-muted-foreground">{open}</span>
            <span className={`font-normal ${HOME_META_CLASS}`}>
              {t('home.day.unconfirmedHint', 'The app is not sure these were work.')}
            </span>
          </h3>
          <ul>
            {records.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                answer={answers[record.id]}
                tasks={tasks}
                onAnswer={(answer) => onAnswer(record.id, answer)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 pt-2">
        <Button
          type="button"
          variant={prominent && wrappedUp === null ? 'default' : 'outline'}
          size="sm"
          data-home-wrap-up-open=""
          onClick={onWrapUp}
        >
          {t('home.wrapUp.title', 'Wrap up today')}
        </Button>
        <span className={HOME_META_CLASS}>
          {wrappedUp === null
            ? t('home.day.wrapUpHint', 'See what would be reported before anything is.')
            : t('home.day.wrappedUp', 'Wrapped up: {{count}} updates confirmed.', {
                count: wrappedUp
              })}
        </span>
      </div>
    </HomeCard>
  )
}
