import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { DemoMenu } from '@/components/task-page/inax/InaxDemoNote'
import { MEETING_PEOPLE } from './meeting-people'
import { setViewer, useMeetings } from './meetings-store'

/** Not part of the product: the PoC's way to be another person of the sample team on one machine. */
export function MeetingViewerRadioGroup(): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  return (
    <>
      <DropdownMenuLabel>{t('meetings.viewerLabel', 'Signed in as')}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={viewerId} onValueChange={setViewer}>
        {MEETING_PEOPLE.map((person) => (
          <DropdownMenuRadioItem
            key={person.id}
            value={person.id}
            data-meeting-viewer-option={person.id}
          >
            {person.name}
            <span className="text-muted-foreground">{person.role}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}

/** Meetings' demo chip: be another person of the team, or start over. */
export function MeetingViewerMenu({ onReset }: { onReset: () => void }): React.JSX.Element {
  const t = useTranslate()
  return (
    <DemoMenu>
      <MeetingViewerRadioGroup />
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onReset}>
        {t('home.preview.reset', 'Start over')}
      </DropdownMenuItem>
    </DemoMenu>
  )
}
