import type { Translate } from '@/i18n/use-translate'
import type { NativeChatMessage } from '../../../../shared/native-chat/native-chat-types'
import type { HomeChoice, HomeTask } from './home-board'
import {
  homeLoopDraftAt,
  homeLoopQuestionAt,
  type HomeTaskLoop,
  type InaxStatus
} from './home-task-loop'

// shortcut: no agent runs on this Mac's dev profile, so the task's agent speaks from this script; replace it
// with a real agent session when one can read the task and propose through inAX.

export type HomeLoopScript = {
  plan: string
  question: string
  choices: HomeChoice[]
  /** The output, as markdown. */
  draft: string
  /** The progress note the agent proposes. */
  note: string
}

export const HOME_LOOP_DRAFT_MESSAGE_ID = 'loop-draft'

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
    todo: t('taskLoop.statusTo.todo', 'to “To do”'),
    inProgress: t('taskLoop.statusTo.inProgress', 'to “In progress”'),
    review: t('taskLoop.statusTo.review', 'to “Review requested”'),
    done: t('taskLoop.statusTo.done', 'to “Done”')
  }
}

export function buildHomeLoopScript(t: Translate, task: HomeTask): HomeLoopScript {
  if (task.id === 'report') {
    return {
      plan: t(
        'taskLoop.script.reportPlan',
        'The report is already written, so I will prepare what sharing it needs.\n\n1. Pull the three key numbers out of the report.\n2. Draft the message that shares it with Kim Jiwoo.\n3. Show you the draft, then propose a status and a progress note.'
      ),
      question: t(
        'taskLoop.script.reportQuestion',
        'Who should the sharing message be written for?'
      ),
      choices: [
        { id: 'a', label: t('taskLoop.script.reportA', 'Kim Jiwoo only · short') },
        { id: 'b', label: t('taskLoop.script.reportB', 'The whole campaign team · with a summary') }
      ],
      draft: t(
        'taskLoop.script.reportDraft',
        '**Sharing message for last month’s campaign report (draft)**\n\nJiwoo, here is last month’s campaign report.\n\n- Visitors: 112% of the target\n- Sign-up conversion: 3.4% (2.9% the month before)\n- Ad spend: 96% of the budget\n\nThe details are in the report. Please send your comments by Wednesday.'
      ),
      note: t(
        'taskLoop.script.reportNote',
        'Drafted the message that shares last month’s campaign report. It carries three key numbers: visitors, sign-up conversion and ad spend. Kim Jiwoo needs to check it before it is shared.'
      )
    }
  }
  return {
    plan: t(
      'taskLoop.script.plan',
      'This is how I will do it.\n\n1. Put the task description and its earlier notes in order.\n2. Write a draft.\n3. Show you the draft, then propose a status and a progress note.'
    ),
    question: t('taskLoop.script.question', 'How long should the draft be?'),
    choices: [
      { id: 'a', label: t('taskLoop.script.choiceA', 'Short · the main points only') },
      { id: 'b', label: t('taskLoop.script.choiceB', 'Detailed · with the reasons') }
    ],
    draft: t(
      'taskLoop.script.draft',
      '**{{title}} (draft)**\n\n- What the task asks for: {{detail}}\n- What I prepared: a first draft that follows the task description.\n- What is left for you: read it and correct what is wrong.',
      { title: task.title, detail: task.detail }
    ),
    note: t(
      'taskLoop.script.note',
      'Wrote a first draft for “{{title}}”. It follows the task description. It needs a review before it is used.',
      { title: task.title }
    )
  }
}

function message(
  id: string,
  role: NativeChatMessage['role'],
  at: number,
  text: string
): NativeChatMessage {
  return { id, role, source: 'transcript', timestamp: at, blocks: [{ type: 'text', text }] }
}

/** The conversation so far: what the script has said by `now`, and what I answered. */
export function buildHomeLoopTranscript(
  t: Translate,
  task: HomeTask,
  loop: HomeTaskLoop,
  now: number
): NativeChatMessage[] {
  const script = buildHomeLoopScript(t, task)
  const status = inaxStatusLabels(t)
  const to = inaxStatusTo(t)
  const rows: NativeChatMessage[] = [
    message(
      'loop-kickoff',
      'user',
      loop.startedAt,
      t('taskLoop.chat.kickoff', 'Please take this task: {{title}}', { title: task.title })
    ),
    message(
      'loop-plan',
      'assistant',
      loop.startedAt + 1,
      `${t('taskLoop.chat.read', 'I read the task: its description, its deadline ({{due}}) and its notes.', { due: task.dueLabel })}\n\n${script.plan}\n\n${t('taskLoop.chat.proposeStart', 'First I propose changing the status {{to}}. Nothing changes on inAX until you confirm it in the card below.', { to: to.inProgress })}`
    )
  ]
  const decided = (
    id: string,
    decision: HomeTaskLoop['start'],
    statusName: string,
    withNote: boolean
  ): void => {
    if (!decision) {
      return
    }
    rows.push(
      message(
        id,
        'user',
        decision.at,
        decision.kind === 'declined'
          ? t('taskLoop.chat.declined', 'Not yet: nothing changed on inAX.')
          : withNote
            ? t(
                'taskLoop.chat.confirmedNote',
                'Confirmed: the status is “{{status}}” and the progress note is on the task.',
                { status: statusName }
              )
            : t('taskLoop.chat.confirmed', 'Confirmed: the status is “{{status}}”.', {
                status: statusName
              })
      )
    )
  }
  decided('loop-start-decision', loop.start, status.inProgress, false)
  if (now >= homeLoopQuestionAt(loop)) {
    rows.push(
      message(
        'loop-question',
        'assistant',
        homeLoopQuestionAt(loop),
        t('taskLoop.chat.ask', 'I need one decision from you before I write: {{question}}', {
          question: script.question
        })
      )
    )
  }
  if (loop.answer) {
    const choice = script.choices.find((entry) => entry.id === loop.answer?.choiceId)
    rows.push(
      message('loop-answer', 'user', loop.answer.at, choice?.label ?? ''),
      message(
        'loop-answer-ack',
        'assistant',
        loop.answer.at + 1,
        t('taskLoop.chat.answerAck', 'Thank you. I am writing it that way now.')
      )
    )
  }
  const draftAt = homeLoopDraftAt(loop)
  if (draftAt !== null && now >= draftAt) {
    rows.push(
      message(HOME_LOOP_DRAFT_MESSAGE_ID, 'assistant', draftAt, script.draft),
      message(
        'loop-propose-final',
        'assistant',
        draftAt + 1,
        t(
          'taskLoop.chat.proposeFinal',
          'The draft is above. I propose changing the status {{to}} and leaving a progress note. Read the card below: you can confirm it, correct it, or say not yet.',
          { to: to.review }
        )
      )
    )
  }
  if (loop.final) {
    decided('loop-final-decision', loop.final, status.review, true)
    rows.push(
      message(
        'loop-final-reply',
        'assistant',
        loop.final.at + 1,
        loop.final.kind === 'confirmed'
          ? t(
              'taskLoop.chat.done',
              'It is on inAX now. I am finished with this task unless you tell me more.'
            )
          : t(
              'taskLoop.chat.waiting',
              'Understood. The status and the notes stay as they are. Tell me below what to change, and I will propose again.'
            )
      )
    )
  }
  loop.said.forEach((said, index) => {
    rows.push(
      message(`loop-said-${index}`, 'user', said.at, said.text),
      message(
        `loop-said-reply-${index}`,
        'assistant',
        said.at + 1,
        said.reply === 'repropose'
          ? t('taskLoop.chat.reproposed', 'I applied that. Here is the proposal again.')
          : t('taskLoop.chat.noted', 'Noted. I will apply it to the step I am on.')
      )
    )
  })
  return rows.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
}
