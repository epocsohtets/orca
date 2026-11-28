import { translate } from '@/i18n/i18n'

/** Compact "now / 5m / 3h / 2d" age label shared by agent rows and activity threads, in the app's language. */
export function formatShortTimeAgo(ts: number, now = Date.now()): string {
  const delta = now - ts
  if (delta < 60_000) {
    return translate('time.shortAgo.now', 'now')
  }
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 60) {
    return translate('time.shortAgo.minutes', '{{count}}m', { count: minutes })
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return translate('time.shortAgo.hours', '{{count}}h', { count: hours })
  }
  return translate('time.shortAgo.days', '{{count}}d', {
    count: Math.floor(hours / 24)
  })
}
