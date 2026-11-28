import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MEETING_PEOPLE, personName } from './meeting-people'
import { setViewer, useMeetings } from './meetings-store'

/** Not part of the product: the PoC's way to be another person of the sample team on one machine. */
export function MeetingViewerRadioGroup(): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  return (
    <>
      <DropdownMenuLabel>{t('meetings.viewerLabel', 'Seen as')}</DropdownMenuLabel>
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

export function MeetingViewerMenu(): React.JSX.Element {
  const t = useTranslate()
  const viewerId = useMeetings((state) => state.viewerId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" data-meeting-viewer="">
          <Badge variant="outline">{t('meetings.demo', 'Demo')}</Badge>
          {t('meetings.viewer', 'Seen as {{name}}', { name: personName(viewerId) })}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MeetingViewerRadioGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
