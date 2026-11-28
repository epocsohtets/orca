import { describe, expect, it, vi } from 'vitest'

vi.mock('@/store', () => ({ useAppStore: {} }))
vi.mock('@/lib/workspace/activation/worktree-activation', () => ({}))
vi.mock('@/lib/bot-group-catalog', () => ({}))
vi.mock('sonner', () => ({ toast: {} }))

import { taskIdOfRoom, taskIdOfWorkspace, taskRoomId } from './work-task-workspace'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'

describe('a task and its workspace', () => {
  it('a room tab names its task; a bot group room names none', () => {
    expect(taskIdOfRoom(taskRoomId('report'))).toBe('report')
    expect(taskIdOfRoom('group-1')).toBeNull()
  })

  it('only the workspace made for a task is that task', () => {
    const loops = { report: { workspaceId: 'w1' }, notStarted: {} }
    expect(taskIdOfWorkspace(loops, folderWorkspaceKey('w1'))).toBe('report')
    expect(taskIdOfWorkspace(loops, folderWorkspaceKey('w2'))).toBeNull()
    expect(taskIdOfWorkspace(loops, null)).toBeNull()
  })
})
