import React, { useEffect, useRef, useState } from 'react'
import { MeetingOutlineField } from './MeetingOutlineField'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Switch } from '@/components/ui/switch'
import { SIDEBAR_CHAT_CONVERSATIONS } from '@/components/sidebar-chat/sidebar-chat-mock-data'
import { MeetingDateTimeRangeField } from './MeetingDateTimeRangeField'
import { MeetingMaterialsField } from './MeetingMaterialsField'
import { fieldAria, MeetingFormField } from './MeetingParts'
import { MeetingPeoplePicker } from './MeetingPeoplePicker'
import { PROMO_DEFAULTS } from './meeting-sample-promo'
import { DEFAULT_MEETING_MINUTES, checkRange, type MeetingRange } from './meeting-time-range'
import type { MeetingMaterial } from './meeting-types'
import { scenarioNow, scheduleMeeting, useMeetings, type MeetingComposing } from './meetings-store'

const TITLE_MAX = 60
const MINUTE = 60_000
const SAVE_MS = 600
const ID = (name: string): string => `meeting-create-${name}`

/** The next half hour that is at least ten minutes away. */
function nextSlot(now: number): number {
  const slot = 30 * MINUTE
  return Math.ceil((now + 10 * MINUTE) / slot) * slot
}

/** Creates a meeting: one column, labels above, each field checked when the keyboard leaves it. */
export function MeetingCreateForm({
  composing,
  onCancel
}: {
  composing: MeetingComposing
  onCancel: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  const today = useMeetings((state) => state.day)
  const meetings = useMeetings((state) => state.meetings)
  const { conversationId, draft } = composing
  const origin = SIDEBAR_CHAT_CONVERSATIONS.find(({ id }) => id === conversationId) ?? null
  // The promotion chat carries its own subject and materials; any other start is blank.
  const preset = conversationId === PROMO_DEFAULTS.conversationId ? PROMO_DEFAULTS : null
  const chatMemberIds = origin?.memberIds.filter((id) => id !== viewerId)
  // Read once: the form is about the moment it was opened.
  const [openedAt] = useState(scenarioNow)
  const [title, setTitle] = useState(draft?.title ?? preset?.title ?? '')
  const [startNow, setStartNow] = useState(composing.startNow === true)
  const [range, setRange] = useState<MeetingRange>(() => {
    const startsAt = draft?.startsAt ?? nextSlot(openedAt)
    return { startsAt, endsAt: draft?.endsAt ?? startsAt + DEFAULT_MEETING_MINUTES * MINUTE }
  })
  const [typedTime, setTypedTime] = useState<string | null>(null)
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    draft?.attendeeIds ?? chatMemberIds ?? []
  )
  const [place, setPlace] = useState(draft?.place ?? preset?.place ?? '')
  const [outline, setOutline] = useState(draft?.outline ?? preset?.outline ?? '')
  const [materials, setMaterials] = useState<MeetingMaterial[]>(
    draft?.materials ?? preset?.materials ?? []
  )
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  // The schedule is checked from the first time the keyboard leaves its row, on every change after that.
  const [whenTouched, setWhenTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  // Starting now keeps the length that was set and moves it to this moment.
  const shownRange: MeetingRange = startNow
    ? { startsAt: openedAt, endsAt: openedAt + Math.max(MINUTE, range.endsAt - range.startsAt) }
    : range
  const recentPlaces = [...new Set(meetings.map((meeting) => meeting.place).filter(Boolean))]
    .filter((entry) => entry !== place)
    .slice(0, 4)

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
    when: (): string | undefined => {
      if (typedTime !== null) {
        return t(
          'meetings.form.timeInvalid',
          '“{{typed}}” is not a time. Write it like 15:30, or pick one from the list.',
          { typed: typedTime }
        )
      }
      const problem = checkRange(shownRange)
      return problem === 'endBeforeStart'
        ? t(
            'meetings.form.endBeforeStart',
            'The end must be after the start. Move the end time or the end date later.'
          )
        : problem === 'tooLong'
          ? t(
              'meetings.form.rangeTooLong',
              'This is longer than 14 days. Move the end date earlier.'
            )
          : undefined
    },
    attendees: (ids = attendeeIds): string | undefined =>
      ids.length === 0
        ? t('meetings.form.attendeesRequired', 'Add at least one person besides the host.')
        : undefined
  }
  const whenError = whenTouched || typedTime !== null ? check.when() : undefined
  const blur = (field: keyof typeof check) => () =>
    setErrors((current) => ({ ...current, [field]: check[field]() }))
  const clear = (field: keyof typeof check): void => {
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    const next = { title: check.title(), when: check.when(), attendees: check.attendees() }
    setErrors(next)
    setWhenTouched(true)
    const firstInvalid = (['title', 'when', 'attendees'] as const).find((field) => next[field])
    if (firstInvalid) {
      document.getElementById(ID(firstInvalid))?.focus()
      return
    }
    setSaving(true)
    // shortcut: a short wait stands in for the save request; replace with the request when meetings have a backend.
    timer.current = setTimeout(() => {
      scheduleMeeting({
        title: title.trim(),
        attendeeIds,
        ...shownRange,
        place: place.trim(),
        outline: outline.trim(),
        materials,
        originConversationId: conversationId,
        sample: preset ? 'promo' : 'generic',
        project: draft?.project ?? (preset ? 'promo' : 'campaign'),
        startNow,
        whisperMessageId: composing.whisperMessageId
      })
    }, SAVE_MS)
  }
  const days = Math.round(
    (new Date(shownRange.endsAt).setHours(0, 0, 0, 0) -
      new Date(shownRange.startsAt).setHours(0, 0, 0, 0)) /
      86_400_000
  )
  const lengthMinutes = Math.round((shownRange.endsAt - shownRange.startsAt) / MINUTE)

  return (
    <form
      className="flex max-w-xl flex-col gap-5"
      noValidate
      aria-busy={saving}
      data-meeting-create-form=""
      onSubmit={submit}
    >
      {draft || origin ? (
        <p className="text-xs text-muted-foreground">
          {draft
            ? t(
                'meetings.form.fromWhisper',
                'The meeting agent filled this in from the chat “{{name}}”. Change what is wrong.',
                { name: origin?.name ?? '' }
              )
            : t('meetings.form.fromChat', 'From the chat “{{name}}”', { name: origin?.name ?? '' })}
        </p>
      ) : null}

      <MeetingFormField
        id={ID('title')}
        label={t('meetings.form.title', 'Title')}
        error={errors.title}
      >
        <Input
          {...fieldAria(ID('title'), errors.title)}
          value={title}
          autoFocus
          disabled={saving}
          onChange={(event) => {
            setTitle(event.target.value)
            clear('title')
          }}
          onBlur={blur('title')}
        />
      </MeetingFormField>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span id={`${ID('when')}-label`} className="text-sm leading-none font-medium">
            {t('meetings.form.when', 'When')}
          </span>
          <span className="flex items-center gap-2">
            <Switch
              id={ID('now')}
              size="compact"
              checked={startNow}
              disabled={saving}
              onCheckedChange={setStartNow}
            />
            <Label htmlFor={ID('now')} variant="control">
              {t('meetings.form.now', 'Start now and record')}
            </Label>
          </span>
        </div>
        <MeetingDateTimeRangeField
          id={ID('when')}
          value={shownRange}
          today={today}
          startDisabled={startNow}
          disabled={saving}
          invalid={Boolean(whenError)}
          onChange={setRange}
          onTimeTyped={setTypedTime}
          onBlur={() => setWhenTouched(true)}
        />
        {whenError ? (
          <p id={`${ID('when')}-error`} role="alert" className="text-xs text-destructive">
            {whenError}
          </p>
        ) : (
          <p id={`${ID('when')}-description`} className="text-xs text-muted-foreground">
            {days > 0
              ? t('meetings.form.spansDays', 'Runs over {{count}} days.', { count: days + 1 })
              : lengthMinutes >= 60
                ? t('meetings.form.lengthHours', '{{h}} hr {{m}} min long', {
                    h: Math.floor(lengthMinutes / 60),
                    m: lengthMinutes % 60
                  })
                : t('meetings.form.lengthMinutes', '{{count}} min long', {
                    count: Math.max(0, lengthMinutes)
                  })}
          </p>
        )}
      </div>

      <MeetingFormField id={ID('place')} label={t('meetings.form.place', 'Place')}>
        <Input
          {...fieldAria(ID('place'), null)}
          value={place}
          disabled={saving}
          onChange={(event) => setPlace(event.target.value)}
        />
        {recentPlaces.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5" data-meeting-recent-places="">
            <span className="text-xs text-muted-foreground">
              {t('meetings.form.recentPlaces', 'Used recently')}
            </span>
            {recentPlaces.map((entry) => (
              <Button
                key={entry}
                type="button"
                variant="outline"
                size="xs"
                disabled={saving}
                onClick={() => setPlace(entry)}
              >
                {entry}
              </Button>
            ))}
          </div>
        ) : null}
      </MeetingFormField>

      <MeetingFormField
        id={ID('attendees')}
        label={t('meetings.form.attendees', 'Attendees')}
        description={
          origin
            ? t(
                'meetings.form.attendeesFromChat',
                'The people of “{{name}}” are in. Take out anyone who need not come.',
                { name: origin.name }
              )
            : undefined
        }
        error={errors.attendees}
      >
        <MeetingPeoplePicker
          id={ID('attendees')}
          hostId={viewerId}
          value={attendeeIds}
          chatMemberIds={chatMemberIds}
          disabled={saving}
          invalid={Boolean(errors.attendees)}
          describedBy={
            errors.attendees ? `${ID('attendees')}-error` : `${ID('attendees')}-description`
          }
          onChange={(next) => {
            setAttendeeIds(next)
            if (errors.attendees && !check.attendees(next)) {
              setErrors((current) => ({ ...current, attendees: undefined }))
            }
          }}
          onBlur={blur('attendees')}
        />
      </MeetingFormField>

      <MeetingFormField id={ID('materials')} label={t('meetings.form.materials', 'Materials')}>
        <MeetingMaterialsField
          id={ID('materials')}
          value={materials}
          disabled={saving}
          onChange={setMaterials}
        />
      </MeetingFormField>

      <MeetingFormField id={ID('outline')} label={t('meetings.form.outline', 'Outline')}>
        <MeetingOutlineField
          id={ID('outline')}
          value={outline}
          disabled={saving}
          onChange={setOutline}
        />
      </MeetingFormField>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving} data-meeting-create-submit="">
          {saving ? <LoadingSpinner /> : null}
          {saving
            ? t('meetings.form.saving', 'Creating')
            : startNow
              ? t('meetings.form.submitNow', 'Create and record')
              : t('meetings.form.submit', 'Create')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          // Leaving must not first check the field the keyboard was in: the message would move this button.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}
        >
          {t('meetings.cancel', 'Cancel')}
        </Button>
      </div>
    </form>
  )
}
