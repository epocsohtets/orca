import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { HomeRow, HomeRowMenu } from './HomeCard'
import type { HomeRecordAnswer, HomeTask } from './home-board'
import type { HomeDayRecord } from './home-board-day-mock'

const NOT_WORK = 'notWork'

/** One day record the app is unsure about: I pick its task, or say it was not work. Picking applies at once. */
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
  return (
    <HomeRow
      data-home-record={answer ? 'answered' : 'open'}
      title={record.text}
      tip={record.text}
      action={
        <span className="flex items-center gap-1">
          <Select
            // Why '': an empty value shows the placeholder again after an undo.
            value={answer ? (answer === NOT_WORK ? NOT_WORK : answer.taskId) : ''}
            onValueChange={(value) => onAnswer(value === NOT_WORK ? NOT_WORK : { taskId: value })}
          >
            <SelectTrigger
              size="xs"
              className="w-40"
              aria-label={t('home.day.pickTask', 'Task to link this record to')}
            >
              <SelectValue placeholder={t('home.day.pick', 'Pick a task')} />
            </SelectTrigger>
            <SelectContent align="end">
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={NOT_WORK}>{t('home.day.notWork', 'Not work')}</SelectItem>
            </SelectContent>
          </Select>
          {/* The slot stays when the menu does not: the select keeps its place. */}
          <span className="flex w-7 justify-end">
            {answer ? (
              <HomeRowMenu
                label={t('meetings.followUps.more', 'Menu for “{{text}}”', { text: record.text })}
              >
                <DropdownMenuItem onSelect={() => onAnswer(null)}>
                  {t('home.day.undo', 'Undo')}
                </DropdownMenuItem>
              </HomeRowMenu>
            ) : null}
          </span>
        </span>
      }
    />
  )
}
