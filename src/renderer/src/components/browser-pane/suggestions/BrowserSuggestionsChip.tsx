import { useMemo } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ReviewNotesSendMenuContent } from '@/components/editor/review-note-delivery/ReviewNotesSendMenuContent'
import { useAppStore } from '@/store/index'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { dismissBrowserActivitySuggestion, useBrowserActivityStore } from './browser-activity-store'
import {
  browserActivityPageUrl,
  buildBrowserActivityAgentPrompt,
  deriveBrowserActivitySuggestions,
  type BrowserActivitySuggestion
} from './browser-activity-suggestions'

function suggestionSummary(suggestion: BrowserActivitySuggestion, t: Translate): string {
  return suggestion.kind === 'repeated-sequence'
    ? t(
        'components.browser-pane.suggestions.repeatedSequence',
        'You repeated the same sequence of pages {{times}} times today',
        { times: suggestion.count }
      )
    : t(
        'components.browser-pane.suggestions.repeatedPage',
        'You opened this page {{times}} times today',
        { times: suggestion.count }
      )
}

/** Shown only while the activity record has something to offer, so the toolbar stays quiet otherwise. */
export function BrowserSuggestionsChip({
  worktreeId
}: {
  worktreeId: string
}): React.JSX.Element | null {
  const t = useTranslate()
  const enabled = useAppStore((s) => s.settings?.browserActivityRecordEnabled !== false)
  const visits = useBrowserActivityStore((s) => s.visits)
  const dismissedIds = useBrowserActivityStore((s) => s.dismissedIds)
  // A new agent opens where a new tab from this workspace would.
  const groupId = useAppStore(
    (s) => s.activeGroupIdByWorktree[worktreeId] ?? s.groupsByWorktree[worktreeId]?.[0]?.id ?? ''
  )
  const suggestions = useMemo(
    () => deriveBrowserActivitySuggestions(visits, dismissedIds),
    [visits, dismissedIds]
  )
  if (!enabled || suggestions.length === 0) {
    return null
  }
  const label = t('components.browser-pane.suggestions.chipLabel', 'Suggestions from your browsing')

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="xs" variant="muted-field-icon" title={label} aria-label={label}>
          <Sparkles />
          {suggestions.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-80">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {suggestions.map((suggestion) => (
          <div key={suggestion.id}>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="text-sm">{suggestionSummary(suggestion, t)}</div>
              {suggestion.pages.map((page, index) => (
                <div
                  key={browserActivityPageUrl(page)}
                  className="truncate text-xs text-muted-foreground"
                >
                  {suggestion.kind === 'repeated-sequence' ? `${index + 1}. ` : null}
                  {/* The address leads because truncation cuts the end, and page titles often repeat the site. */}
                  {browserActivityPageUrl(page).replace(/^https?:\/\//, '')} · {page.title}
                </div>
              ))}
            </div>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sparkles />
                {t('components.browser-pane.suggestions.letAgent', 'Let an agent do this')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[220px]">
                <ReviewNotesSendMenuContent
                  worktreeId={worktreeId}
                  groupId={groupId}
                  prompt={buildBrowserActivityAgentPrompt(suggestion)}
                  // The prompt lands in the agent's input unsent, so the user reviews it first.
                  mode="add-to-chat"
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => dismissBrowserActivitySuggestion(suggestion.id)}>
              <X />
              {t('components.browser-pane.suggestions.dismiss', 'Dismiss')}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
