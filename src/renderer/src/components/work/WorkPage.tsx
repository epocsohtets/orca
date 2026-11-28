import React, { useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { RailPage } from '@/components/rail-page/RailPage'
import { RailPageBand } from '@/components/rail-page/RailPageHeader'
import { DemoMenu } from '@/components/task-page/inax/InaxDemoNote'
import { useInaxSourceSelection } from '@/components/task-page/inax/inax-source-selection'
import { MeetingViewerRadioGroup } from '@/components/meetings/MeetingViewerMenu'
import { MAKO } from '@/components/meetings/meeting-people'
import { signInInaxMock } from '@/lib/inax-mock-account'
import { useHomeBoard } from '@/components/home/use-home-board'
import { resetHomeBoard, useHomeBoardStore } from '@/components/home/home-board-store'
import {
  answerHomeLoop,
  sayHomeLoop,
  setHomeTaskStatus,
  startHomeLoop
} from '@/components/home/home-board-actions'
import type { HomeAgent, HomeTask } from '@/components/home/home-board'
import type { NativeChatMessage } from '../../../../shared/native-chat/native-chat-types'
import { WorkBoard } from './WorkBoard'
import { WorkTaskChat } from './WorkTaskChat'
import { WorkTaskPanel } from './WorkTaskPanel'

/** A sample agent's side of its task: the last lines it said, and my answer if I gave one. */
function sampleTranscript(
  agent: HomeAgent | undefined,
  answer: string | undefined
): NativeChatMessage[] {
  const lines = agent?.lines.length ? agent.lines : []
  const row = (id: string, role: NativeChatMessage['role'], text: string): NativeChatMessage => ({
    id,
    role,
    source: 'transcript',
    // The sample says what was said, not when.
    timestamp: null,
    blocks: [{ type: 'text', text }]
  })
  return [
    ...lines.map((text, index) => row(`sample-${index}`, 'assistant', text)),
    ...(answer ? [row('sample-answer', 'user', answer)] : [])
  ]
}

/**
 * Work: the board of my tasks, and one task's conversation with its panel. Opening a task opens its
 * conversation; there is no other page for a task.
 */
export function WorkSurface(): React.JSX.Element {
  const t = useTranslate()
  const taskId = useInaxSourceSelection((state) => state.taskId)
  const { board, view, viewerId, projects, signedIn, now } = useHomeBoard()
  const own = viewerId === MAKO
  const open = (next: string | null): void => useInaxSourceSelection.setState({ taskId: next })
  const task = view.boardTasks.find((entry) => entry.id === taskId)
  useEffect(() => {
    if (taskId !== null && !task && signedIn) {
      useInaxSourceSelection.setState({ taskId: null })
    }
  }, [taskId, task, signedIn])
  const title = t('appRail.work', 'Work')
  const demo = (
    <DemoMenu>
      <MeetingViewerRadioGroup />
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={resetHomeBoard}>
        {t('home.preview.reset', 'Start over')}
      </DropdownMenuItem>
    </DemoMenu>
  )
  const start = (target: HomeTask): void => {
    startHomeLoop(target.id, target.title, target.status)
    open(target.id)
  }

  if (!signedIn) {
    return (
      <>
        <RailPageBand>
          <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
        </RailPageBand>
        <div className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-foreground">
            {t('taskLoop.gate.line', 'Sign in to inAX and your tasks appear here.')}
          </p>
          <Button type="button" size="sm" data-inax-sign-in="" onClick={signInInaxMock}>
            {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
          </Button>
        </div>
      </>
    )
  }

  const loop = task ? board.loops[task.id] : undefined
  const agent = task ? view.agents.find((entry) => entry.taskId === task.id) : undefined
  const sampleAnswer = task?.choices?.find((choice) => choice.id === board.answers[task.id])?.label
  const sample = task ? sampleTranscript(agent, sampleAnswer) : []
  const hasChat = own && task !== undefined && (loop !== undefined || sample.length > 0)
  const panel = task ? (
    <WorkTaskPanel
      // One task's typed answer never shows on the next.
      key={task.id}
      task={task}
      project={projects[task.project]}
      readOnly={!own}
      onStatus={(status) => setHomeTaskStatus(task.id, status, task.title)}
      onAnswer={(choiceId, text) =>
        loop
          ? answerHomeLoop(task.id, choiceId, text)
          : choiceId &&
            useHomeBoardStore.setState((state) => ({
              answers: { ...state.answers, [task.id]: choiceId }
            }))
      }
      onStart={own && !loop && !task.who && !task.done ? () => start(task) : undefined}
    />
  ) : null

  return (
    <>
      <RailPageBand data-work-page={task ? 'task' : 'board'}>
        {task && hasChat ? (
          <Button
            type="button"
            variant="ghost-muted"
            size="xs"
            className="-ml-2"
            data-work-back=""
            onClick={() => open(null)}
          >
            <ChevronLeft className="size-3.5" />
            {title}
          </Button>
        ) : null}
        <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight">
          {task && hasChat ? task.title : title}
        </h1>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {task && hasChat ? '' : 'inAX'}
        </span>
        {demo}
      </RailPageBand>
      <div className="flex min-h-0 flex-1">
        {task && hasChat ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-chat-pane">
            <WorkTaskChat
              key={task.id}
              task={task}
              loop={loop}
              sample={sample}
              agentName={agent?.name ?? t('taskLoop.agent.name', 'Task agent')}
              now={now}
              onOpenQuestion={() =>
                document.querySelector<HTMLElement>('[data-work-task-ask] [role="radio"]')?.focus()
              }
              onSay={(text) => sayHomeLoop(task.id, text)}
            />
          </div>
        ) : (
          <WorkBoard
            tasks={view.boardTasks}
            projects={projects}
            readOnly={!own}
            openId={task?.id ?? null}
            onOpen={open}
            onMove={(id, status) =>
              setHomeTaskStatus(id, status, view.boardTasks.find((entry) => entry.id === id)?.title)
            }
            onStart={start}
          />
        )}
        {panel}
      </div>
    </>
  )
}

export default function WorkPage(): React.JSX.Element {
  const t = useTranslate()
  return (
    <RailPage as="main" aria-label={t('appRail.work', 'Work')}>
      <WorkSurface />
    </RailPage>
  )
}
