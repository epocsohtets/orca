import type { InaxMockTask } from '@/components/task-page/inax/inax-mock-tasks'

// shortcut: the mock inAX account has no assignee identity, so "me" is a fixed name; read it from the account when inAX auth exists.
export const HOME_MOCK_ME = 'Mako'

/** Tasks assigned to `me`: unfinished first, then the most recently updated. */
export function selectMyWork(tasks: readonly InaxMockTask[], me: string): InaxMockTask[] {
  return tasks
    .filter((task) => task.assignee === me)
    .sort(
      (a, b) =>
        Number(a.status === 'done') - Number(b.status === 'done') ||
        b.updatedAt.localeCompare(a.updatedAt)
    )
}
