import React, { useId } from 'react'
import { Button } from '@/components/ui/button'

// This page's whole scale. Spacing: 1, 2, 3, 6, 12, 24. Type: 14/600 title and primary heading, 13/500 primary row,
// 13/400 secondary row, 12/400 detail, 11/600 uppercase label. Color: background, foreground, muted-foreground,
// border, accent; `primary` only for the one filled action, `destructive` only for a form error.
export const HOME_ROW_CLASS = 'flex w-full min-w-0 items-center gap-3 p-3 text-left'
export const HOME_QUIET_ROW_CLASS = 'flex w-full min-w-0 items-center gap-3 py-2 text-left'
export const HOME_META_CLASS = 'text-xs text-muted-foreground'
export const HOME_LABEL_CLASS =
  'text-2xs font-semibold uppercase tracking-wider text-muted-foreground'
// The rail buttons' ring: muted-foreground holds 3:1 on both themes, where `ring` does not in light.
export const HOME_FOCUS_RING_CLASS =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-muted-foreground'

/** `primary` is a heading over a bordered list; the default is a quiet label over bare rows. */
export function HomeSection({
  title,
  count,
  primary = false,
  action,
  list = true,
  children
}: {
  title: string
  count?: number
  primary?: boolean
  action?: React.ReactNode
  /** False when the body is not a list of rows. */
  list?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const headingId = useId()
  const Body = list ? 'ul' : 'div'
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className={
            primary
              ? 'flex min-w-0 items-baseline gap-2 text-sm font-semibold text-foreground'
              : `min-w-0 truncate ${HOME_LABEL_CLASS}`
          }
        >
          <span className="truncate">{title}</span>
          {typeof count === 'number' ? (
            <span className="text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
          ) : null}
        </h2>
        {action}
      </div>
      <Body
        className={
          primary
            ? 'divide-y divide-border overflow-hidden rounded-md border border-border'
            : 'divide-y divide-border border-t border-border'
        }
      >
        {children}
      </Body>
    </section>
  )
}

export function HomeRowText({
  title,
  detail,
  primary = false
}: {
  title: string
  detail?: string
  primary?: boolean
}): React.JSX.Element {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span
        className={
          primary
            ? 'line-clamp-2 text-[13px] font-medium text-foreground'
            : 'line-clamp-2 text-[13px] text-foreground'
        }
      >
        {title}
      </span>
      {detail ? <span className={`line-clamp-2 ${HOME_META_CLASS}`}>{detail}</span> : null}
    </span>
  )
}

export type HomeRow = {
  id: string
  title: string
  detail?: string
  action?: string
  run?: () => void
  filled?: boolean
}

/** Rows that say one thing and offer at most one action. */
export function HomeActionRows({
  rows,
  quiet = false
}: {
  rows: HomeRow[]
  quiet?: boolean
}): React.JSX.Element {
  return (
    <>
      {rows.map((row) => (
        <li key={row.id} className={quiet ? HOME_QUIET_ROW_CLASS : HOME_ROW_CLASS}>
          <HomeRowText primary={!quiet} title={row.title} detail={row.detail} />
          {row.action ? (
            <Button
              type="button"
              variant={row.filled ? 'default' : 'outline'}
              size="xs"
              className="shrink-0"
              onClick={row.run}
            >
              {row.action}
            </Button>
          ) : null}
        </li>
      ))}
    </>
  )
}
