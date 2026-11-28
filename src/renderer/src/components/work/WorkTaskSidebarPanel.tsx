import React from 'react'
import { useAppStore } from '@/store'
import { useHomeBoard } from '@/components/home/use-home-board'
import { answerHomeLoop, setHomeTaskStatus } from '@/components/home/home-board-actions'
import { WorkTaskPanel } from './WorkTaskPanel'
import { useTaskIdOfWorkspace } from './work-task-workspace'

/** The task of the open workspace, in the right sidebar beside its conversation. */
export default function WorkTaskSidebarPanel(): React.JSX.Element | null {
  const taskId = useTaskIdOfWorkspace(useAppStore((state) => state.activeWorkspaceKey))
  const { view, projects } = useHomeBoard()
  const task = view.boardTasks.find((entry) => entry.id === taskId)
  if (!task) {
    return null
  }
  return (
    <WorkTaskPanel
      // One task's typed answer never shows on the next.
      key={task.id}
      task={task}
      project={projects[task.project]}
      // The sidebar gives the width and the edge.
      className="min-h-0 w-full flex-1 border-l-0"
      onStatus={(status) => setHomeTaskStatus(task.id, status, task.title)}
      onAnswer={(choiceId, text) => answerHomeLoop(task.id, choiceId, text)}
    />
  )
}
