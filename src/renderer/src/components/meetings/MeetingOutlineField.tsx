import React, { useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { fieldAria } from './MeetingParts'
import { continueNumberedList } from './meeting-time-range'

/** An outline box where a numbered list continues by itself on Enter. */
export function MeetingOutlineField({
  id,
  value,
  disabled,
  autoFocus,
  onChange
}: {
  id: string
  value: string
  disabled?: boolean
  autoFocus?: boolean
  onChange: (value: string) => void
}): React.JSX.Element {
  const caret = useRef<number | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    // The caret goes after the number that was just written for the person.
    if (caret.current !== null) {
      field.current?.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [value])
  return (
    <Textarea
      ref={field}
      {...fieldAria(id, null, true)}
      rows={5}
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder="1. "
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
          return
        }
        const target = event.currentTarget
        if (target.selectionStart !== target.selectionEnd) {
          return
        }
        const next = continueNumberedList(value, target.selectionStart)
        if (next) {
          event.preventDefault()
          caret.current = next.caret
          onChange(next.value)
        }
      }}
    />
  )
}
