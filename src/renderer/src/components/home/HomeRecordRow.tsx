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
import { HOME_META_CLASS } from './HomeCard'
import type { HomeRecordAnswer, HomeTask } from './home-board'
import type { HomeDayRecord } from './home-board-day-mock'

/** One day record the app is unsure about: link it to a task I pick, or say it was not work. Undoable. */
export function HomeRecordRow({
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
    <li className="flex flex-col gap-2 py-2" data-home-record={answer ? 'answered' : 'open'}>
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
