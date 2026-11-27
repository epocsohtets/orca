import React, { useId } from 'react'
import { Card } from '@/components/ui/card'
import { AgentStateDot } from '@/components/agent/status/AgentStateDot'
import { GitHubUserAvatar } from '@/components/github/github-user-avatar'
import type { HomeAgentState, HomeTaskWho } from './home-board'
import type { HomeProject } from './home-board-mock'

export const HOME_META_CLASS = 'text-xs text-muted-foreground'
// The rail buttons' ring: muted-foreground holds 3:1 on both themes, where `ring` does not in light.
export const HOME_FOCUS_RING_CLASS =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-muted-foreground'
/** A row that opens or jumps. Rows bleed to the card's edges so the hover wash and the ring reach them. */
export const HOME_ROW_BUTTON_CLASS = `${HOME_FOCUS_RING_CLASS} w-full min-w-0 px-4 py-2 text-left transition-colors motion-reduce:transition-none hover:bg-accent`
/** What a row shows when it is open. */
export const HOME_ROW_DETAIL_CLASS = 'flex flex-col gap-2 bg-accent/50 px-4 py-3'

/** A titled card: heading, an optional line beside it, an optional action at the right, then the body. */
export function HomeCard({
  title,
  aside,
  action,
  children,
  ...props
}: {
  title: string
  aside?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
} & Record<`data-${string}`, string>): React.JSX.Element {
  const headingId = useId()
  return (
    <Card size="sm" {...props}>
      <section aria-labelledby={headingId} className="@container/home-card flex min-w-0 flex-col">
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2">
          <h2 id={headingId} className="shrink-0 text-sm font-semibold text-foreground">
            {title}
          </h2>
          <div className={`min-w-0 flex-1 ${HOME_META_CLASS}`}>{aside}</div>
          {action}
        </div>
        {children}
      </section>
    </Card>
  )
}

export function HomeProjectDot({ project }: { project: HomeProject }): React.JSX.Element {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${HOME_META_CLASS}`}>
      {/* Why inline: project colours are data, as on the sidebar's project headers. */}
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <span className="truncate">{project.name}</span>
    </span>
  )
}

/** A person's or an agent's initials, as the task lists draw assignees. */
export function HomeAvatar({ name }: { name: string }): React.JSX.Element {
  return <GitHubUserAvatar login="" name={name} className="size-5" />
}

const WHO_STATE = {
  agentWorking: 'working',
  waiting: 'waiting',
  blocked: 'blocked',
  draft: 'done',
  working: 'working',
  idle: 'idle'
} as const

/** Who has it right now: the agent state glyph every agent surface uses, plus words. */
export function HomeWhoMarker({
  who,
  label
}: {
  who: NonNullable<HomeTaskWho> | HomeAgentState
  label: string
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 text-xs ${
        who === 'blocked'
          ? 'text-destructive'
          : who === 'waiting'
            ? 'font-medium text-foreground'
            : 'text-muted-foreground'
      }`}
    >
      <AgentStateDot state={WHO_STATE[who]} title={null} />
      <span className="truncate">{label}</span>
    </span>
  )
}
