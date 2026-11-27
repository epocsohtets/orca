import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SIDEBAR_CHAT_CONVERSATIONS } from '@/components/sidebar-chat/sidebar-chat-mock-data'
import { MEETING_PEOPLE } from './meeting-people'
import { PROMO_DEFAULTS } from './meeting-sample-promo'
import { atTime, dateKey } from './meeting-schedule'
import { fieldAria, MeetingFormField } from './MeetingParts'
import { scenarioNow, scheduleMeeting, useMeetings } from './meetings-store'

const TITLE_MAX = 60
const DURATIONS = [30, 50, 60, 90]
const ID = (name: string): string => `meeting-schedule-${name}`

/** Sets up a meeting: when, who, and what attendees should read first. One column, checked on blur. */
export function MeetingScheduleForm({
  conversationId,
  onCancel
}: {
  conversationId: string | null
  onCancel: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  const today = useMeetings((state) => state.day)
  const origin = SIDEBAR_CHAT_CONVERSATIONS.find(({ id }) => id === conversationId) ?? null
  // The promotion chat carries its own subject and members; any other start is blank.
  const preset = conversationId === PROMO_DEFAULTS.conversationId ? PROMO_DEFAULTS : null
  const [title, setTitle] = useState(preset?.title ?? '')
  const [timing, setTiming] = useState<'now' | 'later'>('later')
  const [date, setDate] = useState(dateKey(today))
  const [time, setTime] = useState('14:00')
  const [minutes, setMinutes] = useState(50)
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    preset ? preset.attendeeIds.filter((id) => id !== viewerId) : []
  )
  const [place, setPlace] = useState(preset?.place ?? '')
  const [outline, setOutline] = useState(preset?.outline ?? '')
  const [materials, setMaterials] = useState(preset?.materials.join('\n') ?? '')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  const check = {
    title: (): string | undefined =>
      !title.trim()
        ? t(
            'meetings.form.titleRequired',
            'Enter a title so attendees know what the meeting is for.'
          )
        : title.trim().length > TITLE_MAX
          ? t('meetings.form.titleTooLong', 'Use {{max}} characters or fewer.', { max: TITLE_MAX })
          : undefined,
    date: (): string | undefined =>
      timing === 'later' && (!date || date < dateKey(today))
        ? t('meetings.form.datePast', 'Choose today or a later date.')
        : undefined,
    time: (): string | undefined =>
      timing === 'later' && !time
        ? t('meetings.form.timeRequired', 'Enter a start time.')
        : undefined,
    attendees: (ids = attendeeIds): string | undefined =>
      ids.length === 0
        ? t('meetings.form.attendeesRequired', 'Choose at least one attendee.')
        : undefined
  }
  const others = MEETING_PEOPLE.filter((person) => person.id !== viewerId)
  const inChat = (id: string): boolean => preset?.attendeeIds.includes(id) ?? false
  // From a chat, its members come first and are ticked; anyone else is an explicit addition.
  const candidateGroups = (
    preset && origin
      ? [
          {
            id: 'chat',
            label: t('meetings.form.chatMembers', 'Members of “{{name}}”', { name: origin.name }),
            people: others.filter((person) => inChat(person.id))
          },
          {
            id: 'others',
            label: t('meetings.form.otherPeople', 'Add someone else'),
            people: others.filter((person) => !inChat(person.id))
          }
        ]
      : [{ id: 'all', label: '', people: others }]
  ).filter((group) => group.people.length > 0)
  const blur = (field: keyof typeof check) => () =>
    setErrors((current) => ({ ...current, [field]: check[field]() }))
  // While typing, an error only clears once the value is valid again.
  const clear = (field: keyof typeof check): void => {
    if (errors[field]) {
      queueMicrotask(() => setErrors((current) => ({ ...current, [field]: undefined })))
    }
  }

  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    const next = {
      title: check.title(),
      date: check.date(),
      time: check.time(),
      attendees: check.attendees()
    }
    setErrors(next)
    const firstInvalid = (['title', 'date', 'time', 'attendees'] as const).find((f) => next[f])
    if (firstInvalid) {
      document.getElementById(ID(firstInvalid))?.focus()
      return
    }
    const [year, month, dayOfMonth] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    const startsAt =
      timing === 'now'
        ? scenarioNow(today)
        : atTime(new Date(year, month - 1, dayOfMonth).getTime(), hour, minute)
    scheduleMeeting({
      title: title.trim(),
      attendeeIds,
      startsAt,
      endsAt: startsAt + minutes * 60_000,
      place: place.trim(),
      outline: outline.trim(),
      materials: materials
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      originConversationId: conversationId,
      sample: preset ? 'promo' : 'generic',
      startNow: false
    })
  }

  return (
    <form className="flex max-w-xl flex-col gap-5" noValidate onSubmit={submit}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t('meetings.form.heading', 'Set up a meeting')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {origin
            ? t(
                'meetings.form.fromChat',
                'From the chat “{{name}}”. The meeting links back to it; it stays its own item.',
                { name: origin.name }
              )
            : t(
                'meetings.form.intro',
                'Attendees get it on their own schedule and can read the outline first.'
              )}
        </p>
      </div>

      <MeetingFormField
        id={ID('title')}
        label={t('meetings.form.title', 'Title')}
        error={errors.title}
      >
        <Input
          {...fieldAria(ID('title'), errors.title)}
          value={title}
          autoFocus
          onChange={(event) => {
            setTitle(event.target.value)
            clear('title')
          }}
          onBlur={blur('title')}
        />
      </MeetingFormField>

      <fieldset className="space-y-2">
        <legend className="text-sm leading-none font-medium">
          {t('meetings.form.when', 'When')}
        </legend>
        <RadioGroup
          value={timing}
          onValueChange={(value) => setTiming(value === 'now' ? 'now' : 'later')}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="later" id={ID('later')} />
            <Label htmlFor={ID('later')} variant="control">
              {t('meetings.form.later', 'On a date and time')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="now" id={ID('now')} />
            <Label htmlFor={ID('now')} variant="control">
              {t('meetings.form.now', 'Right now')}
            </Label>
          </div>
        </RadioGroup>
      </fieldset>

      {timing === 'later' ? (
        <>
          <MeetingFormField
            id={ID('date')}
            label={t('meetings.form.date', 'Date')}
            error={errors.date}
          >
            {/* shortcut: native date and time inputs; use the month-calendar popover if this outlives the PoC. */}
            <Input
              type="date"
              className="w-44"
              {...fieldAria(ID('date'), errors.date)}
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                clear('date')
              }}
              onBlur={blur('date')}
            />
          </MeetingFormField>
          <MeetingFormField
            id={ID('time')}
            label={t('meetings.form.time', 'Start time')}
            error={errors.time}
          >
            <Input
              type="time"
              className="w-32"
              {...fieldAria(ID('time'), errors.time)}
              value={time}
              onChange={(event) => {
                setTime(event.target.value)
                clear('time')
              }}
              onBlur={blur('time')}
            />
          </MeetingFormField>
        </>
      ) : null}

      <MeetingFormField id={ID('length')} label={t('meetings.form.length', 'Length')}>
        <Select value={String(minutes)} onValueChange={(value) => setMinutes(Number(value))}>
          <SelectTrigger id={ID('length')} size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {t('meetings.form.minutes', '{{count}} min', { count: value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </MeetingFormField>

      <fieldset
        className="space-y-2"
        aria-describedby={errors.attendees ? `${ID('attendees')}-error` : undefined}
      >
        <legend className="text-sm leading-none font-medium">
          {t('meetings.form.attendees', 'Attendees')}
        </legend>
        <div className="flex flex-col gap-2" onBlur={blur('attendees')}>
          {candidateGroups.map((group) => (
            <React.Fragment key={group.id}>
              {group.label ? <p className="text-xs text-muted-foreground">{group.label}</p> : null}
              {group.people.map((person) => {
                const first = person.id === candidateGroups[0].people[0]?.id
                const id = first ? ID('attendees') : ID(`attendee-${person.id}`)
                return (
                  <div key={person.id} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={attendeeIds.includes(person.id)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...attendeeIds, person.id]
                          : attendeeIds.filter((entry) => entry !== person.id)
                        setAttendeeIds(next)
                        if (errors.attendees && !check.attendees(next)) {
                          setErrors((current) => ({ ...current, attendees: undefined }))
                        }
                      }}
                    />
                    <Label htmlFor={id} variant="control">
                      {person.name}
                      <span className="font-normal text-muted-foreground">{person.role}</span>
                    </Label>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
        {errors.attendees ? (
          <p id={`${ID('attendees')}-error`} role="alert" className="text-xs text-destructive">
            {errors.attendees}
          </p>
        ) : null}
      </fieldset>

      <MeetingFormField
        id={ID('place')}
        label={t('meetings.form.place', 'Place')}
        description={t('meetings.form.optional', 'Optional.')}
      >
        <Input
          {...fieldAria(ID('place'), null, true)}
          value={place}
          onChange={(event) => setPlace(event.target.value)}
        />
      </MeetingFormField>

      <MeetingFormField
        id={ID('outline')}
        label={t('meetings.form.outline', 'Outline')}
        description={t(
          'meetings.form.outlineHelp',
          'What the meeting must settle. Attendees read this before they come.'
        )}
      >
        <Textarea
          {...fieldAria(ID('outline'), null, true)}
          rows={4}
          value={outline}
          onChange={(event) => setOutline(event.target.value)}
        />
      </MeetingFormField>

      <MeetingFormField
        id={ID('materials')}
        label={t('meetings.form.materials', 'Materials')}
        description={t('meetings.form.materialsHelp', 'One file or link name on each line.')}
      >
        <Textarea
          {...fieldAria(ID('materials'), null, true)}
          rows={2}
          value={materials}
          onChange={(event) => setMaterials(event.target.value)}
        />
      </MeetingFormField>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t('meetings.form.submit', 'Set up meeting')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('meetings.cancel', 'Cancel')}
        </Button>
      </div>
    </form>
  )
}
