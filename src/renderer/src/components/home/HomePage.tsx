import React, { useState } from 'react'
import { AppWindow } from 'lucide-react'
import { useAppStore } from '@/store'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import { Badge } from '@/components/ui/badge'
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
const ROW_CLASS = 'flex min-h-11 w-full min-w-0 items-center gap-3 px-3 py-2 text-left'
const ROW_LINK_CLASS = `${ROW_CLASS} outline-none transition-colors hover:bg-accent focus-visible:bg-accent`

function HomeSection({
  title,
  action,
  children
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex h-6 items-center justify-between gap-2">
        <h2 className="truncate text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {children}
      </div>
    </section>
  )
}

function RowText({ title, detail }: { title: string; detail?: string }): React.JSX.Element {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[13px] font-medium text-foreground">{title}</span>
      {detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
    </span>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={`${ROW_CLASS} justify-between text-xs text-muted-foreground`}>{children}</div>
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
        <h1 className="shrink-0 truncate text-[15px] font-semibold tracking-tight">
          {uiDateTimeFormat(DATE_OPTIONS, intlLocale).format(now)}
        </h1>
        <span className="min-w-0 truncate text-xs text-muted-foreground" data-home-summary="">
          {summary}
        </span>
      </RailPageBand>
      <RailPageScroll className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        <div className="rail-page-row-gutter mx-auto grid max-w-5xl gap-x-8 gap-y-6 py-6 @min-[56rem]/rail-page:grid-cols-2">
          <HomeSection title={t('home.myWork.title', 'My work today')}>
            {!signedIn ? (
              <EmptyRow>
                <span className="min-w-0 truncate">
                  {t(
                    'auto.components.TaskPage.inaxSignedOut',
                    'Sign in with inAX to see your tasks'
                  )}
                </span>
                <Button
                  type="button"
                  size="xs"
                  onClick={() => openSettings('integrations', INAX_INTEGRATION_SECTION_ID)}
                >
                  {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
                </Button>
              </EmptyRow>
            ) : myWork.length === 0 ? (
              <EmptyRow>{t('home.myWork.empty', 'No tasks assigned to you')}</EmptyRow>
            ) : (
              myWork.map((task) => (
                <button key={task.id} type="button" className={ROW_LINK_CLASS} onClick={openTasks}>
                  <RowText
                    title={task.title}
                    detail={`${task.id} · ${t('home.myWork.lastUpdate', 'Last update by {{name}}', {
                      name: HOME_MOCK_LAST_UPDATE_BY[task.id] ?? task.author
                    })} · ${ago(Date.parse(task.updatedAt))}`}
                  />
                  <Badge variant="outline" className="shrink-0">
                    {statusLabels[task.status]}
                  </Badge>
                </button>
              ))
            )}
          </HomeSection>

          <HomeSection title={t('home.needsYou.title', 'Needs you')}>
            {needs.map((item) => (
              <div key={item.id} className={ROW_CLASS}>
                <RowText title={item.title} detail={item.detail} />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="shrink-0"
                  onClick={item.run}
                >
                  {item.action}
                </Button>
              </div>
            ))}
          </HomeSection>

          <HomeSection title={t('home.agents.title', 'What agents did')}>
            {activity.map((item) => (
              <button key={item.id} type="button" className={ROW_LINK_CLASS} onClick={openActivity}>
                <RowText title={item.title} detail={item.detail} />
              </button>
            ))}
          </HomeSection>

          <HomeSection
            title={t('home.apps.title', 'Apps today')}
            action={
              <Button
                type="button"
                variant="ghost-muted"
                size="xs"
                onClick={() => openSettings('my-apps')}
              >
                {t('home.apps.manage', 'Manage')}
              </Button>
            }
          >
            {myApps?.length ? (
              myApps.map((app) => (
                <div key={app.path} className={ROW_CLASS}>
                  <AppWindow className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <RowText title={app.name} />
                  {app.paused ? (
                    <Badge variant="outline" className="shrink-0">
                      {t('settings.myApps.paused', 'Paused')}
                    </Badge>
                  ) : null}
                  {/* Usage recording is a separate PoC. */}
                  <span
                    className="shrink-0 text-xs tabular-nums text-muted-foreground"
                    title={t('home.apps.usageUnknown', 'Usage time is not recorded yet')}
                  >
                    —
                  </span>
                </div>
              ))
            ) : (
              <EmptyRow>{t('settings.myApps.emptyTitle', 'No apps registered')}</EmptyRow>
            )}
          </HomeSection>
        </div>
      </RailPageScroll>
    </RailPage>
  )
}
