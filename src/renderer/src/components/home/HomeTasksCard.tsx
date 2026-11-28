import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import { HomeCard, HomeRow, HomeStateIcon } from './HomeCard'
import {
  homeTaskTab,
  sortHomeTasks,
  type HomeProjectId,
  type HomeTask,
  type HomeTaskTab
} from './home-board'
import type { HomeProject } from './home-board-mock'

const TABS: HomeTaskTab[] = ['today', 'waiting', 'late', 'done']

function isTaskTab(value: string): value is HomeTaskTab {
  return TABS.some((tab) => tab === value)
}

/** My work: what is mine today, with who has each task right now. A row opens in the panel beside it. */
export function HomeTasksCard({
  tasks,
  projects,
  tab,
  onTabChange,
  onStart,
  onOpenTask,
  onOpenTaskList
}: {
  tasks: readonly HomeTask[]
  projects: Record<HomeProjectId, HomeProject>
  tab: HomeTaskTab
  onTabChange: (tab: HomeTaskTab) => void
  /** Hands a task of mine that is not started to an agent. */
  onStart: (task: HomeTask) => void
  /** Opens the row's 업무 in the panel beside the board. */
  onOpenTask: (taskId: string) => void
  onOpenTaskList: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const labels: Record<HomeTaskTab, string> = {
    today: t('home.tasks.today', 'Remaining'),
    waiting: t('home.tasks.waiting', 'Needs me'),
    late: t('home.tasks.late', 'Late'),
    done: t('home.tasks.done', 'Done')
  }
  const chips: Record<NonNullable<HomeTask['who']>, string> = {
    waiting: t('home.chip.waiting', 'Needs me'),
    blocked: t('home.chip.blocked', 'Awaiting reply'),
    agentWorking: t('home.chip.working', 'Working'),
    draft: t('home.chip.draft', 'Draft ready')
  }
  const byTab = (key: HomeTaskTab): HomeTask[] =>
    sortHomeTasks(tasks.filter((task) => homeTaskTab(task).includes(key)))
  const shown = byTab(tab)
  const startable = (task: HomeTask): boolean =>
    task.who === null && !task.done && !task.assignee && !task.meetingId && task.status === 'todo'

  return (
    <HomeCard
      title={t('home.tasks.title', 'My work')}
      data-home-card="tasks"
      tabs={{
        label: t('home.tasks.title', 'My work'),
        value: tab,
        onValueChange: (value) => {
          if (isTaskTab(value)) {
            onTabChange(value)
          }
        },
        items: TABS.map((key) => ({
          value: key,
          label: labels[key],
          count: byTab(key).length,
          data: { 'data-home-tab': key }
        }))
      }}
      action={
        <Button type="button" variant="ghost-muted" size="xs" onClick={onOpenTaskList}>
          {t('home.tasks.openList', 'Task list')}
        </Button>
      }
    >
      <TabsContent value={tab}>
        <ul className="mx-4">
          {shown.map((task) => {
            const waiting = task.who === 'waiting'
            // Every row opens its 업무 in the panel beside the board, where what it asks of me is answered.
            const go = (): void => onOpenTask(task.id)
            return (
              <HomeRow
                key={task.id}
                data-home-task={task.id}
                icon={<HomeStateIcon state={task.done ? 'done' : task.who} />}
                title={task.title}
                tip={task.whoLabel}
                chip={task.who && !task.done ? chips[task.who] : undefined}
                project={task.dayEndRecords ? undefined : projects[task.project]}
                date={task.dueLabel}
                dateAlert={task.due === 'overdue' && !task.done}
                onClick={go}
                action={
                  // One width for every row's slot, so the date column stays on one line.
                  <span className="flex w-[104px] justify-end">
                    {waiting ? (
                      <Button type="button" variant="outline" size="xs" onClick={go}>
                        {t('home.tasks.answer', 'Answer')}
                      </Button>
                    ) : startable(task) ? (
                      // Shown on the row's hover or focus only (R3); its slot stays, so dates keep their column.
                      <span className="flex opacity-0 group-focus-within/home-row:opacity-100 group-hover/home-row:opacity-100 pointer-coarse:opacity-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          data-home-task-start=""
                          onClick={() => onStart(task)}
                        >
                          {t('taskLoop.detail.start', 'Start with an agent')}
                        </Button>
                      </span>
                    ) : null}
                  </span>
                }
              />
            )
          })}
        </ul>
      </TabsContent>
    </HomeCard>
  )
}
