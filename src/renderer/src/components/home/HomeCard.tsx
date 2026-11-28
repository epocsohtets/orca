import React, { useId, useState } from 'react'
import {
  Circle,
  CircleAlert,
  CircleCheckBig,
  CircleDashed,
  Clock,
  FileText,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AgentStateDot } from '@/components/agent/status/AgentStateDot'
import { REPO_COLORS } from '../../../../shared/repository/appearance/repo-badge-color'
import type { HomeAgentState, HomeTaskWho } from './home-board'
import type { HomeProject } from './home-board-mock'

export const HOME_META_CLASS = 'text-xs leading-4 text-muted-foreground'
// The rail buttons' ring: muted-foreground holds 3:1 on both themes, where `ring` does not in light.
export const HOME_FOCUS_RING_CLASS =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-muted-foreground'
/** A row that opens or jumps. Rows bleed to the card's edges so the hover wash and the ring reach them. */
export const HOME_ROW_BUTTON_CLASS = `${HOME_FOCUS_RING_CLASS} w-full min-w-0 px-4 py-2 text-left transition-colors motion-reduce:transition-none hover:bg-accent`
/** What a row shows when it is open. */
export const HOME_ROW_DETAIL_CLASS = 'flex flex-col gap-2 bg-accent/50 px-4 py-3'
/** A group's name above its rows: 28px. */
export const HOME_GROUP_CLASS = `flex h-7 items-center gap-1.5 px-4 ${HOME_META_CLASS}`
/** The same name with a rule above it, on the rows' own left edge. */
export const HOME_GROUP_RULED_CLASS = `mx-4 flex h-7 items-center gap-1.5 border-t border-border ${HOME_META_CLASS}`
/** The board pages' own button rules: two weights only, no shadow on an outline button, 28px page buttons. */
export const HOME_BOARD_SCOPE_CLASS =
  '[&_button]:font-normal [&_[data-slot=badge]]:font-normal [&_button[data-variant=outline]]:shadow-none [&_button[data-size=sm]]:h-7 [&_button[data-size=sm]]:px-2.5 [&_button[data-size=sm]]:text-[13px] [&_button[data-size=sm]]:leading-5'
/** The board pages' width and the gap between their cards. */
export const HOME_BOARD_PAGE_CLASS = `rail-page-row-gutter mx-auto flex max-w-[calc(1200px+2*var(--rail-page-gutter))] flex-col gap-4 pt-6 pb-24 ${HOME_BOARD_SCOPE_CLASS}`
/** Main and side columns, 2 to 1. */
export const HOME_BOARD_COLUMNS_CLASS =
  'grid items-start gap-4 @min-[60rem]/rail-page:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'

export type HomeCardTabs = {
  label: string
  value: string
  onValueChange: (value: string) => void
  items: readonly {
    value: string
    label: string
    count?: number
    data?: Record<`data-${string}`, string>
  }[]
}

/** A titled card: a 44px header (title, a line beside it, tabs and a link at the right), then the body. */
export function HomeCard({
  title,
  titleTip,
  aside,
  tabs,
  action,
  children,
  ...props
}: {
  title: string
  /** What the title's tooltip says; the aside then leaves a narrow header to it. */
  titleTip?: string
  aside?: React.ReactNode
  tabs?: HomeCardTabs
  action?: React.ReactNode
  children?: React.ReactNode
} & Record<`data-${string}`, string>): React.JSX.Element {
  const headingId = useId()
  const section = (
    <section aria-labelledby={headingId} className="@container/home-card flex min-w-0 flex-col">
      <div className="flex h-11 items-center gap-3 px-4">
        <h2
          id={headingId}
          title={titleTip}
          className="shrink-0 text-sm leading-5 font-semibold text-foreground"
        >
          {title}
        </h2>
        <div
          className={`min-w-0 flex-1 truncate ${HOME_META_CLASS} ${titleTip ? '@max-[30rem]/home-card:hidden' : ''}`}
        >
          {aside}
        </div>
        {/* Why a group pushed right: a narrow header drops the aside, and the tabs keep their place. */}
        <div className="ml-auto flex min-w-0 items-center gap-3">
          {tabs ? (
            <TabsList size="sm" aria-label={tabs.label} className="min-w-0 shrink">
              {tabs.items.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="min-w-0 flex-[0_1_auto]"
                  {...item.data}
                >
                  {/* A narrow header cuts a long tab name before it pushes the link out of the card. */}
                  <span className="min-w-[2em] truncate">{item.label}</span>
                  {item.count === undefined ? null : (
                    <span className="text-muted-foreground tabular-nums">{item.count}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          ) : null}
          {action}
        </div>
      </div>
      <div className="pb-4 empty:hidden">{children}</div>
    </section>
  )
  return (
    <Card size="board" {...props}>
      {tabs ? (
        <Tabs value={tabs.value} onValueChange={tabs.onValueChange}>
          {section}
        </Tabs>
      ) : (
        section
      )}
    </Card>
  )
}

export function HomeProjectDot({ project }: { project: HomeProject }): React.JSX.Element {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${HOME_META_CLASS}`}>
      {/* Why inline: project colours are data, as on the sidebar's project headers. */}
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <span className="truncate">{project.name}</span>
    </span>
  )
}

/** A person or an agent: the first character of the name, on a tint that is fixed per name. */
export function HomeAvatar({ name }: { name: string }): React.JSX.Element {
  // Why a rolling hash: a plain sum gives people with near names the same tint.
  const hash = Array.from(name).reduce(
    (total, char) => (total * 31 + (char.codePointAt(0) ?? 0)) >>> 0,
    7
  )
  const hue = REPO_COLORS[hash % REPO_COLORS.length]
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className="flex size-5 shrink-0 items-center justify-center rounded-full text-xs leading-4"
      // Why inline: the tint is data, as a project's colour is.
      style={{
        backgroundColor: `color-mix(in srgb, ${hue} 20%, var(--card))`,
        color: `color-mix(in srgb, ${hue} 55%, var(--foreground))`
      }}
    >
      {Array.from(name)[0]}
    </span>
  )
}

/** Up to three people, overlapping; past three a count. Names are in each avatar's tooltip. */
export function HomeAvatarStack({ names }: { names: readonly string[] }): React.JSX.Element {
  return (
    <span className="flex shrink-0 items-center">
      {names.slice(0, 3).map((name) => (
        <span key={name} className="-ml-1 rounded-full ring-1 ring-card first:ml-0">
          <HomeAvatar name={name} />
        </span>
      ))}
      {names.length > 3 ? (
        <span className={`ml-1 tabular-nums ${HOME_META_CLASS}`}>+{names.length - 3}</span>
      ) : null}
    </span>
  )
}

export type HomeRowState = NonNullable<HomeTaskWho> | 'done' | null

const STATE_ICON = {
  waiting: CircleAlert,
  blocked: Clock,
  agentWorking: CircleDashed,
  // A sheet, not a check: a check read as done.
  draft: FileText,
  done: CircleCheckBig
} as const

/** Where a row stands, as the icon in its first slot. Only "waits on me" has a colour. */
export function HomeStateIcon({ state }: { state: HomeRowState }): React.JSX.Element {
  const Icon = state ? STATE_ICON[state] : Circle
  return <Icon aria-hidden className={state === 'waiting' ? 'text-status-warning' : undefined} />
}

/** A row's one state word, after its title. */
export function HomeChip({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded-full border border-border bg-muted/50 px-1.5 whitespace-nowrap ${HOME_META_CLASS}`}
    >
      {children}
    </span>
  )
}

/**
 * One 36px line of a list: state icon, title, state chip, then the fixed columns (project, people, date) and a
 * 48px slot for the one button or the menu. The title is cut before anything else.
 */
export function HomeRow({
  icon,
  title,
  tip,
  chip,
  project,
  people,
  date,
  dateAlert,
  action,
  onClick,
  expanded,
  button,
  ...props
}: {
  icon?: React.ReactNode
  title: string
  /** The whole sentence the row stands for. */
  tip?: string
  chip?: string
  project?: HomeProject
  people?: React.ReactNode
  date?: string
  dateAlert?: boolean
  /** Undefined: the list has no slot. Null: this row's slot is empty. */
  action?: React.ReactNode
  /** Absent: the row leads nowhere, and does not look as if it did. */
  onClick?: () => void
  expanded?: boolean
  button?: Record<`data-${string}`, string>
} & Record<`data-${string}`, string>): React.JSX.Element {
  const Main = onClick ? 'button' : 'div'
  const main = (
    <Main
      type={onClick ? 'button' : undefined}
      aria-expanded={expanded}
      className={`${HOME_FOCUS_RING_CLASS} flex h-full min-w-0 flex-1 items-center gap-2 rounded-sm text-left text-[13px] leading-5`}
      onClick={onClick}
      {...button}
    >
      {icon === undefined ? null : (
        <span className="flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      )}
      <span className="min-w-0 truncate text-foreground">{title}</span>
      {chip ? <HomeChip>{chip}</HomeChip> : null}
      <span className="min-w-0 flex-1" />
      <span className="flex shrink-0 items-center gap-6">
        {project ? (
          // A narrow card leaves the project to the item's own page: a dot alone says nothing.
          // Why two spans: `flex` on the same span would win over the container rule that hides it.
          <span className="@max-[30rem]/home-card:hidden">
            <span className="flex w-[140px] items-center gap-1.5">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className={`truncate ${HOME_META_CLASS}`}>{project.name}</span>
            </span>
          </span>
        ) : null}
        {people}
        {date === undefined ? null : (
          <span
            className={`w-[72px] text-right text-xs leading-4 whitespace-nowrap tabular-nums ${dateAlert ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {date}
          </span>
        )}
      </span>
    </Main>
  )
  return (
    <li
      className={`group/home-row relative -mx-2 flex h-9 items-center rounded-md px-2 transition-colors before:absolute before:inset-x-2 before:top-0 before:border-t before:border-border motion-reduce:transition-none ${onClick ? 'hover:bg-accent' : ''}`}
      {...props}
    >
      {tip ? (
        <Tooltip>
          <TooltipTrigger asChild>{main}</TooltipTrigger>
          <TooltipContent side="top" sideOffset={4} className="max-w-sm">
            {tip}
          </TooltipContent>
        </Tooltip>
      ) : (
        main
      )}
      {action === undefined ? null : (
        <span className="ml-6 flex min-w-12 shrink-0 justify-end">{action}</span>
      )}
    </li>
  )
}

/** A row's other actions, in Orca's row menu: it shows on hover and on keyboard focus. */
export function HomeRowMenu({
  label,
  children,
  ...props
}: {
  label: string
  children: React.ReactNode
} & Record<`data-${string}`, string>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {/* Why the span: the button owns its own effects; the row shows and hides it from outside. */}
      <span
        className={
          open
            ? undefined
            : 'opacity-0 group-focus-within/home-row:opacity-100 group-hover/home-row:opacity-100 pointer-coarse:opacity-100'
        }
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost-muted"
            size="icon-toolbar"
            aria-label={label}
            {...props}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
      </span>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
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
      className={`inline-flex min-w-0 items-center gap-1.5 text-xs leading-4 ${
        who === 'blocked'
          ? 'text-destructive'
          : who === 'waiting'
            ? 'text-foreground'
            : 'text-muted-foreground'
      }`}
    >
      <AgentStateDot state={WHO_STATE[who]} title={null} />
      <span className="truncate">{label}</span>
    </span>
  )
}
