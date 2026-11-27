import React, { useId, useState } from 'react'
import { AppWindow } from 'lucide-react'
import { useAppStore } from '@/store'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import { Button } from '@/components/ui/button'
import { RailPage, RailPageScroll } from '@/components/rail-page/RailPage'
import { RailPageBand } from '@/components/rail-page/RailPageHeader'
import { INAX_INTEGRATION_SECTION_ID } from '@/components/integrations/task-trackers/task-provider-integration-section-ids'
import { INAX_MOCK_TASKS, type InaxTaskStatus } from '@/components/task-page/inax/inax-mock-tasks'
import { useInaxSourceSelection } from '@/components/task-page/inax/inax-source-selection'
import { useAllAgentPaneThreads } from '@/components/activity/threads/use-agent-pane-threads'
import {
  activityThreadRowCopy,
  threadAgentStateLabel
} from '@/components/activity/threads/activity-thread-presentation'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { openBotHome, useBots } from '@/lib/bot-catalog'
import { HOME_MOCK_LAST_UPDATE_BY, HOME_MOCK_ME, selectMyWork } from './home-my-work'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }

// This page's whole scale. Spacing: 1, 2, 3, 6, 12, 24. Type: 14/600 title and primary heading, 13/500 primary row,
// 13/400 secondary row, 12/400 detail, 11/600 uppercase label. Color: background, foreground, muted-foreground,
// border, accent.
const PRIMARY_ROW_CLASS = 'flex w-full min-w-0 items-center gap-3 p-3 text-left'
const SECONDARY_ROW_CLASS = 'flex w-full min-w-0 items-center gap-3 py-2 text-left'
// The rail buttons' ring: muted-foreground holds 3:1 on both themes, where `ring` does not in light.
const FOCUS_RING_CLASS =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-muted-foreground'
const ROW_HOVER_CLASS = `${FOCUS_RING_CLASS} transition-colors motion-reduce:transition-none hover:bg-accent focus-visible:bg-accent`
const META_CLASS = 'shrink-0 text-xs text-muted-foreground'

/** `primary` is the area the page is for: a heading and a bordered list. Secondary is a quiet label over bare rows. */
function HomeSection({
  title,
  count,
  primary = false,
  action,
  children
}: {
  title: string
  count?: number
  primary?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className={
            primary
              ? 'flex min-w-0 items-baseline gap-2 text-sm font-semibold text-foreground'
              : 'min-w-0 truncate text-2xs font-semibold uppercase tracking-wider text-muted-foreground'
          }
        >
          <span className="truncate">{title}</span>
          {typeof count === 'number' ? (
            <span className="text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
          ) : null}
        </h2>
        {action}
      </div>
      <ul
        className={
          primary
            ? 'divide-y divide-border overflow-hidden rounded-md border border-border'
            : 'divide-y divide-border border-t border-border'
        }
      >
        {children}
      </ul>
    </section>
  )
}

function RowText({
  title,
  detail,
  primary = false
}: {
  title: string
  detail?: string
  primary?: boolean
}): React.JSX.Element {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span
        className={
          primary
            ? 'line-clamp-2 text-[13px] font-medium text-foreground'
            : 'truncate text-[13px] text-foreground'
        }
      >
        {title}
      </span>
      {detail ? (
        <span className={`${primary ? 'line-clamp-2' : 'truncate'} text-xs text-muted-foreground`}>
          {detail}
        </span>
      ) : null}
    </span>
  )
}

/** The personal start page. Read-only: every row links to the view that owns the thing. */
export default function HomePage(): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  const myApps = useAppStore((s) => s.settings?.myApps)
  const bots = useBots()
  const threads = useAllAgentPaneThreads().allThreads
  // Read once per mount: the page shows a snapshot of the day.
  const [now] = useState(() => Date.now())
  const ago = (timestamp: number): string => formatUiRelativeTime(timestamp - now, intlLocale)

  const openTasks = (): void => {
    useInaxSourceSelection.setState({ selected: true })
    useAppStore.getState().openTaskPage()
  }
  const openSettings = (pane: 'integrations' | 'my-apps', sectionId?: string): void => {
    useAppStore.getState().openSettingsTarget({ pane, repoId: null, sectionId })
    useAppStore.getState().openSettingsPage()
  }
  const openActivity = (): void => useAppStore.getState().openActivityPage()

  const statusLabels: Record<InaxTaskStatus, string> = {
    open: t('auto.components.TaskPage.inaxStatusOpen', 'Open'),
    inProgress: t('auto.components.TaskPage.inaxStatusInProgress', 'In progress'),
    done: t('auto.components.TaskPage.18451e99df', 'Done')
  }
  const myWork = selectMyWork(INAX_MOCK_TASKS, HOME_MOCK_ME)

  // shortcut: "Needs you" is mock; build it from agent questions, check-outs and reviews when those have a source.
  const needs = [
    {
      id: 'question',
      title: t(
        'home.needsYou.questionTitle',
        'Claude Code asks: keep the legacy SSO callback URL?'
      ),
      detail: t('home.needsYou.questionDetail', 'INAX-128 · waiting for your answer'),
      action: t('home.needsYou.answer', 'Answer'),
      // A bot chat when a bot exists; else the agents view.
      run: () => (bots[0] ? void openBotHome(bots[0]) : openActivity())
    },
    {
      id: 'checkout',
      title: t('home.needsYou.checkoutTitle', 'Confirm today’s check-out'),
      detail: t('home.needsYou.checkoutDetail', 'Your apps for today are ready to review'),
      action: t('home.needsYou.review', 'Review'),
      run: () => openSettings('my-apps')
    },
    {
      id: 'review',
      title: t('home.needsYou.reviewTitle', 'Review: Fix role picker losing focus after search'),
      detail: t('home.needsYou.reviewDetail', 'INAX-119 · Codex marked it done'),
      action: t('home.needsYou.open', 'Open'),
      run: openTasks
    }
  ]

  const realActivity = [...threads]
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp)
    .slice(0, 5)
    .map((thread) => {
      const copy = activityThreadRowCopy(thread, t)
      return {
        id: thread.paneKey,
        title: copy.taskTitle,
        detail: [
          copy.statusLine || threadAgentStateLabel(thread, t),
          copy.workspaceLabel,
          ago(thread.latestTimestamp)
        ]
          .filter(Boolean)
          .join(' · ')
      }
    })
  // shortcut: sample rows stand in while no agent has run in this profile; drop them when the PoC ends.
  const activity =
    realActivity.length > 0
      ? realActivity
      : [
          {
            id: 'sample-1',
            title: t('home.agents.sample1Title', 'Claude Code updated INAX-128'),
            detail: `${t('home.agents.sample1Detail', 'Added the SSO login form and tests')} · ${ago(now - 3_600_000)}`
          },
          {
            id: 'sample-2',
            title: t('home.agents.sample2Title', 'Codex finished INAX-119'),
            detail: `${t('home.agents.sample2Detail', 'Role picker keeps focus after search')} · ${ago(now - 5 * 3_600_000)}`
          },
          {
            id: 'sample-3',
            title: t('home.agents.sample3Title', 'Standup bot posted the daily summary'),
            detail: `${t('home.agents.sample3Detail', '4 tasks moved, 1 blocked')} · ${ago(now - 8 * 3_600_000)}`
          }
        ]

  const inProgress = myWork.filter((task) => task.status === 'inProgress').length
  const summary = signedIn
    ? t('home.summary', '{{inProgress}} in progress, {{needs}} waiting on you', {
        inProgress,
        needs: needs.length
      })
    : t('home.summarySignedOut', '{{needs}} waiting on you', { needs: needs.length })

  return (
    <RailPage as="main" data-home-page="">
      <RailPageBand>
        <h1 className="shrink-0 truncate text-sm font-semibold text-foreground">
          {uiDateTimeFormat(DATE_OPTIONS, intlLocale).format(now)}
        </h1>
        <span className="min-w-0 truncate text-xs text-muted-foreground" data-home-summary="">
          {summary}
        </span>
      </RailPageBand>
      <RailPageScroll className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        {/* Why pb-24: the last row scrolls clear of the floating panel toggle. */}
        <div className="rail-page-row-gutter mx-auto grid max-w-4xl gap-x-12 gap-y-6 pt-6 pb-24 @min-[56rem]/rail-page:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <HomeSection primary title={t('home.needsYou.title', 'Needs you')} count={needs.length}>
              {needs.map((item) => (
                <li key={item.id} className={PRIMARY_ROW_CLASS}>
                  <RowText primary title={item.title} detail={item.detail} />
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="shrink-0"
                    onClick={item.run}
                  >
                    {item.action}
                  </Button>
                </li>
              ))}
            </HomeSection>

            <HomeSection
              primary
              title={t('home.myWork.title', 'My work today')}
              count={signedIn ? myWork.length : undefined}
            >
              {!signedIn ? (
                <li className={`${PRIMARY_ROW_CLASS} flex-wrap justify-between`}>
                  <span className="min-w-0 text-xs text-muted-foreground">
                    {t(
                      'auto.components.TaskPage.inaxSignedOut',
                      'Sign in with inAX to see your tasks'
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => openSettings('integrations', INAX_INTEGRATION_SECTION_ID)}
                  >
                    {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
                  </Button>
                </li>
              ) : myWork.length === 0 ? (
                <li className={`${PRIMARY_ROW_CLASS} text-xs text-muted-foreground`}>
                  {t('home.myWork.empty', 'No tasks assigned to you')}
                </li>
              ) : (
                myWork.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      className={`${PRIMARY_ROW_CLASS} ${ROW_HOVER_CLASS}`}
                      onClick={openTasks}
                    >
                      <RowText
                        primary
                        title={task.title}
                        detail={`${task.id} · ${t(
                          'home.myWork.lastUpdate',
                          'Last update by {{name}}',
                          { name: HOME_MOCK_LAST_UPDATE_BY[task.id] ?? task.author }
                        )} · ${ago(Date.parse(task.updatedAt))}`}
                      />
                      <span className={META_CLASS}>{statusLabels[task.status]}</span>
                    </button>
                  </li>
                ))
              )}
            </HomeSection>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <HomeSection title={t('home.agents.title', 'What agents did')}>
              {activity.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${SECONDARY_ROW_CLASS} ${ROW_HOVER_CLASS}`}
                    onClick={openActivity}
                  >
                    <RowText title={item.title} detail={item.detail} />
                  </button>
                </li>
              ))}
            </HomeSection>

            <HomeSection
              title={t('home.apps.title', 'Apps today')}
              action={
                <Button
                  type="button"
                  variant="ghost-muted"
                  size="xs"
                  // Why -mr-2: the label lines up with the rows' right edge.
                  className="-mr-2"
                  onClick={() => openSettings('my-apps')}
                >
                  {t('home.apps.manage', 'Manage')}
                </Button>
              }
            >
              {myApps?.length ? (
                myApps.map((app) => (
                  <li key={app.path} className={SECONDARY_ROW_CLASS}>
                    <AppWindow className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <RowText title={app.name} />
                    {app.paused ? (
                      <span className={META_CLASS}>{t('settings.myApps.paused', 'Paused')}</span>
                    ) : null}
                    {/* Usage recording is a separate PoC. */}
                    <span className={`${META_CLASS} tabular-nums`}>
                      <span aria-hidden>—</span>
                      <span className="sr-only">
                        {t('home.apps.usageUnknown', 'Usage time is not recorded yet')}
                      </span>
                    </span>
                  </li>
                ))
              ) : (
                <li className={`${SECONDARY_ROW_CLASS} text-xs text-muted-foreground`}>
                  {t('settings.myApps.emptyTitle', 'No apps registered')}
                </li>
              )}
            </HomeSection>
          </div>
        </div>
      </RailPageScroll>
    </RailPage>
  )
}
