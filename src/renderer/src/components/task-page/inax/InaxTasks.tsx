import React, { useEffect } from 'react'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { signInInaxMock, useInaxMockAccount } from '@/lib/inax-mock-account'
import { useHomeBoard } from '@/components/home/use-home-board'
import { useHomeBoardStore } from '@/components/home/home-board-store'
import {
  answerHomeLoop,
  decideHomeLoop,
  finishHomeTask,
  sayHomeLoop,
  startHomeLoop
} from '@/components/home/home-board-actions'
import type { HomeAgent, HomeTask } from '@/components/home/home-board'
import type { HomeTaskLoop } from '@/components/home/home-task-loop'
import {
  buildHomeLoopScript,
  buildHomeLoopTranscript
} from '@/components/home/home-task-loop-script'
import type { NativeChatMessage } from '../../../../../shared/native-chat/native-chat-types'
import { TaskPageInaxList } from './List'
import { TaskPageInaxTaskDetail } from './TaskDetail'
import { TaskPageInaxConversation, type InaxConversationCard } from './TaskConversation'
import { useInaxSourceSelection } from './inax-source-selection'

/** A sample agent's side of its task: the last lines it said, and my answer if I gave one. */
function sampleTranscript(
  task: HomeTask,
  agent: HomeAgent | undefined,
  answer: string | undefined
): NativeChatMessage[] {
  const lines = agent?.lines.length ? agent.lines : [task.detail]
  const rows = lines.map((text, index): NativeChatMessage => ({
    id: `sample-${index}`,
    role: 'assistant',
    source: 'transcript',
    // The sample says what was said, not when.
    timestamp: null,
    blocks: [{ type: 'text', text }]
  }))
  return answer
    ? [
        ...rows,
        {
          id: 'sample-answer',
          role: 'user',
          source: 'transcript',
          timestamp: null,
          blocks: [{ type: 'text', text: answer }]
        }
      ]
    : rows
}

function loopCard(t: Translate, task: HomeTask, loop: HomeTaskLoop): InaxConversationCard | null {
  if (task.loop === 'question') {
    const script = buildHomeLoopScript(t, task, loop)
    return { kind: 'question', question: script.question, choices: script.choices }
  }
  // The board already decided whether a proposal waits: a task with nothing prepared has none at the end.
  return task.proposal && task.proposalStep
    ? {
        kind: 'proposal',
        step: task.proposalStep,
        proposal: task.proposal,
        basis: task.proposalBasis ?? []
      }
    : null
}

/** Tasks on inAX: sign in where I stand, then my list, a task's page, and its conversation. */
export function TaskPageInax(): React.JSX.Element {
  const t = useTranslate()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  const { taskId, view: screen } = useInaxSourceSelection()
  const { board, view, projects, now } = useHomeBoard()
  const show = (next: string | null, as: 'detail' | 'chat' = 'detail'): void =>
    useInaxSourceSelection.setState({ taskId: next, view: as })
  const openTaskGone =
    signedIn &&
    taskId !== null &&
    ![...view.tasks, ...view.otherTasks].some((entry) => entry.id === taskId)
  useEffect(() => {
    // An answered offer leaves the list; its page goes with it.
    if (openTaskGone) {
      useInaxSourceSelection.setState({ taskId: null, view: 'detail' })
    }
  }, [openTaskGone])

  if (!signedIn) {
    return (
      <div
        className="mt-3 flex flex-col items-center gap-3 rounded-md border border-border bg-background px-4 py-12 shadow-sm"
        data-task-list="inax-signed-out"
      >
        <p className="max-w-md text-center text-sm text-foreground">
          {t('taskLoop.gate.line', 'Sign in to inAX and your tasks appear here.')}
        </p>
        <Button type="button" size="sm" data-inax-sign-in="" onClick={signInInaxMock}>
          {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
        </Button>
      </div>
    )
  }

  // The same rows as Home's My work, a meeting's offer included, so the two counts agree.
  const { tasks } = view
  // What a meeting waits on me for is answered on Home; it has no page of its own.
  const task = [...tasks, ...view.otherTasks].find(
    (entry) => entry.id === taskId && !entry.meetingId
  )
  if (!task) {
    return (
      <TaskPageInaxList tasks={tasks} projects={projects} onOpen={(id) => show(id, 'detail')} />
    )
  }
  const project = projects[task.project]
  if (screen !== 'chat') {
    return (
      <div className="mt-3 min-h-0 flex-1">
        <TaskPageInaxTaskDetail
          task={task}
          project={project}
          onBack={() => show(null)}
          onStart={() => {
            startHomeLoop(task.id)
            show(task.id, 'chat')
          }}
          onOpenChat={() => show(task.id, 'chat')}
          onFinish={() => finishHomeTask(task.id)}
        />
      </div>
    )
  }

  const loop = board.loops[task.id]
  const agent = view.agents.find((entry) => entry.taskId === task.id)
  const sampleAnswer = task.choices?.find((choice) => choice.id === board.answers[task.id])?.label
  return (
    <div className="mt-3 min-h-0 flex-1">
      <TaskPageInaxConversation
        task={task}
        agentName={agent?.name ?? t('taskLoop.agent.name', 'Task agent')}
        project={project.name}
        messages={
          loop
            ? buildHomeLoopTranscript(t, task, loop, now)
            : sampleTranscript(task, agent, sampleAnswer)
        }
        working={task.loop === 'working'}
        card={
          loop
            ? loopCard(t, task, loop)
            : task.question && task.choices
              ? { kind: 'question', question: task.question, choices: task.choices }
              : null
        }
        onBack={() => show(task.id, 'detail')}
        onAnswer={(choiceId) =>
          loop
            ? answerHomeLoop(task.id, choiceId)
            : useHomeBoardStore.setState((state) => ({
                answers: { ...state.answers, [task.id]: choiceId }
              }))
        }
        onDecide={(step, proposal) => decideHomeLoop(task.id, step, proposal, project.name)}
        onSay={loop ? (text) => sayHomeLoop(task.id, text) : undefined}
      />
    </div>
  )
}
