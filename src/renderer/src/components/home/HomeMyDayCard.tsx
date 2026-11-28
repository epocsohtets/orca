import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { HOME_META_CLASS, HomeCard } from './HomeCard'
import { HomeRecordRow } from './HomeRecordRow'
import type { HomeRecordAnswer, HomeTask } from './home-board'
import type { HomeDayRecord, HomeDaySegment } from './home-board-day-mock'

// Three steps of one token: each holds 3:1 against the card in both themes.
const SEGMENT_CLASS: Record<HomeDaySegment['id'], string> = {
  app: 'bg-foreground',
  browser: 'bg-foreground/75',
  meeting: 'bg-foreground/50'
}

/** My day as the app recorded it. Only I see it; the sentence beside the title says so. */
export function HomeMyDayCard({
  segments,
  duration,
  records,
  answers,
  tasks,
  onAnswer,
  wrappedUp,
  prominent,
  hasApp,
  onManageApps,
  onManageBrowser,
  onWrapUp
}: {
  segments: readonly HomeDaySegment[]
  duration: (minutes: number) => string
  records: readonly HomeDayRecord[]
  answers: Readonly<Record<string, HomeRecordAnswer>>
  tasks: readonly HomeTask[]
  onAnswer: (recordId: string, answer: HomeRecordAnswer | null) => void
  wrappedUp: number | null
  /** Evening: wrapping up is the point of the visit. */
  prominent: boolean
  hasApp: boolean
  onManageApps: () => void
  onManageBrowser: () => void
  onWrapUp: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const total = segments.reduce((sum, segment) => sum + segment.minutes, 0)
  const open = records.filter((record) => !answers[record.id]).length

  return (
    <HomeCard
      title={t('home.day.title', 'My day')}
      aside={t(
        'home.day.privacy',
        'Only I see this. Only what I confirm in Wrap up today is reported to the team.'
      )}
      data-home-card="day"
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost-muted" size="xs" data-home-manage-records="">
              {t('home.day.manage', 'Manage records')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onManageApps}>
              {t('home.day.manageApps', 'Apps that are recorded')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onManageBrowser}>
              {t('home.day.manageBrowser', 'Browser activity record')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="flex flex-col gap-2 px-4 pb-2">
        {total > 0 ? (
          <>
            <div aria-hidden className="flex h-2 overflow-hidden rounded-full">
              {segments.map((segment) => (
                <span
                  key={segment.id}
                  className={SEGMENT_CLASS[segment.id]}
                  style={{ width: `${(segment.minutes / total) * 100}%` }}
                />
              ))}
            </div>
            {/* The legend is the text form of the bar, in the bar's order. */}
            <ul className="flex flex-wrap gap-x-4 gap-y-1" data-home-day-legend="">
              {segments.map((segment) => (
                <li key={segment.id} className="flex items-center gap-1.5 text-xs text-foreground">
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-sm ${SEGMENT_CLASS[segment.id]}`}
                  />
                  <span>{segment.label}</span>
                  <span className="font-medium tabular-nums">{duration(segment.minutes)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[13px] font-medium text-foreground">
            {t(
              'home.day.nothing',
              'Use a registered app or hold a meeting and today’s records collect here.'
            )}
          </p>
        )}
        <p className={HOME_META_CLASS}>
          {t(
            'home.day.scope',
            'Only time in registered apps, the address and title of pages in this app’s browser, and meeting times are recorded. Never screen content.'
          )}
        </p>
        {hasApp ? null : (
          <p className={HOME_META_CLASS}>
            {t('home.day.noApp', 'Register an app you work in and its time collects here.')}
          </p>
        )}
      </div>
      {records.length > 0 ? (
        <section aria-label={t('home.day.unconfirmed', 'Records to check')}>
          <h3 className="flex flex-wrap items-baseline gap-x-2 border-t border-border px-4 pt-2 text-xs font-medium text-foreground">
            {t('home.day.unconfirmed', 'Records to check')}
            <span className="tabular-nums" data-home-records-open="">
              {open}
            </span>
            <span className={`font-normal ${HOME_META_CLASS}`}>
              {t('home.day.unconfirmedHint', 'Choose whether these were work.')}
            </span>
          </h3>
          <ul className="px-4">
            {records.map((record) => (
              <HomeRecordRow
                key={record.id}
                record={record}
                answer={answers[record.id]}
                tasks={tasks}
                onAnswer={(answer) => onAnswer(record.id, answer)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 pt-2">
        <Button
          type="button"
          variant={prominent && wrappedUp === null ? 'default' : 'outline'}
          size="sm"
          data-home-wrap-up-open=""
          onClick={onWrapUp}
        >
          {t('home.wrapUp.title', 'Wrap up today')}
        </Button>
        <span className={HOME_META_CLASS}>
          {wrappedUp === null
            ? t('home.day.wrapUpHint', 'I choose what is reported.')
            : t('home.day.wrappedUp', 'Wrapped up: {{count}} updates confirmed.', {
                count: wrappedUp
              })}
        </span>
      </div>
    </HomeCard>
  )
}
