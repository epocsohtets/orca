import type { Translate } from '@/i18n/use-translate'
import type { NativeChatMessage } from '../../../../shared/native-chat/native-chat-types'
import type { HomeChoice, HomeTask } from './home-board'
import {
  homeLoopDraftAt,
  homeLoopQuestionAt,
  type HomeTaskLoop,
  type InaxStatus
} from './home-task-loop'

// shortcut: no agent runs behind a task on this build, so the task's agent speaks from this script; replace it
// with a real agent session when one can read the task and ask through the item ask.

export type HomeLoopScript = {
  plan: string
  question: string
  choices: HomeChoice[]
  /**
   * The output for the answer I gave, as markdown. Null for a task with nothing prepared: the agent then says
   * what it does next (`next`) and proposes nothing, because it has nothing to show.
   */
  draft: string | null
  /** What the agent says after my answer when there is no draft. */
  next: string
  /** The progress note the agent writes ahead for the day-end card. */
  note: string
}

export function inaxStatusLabels(t: Translate): Record<InaxStatus, string> {
  return {
    todo: t('taskLoop.status.todo', 'To do'),
    inProgress: t('taskLoop.status.inProgress', 'In progress'),
    review: t('taskLoop.status.review', 'Review requested'),
    done: t('taskLoop.status.done', 'Done')
  }
}

/** "to <status>", worded per status so Korean gets the right particle. */
export function inaxStatusTo(t: Translate): Record<InaxStatus, string> {
  return {
    todo: t('taskLoop.statusTo.todo', 'to To do'),
    inProgress: t('taskLoop.statusTo.inProgress', 'to In progress'),
    review: t('taskLoop.statusTo.review', 'to Review requested'),
    done: t('taskLoop.statusTo.done', 'to Done')
  }
}

/** The Korean object particle for a title; empty for a title that does not end in Hangul. */
function objectParticle(title: string): string {
  const code = title.trim().charCodeAt(title.trim().length - 1) - 0xac00
  return code < 0 || code > 11171 ? '' : code % 28 === 0 ? '를' : '을'
}

/** The line a status change by my own hand leaves: in the conversation, and nowhere else. */
export function homeStatusMovedLine(t: Translate, title: string, status: InaxStatus): string {
  return t('taskLoop.chat.moved', 'Moved {{title}} {{to}}', {
    title,
    particle: objectParticle(title),
    to: inaxStatusTo(t)[status]
  })
}

/** The script for one task, as far as my answer has shaped it. */
export function buildHomeLoopScript(
  t: Translate,
  task: HomeTask,
  loop?: HomeTaskLoop
): HomeLoopScript {
  const second = loop?.answer?.choiceId === 'b'
  if (task.id === 'report') {
    const numbers = t(
      'taskLoop.script.reportNumbers',
      '- Visitors: 112% of the target\n- Sign-up conversion: 3.4% (2.9% the month before)\n- Ad spend: 96% of the budget'
    )
    return {
      plan: t(
        'taskLoop.script.reportPlan',
        'This is how I will do it.\n\n1. Collect last month’s campaign numbers: visitors, sign-up conversion, ad spend.\n2. Write the draft of the results report.\n3. Attach the draft to this conversation and to the task.'
      ),
      question: t('taskLoop.script.reportQuestion', 'Should the report include the agency’s fee?'),
      choices: [
        { id: 'a', label: t('taskLoop.script.reportA', 'Include it'), recommended: true },
        { id: 'b', label: t('taskLoop.script.reportB', 'Leave it out') }
      ],
      next: '',
      draft: `${t(
        'taskLoop.script.reportDraft',
        '**Last month’s campaign results report (draft)**\n\n**Summary**\n\nMore people visited than we aimed for, and more of them signed up. Ad spend stayed inside the budget.'
      )}\n\n${numbers}${second ? '' : `\n${t('taskLoop.script.reportAgency', '- Agency fee: 18% of ad spend')}`}`,
      note: second
        ? t(
            'taskLoop.script.reportNoteWithout',
            'Wrote the draft of last month’s campaign results report: visitors, sign-up conversion and ad spend. The agency’s fee is left out. Please review it.'
          )
        : t(
            'taskLoop.script.reportNote',
            'Wrote the draft of last month’s campaign results report: visitors, sign-up conversion, ad spend and the agency’s fee. Please review it.'
          )
    }
  }
  return {
    plan: t(
      'taskLoop.script.plan',
      'This is how I will do it.\n\n1. Read the task description.\n2. Split the task into items and put the list in this conversation.'
    ),
    question: t('taskLoop.script.question', 'Who should the list be written for?'),
    choices: [
      { id: 'a', label: t('taskLoop.script.choiceA', 'For me'), recommended: true },
      { id: 'b', label: t('taskLoop.script.choiceB', 'For the project team') }
    ],
    draft: null,
    next: second
      ? t(
          'taskLoop.script.nextTeam',
          'I am splitting the task into items now. When the list is ready I will put it in this conversation, written for the project team to read.'
        )
      : t(
          'taskLoop.script.next',
          'I am splitting the task into items now. When the list is ready I will put it in this conversation.'
        ),
    note: ''
  }
}

export const HOME_LOOP_ASKED_ROW = 'loop-asked'
export const HOME_LOOP_MOVED_ROW = 'loop-moved'
export const HOME_LOOP_ANSWER_ROW = 'loop-answer'

function message(
  id: string,
  role: NativeChatMessage['role'],
  at: number,
  text: string
): NativeChatMessage {
  return { id, role, source: 'transcript', timestamp: at, blocks: [{ type: 'text', text }] }
}

/** My answer to the question, in my words or the choice's. */
export function homeLoopAnswerText(script: HomeLoopScript, loop: HomeTaskLoop): string {
  return (
    loop.answer?.text ??
    script.choices.find((entry) => entry.id === loop.answer?.choiceId)?.label ??
    ''
  )
}

/**
 * The conversation so far: what the script has said by `now`, and what I said. The agent states its plan and
 * starts; it asks for no permission at any point. Its question and my answer to it are item rows, drawn
 * between these messages (homeLoopEventTimes).
 */
export function buildHomeLoopTranscript(
  t: Translate,
  task: HomeTask,
  loop: HomeTaskLoop,
  now: number
): NativeChatMessage[] {
  const script = buildHomeLoopScript(t, task, loop)
  const rows = [
    message(
      'loop-kickoff',
      'user',
      loop.startedAt,
      t('taskLoop.chat.kickoff', 'Please take this task: {{title}}', { title: task.title })
    ),
    message('loop-plan', 'assistant', loop.startedAt + 2, script.plan)
  ]
  const draftAt = homeLoopDraftAt(loop)
  if (draftAt !== null && now >= draftAt) {
    rows.push(message('loop-draft', 'assistant', draftAt, script.draft ?? script.next))
  }
  loop.said.forEach((said, index) => {
    rows.push(
      message(`loop-said-${index}`, 'user', said.at, said.text),
      message(
        `loop-said-reply-${index}`,
        'assistant',
        said.at + 1,
        t('taskLoop.chat.noted', 'Noted. I will apply it to what I am writing now.')
      )
    )
  })
  return rows.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
}

/** When the lines between messages fall: the status I moved at the start, and the agent's question. */
export function homeLoopEventTimes(loop: HomeTaskLoop, now: number): Record<string, number> {
  const asked = homeLoopQuestionAt(loop)
  return {
    [HOME_LOOP_MOVED_ROW]: loop.startedAt + 1,
    ...(now >= asked ? { [HOME_LOOP_ASKED_ROW]: asked } : {}),
    ...(loop.answer ? { [HOME_LOOP_ANSWER_ROW]: loop.answer.at } : {})
  }
}
