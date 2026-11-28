import React, { useState } from 'react'
import { useAppStore } from '@/store'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { Button } from '@/components/ui/button'
import { RailPage, RailPageScroll } from '@/components/rail-page/RailPage'
import { openInaxTask } from '@/components/task-page/inax/inax-source-selection'
import { useAllAgentPaneThreads } from '@/components/activity/threads/use-agent-pane-threads'
import { signInInaxMock } from '@/lib/inax-mock-account'
import { useBots } from '@/lib/bot-catalog'
import { homeTaskTab, sortHomeTasks, type HomeTaskTab } from './home-board'
import { useHomeBoardStore } from './home-board-store'
import {
  openMeeting,
  openMeetingBot,
  openMeetingSchedule,
  openScheduleForm
} from '@/components/meetings/meeting-navigation'
import { MAKO, personName } from '@/components/meetings/meeting-people'
import { answerHomeRecord, saveHomeDayEnd, startHomeLoop } from './home-board-actions'
import { useHomeBoard } from './use-home-board'
import type { HomePhase } from './home-day'
import { HOME_BOARD_COLUMNS_CLASS, HOME_BOARD_PAGE_CLASS, HomeCard } from './HomeCard'
import { HomeFirstSteps, HomeGreeting, HomeTiles, type HomeTileId } from './HomeHeader'
import { HomeTasksCard } from './HomeTasksCard'
import { HomeUpcomingCard } from './HomeUpcomingCard'
import { HomeAgentsCard } from './HomeAgentsCard'
import { HomeActivityCard, type HomeActivityFilter } from './HomeActivityCard'
import { HomeMyDayCard } from './HomeMyDayCard'
import { HomeNewTaskButton } from './HomeNewTaskButton'
import { HomePreviewMenu } from './HomePreviewMenu'
import { HomeDayEndPanel } from './HomeDayEndPanel'
import { HomeDayEndResult, useHomeDayEndRows } from './HomeDayEndResult'

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

/** My work board: what is mine, what waits on me, what my agents are doing, and my day as the app recorded it. */
export default function HomePage(): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const bots = useBots()
  const hasAgentThread = useAllAgentPaneThreads().allThreads.length > 0
  const [preview, setPreview] = useState<'auto' | HomePhase>('auto')
  const { board, view, viewerId, projects, signedIn, myApps, phase, sampleDay, duration } =
    useHomeBoard(preview)
  const [previewFirstRun, setPreviewFirstRun] = useState(false)
  const [tab, setTab] = useState<HomeTaskTab>('today')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [openAgentId, setOpenAgentId] = useState<string | null>(null)
  const [activityFilter, setActivityFilter] = useState<HomeActivityFilter>('all')
  const [activityAll, setActivityAll] = useState(false)
  const [wrapUpOpen, setWrapUpOpen] = useState(false)

  const openSettings = (pane: 'my-apps' | 'browser', sectionId?: string): void => {
    useAppStore.getState().openSettingsTarget({ pane, repoId: null, sectionId })
    useAppStore.getState().openSettingsPage()
  }

  const { tasks } = view
  const recordingMeetingId = view.recordingMeetingId

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
    useHomeBoardStore.setState((state) => ({ addedTasks: [...state.addedTasks, { id, title }] }))
    if (agent) {
      // Handing over is the same path as "Start with an agent" on a task's row.
      startHomeLoop(id, title)
      openInaxTask(id)
      return
    }
    setTab('today')
    focusRow(`[data-home-task="${id}"]`)
  }
  /** An agent's row goes to its conversation; a bot without one opens in place. */
  const openAgent = (agentId: string): void => {
    if (agentId === 'meeting') {
      openMeetingBot()
      return
    }
    const agent = view.agents.find((entry) => entry.id === agentId)
    const task = tasks.find((entry) => entry.id === agent?.taskId)
    if (task && !task.meetingId) {
      openInaxTask(task.id)
    } else {
      setOpenAgentId(openAgentId === agentId ? null : agentId)
    }
  }

  const lateFirst = sortHomeTasks(tasks.filter((task) => homeTaskTab(task).includes('late')))[0]
  const dayEndRows = useHomeDayEndRows(board.dayEnd, tasks, projects, viewerId)
  const firstRun =
    previewFirstRun || (!signedIn && !myApps?.length && !hasAgentThread && bots.length === 0)
  const myDay = (
    <HomeMyDayCard
      segments={view.segments}
      duration={duration}
      records={view.records}
      answers={board.records}
      tasks={view.openTasks}
      onAnswer={answerHomeRecord}
      cardsLeft={view.dayEnd.length}
      result={dayEndRows.length > 0 ? <HomeDayEndResult rows={dayEndRows} /> : null}
      onManageApps={() => openSettings('my-apps')}
      onManageBrowser={() => openSettings('browser', 'browser-activity-suggestions')}
      onWrapUp={() => setWrapUpOpen(true)}
    />
  )

  return (
    <RailPage as="main" data-home-page="" data-home-phase={firstRun ? 'first-run' : phase}>
      {/* The cards open beside the page, where Orca's item pane sits: Home stays in view and in use. */}
      <div className="flex min-h-0 flex-1">
        <RailPageScroll className="scrollbar-sleek min-h-0 min-w-0 flex-1 overflow-y-auto">
          {/* Why pb-24: the last row scrolls clear of the floating panel toggle. */}
          <div className={HOME_BOARD_PAGE_CLASS}>
            <HomeGreeting
              phase={phase}
              name={viewerId === MAKO ? t('home.header.me', 'Mako') : personName(viewerId)}
              date={uiDateTimeFormat(DATE_OPTIONS, intlLocale).format(sampleDay)}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-home-meeting=""
                onClick={() =>
                  recordingMeetingId
                    ? openMeeting(recordingMeetingId)
                    : openScheduleForm(null, { startNow: true })
                }
              >
                {recordingMeetingId
                  ? t('home.header.openMeeting', 'Meeting in progress')
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
            {firstRun ? (
              <HomeFirstSteps
                steps={[
                  {
                    id: 'inax',
                    title: t('home.firstRun.inax', 'Sign in to inAX'),
                    detail: t(
                      'home.firstRun.inaxDetail',
                      'Your tasks, their deadlines and what waits on you'
                    ),
                    action: t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX'),
                    run: signInInaxMock
                  },
                  {
                    id: 'app',
                    title: t('home.firstRun.app', 'Register an app you work in (optional)'),
                    detail: t(
                      'home.firstRun.appDetail',
                      'Its time collects in My day. Only I see it'
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
                    lateFirst={lateFirst ? `${lateFirst.dueLabel} · ${lateFirst.title}` : ''}
                    onSelect={selectTile}
                  />
                ) : null}
                <div className={HOME_BOARD_COLUMNS_CLASS}>
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
                          onOpenTask={(taskId) => openInaxTask(taskId)}
                          onOpenMeeting={(meetingId) => openMeeting(meetingId)}
                          onStart={(task) => {
                            startHomeLoop(task.id, task.title, task.status)
                            openInaxTask(task.id)
                          }}
                          onAnswer={(taskId, choiceId) => {
                            // Only a meeting's offer is answered in place.
                            useHomeBoardStore.setState((state) => ({
                              answers: { ...state.answers, [taskId]: choiceId }
                            }))
                            setOpenTaskId(null)
                            focusRow(`[data-home-tab="${tab}"]`)
                          }}
                          onOpenTaskList={() => openInaxTask(null)}
                        />
                        <HomeAgentsCard
                          agents={view.agents}
                          openId={openAgentId}
                          onOpen={openAgent}
                          onRevealTask={revealTask}
                        />
                      </>
                    ) : (
                      <HomeCard
                        title={t('home.tasks.title', 'My work')}
                        data-home-card="signed-out"
                      >
                        <div className="flex flex-col items-start gap-2 px-4">
                          <p className="text-[13px] text-foreground">
                            {t(
                              'home.signedOut.line',
                              'Sign in to inAX to see your work, what waits on you, and what your agents are doing.'
                            )}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            data-inax-sign-in=""
                            onClick={signInInaxMock}
                          >
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
                      onRevealTask={(taskId) => openInaxTask(taskId)}
                      onOpenMeeting={(meetingId) => openMeeting(meetingId)}
                      onOpenCalendar={openMeetingSchedule}
                    />
                    {signedIn ? (
                      <HomeActivityCard
                        entries={view.activity}
                        filter={activityFilter}
                        onFilterChange={setActivityFilter}
                        showAll={activityAll}
                        onShowAllChange={setActivityAll}
                        onReveal={(entry) => {
                          if (entry.meetingId) {
                            openMeeting(entry.meetingId)
                          } else if (entry.taskId) {
                            openInaxTask(entry.taskId)
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
        {/* Mounted per open: the walk is over the cards as they stand now. */}
        {wrapUpOpen && view.dayEnd.length > 0 ? (
          <HomeDayEndPanel
            cards={view.dayEnd}
            projects={projects}
            openTasks={view.openTasks}
            onSave={saveHomeDayEnd}
            onClose={() => {
              setWrapUpOpen(false)
              focusRow('[data-home-wrap-up-open]:not(:disabled), [data-home-day-end-undo]')
            }}
            onOpenTask={(taskId) => openInaxTask(taskId)}
            onOpenMeeting={(meetingId) => openMeeting(meetingId)}
          />
        ) : null}
      </div>
    </RailPage>
  )
}
