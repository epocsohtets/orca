import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  HOME_META_CLASS,
  HOME_ROW_BUTTON_CLASS,
  HOME_ROW_DETAIL_CLASS,
  HomeCard,
  HomeProjectDot,
  HomeWhoMarker
} from './HomeCard'
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

/** My work: what is mine today, with who has each task right now. A waiting row answers in place. */
export function HomeTasksCard({
  tasks,
  projects,
  tab,
  onTabChange,
  openId,
  onOpenChange,
  onAnswer,
  onStart,
  onOpenTask,
  onOpenMeeting,
  onOpenTaskList
}: {
  tasks: readonly HomeTask[]
  projects: Record<HomeProjectId, HomeProject>
  tab: HomeTaskTab
  onTabChange: (tab: HomeTaskTab) => void
  openId: string | null
  onOpenChange: (id: string | null) => void
  onAnswer: (taskId: string, choiceId: string) => void
  /** Hands a task of mine that is not started to an agent. */
  onStart: (task: HomeTask) => void
  /** Opens the task's conversation, with the task and any question of its agent beside it. */
  onOpenTask: (taskId: string) => void
  /** Opens the meeting a waiting row is about. */
  onOpenMeeting: (meetingId: string) => void
  onOpenTaskList: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const labels: Record<HomeTaskTab, string> = {
    today: t('home.tasks.today', 'Remaining'),
    waiting: t('home.tasks.waiting', 'Needs me'),
    late: t('home.tasks.late', 'Late'),
    done: t('home.tasks.done', 'Done')
  }
  const empty: Record<HomeTaskTab, string> = {
    today: t('home.tasks.emptyToday', 'No tasks remain. Add a new task or hand one to an agent.'),
    waiting: t('home.tasks.emptyWaiting', 'Nothing is waiting for you.'),
    late: t('home.tasks.emptyLate', 'Nothing is late or blocked.'),
    done: t('home.tasks.emptyDone', 'Tasks you finish collect here.')
  }
  const byTab = (key: HomeTaskTab): HomeTask[] =>
    sortHomeTasks(tasks.filter((task) => homeTaskTab(task).includes(key)))
  const shown = byTab(tab)
  const startable = (task: HomeTask): boolean =>
    task.who === null && !task.done && !task.assignee && !task.meetingId && task.status === 'todo'
  // One trailing slot for every row keeps the due column in line when only some rows have a button.
  const anyAction = shown.some((task) => task.who === 'waiting' || startable(task))

  return (
    <HomeCard title={t('home.tasks.title', 'My work')} data-home-card="tasks">
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isTaskTab(value)) {
            onTabChange(value)
          }
        }}
      >
        <div className="px-4 pb-2">
          <TabsList aria-label={t('home.tasks.title', 'My work')}>
            {TABS.map((key) => (
              <TabsTrigger key={key} value={key} data-home-tab={key}>
                {labels[key]}
                <span className="tabular-nums">{byTab(key).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value={tab}>
          {shown.length === 0 ? (
            <p className={`px-4 py-3 ${HOME_META_CLASS}`}>{empty[tab]}</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {shown.map((task) => {
                const waiting = task.who === 'waiting'
                // Only a meeting's offer opens in place; a task's row goes to its conversation.
                const offer = task.meetingId !== undefined
                // A meeting's row with nothing to answer here goes to the meeting.
                const toMeeting = offer && !task.question ? task.meetingId : undefined
                const open = openId === task.id && waiting && offer && !toMeeting
                return (
                  <li key={task.id} data-home-task={task.id}>
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        aria-expanded={offer && !toMeeting ? open : undefined}
                        className={`${HOME_ROW_BUTTON_CLASS} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 @min-[40rem]/home-card:grid-cols-[minmax(0,1fr)_9rem_8rem]`}
                        onClick={() =>
                          toMeeting
                            ? onOpenMeeting(toMeeting)
                            : offer
                              ? onOpenChange(open ? null : task.id)
                              : onOpenTask(task.id)
                        }
                      >
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="line-clamp-2 text-[13px] font-medium text-foreground">
                            {task.title}
                          </span>
                          {task.who && task.whoLabel ? (
                            <HomeWhoMarker who={task.who} label={task.whoLabel} />
                          ) : null}
                        </span>
                        <span className="min-w-0 @max-[40rem]/home-card:hidden">
                          <HomeProjectDot project={projects[task.project]} />
                        </span>
                        <span
                          className={`text-right text-xs ${task.due === 'overdue' && !task.done ? 'text-destructive' : 'text-muted-foreground'}`}
                        >
                          {task.dueLabel}
                        </span>
                      </button>
                      {anyAction ? (
                        <div className="flex w-32 shrink-0 items-center justify-end pr-4">
                          {waiting && !open ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() =>
                                toMeeting
                                  ? onOpenMeeting(toMeeting)
                                  : offer
                                    ? onOpenChange(task.id)
                                    : onOpenTask(task.id)
                              }
                            >
                              {toMeeting
                                ? t('home.tasks.open', 'Open')
                                : t('home.tasks.answer', 'Answer')}
                            </Button>
                          ) : startable(task) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              data-home-task-start=""
                              onClick={() => onStart(task)}
                            >
                              {t('taskLoop.detail.start', 'Start with an agent')}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {open ? (
                      <div className={HOME_ROW_DETAIL_CLASS}>
                        <p className="text-xs text-foreground">{task.detail}</p>
                        {task.question && task.choices ? (
                          <div
                            role="group"
                            aria-label={task.question}
                            className="flex flex-col gap-2"
                          >
                            <p className="text-[13px] font-medium text-foreground">
                              {task.question}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {task.choices.map((choice) => (
                                <Button
                                  key={choice.id}
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  onClick={() => onAnswer(task.id, choice.id)}
                                >
                                  {choice.label}
                                </Button>
                              ))}
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => task.meetingId && onOpenMeeting(task.meetingId)}
                              >
                                {t('home.tasks.openMinutes', 'Open the minutes')}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="border-t border-border px-2 py-1">
            <Button type="button" variant="ghost-muted" size="xs" onClick={onOpenTaskList}>
              {t('home.tasks.openList', 'Open the task list')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </HomeCard>
  )
}
