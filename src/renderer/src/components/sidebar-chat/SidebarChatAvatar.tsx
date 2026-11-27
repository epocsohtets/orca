import React from 'react'
import { Hash } from 'lucide-react'
import { cn } from '@/lib/class-names'
import type { SidebarChatPresence } from './sidebar-chat-mock-data'

const PRESENCE_CLASS: Record<SidebarChatPresence, string> = {
  online: 'bg-status-success',
  away: 'bg-status-warning',
  offline: 'bg-muted-foreground'
}

/** A person's initial with a presence dot, or a group's hash. */
export function SidebarChatAvatar({
  name,
  kind,
  presence,
  presenceLabel
}: {
  name: string
  kind: 'dm' | 'group'
  presence?: SidebarChatPresence
  presenceLabel?: string
}): React.JSX.Element {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-xs font-medium text-muted-foreground">
      {kind === 'group' ? <Hash className="size-4" /> : name.charAt(0)}
      {presence ? (
        <span
          role="img"
          aria-label={presenceLabel}
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-worktree-sidebar',
            PRESENCE_CLASS[presence]
          )}
        />
      ) : null}
    </span>
  )
}
