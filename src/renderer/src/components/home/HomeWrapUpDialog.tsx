import React, { useId, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HOME_META_CLASS } from './HomeCard'

export type HomeWrapUpItem = {
  id: string
  /** The task the update goes to. */
  title: string
  text: string
  included: boolean
  /** Why an item starts unchecked. */
  note?: string
}

type Item = HomeWrapUpItem & { error: boolean }

function WrapUpField({
  item,
  disabled,
  onChange
}: {
  item: Item
  disabled: boolean
  onChange: (patch: Partial<Item>) => void
}): React.JSX.Element {
  const t = useTranslate()
  const textId = useId()
  const errorId = useId()
  return (
    <li className="flex flex-col gap-2">
      <Label htmlFor={textId}>{item.title}</Label>
      <Textarea
        id={textId}
        value={item.text}
        disabled={disabled || !item.included}
        aria-invalid={item.error ? true : undefined}
        aria-describedby={item.error ? errorId : undefined}
        onChange={(event) =>
          onChange({ text: event.target.value, error: item.error && !event.target.value.trim() })
        }
        onBlur={() => onChange({ error: item.included && !item.text.trim() })}
      />
      {item.error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {t('home.wrapUp.errorEmpty', 'Write the update, or clear “Report this” to leave it out.')}
        </p>
      ) : null}
      {/* Why min-h-6: the label is the 24px target for its 16px box. */}
      <Label variant="control" className="min-h-6">
        <Checkbox
          checked={item.included}
          disabled={disabled}
          onCheckedChange={(checked) => onChange({ included: checked === true, error: false })}
        />
        {t('home.wrapUp.include', 'Report this')}
      </Label>
      {item.note ? <p className={HOME_META_CLASS}>{item.note}</p> : null}
    </li>
  )
}

/** The trust step: everything that would be reported, where it goes and who sees it, before any of it goes. */
export function HomeWrapUpDialog({
  items: initial,
  open,
  onOpenChange,
  onConfirmed
}: {
  items: readonly HomeWrapUpItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed: (count: number) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((item) => ({ ...item, error: false }))
  )
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const included = items.filter((item) => item.included)
  const confirm = (): void => {
    const checked = items.map((item) => ({ ...item, error: item.included && !item.text.trim() }))
    setItems(checked)
    if (checked.some((item) => item.error)) {
      return
    }
    setSending(true)
    // shortcut: nothing is sent; the short wait stands in for the report call.
    window.setTimeout(() => {
      setSending(false)
      setDone(included.length)
      onConfirmed(included.length)
    }, 600)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent scrollable className="sm:max-w-lg" data-home-wrap-up="">
        <DialogHeader>
          <DialogTitle>{t('home.wrapUp.title', 'Wrap up today')}</DialogTitle>
          <DialogDescription>
            {done === null
              ? t(
                  'home.wrapUp.destination',
                  'Each checked update becomes a comment on its task in inAX. The project’s members and Kim Jiwoo (team lead) see it. Unchecked items go nowhere.'
                )
              : t(
                  'home.wrapUp.done',
                  '{{count}} updates confirmed. In this sample nothing is sent to inAX.',
                  { count: done }
                )}
          </DialogDescription>
        </DialogHeader>
        {done === null ? (
          <ul className="flex flex-col gap-6">
            {items.map((item, index) => (
              <WrapUpField
                key={item.id}
                item={item}
                disabled={sending}
                onChange={(patch) =>
                  setItems((current) =>
                    current.map((entry, at) => (at === index ? { ...entry, ...patch } : entry))
                  )
                }
              />
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-3">
            {included.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-foreground">{item.title}</span>
                <span className={HOME_META_CLASS}>{item.text}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          {done === null ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={sending}
                onClick={() => onOpenChange(false)}
              >
                {t('home.wrapUp.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                disabled={sending || included.length === 0}
                aria-busy={sending || undefined}
                onClick={confirm}
              >
                {t('home.wrapUp.confirm', 'Report {{count}} updates', { count: included.length })}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('home.wrapUp.close', 'Close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
