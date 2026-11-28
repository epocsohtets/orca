import React, { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  HOME_FOCUS_RING_CLASS,
  HOME_META_CLASS,
  HomeAvatar,
  HomeProjectDot,
  HomeWhoMarker
} from '@/components/home/HomeCard'
import type { HomeProjectId, HomeTask } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { INAX_STATUSES, type InaxStatus } from '@/components/home/home-task-loop'
import { inaxStatusLabels } from '@/components/home/home-task-loop-script'
import { personName } from '@/components/meetings/meeting-people'

/**
 * The work board: a column per status, a card per task. The column is the task's status on inAX; a card I
 * move (by drag, or from its menu) is moved there at once. `readOnly` is a colleague looking at the same board.
 */
export function WorkBoard({
  tasks,
  projects,
  readOnly,
  openId,
  onOpen,
  onMove,
  onStart
}: {
  tasks: readonly HomeTask[]
  projects: Record<HomeProjectId, HomeProject>
  readOnly: boolean
  openId: string | null
  onOpen: (taskId: string) => void
  onMove: (taskId: string, status: InaxStatus) => void
  onStart: (task: HomeTask) => void
}): React.JSX.Element {
  const t = useTranslate()
  const labels = inaxStatusLabels(t)
  const [dragOver, setDragOver] = useState<InaxStatus | null>(null)
  const statusLabel = t('taskLoop.detail.status', 'Status')

  return (
    <div
      data-work-board=""
      className="scrollbar-sleek grid min-h-0 flex-1 auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto px-(--rail-page-gutter) pt-4 pb-6"
    >
      {INAX_STATUSES.map((status) => {
        const cards = tasks.filter((task) => (task.status ?? 'todo') === status)
        return (
          <section
            key={status}
            aria-label={labels[status]}
            data-work-column={status}
            className={cn(
              'flex min-h-0 flex-col rounded-lg bg-muted/40',
              dragOver === status && 'ring-2 ring-ring/40'
            )}
            onDragOver={(event) => {
              if (!readOnly) {
                event.preventDefault()
                setDragOver(status)
              }
            }}
            onDragLeave={() => setDragOver((current) => (current === status ? null : current))}
            onDrop={(event) => {
              const taskId = event.dataTransfer.getData('text/plain')
              setDragOver(null)
              if (taskId && !readOnly) {
                onMove(taskId, status)
              }
            }}
          >
            <h2 className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2 text-xs font-medium text-foreground">
              {labels[status]}
              <span className="text-muted-foreground tabular-nums">{cards.length}</span>
            </h2>
            <ul className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {cards.map((task) => {
                const mine = task.assignee === undefined
                return (
                  <li
                    key={task.id}
                    data-work-card={task.id}
                    draggable={!readOnly && mine}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                    className={cn(
                      'rounded-md border border-border bg-background shadow-xs',
                      openId === task.id && 'border-foreground/40'
                    )}
                  >
                    <div className="flex items-start">
                      <button
                        type="button"
                        className={cn(
                          HOME_FOCUS_RING_CLASS,
                          'flex min-w-0 flex-1 flex-col gap-1.5 rounded-md p-3 text-left'
                        )}
                        onClick={() => onOpen(task.id)}
                      >
                        <span className="line-clamp-2 text-[13px] font-medium text-foreground">
                          {task.title}
                        </span>
                        {task.who && task.whoLabel ? (
                          <HomeWhoMarker who={task.who} label={task.whoLabel} />
                        ) : null}
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <HomeProjectDot project={projects[task.project]} />
                          <span
                            className={
                              task.due === 'overdue' && !task.done
                                ? 'text-xs text-destructive'
                                : HOME_META_CLASS
                            }
                          >
                            {task.dueLabel}
                          </span>
                        </span>
                        {task.assignee ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HomeAvatar name={personName(task.assignee)} />
                            {personName(task.assignee)}
                          </span>
                        ) : null}
                      </button>
                      {readOnly || !mine ? null : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="mt-2 mr-2 shrink-0 text-muted-foreground"
                              aria-label={`${task.title} · ${statusLabel}`}
                              data-work-card-menu=""
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{statusLabel}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={status}
                              onValueChange={(value) => {
                                const next = INAX_STATUSES.find((entry) => entry === value)
                                if (next && next !== status) {
                                  onMove(task.id, next)
                                }
                              }}
                            >
                              {INAX_STATUSES.map((value) => (
                                <DropdownMenuRadioItem key={value} value={value}>
                                  {labels[value]}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {!readOnly && mine && status === 'todo' && task.loop === undefined ? (
                      <div className="px-3 pb-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          data-work-card-start=""
                          onClick={() => onStart(task)}
                        >
                          {t('taskLoop.detail.start', 'Start with an agent')}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
