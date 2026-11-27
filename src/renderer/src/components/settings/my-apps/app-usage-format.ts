import { formatUiNarrowDuration } from '@/i18n/relative-time-format'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import type { AppUsageSession } from '../../../../../shared/my-apps/app-usage'

// Intl formatter caches key on option identity, so this must be a module constant.
const CLOCK_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

/** "1h 5m", "12m", or "40s" under a minute, in the UI language. */
export function formatActiveTime(ms: number, intlLocale: string): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) {
    return formatUiNarrowDuration(Math.round(ms / 1000), 'second', intlLocale)
  }
  const parts = [
    minutes >= 60 ? formatUiNarrowDuration(Math.floor(minutes / 60), 'hour', intlLocale) : '',
    minutes % 60 > 0 ? formatUiNarrowDuration(minutes % 60, 'minute', intlLocale) : ''
  ]
  return parts.filter(Boolean).join(' ')
}

export function formatClock(ms: number, intlLocale: string): string {
  return uiDateTimeFormat(CLOCK_FORMAT, intlLocale).format(ms)
}

export function formatSessionRanges(
  sessions: readonly AppUsageSession[],
  intlLocale: string
): string {
  const clock = uiDateTimeFormat(CLOCK_FORMAT, intlLocale)
  return sessions
    .map((session) => `${clock.format(session.start)}–${clock.format(session.end)}`)
    .join(', ')
}
