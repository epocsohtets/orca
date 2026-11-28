import { describe, expect, it } from 'vitest'
import { botItemQuestionShape } from '../../../../shared/bots/bot-item-ask'
import { homeItemAnswerWords, homeItemAnswerWrite } from './home-task-item-model'

describe('homeItemAnswerWrite', () => {
  it('saves each record line the comment answered, and leaves the rest', () => {
    const ask = {
      questions: [
        { prompt: 'Figma · 10:20', options: [{ label: 'Copy' }, { label: 'Not work' }] },
        { prompt: 'Browser · 11:00', options: [{ label: 'Copy' }, { label: 'Not work' }] }
      ]
    }
    const shape = botItemQuestionShape({ text: '', ask })
    const words = homeItemAnswerWords(shape, 'Figma · 10:20 → Not work\nBrowser · 11:00 →')
    expect(
      homeItemAnswerWrite(
        {
          kind: 'records',
          records: [{ id: 'r1' }, { id: 'r2' }],
          tasks: [{ id: 'copy', label: 'Copy' }],
          notWork: 'Not work'
        },
        words
      )
    ).toEqual({
      kind: 'records',
      save: { kind: 'records', answers: [{ recordId: 'r1', answer: 'notWork' }] }
    })
  })
})
