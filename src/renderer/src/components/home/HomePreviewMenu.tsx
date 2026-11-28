import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { DemoMenu } from '@/components/task-page/inax/InaxDemoNote'
import { MeetingViewerRadioGroup } from '@/components/meetings/MeetingViewerMenu'
import { resetSample } from './home-sample-reset'
import type { HomePhase } from './home-day'

/** Review tools for the sample: pretend a time of day, show the first-run page, start the sample over. */
export function HomePreviewMenu({
  preview,
  onPreviewChange,
  firstRun,
  onFirstRunChange
}: {
  preview: 'auto' | HomePhase
  onPreviewChange: (preview: 'auto' | HomePhase) => void
  firstRun: boolean
  onFirstRunChange: (firstRun: boolean) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <DemoMenu>
      <DropdownMenuLabel>{t('home.preview.label', 'Time of day')}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={preview}
        onValueChange={(value) => {
          if (value === 'auto' || value === 'morning' || value === 'day' || value === 'evening') {
            onPreviewChange(value)
          }
        }}
      >
        <DropdownMenuRadioItem value="auto">{t('home.preview.auto', 'Now')}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="morning">
          {t('home.preview.morning', 'Morning')}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="day">{t('home.preview.day', 'Midday')}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="evening">
          {t('home.preview.evening', 'Evening')}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <MeetingViewerRadioGroup />
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem checked={firstRun} onCheckedChange={onFirstRunChange}>
        {t('home.preview.firstRun', 'Before sign-in')}
      </DropdownMenuCheckboxItem>
      <DropdownMenuItem onSelect={resetSample}>
        {t('home.preview.reset', 'Start over')}
      </DropdownMenuItem>
    </DemoMenu>
  )
}
