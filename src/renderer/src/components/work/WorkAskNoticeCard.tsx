import React from 'react'
import { ListTodo, X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/store'
import { useHomeBoard } from '@/components/home/use-home-board'
import { isSeen, markSeen, useMeetings } from '@/components/meetings/meetings-store'
import {
  openInaxTask,
  useInaxSourceSelection
} from '@/components/task-page/inax/inax-source-selection'

/** Brings an agent's question to me when I am somewhere else: the one notice a task sends during the day. */
export function WorkAskNoticeCard(): React.JSX.Element | null {
  const t = useTranslate()
  const { view, board } = useHomeBoard()
  const seen = useMeetings()
  const openTaskId = useInaxSourceSelection((state) => state.taskId)
  const onWork = useAppStore((state) => state.activeView === 'tasks')
  // Keyed by the conversation, so a task started again asks again.
  const keyOf = (taskId: string): string =>
    `notice:ask:${taskId}:${board.loops[taskId]?.startedAt ?? 0}`
  const task = view.tasks.find(
    (entry) =>
      entry.loop === 'question' &&
      !(onWork && openTaskId === entry.id) &&
      !isSeen(seen, keyOf(entry.id))
  )
  if (!task) {
    return null
  }
  const key = keyOf(task.id)
  return (
    <div data-work-ask-notice={task.id}>
      <Card size="notice" role="complementary" aria-labelledby="work-ask-notice-heading">
        <div className="flex flex-col gap-2.5 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <ListTodo aria-hidden className="size-4 text-muted-foreground" />
              <h3 id="work-ask-notice-heading" className="text-sm font-semibold">
                {t('taskLoop.notice.title', 'Needs your answer')}
              </h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={t('meetings.notice.dismiss', 'Dismiss')}
              onClick={() => markSeen([key])}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{task.title}</p>
          <div className="mt-0.5 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                markSeen([key])
                openInaxTask(task.id)
              }}
            >
              {t('taskLoop.notice.open', 'Answer')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
