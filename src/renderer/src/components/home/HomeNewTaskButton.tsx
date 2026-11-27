import React, { useId, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { HOME_META_CLASS } from './HomeCard'

/**
 * Adds a task of mine to the sample board: a title, and whether an agent takes it. The header shows it twice,
 * once plain and once with the hand-off already switched on.
 */
export function HomeNewTaskButton({
  label,
  primary = false,
  handOff = false,
  disabled,
  onAdd,
  ...props
}: {
  label: string
  primary?: boolean
  /** Opens with "Hand to an agent" switched on. */
  handOff?: boolean
  disabled: boolean
  onAdd: (title: string, agent: boolean) => void
} & Record<`data-${string}`, string>): React.JSX.Element {
  const t = useTranslate()
  const inputId = useId()
  const errorId = useId()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [agent, setAgent] = useState(handOff)
  const [error, setError] = useState(false)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setError(false)
          setAgent(handOff)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={primary ? 'default' : 'outline'}
          size="sm"
          disabled={disabled}
          {...props}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          className="flex flex-col gap-2"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            const trimmed = title.trim()
            if (!trimmed) {
              setError(true)
              return
            }
            onAdd(trimmed, agent)
            setTitle('')
            setOpen(false)
          }}
        >
          <Label htmlFor={inputId}>{t('home.newTask.label', 'Task title')}</Label>
          <Input
            id={inputId}
            value={title}
            autoComplete="off"
            placeholder={t('home.newTask.placeholder', 'For example: book the photo studio')}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setTitle(event.target.value)
              if (error && event.target.value.trim()) {
                setError(false)
              }
            }}
            // An untouched field is not an error; only-spaces is.
            onBlur={() => setError(title.length > 0 && !title.trim())}
          />
          {error ? (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              {t('home.newTask.error', 'Type a title for the task, then press Add.')}
            </p>
          ) : null}
          {/* Why min-h-6: the label is the 24px target for its 16px box. */}
          <Label variant="control" className="min-h-6">
            <Checkbox
              checked={agent}
              data-home-new-task-agent=""
              onCheckedChange={(checked) => setAgent(checked === true)}
            />
            {t('home.header.handOff', 'Hand to an agent')}
          </Label>
          <p className={HOME_META_CLASS}>
            {agent
              ? t(
                  'home.newTask.hintAgent',
                  'The task joins My work, and its conversation with the agent opens.'
                )
              : t('home.newTask.hint', 'It is added to My work, due today, in the sample board.')}
          </p>
          <Button type="submit" size="sm" className="self-end">
            {t('home.newTask.add', 'Add')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
