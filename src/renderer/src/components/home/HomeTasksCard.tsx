import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import { HOME_ROW_DETAIL_CLASS, HomeCard, HomeRow, HomeStateIcon } from './HomeCard'
import {
  homeTaskTab,
  sortHomeTasks,
  type HomeProjectId,
  type HomeTask,
  type HomeTaskTab
} from './home-board'
import type { HomeProject } from './home-board-mock'
import { MeetingAnswerMenu } from '@/components/meetings/MeetingAnswerMenu'

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
            // Only a meeting's offer opens in place; a task's row goes to its conversation.
            const offer = task.meetingId !== undefined
            // A meeting's row with nothing to answer here goes to the meeting.
            const toMeeting = offer && !task.question ? task.meetingId : undefined
            const open = openId === task.id && waiting && offer && !toMeeting
            const go = (): void =>
              toMeeting
                ? onOpenMeeting(toMeeting)
                : offer
                  ? onOpenChange(open ? null : task.id)
                  : onOpenTask(task.id)
            return (
              <React.Fragment key={task.id}>
                <HomeRow
                  data-home-task={task.id}
                  icon={<HomeStateIcon state={task.done ? 'done' : task.who} />}
                  title={task.title}
                  tip={task.whoLabel}
                  chip={task.who && !task.done ? chips[task.who] : undefined}
                  project={projects[task.project]}
                  date={task.dueLabel}
                  dateAlert={task.due === 'overdue' && !task.done}
                  expanded={offer && !toMeeting ? open : undefined}
                  onClick={go}
                  action={
                    // One width for every row's slot, so the date column stays on one line.
                    <span className="flex w-[104px] justify-end">
                      {waiting && task.invitation && task.meetingId ? (
                        <MeetingAnswerMenu meetingId={task.meetingId} />
                      ) : waiting ? (
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
                {open ? (
                  <li className={`-mx-4 ${HOME_ROW_DETAIL_CLASS}`}>
                    <p className="text-xs text-foreground">{task.detail}</p>
                    {task.question && task.choices ? (
                      <div role="group" aria-label={task.question} className="flex flex-col gap-2">
                        <p className="text-[13px] text-foreground">{task.question}</p>
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
                  </li>
                ) : null}
              </React.Fragment>
            )
          })}
        </ul>
      </TabsContent>
    </HomeCard>
  )
}
