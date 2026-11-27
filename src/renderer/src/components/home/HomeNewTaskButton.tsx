import React, { useId, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { HOME_META_CLASS } from './HomeCard'

/** Adds a task of mine to the sample board. One field: a title. */
export function HomeNewTaskButton({
  disabled,
  onAdd
}: {
  disabled: boolean
  onAdd: (title: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const inputId = useId()
  const errorId = useId()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState(false)
  const errorText = t('home.newTask.error', 'Type a title for the task, then press Add.')

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setError(false)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          {t('home.header.newTask', 'New task')}
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
            onAdd(trimmed)
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
              {errorText}
            </p>
          ) : (
            <p className={HOME_META_CLASS}>
              {t('home.newTask.hint', 'It is added to My work, due today, in the sample board.')}
            </p>
          )}
          <Button type="submit" size="sm" className="self-end">
            {t('home.newTask.add', 'Add')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
