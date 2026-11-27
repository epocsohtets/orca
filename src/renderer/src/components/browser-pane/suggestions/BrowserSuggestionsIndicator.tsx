import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppStore } from '@/store/index'
import { useTranslate } from '@/i18n/use-translate'
import {
  markBrowserActivitySuggestionsSeen,
  useBrowserActivityStore
} from './browser-activity-store'
import {
  deriveBrowserActivitySuggestions,
  type BrowserActivitySuggestion
} from './browser-activity-suggestions'
import { BrowserSuggestionRow } from './BrowserSuggestionRow'

/** The open list: the bot panel's Suggestions section, mirrored in a popover. */
function BrowserSuggestionsList({
  suggestions,
  worktreeId,
  onHandOff
}: {
  suggestions: readonly BrowserActivitySuggestion[]
  worktreeId: string
  onHandOff: () => void
}): React.JSX.Element {
  const t = useTranslate()
  // Dots stay for this opening; the next one shows only what arrived since.
  const [seenWhenOpened] = useState(() => useBrowserActivityStore.getState().seenIds)
  useEffect(() => {
    markBrowserActivitySuggestionsSeen(suggestions.map((suggestion) => suggestion.id))
  }, [suggestions])
  return (
    // BotPanelSection's layout; its heading's 80% muted text measures 3.6:1, so this one is full muted.
    <section className="flex flex-col gap-0.5">
      <h3 className="flex h-7 items-center px-2 text-xs font-semibold text-muted-foreground select-none">
        {t('components.browser-pane.suggestions.title', 'Suggestions')}
      </h3>
      <div className="flex flex-col">
        {suggestions.map((suggestion) => (
          <BrowserSuggestionRow
            key={suggestion.id}
            suggestion={suggestion}
            worktreeId={worktreeId}
            unseen={!seenWhenOpened.includes(suggestion.id)}
            onHandOff={onHandOff}
          />
        ))}
      </div>
    </section>
  )
}

function BrowserSuggestionsPopover({
  suggestions,
  hasNew,
  worktreeId
}: {
  suggestions: readonly BrowserActivitySuggestion[]
  hasNew: boolean
  worktreeId: string
}): React.JSX.Element {
  const t = useTranslate()
  const [open, setOpen] = useState(false)
  const label = t('components.browser-pane.suggestions.indicatorLabel', 'Suggestions: {{total}}', {
    total: suggestions.length
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="xs"
          // Unseen suggestions darken the mark; seen ones leave it as quiet as its neighbors.
          variant={hasNew ? 'ghost' : 'muted-field-icon'}
          title={label}
          aria-label={label}
        >
          <Sparkles aria-hidden />
          {suggestions.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="p-1.5">
          <BrowserSuggestionsList
            suggestions={suggestions}
            worktreeId={worktreeId}
            onHandOff={() => setOpen(false)}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Absent while the activity record has nothing to offer, so the toolbar stays quiet. */
export function BrowserSuggestionsIndicator({
  worktreeId
}: {
  worktreeId: string
}): React.JSX.Element | null {
  const enabled = useAppStore((s) => s.settings?.browserActivityRecordEnabled !== false)
  const visits = useBrowserActivityStore((s) => s.visits)
  const dismissedIds = useBrowserActivityStore((s) => s.dismissedIds)
  const seenIds = useBrowserActivityStore((s) => s.seenIds)
  const suggestions = useMemo(
    () => deriveBrowserActivitySuggestions(visits, dismissedIds),
    [visits, dismissedIds]
  )
  if (!enabled || suggestions.length === 0) {
    return null
  }
  // Its own component, so the open state goes away with the last suggestion.
  return (
    <BrowserSuggestionsPopover
      suggestions={suggestions}
      hasNew={suggestions.some((suggestion) => !seenIds.includes(suggestion.id))}
      worktreeId={worktreeId}
    />
  )
}
