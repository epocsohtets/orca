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
import { RailPageMoreMenu } from '@/components/rail-page/RailPageHeader'
import { resetHomeBoard } from './home-board-store'
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
  const label = t('home.preview.label', 'Sample preview')
  return (
    <RailPageMoreMenu label={label}>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={preview}
        onValueChange={(value) => {
          if (value === 'auto' || value === 'morning' || value === 'day' || value === 'evening') {
            onPreviewChange(value)
          }
        }}
      >
        <DropdownMenuRadioItem value="auto">
          {t('home.preview.auto', 'Follow the clock')}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="morning">
          {t('home.preview.morning', 'Morning')}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="day">{t('home.preview.day', 'Midday')}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="evening">
          {t('home.preview.evening', 'Evening')}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem checked={firstRun} onCheckedChange={onFirstRunChange}>
        {t('home.preview.firstRun', 'First run')}
      </DropdownMenuCheckboxItem>
      <DropdownMenuItem onSelect={resetHomeBoard}>
        {t('home.preview.reset', 'Start the sample over')}
      </DropdownMenuItem>
    </RailPageMoreMenu>
  )
}
