import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { selectFolderWorkspaces } from '@/store/workspaces/catalog/workspace-record-fields'
import { activateAndRevealFolderWorkspaceWithOutcome } from '@/lib/workspace/activation/worktree-activation'
import { openRoomTab } from '@/lib/bot-group-catalog'
import { useHomeBoardStore } from '@/components/home/home-board-store'
import { homeLoopQuestionAt } from '@/components/home/home-task-loop'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../shared/execution-host/execution-host'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'

// shortcut: a task's conversation is a room tab (Orca's chat tab with no provider session behind it), because
// the task's agent is scripted; open a structured agent session in the workspace when a real agent takes tasks.
const TASK_ROOM_PREFIX = 'work-task:'

export function taskRoomId(taskId: string): string {
  return `${TASK_ROOM_PREFIX}${taskId}`
}

/** The task a room tab holds; null for a bot group's room. */
export function taskIdOfRoom(roomId: string): string | null {
  return roomId.startsWith(TASK_ROOM_PREFIX) ? roomId.slice(TASK_ROOM_PREFIX.length) : null
}

/** The task whose workspace this is; null for every other workspace. */
export function taskIdOfWorkspace(
  loops: Record<string, { workspaceId?: string }>,
  workspaceKey: string | null
): string | null {
  if (!workspaceKey) {
    return null
  }
  return (
    Object.keys(loops).find(
      (taskId) =>
        loops[taskId].workspaceId !== undefined &&
        folderWorkspaceKey(loops[taskId].workspaceId) === workspaceKey
    ) ?? null
  )
}

const creating = new Map<string, Promise<string | null>>()

async function createTaskWorkspace(taskId: string, title: string): Promise<string | null> {
  const root = useAppStore.getState().settings?.workspaceDir
  if (!root) {
    return null
  }
  const name = title.replace(/[\\/:*?"<>|]/g, ' ').trim()
  const folder = `${root}${root.includes('\\') ? '\\' : '/'}${name}`
  // An existing folder of that name is the task's folder from an earlier start.
  await window.api.fs.createDir({ dirPath: folder }).catch(() => undefined)
  const store = useAppStore.getState()
  await store.fetchFolderWorkspaces({ runtimeEnvironmentId: null })
  // The folder's workspace from an earlier start is the task's workspace again.
  let workspace = selectFolderWorkspaces(useAppStore.getState()).find(
    (entry) => entry.folderPath === folder && !entry.connectionId
  )
  if (!workspace) {
    // shortcut: the group that holds every task's workspace is found by its name; give it an id in settings
    // when the group can be renamed by the person.
    const groupName = translate('appRail.work', 'Work')
    const group =
      useAppStore
        .getState()
        .projectGroups.find(
          (entry) => entry.name === groupName && !entry.parentGroupId && !entry.connectionId
        ) ?? (await store.createProjectGroup(groupName, LOCAL_EXECUTION_HOST_ID))
    if (!group) {
      return null
    }
    const created = await store.createFolderWorkspace(
      { projectGroupId: group.id, name: title, folderPath: folder },
      { runtimeEnvironmentId: null }
    )
    workspace = created?.folderWorkspace
  }
  if (!workspace) {
    return null
  }
  const workspaceId = workspace.id
  useHomeBoardStore.setState((state) => {
    const loop = state.loops[taskId]
    return loop ? { loops: { ...state.loops, [taskId]: { ...loop, folder, workspaceId } } } : state
  })
  return workspaceId
}

/** A workspace per task, in a folder under the work folder location, made without asking. */
export function ensureTaskWorkspace(taskId: string, title: string): Promise<string | null> {
  const known = useHomeBoardStore.getState().loops[taskId]?.workspaceId
  if (known) {
    return Promise.resolve(known)
  }
  let pending = creating.get(taskId)
  if (!pending) {
    pending = createTaskWorkspace(taskId, title)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : String(error))
        return null
      })
      .finally(() => creating.delete(taskId))
    creating.set(taskId, pending)
  }
  return pending
}

/**
 * Opens a started task's workspace on its conversation, with the task in the right sidebar. False when the
 * task has no workspace: it then opens beside the board.
 */
export async function openTaskWorkspace(taskId: string): Promise<boolean> {
  const workspaceId =
    useHomeBoardStore.getState().loops[taskId]?.workspaceId ?? (await creating.get(taskId)) ?? null
  if (!workspaceId) {
    return false
  }
  const outcome = activateAndRevealFolderWorkspaceWithOutcome(workspaceId, {
    // The conversation is the workspace's surface: no terminal is made for it.
    providesInitialSurface: true
  })
  if ('refused' in outcome) {
    return false
  }
  const state = useAppStore.getState()
  // The conversation carries the workspace's name, which is the task's title.
  const label = selectFolderWorkspaces(state).find((entry) => entry.id === workspaceId)?.name ?? ''
  openRoomTab(folderWorkspaceKey(workspaceId), LOCAL_EXECUTION_HOST_ID, taskRoomId(taskId), label)
  state.setRightSidebarTab('bot-activity')
  state.setRightSidebarOpen(true)
  return true
}

export function useTaskIdOfWorkspace(workspaceKey: string | null): string | null {
  return useHomeBoardStore((state) => taskIdOfWorkspace(state.loops, workspaceKey))
}

/** Whether the task's agent waits on my answer now: the count on the sidebar's task tab. */
export function useTaskAsksMe(taskId: string | null): boolean {
  const loop = useHomeBoardStore((state) => (taskId ? state.loops[taskId] : undefined))
  const askAt = loop && !loop.answer ? homeLoopQuestionAt(loop) : null
  const [asked, setAsked] = useState(false)
  useEffect(() => {
    if (askAt === null) {
      setAsked(false)
      return
    }
    const timer = setTimeout(() => setAsked(true), Math.max(0, askAt - Date.now()))
    return () => clearTimeout(timer)
  }, [askAt])
  return asked && askAt !== null
}
