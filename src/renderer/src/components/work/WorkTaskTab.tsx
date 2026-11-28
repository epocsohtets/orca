import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { useHomeBoard } from '@/components/home/use-home-board'
import { commentHomeTask } from '@/components/home/home-board-actions'
import { WorkTaskChat } from './WorkTaskChat'

/** The content of a task's chat tab in its workspace. */
export function WorkTaskTab({
  taskId,
  isVisible,
  isFocusedGroup
}: {
  taskId: string
  isVisible: boolean
  isFocusedGroup: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const { board, view, now } = useHomeBoard()
  const task = view.boardTasks.find((entry) => entry.id === taskId)
  const loop = board.loops[taskId]
  // "Start over" in the sample takes the conversation away; the tab then shows nothing.
  if (!task || !loop) {
    return null
  }
  return (
    <WorkTaskChat
      task={task}
      loop={loop}
      agentName={t('taskLoop.agent.name', 'Task agent')}
      now={now}
      isVisible={isVisible}
      isFocusedGroup={isFocusedGroup}
      onOpenQuestion={() => {
        const state = useAppStore.getState()
        state.setRightSidebarTab('bot-activity')
        state.setRightSidebarOpen(true)
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>('[data-work-task-ask] [role="radio"]')?.focus()
        )
      }}
      onSay={(text) => void commentHomeTask(taskId, text)}
    />
  )
}
