import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { InaxStatus } from '@/components/home/home-task-loop'
import { inaxStatusLabels } from '@/components/home/home-task-loop-script'

// Tones reused from the GitHub work-item state badge; the word carries the meaning.
const TONES: Record<InaxStatus, string> = {
  todo: 'border-border text-muted-foreground',
  inProgress: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  review: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
  done: 'border-border text-foreground'
}

export function InaxStatusBadge({ status }: { status: InaxStatus }): React.JSX.Element {
  const t = useTranslate()
  return (
    <span
      data-inax-status={status}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs leading-none font-medium whitespace-nowrap',
        TONES[status]
      )}
    >
      {inaxStatusLabels(t)[status]}
    </span>
  )
}
