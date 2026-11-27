import React, { useId, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { NativeChatMessageList } from '@/components/native-chat/NativeChatMessageList'
import {
  NativeChatCardActions,
  NativeChatCardFrame
} from '@/components/native-chat/NativeChatCardFrame'
import {
  NATIVE_CHAT_APPEARANCE_ROOT_CLASS,
  useNativeChatAppearanceStyle
} from '@/components/native-chat/appearance/native-chat-appearance-style'
import type { NativeChatLiveSession } from '@/components/native-chat/session/terminal/read/native-chat-live-session-contract'
import type { NativeChatMessage } from '../../../../../shared/native-chat/native-chat-types'
import { HOME_META_CLASS, HomeWhoMarker } from '@/components/home/HomeCard'
import type { HomeChoice, HomeTask } from '@/components/home/home-board'
import type { HomeProposal } from '@/components/home/home-task-loop'
import { HOME_LOOP_DRAFT_MESSAGE_ID } from '@/components/home/home-task-loop-script'
import { InaxStatusBadge } from './inax-status-badge'
import { TaskProposalCard } from './TaskProposalCard'
import { InaxDemoNote } from './InaxDemoNote'

export type InaxConversationCard =
  | { kind: 'proposal'; step: 'start' | 'final'; proposal: HomeProposal; basis: string[] }
  | { kind: 'question'; question: string; choices: HomeChoice[] }

/**
 * A task's conversation with its agent, in the chat's own transcript and cards. What the agent asks of me is
 * docked over the input: a question with its choices, or a proposal for inAX.
 */
export function TaskPageInaxConversation({
  task,
  agentName,
  project,
  messages,
  working,
  card,
  onBack,
  onAnswer,
  onDecide,
  onSay
}: {
  task: HomeTask
  agentName: string
  project: string
  messages: NativeChatMessage[]
  working: boolean
  card: InaxConversationCard | null
  onBack: () => void
  onAnswer: (choiceId: string) => void
  onDecide: (step: 'start' | 'final', proposal: HomeProposal | null) => void
  /** Sends what I typed; absent for a sample agent, which cannot be talked to here. */
  onSay?: (text: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const appearance = useNativeChatAppearanceStyle(useAppStore((s) => s.settings))
  const session = useMemo<NativeChatLiveSession>(
    () => ({
      messages,
      // The transcript needs a provider to parse rows as; none is named on screen.
      agent: 'claude',
      sessionId: `inax-${task.id}`,
      status: 'ready',
      readPhase: 'ready',
      hasMore: false,
      loadingEarlier: false,
      olderHistoryGeneration: 0,
      loadEarlier: async () => 'exhausted'
    }),
    [messages, task.id]
  )
  const hasDraft = messages.some((entry) => entry.id.endsWith(HOME_LOOP_DRAFT_MESSAGE_ID))
  const send = (): void => {
    const text = draft.trim()
    if (text && onSay) {
      onSay(text)
      setDraft('')
    }
  }

  return (
    <section
      data-inax-conversation={task.id}
      aria-label={t('taskLoop.chat.label', 'Conversation about “{{title}}”', {
        title: task.title
      })}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm"
    >
      <header className="flex flex-none flex-col gap-2 border-b border-border px-5 py-3">
        <Button
          type="button"
          variant="ghost-muted"
          size="xs"
          className="-ml-2 self-start"
          onClick={onBack}
        >
          <ChevronLeft className="size-3.5" />
          {t('taskLoop.chat.back', 'The task')}
        </Button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="min-w-0 text-sm font-semibold text-foreground">{task.title}</h2>
          {task.status ? <InaxStatusBadge status={task.status} /> : null}
          {task.who && task.whoLabel ? (
            <HomeWhoMarker who={task.who} label={task.whoLabel} />
          ) : null}
        </div>
        <InaxDemoNote />
        {onSay ? null : (
          <p className={HOME_META_CLASS}>
            {t('taskLoop.chat.readOnly', 'This conversation can only be read here.')}
          </p>
        )}
      </header>
      <div
        className={`${NATIVE_CHAT_APPEARANCE_ROOT_CLASS} flex min-h-0 flex-1 flex-col`}
        style={appearance}
        data-native-chat-scheme={appearance.colorScheme}
      >
        {/* The transcript's own working line counts seconds; the state is said once, in the task's words. */}
        <NativeChatMessageList session={session} isWorking={false} expandSignal={false} />
        {card || onSay ? (
          <div className="mx-auto flex w-full max-w-(--chat-content-max-width) flex-none flex-col gap-3 px-4 pb-4">
            {working && task.whoLabel ? (
              <div role="status" data-inax-working="">
                <HomeWhoMarker who="agentWorking" label={task.whoLabel} />
              </div>
            ) : null}
            {card?.kind === 'proposal' ? (
              <TaskProposalCard
                // A corrected proposal starts over when the agent proposes again.
                key={`${card.step}:${card.proposal.note}`}
                proposal={card.proposal}
                project={project}
                onConfirm={(proposal) => onDecide(card.step, proposal)}
                onDecline={() => onDecide(card.step, null)}
                basis={card.basis}
                onOpenOutput={
                  hasDraft
                    ? () =>
                        document
                          .querySelector(
                            // Rows the agent says in a row are one block, named by its last row.
                            `[data-native-chat-message-id$="${HOME_LOOP_DRAFT_MESSAGE_ID}"], [data-native-chat-message-id$="loop-propose-final"]`
                          )
                          ?.scrollIntoView({ block: 'start', behavior: motionSafeScrollBehavior() })
                    : undefined
                }
              />
            ) : card?.kind === 'question' ? (
              <NativeChatCardFrame
                heading={t('taskLoop.question.heading', 'The agent’s question')}
                title={card.question}
                footer={
                  <NativeChatCardActions>
                    {card.choices.map((choice) => (
                      <Button
                        key={choice.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        data-inax-choice={choice.id}
                        onClick={() => onAnswer(choice.id)}
                      >
                        {choice.label}
                      </Button>
                    ))}
                  </NativeChatCardActions>
                }
              />
            ) : null}
            {onSay ? (
              <form
                className="flex flex-col gap-1.5"
                onSubmit={(event) => {
                  event.preventDefault()
                  send()
                }}
              >
                <Label htmlFor={inputId}>
                  {t('taskLoop.chat.inputLabel', 'Message to {{agent}}', { agent: agentName })}
                </Label>
                <div className="flex items-end gap-2">
                  <Textarea
                    id={inputId}
                    value={draft}
                    rows={2}
                    className="min-h-0 flex-1 resize-none"
                    placeholder={t(
                      'taskLoop.chat.placeholder',
                      'For example: make the second line shorter'
                    )}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault()
                        send()
                      }
                    }}
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={!draft.trim()}>
                    {t('taskLoop.chat.send', 'Send')}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
