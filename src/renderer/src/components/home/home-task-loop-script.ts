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
  /**
   * The output for the answer I gave, as markdown. Null for a task with nothing prepared: the agent then says
   * what it does next (`next`) and proposes nothing, because it has nothing to show.
   */
  draft: string | null
  /** What the agent says after my answer when there is no draft. */
  next: string
  /** The progress note the agent proposes, with what I asked for after "not yet". */
  note: string
  /** Where each claim of the note comes from, one line each. */
  basis: string[]
}

/** The draft's row id ends with this; a running number comes before it. */
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

/** The script for one task, as far as my answers have shaped it. */
export function buildHomeLoopScript(
  t: Translate,
  task: HomeTask,
  loop?: HomeTaskLoop
): HomeLoopScript {
  const second = loop?.answer?.choiceId === 'b'
  const requests = (loop?.said ?? [])
    .filter((said) => said.reply === 'repropose')
    .map((said) => t('taskLoop.script.requested', 'You asked for: “{{text}}”', { text: said.text }))
  const withRequests = (note: string): string => [note, ...requests].join('\n')
  if (task.id === 'report') {
    const numbers = t(
      'taskLoop.script.reportNumbers',
      '- Visitors: 112% of the target\n- Sign-up conversion: 3.4% (2.9% the month before)\n- Ad spend: 96% of the budget'
    )
    const closing = t(
      'taskLoop.script.reportClosing',
      'Please read the report and leave your comments on this task.'
    )
    return {
      plan: t(
        'taskLoop.script.reportPlan',
        'The report is already written, so I will prepare what sharing it needs.\n\n1. Pull the three key numbers out of the report.\n2. Draft the message that shares it.\n3. Show you the draft, then propose a status and a progress note.'
      ),
      question: t(
        'taskLoop.script.reportQuestion',
        'Who should the sharing message be written for?'
      ),
      choices: [
        { id: 'a', label: t('taskLoop.script.reportA', 'Kim Jiwoo only · short') },
        { id: 'b', label: t('taskLoop.script.reportB', 'The whole campaign team · with a summary') }
      ],
      next: '',
      draft: second
        ? `${t(
            'taskLoop.script.reportDraftTeam',
            '**Sharing message for last month’s campaign report (draft · to the whole campaign team)**\n\nCampaign team, here is last month’s campaign report.\n\n**Summary**\n\nMore people visited than we aimed for, and more of them signed up. Ad spend stayed inside the budget.'
          )}\n\n${numbers}\n\n${closing}`
        : `${t(
            'taskLoop.script.reportDraftOne',
            '**Sharing message for last month’s campaign report (draft · to Kim Jiwoo)**\n\nJiwoo, here is last month’s campaign report. Three numbers matter most.'
          )}\n\n${numbers}\n\n${closing}`,
      note: withRequests(
        second
          ? t(
              'taskLoop.script.reportNoteTeam',
              'Drafted the message that shares last month’s campaign report with the whole campaign team. It has a summary paragraph and three numbers copied from the report: visitors, sign-up conversion and ad spend. The message has not been sent.'
            )
          : t(
              'taskLoop.script.reportNoteOne',
              'Drafted the short message that shares last month’s campaign report with Kim Jiwoo. It has three numbers copied from the report: visitors, sign-up conversion and ad spend. The message has not been sent.'
            )
      ),
      basis: [
        t(
          'taskLoop.script.reportBasis1',
          'Visitors, 112% of the target: report page 2, “Visits” table, total row'
        ),
        t(
          'taskLoop.script.reportBasis2',
          'Sign-up conversion, 3.4% and 2.9%: report page 3, “Sign-ups” table, this month and last month'
        ),
        t(
          'taskLoop.script.reportBasis3',
          'Ad spend, 96% of the budget: report page 5, “Cost” table, spent ÷ budget'
        )
      ]
    }
  }
  return {
    plan: t(
      'taskLoop.script.plan',
      'This is how I will do it.\n\n1. Read the task description.\n2. Split the task into items and put the list in this conversation.'
    ),
    question: t('taskLoop.script.question', 'Who should the list be written for?'),
    choices: [
      { id: 'a', label: t('taskLoop.script.choiceA', 'For me') },
      { id: 'b', label: t('taskLoop.script.choiceB', 'For the project team') }
    ],
    draft: null,
    next: second
      ? t(
          'taskLoop.script.nextTeam',
          'I am splitting the task description into items now. When the list is ready I will put it in this conversation, written for the project team to read.'
        )
      : t(
          'taskLoop.script.next',
          'I am splitting the task description into items now. When the list is ready I will put it in this conversation.'
        ),
    note: '',
    basis: []
  }
}

/** The transcript says what was said, not when: the sample day keeps its own clock on Home and on notes. */
function message(
  id: string,
  role: NativeChatMessage['role'],
  at: number,
  text: string
): NativeChatMessage & { at: number } {
  return { id, role, source: 'transcript', timestamp: null, at, blocks: [{ type: 'text', text }] }
}

/** The conversation so far: what the script has said by `now`, and what I answered. */
export function buildHomeLoopTranscript(
  t: Translate,
  task: HomeTask,
  loop: HomeTaskLoop,
  now: number
): NativeChatMessage[] {
  const script = buildHomeLoopScript(t, task, loop)
  const status = inaxStatusLabels(t)
  const to = inaxStatusTo(t)
  const rows = [
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
      `${t('taskLoop.chat.read', 'I read the task: its description, its deadline ({{due}}) and its notes.', { due: task.dueLabel })}\n\n${script.plan}\n\n${t('taskLoop.chat.proposeStart', 'Before I start, may I change the status {{to}}?', { to: to.inProgress })}`
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
          ? t('taskLoop.chat.declined', 'Not yet: the status and the notes stay as they are.')
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
  if (loop.start) {
    rows.push(
      message(
        'loop-started',
        'assistant',
        loop.start.at + 1,
        t('taskLoop.chat.started', 'I am starting with step 1.')
      )
    )
  }
  const questionAt = homeLoopQuestionAt(loop)
  if (questionAt !== null && now >= questionAt) {
    rows.push(
      message(
        'loop-question',
        'assistant',
        questionAt,
        t('taskLoop.chat.ask', 'I need one thing from you before I go on: {{question}}', {
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
        t('taskLoop.chat.answerAck', 'Thank you. I will go that way.')
      )
    )
  }
  const draftAt = homeLoopDraftAt(loop)
  if (draftAt !== null && now >= draftAt) {
    if (script.draft === null) {
      // Nothing was prepared for this task: the agent says what it does next and asks for no confirmation.
      rows.push(message('loop-next', 'assistant', draftAt, script.next))
    } else {
      rows.push(
        message(HOME_LOOP_DRAFT_MESSAGE_ID, 'assistant', draftAt, script.draft),
        message(
          'loop-propose-final',
          'assistant',
          draftAt + 1,
          t(
            'taskLoop.chat.proposeFinal',
            'The draft is ready. May I change the status {{to}} and leave a progress note?',
            { to: to.review }
          )
        )
      )
    }
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
              'The status and the note are on the task. Tell me if you need anything more.'
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
          ? t(
              'taskLoop.chat.reproposed',
              'I added your request to the progress note. Please confirm again.'
            )
          : t('taskLoop.chat.noted', 'Noted. I will apply it to what I am writing now.')
      )
    )
  })
  // Why the number: without timestamps the transcript orders rows by id.
  return rows
    .sort((a, b) => a.at - b.at)
    .map(({ at: _at, ...row }, index) => ({
      ...row,
      id: `${String(index).padStart(3, '0')}-${row.id}`
    }))
}
