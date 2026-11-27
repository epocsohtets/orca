import { Badge } from '@/components/ui/badge'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'

/**
 * The one place a screen says it is a demo. Product copy beside it says what the product does; this says that
 * this build does it on sample data inside the app.
 */
export function InaxDemoNote({ className }: { className?: string }): React.JSX.Element {
  const t = useTranslate()
  return (
    <p
      data-inax-demo=""
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground',
        className
      )}
    >
      <Badge variant="warning">{t('taskLoop.demo.chip', 'Demo')}</Badge>
      <span>
        {t(
          'taskLoop.demo.line',
          'This build uses sample inAX data and prepared agent replies inside the app. Nothing leaves this computer.'
        )}
      </span>
    </p>
  )
}
