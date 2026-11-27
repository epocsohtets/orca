import React, { useState, useSyncExternalStore } from 'react'
import { useAppStore } from '@/store'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { Button } from '@/components/ui/button'
import { RailPage, RailPageScroll } from '@/components/rail-page/RailPage'
import { INAX_INTEGRATION_SECTION_ID } from '@/components/integrations/task-trackers/task-provider-integration-section-ids'
import { useInaxSourceSelection } from '@/components/task-page/inax/inax-source-selection'
import { useAllAgentPaneThreads } from '@/components/activity/threads/use-agent-pane-threads'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { openBotHomeTab, useBots } from '@/lib/bot-catalog'
import {
  applyHomeBoardState,
  countHomeBoard,
  homeTaskTab,
  orderHomeAgents,
  type HomeTaskTab
} from './home-board'
import { useHomeBoardStore } from './home-board-store'
import {
  buildHomeAgents,
  buildHomeFollowUps,
  buildHomeProjects,
  buildHomeTasks
} from './home-board-mock'
import { buildHomeActivity, buildHomeDay, buildHomeUpcoming } from './home-board-day-mock'
import {
  HOME_PREVIEW_MINUTES,
  formatHomeDuration,
  homePhaseForMinutes,
  homeSampleDay,
  type HomePhase
} from './home-day'
import { buildHomeMyActivity } from './home-board-my-activity'
import { HomeCard, HOME_META_CLASS } from './HomeCard'
import { HomeFirstSteps, HomeGreeting, HomeTiles, type HomeTileId } from './HomeHeader'
import { HomeTasksCard } from './HomeTasksCard'
import { HomeUpcomingCard } from './HomeUpcomingCard'
import { HomeAgentsCard } from './HomeAgentsCard'
import { HomeActivityCard } from './HomeActivityCard'
import { HomeMyDayCard } from './HomeMyDayCard'
import { HomeNewTaskButton } from './HomeNewTaskButton'
import { HomePreviewMenu } from './HomePreviewMenu'
import { HomeWrapUpDialog } from './HomeWrapUpDialog'
import { buildHomeWrapUpItems } from './home-wrap-up-items'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
const CLOCK_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const TILE_TAB: Partial<Record<HomeTileId, HomeTaskTab>> = {
  tasks: 'today',
  waiting: 'waiting',
  late: 'late'
}

/** Scroll a row into view and put the keyboard on it, once the click that revealed it has rendered. */
function focusRow(selector: string): void {
  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(`[data-home-page] ${selector}`)
    row?.scrollIntoView({ block: 'center', behavior: motionSafeScrollBehavior() })
    ;(row?.matches('button') ? row : row?.querySelector<HTMLElement>('button'))?.focus({
      preventScroll: true
    })
  })
}

/** My work board: what is mine, what waits on me, what my agents are doing, and my day as the app recorded it. */
export default function HomePage(): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  const myApps = useAppStore((s) => s.settings?.myApps)
  const bots = useBots()
  const hasAgentThread = useAllAgentPaneThreads().allThreads.length > 0
  // The whole mock board is one small object, read as it is.
  const board = useSyncExternalStore(useHomeBoardStore.subscribe, useHomeBoardStore.getState)
  // Read once per mount: the page shows a snapshot of the day.
  const [now] = useState(() => Date.now())
  const [preview, setPreview] = useState<'auto' | HomePhase>('auto')
  const [previewFirstRun, setPreviewFirstRun] = useState(false)
  const [tab, setTab] = useState<HomeTaskTab>('today')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [openAgentId, setOpenAgentId] = useState<string | null>(null)
  const [activityFilter, setActivityFilter] = useState<'all' | 'agents'>('all')
  const [wrapUpOpen, setWrapUpOpen] = useState(false)

  const midnight = new Date(now).setHours(0, 0, 0, 0)
  const minutes =
    preview === 'auto' ? Math.floor((now - midnight) / 60_000) : HOME_PREVIEW_MINUTES[preview]
  const phase = homePhaseForMinutes(minutes)
  const sampleDay = homeSampleDay(now)
  const clock = (at: number): string =>
    uiDateTimeFormat(CLOCK_OPTIONS, intlLocale).format(sampleDay + at * 60_000)
  const duration = (value: number): string =>
    formatHomeDuration(value, {
      hours: (count) => t('home.day.hours', '{{count}} hr', { count }),
      minutes: (count) => t('home.day.minutes', '{{count}} min', { count })
    })

  const openSettings = (pane: 'integrations' | 'my-apps', sectionId?: string): void => {
    useAppStore.getState().openSettingsTarget({ pane, repoId: null, sectionId })
    useAppStore.getState().openSettingsPage()
  }
  const connectInax = (): void => openSettings('integrations', INAX_INTEGRATION_SECTION_ID)
  const openTaskList = (): void => {
    useInaxSourceSelection.setState({ selected: true })
    useAppStore.getState().openTaskPage()
  }
  // A bot is this app's agent with a role: its chat when one exists, else the place to make one.
  const handToAgent = (): void =>
    bots[0]
      ? void openBotHomeTab(bots[0])
      : // Opens on a template for everyday work, not on the gallery's first (a code review bot).
        useAppStore.getState().openModal('bot-templates', { templateId: 'meeting-prep' })

  const projects = buildHomeProjects(t)
  // The research agent started at 09:05.
  const working = duration(Math.max(1, minutes - (9 * 60 + 5)))
  const tasks = applyHomeBoardState(buildHomeTasks(t, working), buildHomeFollowUps(t), board, {
    resumed: t('home.task.resumed', 'Agent working · picked up my answer'),
    addedDue: t('home.task.today', 'Today'),
    addedDetail: t('home.task.addedDetail', 'A task I added here.')
  })
  const counts = countHomeBoard(tasks)
  const recording = board.meetingStartedAt !== null
  const ago = (at: number): string =>
    formatUiRelativeTime(Math.min(-1, at - minutes) * 60_000, intlLocale)
  const agents = orderHomeAgents(buildHomeAgents(t, tasks, ago), tasks, recording, {
    resumedLast: t('home.agent.justNow', 'Just now'),
    recording: t('home.agent.recording', 'Recording the meeting I started')
  })
  const openTasks = tasks.filter((task) => !task.done && !task.meetingId)
  const mine = buildHomeMyActivity(t, board, minutes)
  const activity = [...mine, ...buildHomeActivity(t).filter((entry) => entry.at <= minutes)].sort(
    (a, b) => b.at - a.at
  )
  const upcoming = buildHomeUpcoming(t, minutes, board.answers.offer === undefined).filter(
    (item) => signedIn || !item.taskId
  )
  const app = myApps?.find((entry) => !entry.paused)?.name
  const day = buildHomeDay(t, phase, app)

  const revealTask = (taskId: string): void => {
    const task = tasks.find((entry) => entry.id === taskId)
    if (!task) {
      return
    }
    setTab(homeTaskTab(task)[0] ?? 'today')
    setOpenTaskId(taskId)
    focusRow(`[data-home-task="${taskId}"]`)
  }
  const revealAgent = (agentId: string): void => {
    setOpenAgentId(agentId)
    focusRow(`[data-home-agent="${agentId}"]`)
  }
  const selectTile = (tile: HomeTileId): void => {
    const target = TILE_TAB[tile]
    if (target) {
      setTab(target)
      setOpenTaskId(null)
      focusRow(`[data-home-tab="${target}"]`)
    } else {
      setActivityFilter('agents')
      focusRow('[data-home-activity-filter="agents"]')
    }
  }

  const wrapUpItems = buildHomeWrapUpItems(t, tasks, day.records, board)

  const firstRun =
    previewFirstRun || (!signedIn && !myApps?.length && !hasAgentThread && bots.length === 0)
  const myDay = (
    <HomeMyDayCard
      segments={day.segments}
      duration={duration}
      records={day.records}
      answers={board.records}
      tasks={openTasks}
      onAnswer={(recordId, answer) =>
        useHomeBoardStore.setState((state) => {
          const records = { ...state.records }
          delete records[recordId]
          if (answer) {
            records[recordId] = answer
          }
          return { records }
        })
      }
      wrappedUp={board.wrapUp?.count ?? null}
      prominent={phase === 'evening'}
      hasApp={app !== undefined}
      onRegisterApp={() => openSettings('my-apps')}
      onWrapUp={() => setWrapUpOpen(true)}
    />
  )

  return (
    <RailPage as="main" data-home-page="" data-home-phase={firstRun ? 'first-run' : phase}>
      <RailPageScroll className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        {/* Why pb-24: the last row scrolls clear of the floating panel toggle. */}
        <div className="rail-page-row-gutter mx-auto flex max-w-6xl flex-col gap-4 pt-6 pb-24">
          <HomeGreeting
            phase={phase}
            date={uiDateTimeFormat(DATE_OPTIONS, intlLocale).format(sampleDay)}
            line={t('home.header.line', 'My work today, and what my agents did.')}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={recording}
              data-home-meeting=""
              onClick={() =>
                useHomeBoardStore.setState({ meetingStartedAt: recording ? null : Date.now() })
              }
            >
              {recording
                ? t('home.header.endMeeting', 'End meeting')
                : t('home.header.startMeeting', 'Start meeting')}
            </Button>
            <HomeNewTaskButton
              disabled={!signedIn}
              onAdd={(title) => {
                const id = `added-${Date.now()}`
                useHomeBoardStore.setState((state) => ({
                  addedTasks: [...state.addedTasks, { id, title }]
                }))
                setTab('today')
                focusRow(`[data-home-task="${id}"]`)
              }}
            />
            <Button type="button" size="sm" data-home-hand-off="" onClick={handToAgent}>
              {t('home.header.handOff', 'Hand to an agent')}
            </Button>
            <HomePreviewMenu
              preview={preview}
              onPreviewChange={setPreview}
              firstRun={previewFirstRun}
              onFirstRunChange={setPreviewFirstRun}
            />
          </HomeGreeting>
          {recording ? (
            <p role="status" className={HOME_META_CLASS}>
              {t(
                'home.header.meetingNote',
                'The meeting bot is recording. There is no meeting page yet, so minutes do not arrive in this sample.'
              )}
            </p>
          ) : null}
          {firstRun ? (
            <HomeFirstSteps
              steps={[
                {
                  id: 'inax',
                  title: t('home.firstRun.inax', 'Connect inAX so your work appears here'),
                  detail: t(
                    'home.firstRun.inaxDetail',
                    'Your tasks, deadlines and what waits on you'
                  ),
                  action: t('home.firstRun.connect', 'Connect'),
                  run: connectInax
                },
                {
                  id: 'agent',
                  title: t('home.firstRun.agent', 'Make your first agent'),
                  detail: t(
                    'home.firstRun.agentDetail',
                    'Give it a role; it shows up in Agents and bots'
                  ),
                  action: t('home.firstRun.make', 'Make one'),
                  run: handToAgent
                },
                {
                  id: 'app',
                  title: t('home.firstRun.app', 'Register an app you work in'),
                  detail: t(
                    'home.firstRun.appDetail',
                    'Optional. Its time joins My day, which only you see'
                  ),
                  action: t('home.firstRun.register', 'Register'),
                  run: () => openSettings('my-apps')
                }
              ]}
            />
          ) : (
            <>
              {signedIn ? (
                <HomeTiles counts={counts} agentDone={7} confirmedByMe={5} onSelect={selectTile} />
              ) : null}
              <div className="grid items-start gap-4 @min-[60rem]/rail-page:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
                <div className="flex min-w-0 flex-col gap-4">
                  {phase === 'evening' ? myDay : null}
                  {signedIn ? (
                    <>
                      <HomeTasksCard
                        tasks={tasks}
                        projects={projects}
                        tab={tab}
                        onTabChange={(next) => {
                          setTab(next)
                          setOpenTaskId(null)
                        }}
                        openId={openTaskId}
                        onOpenChange={setOpenTaskId}
                        onAnswer={(taskId, choiceId) => {
                          useHomeBoardStore.setState((state) => ({
                            answers: { ...state.answers, [taskId]: choiceId }
                          }))
                          setOpenTaskId(null)
                          // The answered row leaves this tab; the keyboard goes back to the tab itself.
                          focusRow(`[data-home-tab="${tab}"]`)
                        }}
                        onDone={(taskId) => {
                          useHomeBoardStore.setState((state) => ({
                            doneTaskIds: [...state.doneTaskIds, taskId]
                          }))
                          setOpenTaskId(null)
                          focusRow(`[data-home-tab="${tab}"]`)
                        }}
                        onOpenTaskList={openTaskList}
                      />
                      <HomeAgentsCard
                        agents={agents}
                        openId={openAgentId}
                        onOpenChange={setOpenAgentId}
                        onRevealTask={revealTask}
                        onOpenChat={bots[0] ? handToAgent : undefined}
                      />
                    </>
                  ) : (
                    <HomeCard title={t('home.tasks.title', 'My work')} data-home-card="signed-out">
                      <div className="flex flex-col items-start gap-2 px-4 pb-2">
                        <p className="text-[13px] text-foreground">
                          {t(
                            'home.signedOut.line',
                            'Sign in with inAX to see your work, what waits on you, and what your agents are doing.'
                          )}
                        </p>
                        <Button type="button" size="sm" onClick={connectInax}>
                          {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
                        </Button>
                      </div>
                    </HomeCard>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <HomeUpcomingCard
                    items={upcoming}
                    projects={projects}
                    onRevealTask={revealTask}
                  />
                  {signedIn ? (
                    <HomeActivityCard
                      entries={activity}
                      filter={activityFilter}
                      onFilterChange={setActivityFilter}
                      clock={clock}
                      onReveal={(entry) =>
                        entry.taskId
                          ? revealTask(entry.taskId)
                          : entry.agentId && revealAgent(entry.agentId)
                      }
                    />
                  ) : null}
                  {phase === 'evening' ? null : myDay}
                </div>
              </div>
            </>
          )}
        </div>
      </RailPageScroll>
      {/* Remounted per open so it starts from the board as it is now. */}
      {wrapUpOpen ? (
        <HomeWrapUpDialog
          items={wrapUpItems}
          open
          onOpenChange={setWrapUpOpen}
          onConfirmed={(count) => useHomeBoardStore.setState({ wrapUp: { count } })}
        />
      ) : null}
    </RailPage>
  )
}
