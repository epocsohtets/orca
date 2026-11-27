import { describe, expect, it } from 'vitest'
import type { InaxMockTask } from '@/components/task-page/inax/inax-mock-tasks'
import { selectMyWork } from './home-my-work'

const task = (
  id: string,
  assignee: string | null,
  status: InaxMockTask['status'],
  updatedAt: string
): InaxMockTask => ({
  id,
  title: id,
  project: 'p',
  author: 'a',
  labels: [],
  assignee,
  status,
  updatedAt
})

describe('selectMyWork', () => {
  it('keeps only my tasks, unfinished first, newest first', () => {
    const mine = selectMyWork(
      [
        task('done-new', 'Mako', 'done', '2026-01-05T00:00:00.000Z'),
        task('other', 'Jiwoo Han', 'inProgress', '2026-01-06T00:00:00.000Z'),
        task('open-old', 'Mako', 'open', '2026-01-01T00:00:00.000Z'),
        task('unassigned', null, 'open', '2026-01-07T00:00:00.000Z'),
        task('progress-new', 'Mako', 'inProgress', '2026-01-03T00:00:00.000Z')
      ],
      'Mako'
    )
    expect(mine.map((entry) => entry.id)).toEqual(['progress-new', 'open-old', 'done-new'])
  })
})
