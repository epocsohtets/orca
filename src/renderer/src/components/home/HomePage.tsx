import React, { useState, useSyncExternalStore } from 'react'
import { useAppStore } from '@/store'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { Button } from '@/components/ui/button'
import { RailPage, RailPageScroll } from '@/components/rail-page/RailPage'
import { INAX_INTEGRATION_SECTION_ID } from '@/components/integrations/task-trackers/task-provider-integration-section-ids'
import { useInaxSourceSelection } from '@/components/task-page/inax/inax-source-selection'
import { useAllAgentPaneThreads } from '@/components/activity/threads/use-agent-pane-threads'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { openBotHomeTab, useBots } from '@/lib/bot-catalog'
import { homeTaskTab, type HomeRecordAnswer, type HomeTaskTab } from './home-board'
import { useHomeBoardStore } from './home-board-store'
import { buildHomeProjects } from './home-board-mock'
import { buildHomeBoardView } from './home-board-view'
import {
  HOME_PREVIEW_MINUTES,
  formatHomeDuration,
  homePhaseForMinutes,
  homeSampleDay,
  type HomePhase
} from './home-day'
import { HomeCard, HOME_META_CLASS } from './HomeCard'
import { HomeFirstSteps, HomeGreeting, HomeTiles, type HomeTileId } from './HomeHeader'
import { HomeTasksCard } from './HomeTasksCard'
import { HomeUpcomingCard } from './HomeUpcomingCard'
import { HomeAgentsCard } from './HomeAgentsCard'
import { HomeActivityCard, type HomeActivityFilter } from './HomeActivityCard'
import { HomeMyDayCard } from './HomeMyDayCard'
import { HomeNewTaskButton } from './HomeNewTaskButton'
import { HomePreviewMenu } from './HomePreviewMenu'
import { HomeWrapUpDialog } from './HomeWrapUpDialog'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
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

function answerRecord(recordId: string, answer: HomeRecordAnswer | null): void {
  useHomeBoardStore.setState((state) => {
    const records = { ...state.records }
    delete records[recordId]
    if (answer) {
      records[recordId] = answer
    }
    return { records }
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
  const [activityFilter, setActivityFilter] = useState<HomeActivityFilter>('all')
  const [activityAll, setActivityAll] = useState(false)
  const [wrapUpOpen, setWrapUpOpen] = useState(false)

  const midnight = new Date(now).setHours(0, 0, 0, 0)
  const minutes =
    preview === 'auto' ? Math.floor((now - midnight) / 60_000) : HOME_PREVIEW_MINUTES[preview]
  const phase = homePhaseForMinutes(minutes)
  const sampleDay = homeSampleDay(now)
  const duration = (value: number): string =>
    formatHomeDuration(value, {
      hours: (count) => t('home.day.hours', '{{count}} hr', { count }),
      minutes: (count) => t('home.day.minutes', '{{count}} min', { count })
    })

  const openSettings = (pane: 'integrations' | 'my-apps' | 'browser', sectionId?: string): void => {
    useAppStore.getState().openSettingsTarget({ pane, repoId: null, sectionId })
    useAppStore.getState().openSettingsPage()
  }
  const connectInax = (): void => openSettings('integrations', INAX_INTEGRATION_SECTION_ID)
  const openTaskList = (): void => {
    useInaxSourceSelection.setState({ selected: true })
    useAppStore.getState().openTaskPage()
  }

  const app = myApps?.find((entry) => !entry.paused)?.name
  const projects = buildHomeProjects(t)
  const view = buildHomeBoardView(t, {
    board,
    minutes,
    phase,
    sampleDay,
    intlLocale,
    signedIn,
    app,
    duration
  })
  const { tasks } = view
  const recording = board.meetingStartedAt !== null

  const revealTask = (taskId: string): void => {
    const task = tasks.find((entry) => entry.id === taskId)
    if (!task) {
      return
    }
    setTab(homeTaskTab(task)[0] ?? 'today')
    setOpenTaskId(taskId)
    focusRow(`[data-home-task="${taskId}"]`)
  }
  const selectTile = (tile: HomeTileId): void => {
    const target = TILE_TAB[tile]
    if (target) {
      setTab(target)
      setOpenTaskId(null)
      focusRow(`[data-home-tab="${target}"]`)
    } else {
      // The tile's number is the length of this list, so the jump shows all of it.
      setActivityFilter('finished')
      setActivityAll(true)
      focusRow('[data-home-activity-filter="finished"]')
    }
  }
  const addTask = (title: string, agent: boolean): void => {
    const id = `added-${Date.now()}`
    useHomeBoardStore.setState((state) => ({
      addedTasks: [...state.addedTasks, { id, title, agent }]
    }))
    setTab('today')
    focusRow(`[data-home-task="${id}"]`)
  }

  const firstRun =
    previewFirstRun || (!signedIn && !myApps?.length && !hasAgentThread && bots.length === 0)
  const myDay = (
    <HomeMyDayCard
      segments={view.segments}
      duration={duration}
      records={view.records}
      answers={board.records}
      tasks={view.openTasks}
      onAnswer={answerRecord}
      wrappedUp={board.wrapUp?.count ?? null}
      prominent={phase === 'evening'}
      hasApp={app !== undefined}
      onManageApps={() => openSettings('my-apps')}
      onManageBrowser={() => openSettings('browser', 'browser-activity-suggestions')}
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
              label={t('home.header.newTask', 'New task')}
              disabled={!signedIn}
              onAdd={addTask}
            />
            {/* Until hand-off starts from a task, this is the new-task form with the agent switched on. */}
            <HomeNewTaskButton
              label={t('home.header.handOff', 'Hand to an agent')}
              primary
              handOff
              disabled={!signedIn}
              onAdd={addTask}
              data-home-hand-off=""
            />
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
                    'inAX is the team’s work tracker: your tasks, deadlines and what waits on you'
                  ),
                  action: t('home.firstRun.connect', 'Connect'),
                  run: connectInax
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
                <HomeTiles
                  counts={view.counts}
                  agentFinished={view.agentFinished}
                  agentConfirmed={view.agentConfirmed}
                  onSelect={selectTile}
                />
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
                          // The answered row may leave this tab; the keyboard goes back to the tab itself.
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
                        agents={view.agents}
                        openId={openAgentId}
                        onOpenChange={setOpenAgentId}
                        onRevealTask={revealTask}
                        onOpenChat={bots[0] ? () => void openBotHomeTab(bots[0]) : undefined}
                      />
                    </>
                  ) : (
                    <HomeCard title={t('home.tasks.title', 'My work')} data-home-card="signed-out">
                      <div className="flex flex-col items-start gap-2 px-4 pb-2">
                        <p className="text-[13px] text-foreground">
                          {t(
                            'home.signedOut.line',
                            'Sign in with inAX (the team’s work tracker) to see your work, what waits on you, and what your agents are doing.'
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
                    items={view.upcoming}
                    projects={projects}
                    onRevealTask={revealTask}
                  />
                  {signedIn ? (
                    <HomeActivityCard
                      entries={view.activity}
                      filter={activityFilter}
                      onFilterChange={setActivityFilter}
                      showAll={activityAll}
                      onShowAllChange={setActivityAll}
                      onReveal={(entry) => {
                        if (entry.taskId) {
                          revealTask(entry.taskId)
                        } else if (entry.agentId) {
                          setOpenAgentId(entry.agentId)
                          focusRow(`[data-home-agent="${entry.agentId}"]`)
                        }
                      }}
                    />
                  ) : null}
                  {phase === 'evening' ? null : myDay}
                </div>
              </div>
            </>
          )}
        </div>
      </RailPageScroll>
      {/* Mounted per open so edits start from the board as it is now. */}
      {wrapUpOpen ? (
        <HomeWrapUpDialog
          updates={view.wrapUp.updates}
          unanswered={view.wrapUp.unanswered}
          tasks={view.openTasks}
          onAnswerRecord={answerRecord}
          open
          onOpenChange={setWrapUpOpen}
          onConfirmed={(count) => useHomeBoardStore.setState({ wrapUp: { count } })}
        />
      ) : null}
    </RailPage>
  )
}
