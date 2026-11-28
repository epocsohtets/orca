import React from 'react'
import { useAppStore } from '@/store'
import { useHomeBoard } from '@/components/home/use-home-board'
import { HomeTaskItem } from '@/components/home/HomeItemsPanel'
import { useTaskIdOfWorkspace } from './work-task-workspace'

/** The task of the open workspace, as its item, in the right sidebar beside its conversation. */
export default function WorkTaskSidebarPanel(): React.JSX.Element | null {
  const taskId = useTaskIdOfWorkspace(useAppStore((state) => state.activeWorkspaceKey))
  const { view } = useHomeBoard()
  if (!view.boardTasks.some((entry) => entry.id === taskId) || !taskId) {
    return null
  }
  // The sidebar gives the width and the edge.
  return <HomeTaskItem taskId={taskId} className="min-h-0 w-full flex-1 border-l-0" />
}
