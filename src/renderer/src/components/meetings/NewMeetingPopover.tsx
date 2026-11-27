import React, { useRef, useState } from 'react'
import { Circle, Plus } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RailPageSecondaryButton } from '@/components/rail-page/RailPageHeader'
import { fieldAria, MeetingFormField } from './MeetingParts'
import { startAdHocMeeting } from './meetings-mock'

const TITLE_MAX = 80
const FIELD_ID = 'new-meeting-title'

/** Starts a meeting with no calendar entry and no linked task; the title is optional. */
export function NewMeetingPopover({
  open,
  onOpenChange,
  onStarted
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const label = t('meetings.new.button', 'New meeting')
  const check = (value: string): string | null =>
    value.trim().length > TITLE_MAX
      ? t('meetings.new.titleTooLong', 'Use {{max}} characters or fewer.', { max: TITLE_MAX })
      : null

  const handleOpenChange = (next: boolean): void => {
    if (!next) {
      clearTimeout(timer.current)
      setTitle('')
      setError(null)
      setStarting(false)
    }
    onOpenChange(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <RailPageSecondaryButton icon={<Plus aria-hidden />} label={label} aria-label={label} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          className="flex flex-col gap-4 p-4"
          noValidate
          aria-busy={starting}
          onSubmit={(event) => {
            event.preventDefault()
            const invalid = check(title)
            setError(invalid)
            if (invalid) {
              document.getElementById(FIELD_ID)?.focus()
              return
            }
            setStarting(true)
            // shortcut: a fixed delay stands in for creating the meeting; drop it when a real call exists.
            timer.current = setTimeout(() => {
              startAdHocMeeting(title.trim() || t('meetings.new.untitled', 'Untitled meeting'))
              handleOpenChange(false)
              onStarted()
            }, 500)
          }}
        >
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{label}</h2>
            <p className="text-xs text-muted-foreground">
              {t(
                'meetings.new.description',
                'Starts now, with no calendar entry and no linked task. You can link a task later.'
              )}
            </p>
          </div>
          <MeetingFormField
            id={FIELD_ID}
            label={t('meetings.new.titleLabel', 'Title')}
            description={t('meetings.new.titleHelp', 'Optional.')}
            error={error}
          >
            <Input
              {...fieldAria(FIELD_ID, error, true)}
              value={title}
              maxLength={200}
              disabled={starting}
              autoFocus
              onChange={(event) => {
                setTitle(event.target.value)
                // Checked on blur; while typing, an error only clears once the value is valid again.
                if (error && !check(event.target.value)) {
                  setError(null)
                }
              }}
              onBlur={() => setError(check(title))}
            />
          </MeetingFormField>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => handleOpenChange(false)}>
              {t('meetings.cancel', 'Cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={starting}>
              {starting ? (
                <LoadingSpinner className="size-3" />
              ) : (
                <Circle className="size-3 fill-current" aria-hidden />
              )}
              {t('meetings.recorder.start', 'Start recording')}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
