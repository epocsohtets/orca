import { describe, expect, it } from 'vitest'
import type { Translate } from '@/i18n/use-translate'
import type { HomeTask } from './home-board'
import { buildHomeLoopScript } from './home-task-loop-script'

const t: Translate = (_key, fallback, options) =>
  fallback.replace(/{{(\w+)}}/g, (_match, name: string) => String(options?.[name] ?? ''))

const REPORT: HomeTask = {
  id: 'report',
  title: 'Share the report',
  project: 'campaign',
  due: 'overdue',
  dueLabel: 'Due Wednesday',
  done: false,
  who: null,
  detail: ''
}
const loop = (choiceId: string, said: string[] = []) => ({
  startedAt: 1,
  answer: { choiceId, at: 2 },
  said: said.map((text) => ({ at: 3, text, reply: 'repropose' as const }))
})

describe('the scripted agent', () => {
  it('writes the draft and the note for the answer I gave', () => {
    const one = buildHomeLoopScript(t, REPORT, loop('a'))
    const team = buildHomeLoopScript(t, REPORT, loop('b'))
    expect(one.draft).toContain('Jiwoo, here is')
    expect(one.draft).not.toContain('Summary')
    expect(team.draft).toContain('Campaign team, here is')
    expect(team.draft).toContain('Summary')
    expect(team.note).toContain('whole campaign team')
    expect(one.note).not.toBe(team.note)
  })

  it('carries what I asked for after "not yet" into the next proposed note, and nothing else', () => {
    const base = buildHomeLoopScript(t, REPORT, loop('b'))
    const asked = buildHomeLoopScript(t, REPORT, loop('b', ['Mention the budget first']))
    expect(asked.note).toBe(`${base.note}\nYou asked for: “Mention the budget first”`)
    expect(asked.draft).toBe(base.draft)
  })
})
