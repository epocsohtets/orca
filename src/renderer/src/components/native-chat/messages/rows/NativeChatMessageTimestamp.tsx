import { createContext, useContext } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { useNowSnapshot } from '@/lib/window-activity/use-now'
import { cn } from '@/lib/class-names'
import {
  getNativeChatMessageDay,
  getNativeChatMessageTimeFormatter
} from '../../../../../../shared/native-chat/transcript/messages/native-chat-message-time'

/**
 * Maps the real clock to the one a conversation is told on. Only a sample conversation sets it, so its
 * "today" and "yesterday" follow the sample's day and not the real one.
 */
export const NativeChatClockContext = createContext<((real: number) => number) | null>(null)

function useChatDay(enabled = true): ReturnType<typeof getNativeChatMessageDay> {
  const clock = useContext(NativeChatClockContext)
  const today = useNowSnapshot(30_000, getNativeChatMessageDay, enabled)
  return clock ? { ...today, date: new Date(clock(today.date.getTime())) } : today
}

/** The full spoken time a timestamp shows, for a control that names its row by words and time. */
export function useNativeChatMessageTimeLabel(timestamp: number | null | undefined): string | null {
  const intlLocale = useIntlLocale()
  // A row with no time, such as waiting agent mail, keeps no clock running.
  const today = useChatDay(timestamp != null)
  if (timestamp === null || timestamp === undefined) {
    return null
  }
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime())
    ? null
    : getNativeChatMessageTimeFormatter(intlLocale, today).formatFull(date)
}

export function NativeChatMessageTimestamp({
  timestamp,
  focusable = false,
  className
}: {
  timestamp: number | null
  focusable?: boolean
  className?: string
}): React.JSX.Element | null {
  const intlLocale = useIntlLocale()
  const today = useChatDay()
  const t = useTranslate()
  if (timestamp === null) {
    return null
  }
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  const formatter = getNativeChatMessageTimeFormatter(intlLocale, today)
  const fullLabel = formatter.formatFull(date)

  return (
    <Tooltip>
      {/* The label already carries the full date in every reading mode; the tooltip would repeat it. */}
      <TooltipTrigger asChild aria-describedby={undefined}>
        <time
          dateTime={date.toISOString()}
          aria-label={fullLabel}
          tabIndex={focusable ? 0 : undefined}
          className={cn(
            'rounded-md text-xs whitespace-nowrap text-chat-foreground-faint tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          {formatter.format(date, today.date, (time) =>
            t('nativeChat.messageTime.yesterday', 'Yesterday {{time}}', { time })
          )}
        </time>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {fullLabel}
      </TooltipContent>
    </Tooltip>
  )
}
