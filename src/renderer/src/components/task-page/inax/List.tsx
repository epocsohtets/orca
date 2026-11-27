import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  HOME_META_CLASS,
  HOME_ROW_BUTTON_CLASS,
  HomeProjectDot,
  HomeWhoMarker
} from '@/components/home/HomeCard'
import {
  homeTaskTab,
  sortHomeTasks,
  type HomeProjectId,
  type HomeTask,
  type HomeTaskTab
} from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { InaxStatusBadge } from './inax-status-badge'

const TABS: HomeTaskTab[] = ['today', 'waiting', 'late', 'done']

/** My inAX tasks, with the same tabs and the same rows as Home's My work. A row opens its task. */
export function TaskPageInaxList({
  tasks,
  projects,
  onOpen
}: {
  tasks: readonly HomeTask[]
  projects: Record<HomeProjectId, HomeProject>
  onOpen: (taskId: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [tab, setTab] = useState<HomeTaskTab>('today')
  const labels: Record<HomeTaskTab, string> = {
    today: t('home.tasks.today', 'Open'),
    waiting: t('home.tasks.waiting', 'Needs me'),
    late: t('home.tasks.late', 'Late'),
    done: t('home.tasks.done', 'Done')
  }
  const empty: Record<HomeTaskTab, string> = {
    today: t('home.tasks.emptyToday', 'No open tasks.'),
    waiting: t('home.tasks.emptyWaiting', 'Nothing is waiting for you.'),
    late: t('home.tasks.emptyLate', 'Nothing is late or blocked.'),
    done: t('home.tasks.emptyDone', 'Nothing finished yet.')
  }
  const byTab = (key: HomeTaskTab): HomeTask[] =>
    sortHomeTasks(tasks.filter((task) => homeTaskTab(task).includes(key)))
  const shown = byTab(tab)

  return (
    <section
      aria-label={t('home.tasks.title', 'My work')}
      className="@container/home-card mt-3 flex min-h-0 max-h-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm"
      data-task-list="inax"
    >
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(TABS.find((key) => key === value) ?? 'today')}
        className="min-h-0"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 pb-2">
          <h2 className="text-sm font-semibold text-foreground">
            {t('home.tasks.title', 'My work')}
          </h2>
          <TabsList aria-label={t('home.tasks.title', 'My work')}>
            {TABS.map((key) => (
              <TabsTrigger key={key} value={key} data-inax-tab={key}>
                {labels[key]}
                <span className="tabular-nums">{byTab(key).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value={tab} className="min-h-0">
          <div className="scrollbar-sleek max-h-full overflow-y-auto">
            {shown.length === 0 ? (
              <p className={`px-4 py-3 ${HOME_META_CLASS}`}>{empty[tab]}</p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {shown.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      data-inax-task={task.id}
                      className={`${HOME_ROW_BUTTON_CLASS} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 @min-[44rem]/home-card:grid-cols-[minmax(0,1fr)_10rem_8rem_6.5rem]`}
                      onClick={() => onOpen(task.id)}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="line-clamp-2 text-[13px] font-medium text-foreground">
                          {task.title}
                        </span>
                        {task.who && task.whoLabel ? (
                          <HomeWhoMarker who={task.who} label={task.whoLabel} />
                        ) : null}
                      </span>
                      <span className="min-w-0 @max-[44rem]/home-card:hidden">
                        <HomeProjectDot project={projects[task.project]} />
                      </span>
                      <span
                        className={`text-right text-xs @max-[44rem]/home-card:hidden ${task.due === 'overdue' && !task.done ? 'text-destructive' : 'text-muted-foreground'}`}
                      >
                        {task.dueLabel}
                      </span>
                      <span className="flex justify-end">
                        {task.status ? <InaxStatusBadge status={task.status} /> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
