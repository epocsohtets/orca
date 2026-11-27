import React, { useRef, useState } from 'react'
import { useAppStore } from '@/store'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { Button } from '@/components/ui/button'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { RailPage, RailPageScroll } from '@/components/rail-page/RailPage'
import { RailPageBand, RailPageMoreMenu } from '@/components/rail-page/RailPageHeader'
import { INAX_INTEGRATION_SECTION_ID } from '@/components/integrations/task-trackers/task-provider-integration-section-ids'
import { INAX_MOCK_TASKS } from '@/components/task-page/inax/inax-mock-tasks'
import { useInaxSourceSelection } from '@/components/task-page/inax/inax-source-selection'
import { useAllAgentPaneThreads } from '@/components/activity/threads/use-agent-pane-threads'
import { activityThreadRowCopy } from '@/components/activity/threads/activity-thread-presentation'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { openBotHome, useBots } from '@/lib/bot-catalog'
import { HOME_MOCK_ME, selectMyWork } from './home-my-work'
import {
  HOME_PREVIEW_MINUTES,
  homePhaseForMinutes,
  unansweredEntries,
  visibleTimeline,
  type HomeEntryAnswer,
  type HomePhase,
  type HomeTimelineEntry
} from './home-day'
import { buildHomeNeeds, buildHomeNext, buildHomeTimeline, buildHomeWrapUp } from './home-day-mock'
import {
  HOME_LABEL_CLASS,
  HOME_META_CLASS,
  HOME_ROW_CLASS,
  HomeActionRows,
  HomeRowText,
  HomeSection,
  type HomeRow
} from './HomeSection'
import { HomeStartBar } from './HomeStartBar'
import { HomeTimeline } from './HomeTimeline'
import { HomeWrapUpDialog } from './HomeWrapUpDialog'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
const CLOCK_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const NEEDS_CAP = 3

/** My day, kept by my agents: start anything, see what is happening, answer what needs me, check the record. */
export default function HomePage(): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  const myApps = useAppStore((s) => s.settings?.myApps)
  const bots = useBots()
  const threads = useAllAgentPaneThreads().allThreads
  // Read once per mount: the page shows a snapshot of the day.
  const [now] = useState(() => Date.now())
  const [preview, setPreview] = useState<'auto' | HomePhase>('auto')
  const [previewFirstRun, setPreviewFirstRun] = useState(false)
  const [answers, setAnswers] = useState<Record<string, HomeEntryAnswer>>({})
  const [needsExpanded, setNeedsExpanded] = useState(false)
  const [wrapUpOpen, setWrapUpOpen] = useState(false)
  const [wrappedUp, setWrappedUp] = useState<number | null>(null)
  const startRef = useRef<HTMLInputElement | null>(null)

  const dayStart = new Date(now).setHours(0, 0, 0, 0)
  const minutes =
    preview === 'auto' ? Math.floor((now - dayStart) / 60_000) : HOME_PREVIEW_MINUTES[preview]
  const phase = homePhaseForMinutes(minutes)
  const clock = (at: number): string =>
    uiDateTimeFormat(CLOCK_OPTIONS, intlLocale).format(dayStart + at * 60_000)

  const openTasks = (): void => {
    useInaxSourceSelection.setState({ selected: true })
    useAppStore.getState().openTaskPage()
  }
  const openSettings = (pane: 'integrations' | 'my-apps', sectionId?: string): void => {
    useAppStore.getState().openSettingsTarget({ pane, repoId: null, sectionId })
    useAppStore.getState().openSettingsPage()
  }
  const openActivity = (): void => useAppStore.getState().openActivityPage()
  const connectInax = (): void => openSettings('integrations', INAX_INTEGRATION_SECTION_ID)

  const firstRun =
    previewFirstRun || (!signedIn && !myApps?.length && threads.length === 0 && bots.length === 0)

  // Real agent sessions from today join the mock record.
  const agentEntries: HomeTimelineEntry[] = threads
    .filter((thread) => thread.latestTimestamp >= dayStart)
    .map((thread) => {
      const copy = activityThreadRowCopy(thread, t)
      return {
        id: thread.paneKey,
        at: Math.floor((thread.latestTimestamp - dayStart) / 60_000),
        text: copy.taskTitle,
        actor: copy.workspaceLabel
      }
    })
  const appNames = (myApps ?? []).filter((app) => !app.paused).map((app) => app.name)
  const timeline = visibleTimeline([...buildHomeTimeline(t, appNames), ...agentEntries], minutes)
  const unanswered = unansweredEntries(timeline, answers)

  const needRuns = {
    // A bot chat when a bot exists; else the agents view.
    question: () => (bots[0] ? void openBotHome(bots[0]) : openActivity()),
    followUps: openTasks,
    review: openTasks
  }
  const needs: HomeRow[] = buildHomeNeeds(t).map((need) => ({ ...need, run: needRuns[need.id] }))
  if (unanswered.length > 0) {
    needs.push({
      id: 'records',
      title: t(
        'home.needs.recordsTitle',
        'Confirm whether {{count}} entries in today’s record are work',
        {
          count: unanswered.length
        }
      ),
      detail: t('home.needs.recordsDetail', 'Browser and app use the app could not link to a task'),
      action: t('home.needs.check', 'Check'),
      run: () =>
        document
          .querySelector<HTMLElement>('[data-home-timeline] [data-home-entry="unconfirmed"] button')
          ?.focus()
    })
  }
  const shownNeeds = needsExpanded ? needs : needs.slice(0, NEEDS_CAP)

  const overnight = timeline.filter((entry) => entry.at < 6 * 60 + 30).length
  const myOpenWork = selectMyWork(INAX_MOCK_TASKS, HOME_MOCK_ME).filter(
    (task) => task.status !== 'done'
  )
  const upcoming = buildHomeNext(t).filter((item) => item.at > minutes)
  const brief: HomeRow[] = [
    {
      id: 'carry',
      title: t('home.brief.carry', '{{count}} tasks carried over from yesterday', {
        count: signedIn ? myOpenWork.length : 0
      }),
      detail: t('home.brief.carryDetail', 'Agents kept their status current overnight'),
      action: t('home.brief.openTasks', 'Open tasks'),
      run: openTasks
    },
    {
      id: 'meetings',
      title: t('home.brief.meetings', '{{count}} meetings today', { count: upcoming.length }),
      detail: upcoming[0] ? `${clock(upcoming[0].at)} · ${upcoming[0].title}` : undefined
    },
    {
      id: 'overnight',
      title: t('home.brief.overnight', 'Agents finished {{count}} things overnight', {
        count: overnight
      }),
      detail: t('home.brief.overnightDetail', 'They are at the bottom of today’s record'),
      action: t('home.brief.see', 'See'),
      run: openActivity
    }
  ]
  const next: HomeRow[] = [
    ...upcoming.slice(0, 2).map((item) => ({
      id: item.id,
      title: `${clock(item.at)} · ${item.title}`,
      detail: item.detail
    })),
    ...(signedIn
      ? myOpenWork.map((task) => ({
          id: task.id,
          title: task.title,
          detail: t('home.next.dueToday', '{{task}} · due today', { task: task.id })
        }))
      : [
          {
            id: 'sign-in',
            title: t(
              'auto.components.TaskPage.inaxSignedOut',
              'Sign in with inAX to see your tasks'
            ),
            action: t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX'),
            run: connectInax
          }
        ])
  ]
  const firstSteps: HomeRow[] = [
    {
      id: 'inax',
      title: t('home.firstRun.inax', 'Connect inAX so your tasks appear here'),
      detail: t('home.firstRun.inaxDetail', 'Agents then keep each task’s status current for you'),
      action: t('home.firstRun.connect', 'Connect'),
      run: connectInax
    },
    {
      id: 'app',
      title: t('home.firstRun.app', 'Register an app you work in'),
      detail: t('home.firstRun.appDetail', 'Time in it joins the record of your day'),
      action: t('home.firstRun.register', 'Register'),
      run: () => openSettings('my-apps')
    },
    {
      id: 'agent',
      title: t('home.firstRun.agent', 'Start your first task with an agent'),
      detail: t('home.firstRun.agentDetail', 'Type what you want to do in the box above'),
      action: t('home.firstRun.start', 'Start'),
      run: () => startRef.current?.focus()
    }
  ]
  const drafts = buildHomeWrapUp(t)
  const wrapUp: HomeRow[] = [
    {
      id: 'wrap-up',
      title:
        wrappedUp === null
          ? t(
              'home.wrapUp.ready',
              'Agents drafted updates for {{count}} tasks from today’s record',
              {
                count: drafts.length
              }
            )
          : t('home.wrapUp.confirmed', 'Today is wrapped up: {{count}} updates confirmed', {
              count: wrappedUp
            }),
      detail: t('home.wrapUp.trust', 'Nothing is shared until you have seen it'),
      action: t('home.wrapUp.preview', 'Preview'),
      // The one filled action on the page, and only when wrapping up is the point of the visit.
      filled: phase === 'evening' && wrappedUp === null,
      run: () => setWrapUpOpen(true)
    }
  ]
  const wrapUpTitle = t('home.wrapUp.title', 'Wrap up today')

  return (
    <RailPage as="main" data-home-page="" data-home-phase={firstRun ? 'first-run' : phase}>
      <RailPageBand>
        <h1 className="shrink-0 truncate text-sm font-semibold text-foreground">
          {uiDateTimeFormat(DATE_OPTIONS, intlLocale).format(now)}
        </h1>
        <span className={`min-w-0 flex-1 truncate ${HOME_META_CLASS}`} data-home-summary="">
          {firstRun
            ? t('home.summaryFirstRun', 'Nothing is connected yet')
            : t('home.summary', '{{needs}} waiting on you · {{entries}} entries recorded today', {
                needs: needs.length,
                entries: timeline.length
              })}
        </span>
        <RailPageMoreMenu label={t('home.preview.label', 'Preview (PoC)')}>
          <DropdownMenuLabel>{t('home.preview.label', 'Preview (PoC)')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preview}
            onValueChange={(value) => {
              if (
                value === 'auto' ||
                value === 'morning' ||
                value === 'day' ||
                value === 'evening'
              ) {
                setPreview(value)
              }
            }}
          >
            <DropdownMenuRadioItem value="auto">
              {t('home.preview.auto', 'Follow the clock')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="morning">
              {t('home.preview.morning', 'Morning')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="day">
              {t('home.preview.day', 'Day')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="evening">
              {t('home.preview.evening', 'Evening')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={previewFirstRun} onCheckedChange={setPreviewFirstRun}>
            {t('home.preview.firstRun', 'First run')}
          </DropdownMenuCheckboxItem>
        </RailPageMoreMenu>
      </RailPageBand>
      <RailPageScroll className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        {/* Why pb-24: the last row scrolls clear of the floating panel toggle. */}
        <div className="rail-page-row-gutter mx-auto grid max-w-4xl gap-x-12 gap-y-6 pt-6 pb-24 @min-[56rem]/rail-page:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <HomeStartBar inputRef={startRef} />
            {firstRun ? (
              <HomeSection primary title={t('home.firstRun.title', 'Three steps to start')}>
                <HomeActionRows rows={firstSteps} />
              </HomeSection>
            ) : (
              <>
                {phase === 'evening' ? (
                  <HomeSection primary title={wrapUpTitle}>
                    <HomeActionRows rows={wrapUp} />
                  </HomeSection>
                ) : null}
                {phase === 'morning' ? (
                  <HomeSection primary title={t('home.brief.title', 'This morning')}>
                    <HomeActionRows rows={brief} />
                  </HomeSection>
                ) : null}
                {phase === 'day' ? (
                  <section
                    aria-labelledby="home-now-heading"
                    className={`${HOME_ROW_CLASS} rounded-md border border-border`}
                  >
                    <h2 id="home-now-heading" className={`shrink-0 ${HOME_LABEL_CLASS}`}>
                      {t('home.now.title', 'Now')}
                    </h2>
                    <HomeRowText
                      primary
                      title={t('home.now.agent', 'Claude Code is working on INAX-128')}
                      detail={t(
                        'home.now.agentDetail',
                        'For 12 minutes · writing the SSO callback tests'
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="shrink-0"
                      onClick={openActivity}
                    >
                      {t('home.now.open', 'Open')}
                    </Button>
                  </section>
                ) : null}
                <HomeSection
                  primary
                  title={t('home.needs.title', 'Needs you')}
                  count={needs.length}
                  action={
                    needs.length > NEEDS_CAP ? (
                      <Button
                        type="button"
                        variant="ghost-muted"
                        size="xs"
                        aria-expanded={needsExpanded}
                        onClick={() => setNeedsExpanded((expanded) => !expanded)}
                      >
                        {needsExpanded
                          ? t('home.needs.less', 'Show fewer')
                          : t('home.needs.more', '{{count}} more', {
                              count: needs.length - NEEDS_CAP
                            })}
                      </Button>
                    ) : undefined
                  }
                >
                  <HomeActionRows rows={shownNeeds} />
                </HomeSection>
                <section
                  aria-labelledby="home-today-heading"
                  className="flex min-w-0 flex-col gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <h2 id="home-today-heading" className="text-sm font-semibold text-foreground">
                      {t('home.timeline.title', 'Today')}
                    </h2>
                    <p className={HOME_META_CLASS}>
                      {t(
                        'home.timeline.lead',
                        'The app keeps this record. Correct only what is wrong.'
                      )}
                    </p>
                  </div>
                  <HomeTimeline
                    entries={timeline}
                    answers={answers}
                    dayStart={dayStart}
                    onAnswer={(id, answer) =>
                      setAnswers((current) => {
                        const next = { ...current }
                        delete next[id]
                        if (answer) {
                          next[id] = answer
                        }
                        return next
                      })
                    }
                  />
                </section>
              </>
            )}
          </div>
          {firstRun ? null : (
            <div className="flex min-w-0 flex-col gap-6">
              <HomeSection title={t('home.next.title', 'Next')}>
                <HomeActionRows quiet rows={next} />
              </HomeSection>
              {phase === 'day' ? (
                <HomeSection title={wrapUpTitle}>
                  <HomeActionRows quiet rows={wrapUp} />
                </HomeSection>
              ) : null}
            </div>
          )}
        </div>
      </RailPageScroll>
      <HomeWrapUpDialog
        drafts={drafts}
        open={wrapUpOpen}
        onOpenChange={setWrapUpOpen}
        onConfirmed={setWrappedUp}
      />
    </RailPage>
  )
}
