import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'

const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
const DAY: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
const SHORT_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

export const formatMeetingTime = (timestamp: number, intlLocale: string): string =>
  uiDateTimeFormat(TIME, intlLocale).format(timestamp)

export const formatMeetingDay = (timestamp: number, intlLocale: string): string =>
  uiDateTimeFormat(DAY, intlLocale).format(timestamp)

export const formatMeetingShortDay = (timestamp: number, intlLocale: string): string =>
  uiDateTimeFormat(SHORT_DAY, intlLocale).format(timestamp)

/** A YYYY-MM-DD due date as a local day; null when it is empty or not a date. */
export function formatDueDate(due: string, intlLocale: string): string | null {
  const [year, month, day] = due.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return due && !Number.isNaN(date.getTime())
    ? uiDateTimeFormat(SHORT_DAY, intlLocale).format(date)
    : null
}
