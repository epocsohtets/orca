import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'

/** The one mark that a screen is a demo: a chip, never a sentence in the product's voice. */
export function InaxDemoNote({ className }: { className?: string }): React.JSX.Element {
  const t = useTranslate()
  return (
    <Badge variant="warning" data-inax-demo="" className={cn('self-start', className)}>
      {t('taskLoop.demo.chip', 'Demo')}
    </Badge>
  )
}

/** The demo chip as a menu: everything that only a demo has (time of day, who is looking, starting over) is behind it. */
export function DemoMenu({ children }: { children: React.ReactNode }): React.JSX.Element {
  const t = useTranslate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-demo-menu=""
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Badge variant="warning">{t('taskLoop.demo.chip', 'Demo')}</Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
