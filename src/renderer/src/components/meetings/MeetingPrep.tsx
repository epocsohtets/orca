import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { MeetingOutlineField } from './MeetingOutlineField'
import { MeetingMaterialList, MeetingMaterialsField } from './MeetingMaterialsField'
import { MeetingFormField, MeetingSection } from './MeetingParts'
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
  const [materials, setMaterials] = useState(meeting.materials)
  const edit = (): void => {
    setOutline(meeting.outline)
    setMaterials(meeting.materials)
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
          saveOutline(meeting.id, outline.trim(), materials)
          setEditing(false)
        }}
      >
        <MeetingFormField
          id={ID(meeting.id, 'outline')}
          label={t('meetings.form.outline', 'Outline')}
          description={t(
            'meetings.form.outlineHelp',
            'What the meeting must settle. Start a line with “1.” and the numbers continue.'
          )}
        >
          <MeetingOutlineField
            id={ID(meeting.id, 'outline')}
            value={outline}
            autoFocus
            onChange={setOutline}
          />
        </MeetingFormField>
        <MeetingFormField
          id={ID(meeting.id, 'materials')}
          label={t('meetings.form.materials', 'Materials')}
          description={t(
            'meetings.form.materialsHelp',
            'Files and links attendees should read first. Optional.'
          )}
        >
          <MeetingMaterialsField
            id={ID(meeting.id, 'materials')}
            value={materials}
            onChange={setMaterials}
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
          <div className="max-w-xl">
            <MeetingMaterialList materials={meeting.materials} />
          </div>
        </MeetingSection>
      ) : null}
    </div>
  )
}
