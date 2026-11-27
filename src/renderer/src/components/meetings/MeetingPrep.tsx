import React, { useState } from 'react'
import { FileText } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { fieldAria, MeetingFormField, MeetingSection } from './MeetingParts'
import type { Meeting } from './meeting-types'
import { saveOutline } from './meetings-store'

const ID = (meetingId: string, name: string): string => `meeting-prep-${meetingId}-${name}`

/** The outline and materials the host puts in and attendees read before the meeting. */
export function MeetingPrep({
  meeting,
  isHost
}: {
  meeting: Meeting
  isHost: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const [editing, setEditing] = useState(false)
  const [outline, setOutline] = useState(meeting.outline)
  const [materials, setMaterials] = useState(meeting.materials.join('\n'))
  const edit = (): void => {
    setOutline(meeting.outline)
    setMaterials(meeting.materials.join('\n'))
    setEditing(true)
  }
  const editButton = (label: string): React.JSX.Element => (
    <Button type="button" variant="ghost" size="xs" onClick={edit}>
      {label}
    </Button>
  )

  if (editing) {
    return (
      <form
        className="flex max-w-xl flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          saveOutline(
            meeting.id,
            outline.trim(),
            materials
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          )
          setEditing(false)
        }}
      >
        <MeetingFormField
          id={ID(meeting.id, 'outline')}
          label={t('meetings.form.outline', 'Outline')}
          description={t(
            'meetings.form.outlineHelp',
            'What the meeting must settle. Attendees read this before they come.'
          )}
        >
          <Textarea
            {...fieldAria(ID(meeting.id, 'outline'), null, true)}
            rows={5}
            autoFocus
            value={outline}
            onChange={(event) => setOutline(event.target.value)}
          />
        </MeetingFormField>
        <MeetingFormField
          id={ID(meeting.id, 'materials')}
          label={t('meetings.form.materials', 'Materials')}
          description={t('meetings.form.materialsHelp', 'One file or link name on each line.')}
        >
          <Textarea
            {...fieldAria(ID(meeting.id, 'materials'), null, true)}
            rows={3}
            value={materials}
            onChange={(event) => setMaterials(event.target.value)}
          />
        </MeetingFormField>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            {t('meetings.save', 'Save')}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t('meetings.cancel', 'Cancel')}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <MeetingSection
        title={t('meetings.prep.outline', 'Outline')}
        action={
          isHost && meeting.outline
            ? editButton(t('meetings.prep.edit', 'Edit outline and materials'))
            : null
        }
      >
        {meeting.outline ? (
          <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-foreground">
            {meeting.outline}
          </p>
        ) : isHost ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">
              {t(
                'meetings.prep.noOutlineHost',
                'No outline yet. Write what the meeting must settle so attendees can read it first.'
              )}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={edit}>
              {t('meetings.prep.write', 'Write the outline')}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('meetings.prep.noOutline', 'The host has not added an outline yet.')}
          </p>
        )}
      </MeetingSection>
      {meeting.materials.length > 0 ? (
        <MeetingSection title={t('meetings.prep.materials', 'Materials')}>
          <ul className="flex flex-col gap-1">
            {meeting.materials.map((name) => (
              <li key={name} className="flex items-center gap-2 text-[13px] text-foreground">
                <FileText aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                {name}
              </li>
            ))}
          </ul>
        </MeetingSection>
      ) : null}
    </div>
  )
}
