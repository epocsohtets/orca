import { useId, useState } from 'react'
import { Globe, Repeat, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { BotRowHoverCard } from '@/components/bots/BotPanelRow'
import { ReviewNotesSendMenuContent } from '@/components/editor/review-note-delivery/ReviewNotesSendMenuContent'
import { useAppStore } from '@/store/index'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { dismissBrowserActivitySuggestion } from './browser-activity-store'
import {
  browserActivityPageLabel,
  browserActivityPageUrl,
  buildBrowserActivityAgentPrompt,
  type BrowserActivitySuggestion
} from './browser-activity-suggestions'

const LAST_VISIT_TIME = { hour: 'numeric', minute: '2-digit' } as const

/** The row's one line: what to hand over, never what was observed. */
export function browserSuggestionActionLine(
  suggestion: BrowserActivitySuggestion,
  t: Translate
): string {
  const first = browserActivityPageLabel(suggestion.pages[0])
  return suggestion.kind === 'repeated-sequence'
    ? t(
        'components.browser-pane.suggestions.actionSequence',
        'Hand the round from {{first}} to {{last}} to an agent',
        { first, last: browserActivityPageLabel(suggestion.pages.at(-1) ?? suggestion.pages[0]) }
      )
    : t(
        'components.browser-pane.suggestions.actionPage',
        'Hand the {{page}} check you keep opening to an agent',
        { page: first }
      )
}

/** The observation behind the row, then each page: the hover card's body and the row's description. */
export function browserSuggestionEvidence(
  suggestion: BrowserActivitySuggestion,
  t: Translate
): string[] {
  const values = {
    times: suggestion.count,
    time: uiDateTimeFormat(LAST_VISIT_TIME).format(suggestion.pages.at(-1)?.at)
  }
  const addresses = suggestion.pages.map((page) =>
    browserActivityPageUrl(page).replace(/^https?:\/\//, '')
  )
  return suggestion.kind === 'repeated-sequence'
    ? [
        t(
          'components.browser-pane.suggestions.evidenceSequence',
          'You went through these pages in the same order {{times}} times today, last at {{time}}.',
          values
        ),
        ...addresses.map((address, index) => `${index + 1}. ${address}`)
      ]
    : [
        t(
          'components.browser-pane.suggestions.evidencePage',
          'You opened this page {{times}} times today, last at {{time}}.',
          values
        ),
        ...addresses
      ]
}

// Takes the pointer only while the row shows its actions, so a hidden action is never clicked.
const REVEALED_POINTER =
  "pointer-events-none group-hover/upnext:pointer-events-auto [[class~='group/upnext']:has(:focus-visible)_&]:pointer-events-auto"

/** Keyboard dismissal must not drop focus out of the list. */
function focusNeighborRow(row: Element | null): void {
  const neighbor = row?.nextElementSibling ?? row?.previousElementSibling
  neighbor?.querySelector<HTMLButtonElement>(':scope > button')?.focus()
}

/** A browser suggestion in the bot Suggestions row's structure (BotUpNextSection's UpNextRow). */
export function BrowserSuggestionRow({
  suggestion,
  worktreeId,
  unseen,
  onHandOff
}: {
  suggestion: BrowserActivitySuggestion
  worktreeId: string
  unseen: boolean
  /** An agent was picked: the list has done its job and closes. */
  onHandOff: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const descriptionId = useId()
  const [pickerOpen, setPickerOpen] = useState(false)
  // A new agent opens where a new tab from this workspace would.
  const groupId = useAppStore(
    (s) => s.activeGroupIdByWorktree[worktreeId] ?? s.groupsByWorktree[worktreeId]?.[0]?.id ?? ''
  )
  const title = browserSuggestionActionLine(suggestion, t)
  const evidence = browserSuggestionEvidence(suggestion, t)
  const Icon = suggestion.kind === 'repeated-sequence' ? Repeat : Globe

  return (
    // The ring sits on the row, outside the actions' backdrop, so it is never cut off at the end.
    // It uses muted-foreground because the ring token measures under 3:1 on this surface.
    <div
      data-browser-suggestion-row
      className="group/upnext relative flex w-full min-w-0 items-start rounded-sm hover:bg-accent has-focus-visible:bg-accent has-[[data-state=open]]:bg-accent has-[>button:focus-visible]:ring-1 has-[>button:focus-visible]:ring-muted-foreground"
    >
      <BotRowHoverCard
        card={
          <>
            <p className="font-medium">{title}</p>
            {evidence.map((line) => (
              <p key={line} className="mt-1 text-muted-foreground">
                {line}
              </p>
            ))}
          </>
        }
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1 text-left focus-visible:outline-none"
          aria-describedby={descriptionId}
          aria-keyshortcuts="Enter Delete"
          onClick={() => setPickerOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
              event.preventDefault()
              focusNeighborRow(event.currentTarget.parentElement)
              dismissBrowserActivitySuggestion(suggestion.id)
            }
          }}
        >
          <span className="flex h-5 w-4 shrink-0 items-center justify-center text-muted-foreground">
            <Icon aria-hidden className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] leading-5 text-foreground">
            {title}
          </span>
          {unseen ? (
            <>
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />
              <span className="sr-only">{t('components.browser-pane.suggestions.new', 'New')}</span>
            </>
          ) : null}
        </button>
      </BotRowHoverCard>
      {/* The card is a pointer and focus aid; this is the same text for assistive technology. */}
      <span id={descriptionId} hidden>
        {evidence.join(' ')}
      </span>
      {/* Over the row's end on hover, focus, or while the agent list is open. */}
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 rounded-r-sm bg-accent pr-1.5 pl-2 text-accent-foreground opacity-0 transition-opacity group-hover/upnext:opacity-100 has-[[data-state=open]]:opacity-100 motion-reduce:transition-none [[class~='group/upnext']:has(:focus-visible)_&]:opacity-100">
        <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline-on-accent" size="xs" className={REVEALED_POINTER}>
              {t('components.browser-pane.suggestions.start', 'Start')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="min-w-[220px]"
            // The shared target list reports no pick, and focus leaving for the new tab does not
            // close the popover around this menu.
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('[role=menuitem]')) {
                onHandOff()
              }
            }}
          >
            <ReviewNotesSendMenuContent
              worktreeId={worktreeId}
              groupId={groupId}
              prompt={buildBrowserActivityAgentPrompt(suggestion)}
              // The prompt lands in the agent's input unsent, so the user reviews it first.
              mode="add-to-chat"
            />
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost-on-accent"
          size="icon-xs"
          className={REVEALED_POINTER}
          aria-label={t('components.browser-pane.suggestions.dismiss', 'Dismiss')}
          onClick={() => dismissBrowserActivitySuggestion(suggestion.id)}
        >
          <X />
        </Button>
      </span>
    </div>
  )
}
