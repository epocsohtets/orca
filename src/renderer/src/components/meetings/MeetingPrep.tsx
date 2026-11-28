import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { HOME_META_CLASS, HomeCard } from '@/components/home/HomeCard'
import { MeetingMaterialList, MeetingMaterialsField } from './MeetingMaterialsField'
import { MeetingOutlineField } from './MeetingOutlineField'
import { MeetingFormField } from './MeetingParts'
import type { Meeting } from './meeting-types'
import { saveOutline } from './meetings-store'

const ID = (meetingId: string, name: string): string => `meeting-prep-${meetingId}-${name}`

/** The outline and materials the host puts in and attendees read before the meeting: two cards. */
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

  if (editing) {
    return (
      <HomeCard
        title={t('meetings.prep.edit', 'Edit outline and materials')}
        data-meeting-card="prep-edit"
      >
        <form
          className="flex flex-col gap-4 px-4 pb-2"
          onSubmit={(event) => {
            event.preventDefault()
            saveOutline(meeting.id, outline.trim(), materials)
            setEditing(false)
          }}
        >
          <MeetingFormField
            id={ID(meeting.id, 'outline')}
            label={t('meetings.form.outline', 'Outline')}
            description={t('meetings.form.outlineHelp', 'What the meeting must settle.')}
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
      </HomeCard>
    )
  }

  return (
    <>
      {/* An attendee can do nothing about a missing outline, so the card is the host's alone until there is one. */}
      {meeting.outline || isHost ? (
        <HomeCard
          title={t('meetings.prep.outline', 'Outline')}
          data-meeting-card="outline"
          action={
            isHost ? (
              <Button
                type="button"
                variant="ghost-muted"
                size="xs"
                data-meeting-prep-edit=""
                onClick={edit}
              >
                {t('meetings.prep.editShort', 'Edit')}
              </Button>
            ) : null
          }
        >
          <div className="px-4 pb-2">
            {meeting.outline ? (
              <p className="max-w-prose text-[13px] leading-relaxed whitespace-pre-line text-foreground">
                {meeting.outline}
              </p>
            ) : (
              <p className={HOME_META_CLASS}>
                {t(
                  'meetings.prep.noOutlineHost',
                  'Write what the meeting must settle, so attendees can read it first.'
                )}
              </p>
            )}
          </div>
        </HomeCard>
      ) : null}
      {/* No materials: nothing to read, so no card; the host adds them from the outline's Edit. */}
      {meeting.materials.length > 0 ? (
        <HomeCard
          title={t('meetings.prep.materials', 'Materials')}
          aside={<span className="tabular-nums">{meeting.materials.length}</span>}
          data-meeting-card="materials"
        >
          <div className="px-4 pb-2">
            <MeetingMaterialList materials={meeting.materials} />
          </div>
        </HomeCard>
      ) : null}
    </>
  )
}
