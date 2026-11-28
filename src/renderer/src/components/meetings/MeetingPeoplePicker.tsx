import React, { useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { HomeAvatar } from '@/components/home/HomeCard'
import { cn } from '@/lib/class-names'
import { MEETING_PEOPLE, personName } from './meeting-people'

/** A person as a chip: small avatar, name, and a way to take them out unless they are the host. */
export function MeetingPersonChip({
  personId,
  tag,
  onRemove,
  disabled,
  plain
}: {
  personId: string
  tag?: string
  onRemove?: () => void
  disabled?: boolean
  /** In a detail header: avatar and name with no chip around them. */
  plain?: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const name = personName(personId)
  return (
    <span
      data-meeting-person-chip={personId}
      className={
        plain
          ? 'inline-flex items-center gap-1.5 text-[13px] leading-5 text-foreground'
          : 'inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-background pr-2 pl-0.5 text-xs text-foreground'
      }
    >
      <HomeAvatar name={name} />
      {name}
      {tag ? <span className="text-xs leading-4 text-muted-foreground">{tag}</span> : null}
      {onRemove ? (
        <button
          type="button"
          disabled={disabled}
          aria-label={t('meetings.form.removePerson', 'Remove {{name}}', { name })}
          className="-mr-1 flex size-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          onClick={onRemove}
        >
          <X aria-hidden className="size-3" />
        </button>
      ) : null}
    </span>
  )
}

/**
 * Who comes: the host first and fixed, then the people picked. Type a name to find someone; Enter adds the
 * marked one, Backspace on an empty field takes the last one out.
 */
export function MeetingPeoplePicker({
  id,
  hostId,
  value,
  chatMemberIds,
  disabled,
  invalid,
  describedBy,
  onChange,
  onBlur
}: {
  id: string
  hostId: string
  value: readonly string[]
  /** People of the chat the meeting was started from: named as such in the list. */
  chatMemberIds?: readonly string[]
  disabled?: boolean
  invalid: boolean
  describedBy?: string
  onChange: (ids: string[]) => void
  onBlur: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const found = MEETING_PEOPLE.filter(
    (person) =>
      person.id !== hostId &&
      !value.includes(person.id) &&
      (person.name.includes(query.trim()) || person.role.includes(query.trim()))
  )
  const marked = Math.min(active, Math.max(0, found.length - 1))
  const add = (personId: string): void => {
    onChange([...value, personId])
    setQuery('')
    setActive(0)
    input.current?.focus()
  }
  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
          onBlur()
        }
      }}
    >
      {/* The box is the field: it carries the border and the ring, the text run inside has none. */}
      <div
        data-meeting-people-picker=""
        aria-invalid={invalid}
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30',
          invalid && 'border-destructive',
          disabled && 'pointer-events-none opacity-50'
        )}
        onClick={() => input.current?.focus()}
      >
        <MeetingPersonChip personId={hostId} tag={t('meetings.form.host', 'Host')} />
        {value.map((personId) => (
          <MeetingPersonChip
            key={personId}
            personId={personId}
            disabled={disabled}
            onRemove={() => onChange(value.filter((entry) => entry !== personId))}
          />
        ))}
        <Input
          ref={input}
          id={id}
          surface="embedded"
          role="combobox"
          aria-expanded={open && found.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            open && found[marked] ? `${listId}-${found[marked].id}` : undefined
          }
          aria-autocomplete="list"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          autoComplete="off"
          disabled={disabled}
          className="h-6 min-w-24 flex-1"
          placeholder={t('meetings.form.findPerson', 'Find by name')}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) {
              return
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setOpen(true)
              setActive(
                (marked + (event.key === 'ArrowDown' ? 1 : -1) + found.length) %
                  Math.max(1, found.length)
              )
            } else if (event.key === 'Enter' && open && found[marked]) {
              event.preventDefault()
              add(found[marked].id)
            } else if (event.key === 'Escape' && open) {
              event.stopPropagation()
              setOpen(false)
            } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
        />
      </div>
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('meetings.form.people', 'People')}
          className="absolute top-full left-0 z-50 mt-1 max-h-56 w-full min-w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md scrollbar-sleek"
        >
          {found.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
              {query.trim()
                ? t('meetings.form.noPerson', 'Nobody is called “{{query}}”. Check the name.', {
                    query: query.trim()
                  })
                : t('meetings.form.everyoneIn', 'Everyone is already in.')}
            </li>
          ) : (
            found.map((person, index) => (
              <li
                key={person.id}
                id={`${listId}-${person.id}`}
                role="option"
                aria-selected={index === marked}
                data-meeting-person-option={person.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[13px]',
                  index === marked && 'bg-accent'
                )}
                // Mouse down, not click: the field must not lose the keyboard first.
                onMouseDown={(event) => {
                  event.preventDefault()
                  add(person.id)
                }}
                onMouseEnter={() => setActive(index)}
              >
                <HomeAvatar name={person.name} />
                <span className="text-foreground">{person.name}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {person.role}
                </span>
                {chatMemberIds?.includes(person.id) ? (
                  <Badge variant="outline">{t('meetings.form.inChat', 'In this chat')}</Badge>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
