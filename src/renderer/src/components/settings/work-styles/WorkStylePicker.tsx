import { AppWindow, Check, CodeXml, Globe, Users, type LucideIcon } from 'lucide-react'
import { normalizeWorkStyles, type WorkStyle } from '../../../../../shared/settings/work-styles'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { Translate } from '@/i18n/use-translate'

const WORK_STYLE_ICONS: Record<WorkStyle, LucideIcon> = {
  code: CodeXml,
  web: Globe,
  'desktop-apps': AppWindow,
  meetings: Users
}

function workStyleCopy(style: WorkStyle, t: Translate): { label: string; description: string } {
  switch (style) {
    case 'code':
      return {
        label: t('workStyles.options.code.label', 'Code'),
        description: t(
          'workStyles.options.code.description',
          'I write and change program code myself'
        )
      }
    case 'web':
      return {
        label: t('workStyles.options.web.label', 'Web'),
        description: t('workStyles.options.web.description', 'Work in the browser')
      }
    case 'desktop-apps':
      return {
        label: t('workStyles.options.desktopApps.label', 'Desktop apps'),
        description: t(
          'workStyles.options.desktopApps.description',
          'Excel, Photoshop and other apps'
        )
      }
    case 'meetings':
      return {
        label: t('workStyles.options.meetings.label', 'Meetings'),
        description: t('workStyles.options.meetings.description', 'Calls, notes and dictation')
      }
  }
}

const WORK_STYLE_ORDER: readonly WorkStyle[] = ['code', 'web', 'desktop-apps', 'meetings']

type WorkStylePickerProps = {
  value: readonly WorkStyle[]
  onChange: (next: WorkStyle[]) => void
  disabled?: boolean
  className?: string
}

/** Multi-select cards: arrow keys move between cards, Space or Enter toggles one. */
export function WorkStylePicker({
  value,
  onChange,
  disabled,
  className
}: WorkStylePickerProps): React.JSX.Element {
  const t = useTranslate()
  return (
    <ToggleGroup
      type="multiple"
      variant="chip"
      spacing={2}
      value={[...value]}
      onValueChange={(next) => onChange(normalizeWorkStyles(next))}
      disabled={disabled}
      aria-label={t('workStyles.title', 'How you work')}
      className={cn('grid w-full grid-cols-2 items-stretch md:grid-cols-4', className)}
    >
      {WORK_STYLE_ORDER.map((style) => {
        const Icon = WORK_STYLE_ICONS[style]
        const copy = workStyleCopy(style, t)
        const selected = value.includes(style)
        // Why foreground when selected: muted text on the selected fill measures 4.2:1, under AA.
        const quietTextClass = selected ? 'text-foreground' : 'text-muted-foreground'
        return (
          <ToggleGroupItem
            key={style}
            value={style}
            className="h-auto w-full shrink items-start justify-start text-left whitespace-normal"
          >
            <span className="flex w-full flex-col gap-1 py-3">
              <span className="flex w-full items-center gap-2 text-sm font-medium text-foreground">
                <Icon className={quietTextClass} />
                {copy.label}
                <span
                  aria-hidden
                  className={cn(
                    'ml-auto grid size-4 shrink-0 place-items-center rounded-sm border transition-colors motion-reduce:transition-none',
                    selected ? 'border-foreground bg-foreground text-background' : 'border-input'
                  )}
                >
                  {selected ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
              </span>
              <span className={cn('text-xs leading-relaxed font-normal', quietTextClass)}>
                {copy.description}
              </span>
            </span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
