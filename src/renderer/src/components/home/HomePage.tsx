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
import { homeTaskTab, type HomeRecordAnswer, type HomeTaskTab } from './home-board'
import { useHomeBoardStore } from './home-board-store'
import { HOME_ACCEPT_FOLLOW_UPS } from './home-board-meetings'
import {
  openMeeting,
  openMeetingBot,
  openMeetingSchedule,
  openScheduleForm
} from '@/components/meetings/meeting-navigation'
import { MAKO, personName } from '@/components/meetings/meeting-people'
import {
  acceptFollowUp,
  setFollowUpDeclined,
  useMeetings
} from '@/components/meetings/meetings-store'
import { answerHomeLoop, decideHomeLoop, startHomeLoop } from './home-board-actions'
import { useHomeBoard } from './use-home-board'
import type { HomePhase } from './home-day'
import { HomeCard } from './HomeCard'
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
  const bots = useBots()
  const hasAgentThread = useAllAgentPaneThreads().allThreads.length > 0
  const [preview, setPreview] = useState<'auto' | HomePhase>('auto')
  const { board, view, viewerId, projects, signedIn, myApps, app, phase, sampleDay, duration } =
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
      // Handing over is the same path as "Start with an agent" on the task's page.
      startHomeLoop(id)
      openInaxTask(id, 'chat')
      return
    }
    setTab('today')
    focusRow(`[data-home-task="${id}"]`)
  }
  /** My answer to what the meeting agent offered me: each item becomes my task, or goes back to the host. */
  const answerOffer = (meetingId: string, choiceId: string): void => {
    const meeting = useMeetings.getState().meetings.find((entry) => entry.id === meetingId)
    for (const followUp of meeting?.followUps ?? []) {
      if (followUp.suggestedOwnerId !== viewerId || followUp.taskId || followUp.declined) {
        continue
      }
      if (choiceId === HOME_ACCEPT_FOLLOW_UPS) {
        acceptFollowUp(meetingId, followUp.id)
      } else {
        setFollowUpDeclined(meetingId, followUp.id, true)
      }
    }
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
      openInaxTask(task.id, 'chat')
    } else {
      setOpenAgentId(openAgentId === agentId ? null : agentId)
    }
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
            name={viewerId === MAKO ? t('home.header.me', 'Mako') : personName(viewerId)}
            date={uiDateTimeFormat(DATE_OPTIONS, intlLocale).format(sampleDay)}
            line={t('home.header.line', 'My work today, and what my agents did.')}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-home-meeting=""
              onClick={() =>
                recordingMeetingId ? openMeeting(recordingMeetingId) : openScheduleForm(null, true)
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
                  title: t(
                    'home.firstRun.inax',
                    'Sign in with inAX (the team’s work tracker) so your work appears here'
                  ),
                  detail: t(
                    'home.firstRun.inaxDetail',
                    'Your tasks, their deadlines and what waits on you'
                  ),
                  action: t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX'),
                  run: signInInaxMock
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
                        onOpenTask={(taskId) => openInaxTask(taskId)}
                        onOpenMeeting={(meetingId) => openMeeting(meetingId)}
                        onOpenOutput={(taskId) => openInaxTask(taskId, 'chat')}
                        onDecide={(taskId, proposal) => {
                          const task = tasks.find((entry) => entry.id === taskId)
                          decideHomeLoop(
                            taskId,
                            task?.proposalStep ?? 'final',
                            proposal,
                            task ? projects[task.project].name : ''
                          )
                          setOpenTaskId(null)
                          focusRow(`[data-home-tab="${tab}"]`)
                        }}
                        onAnswer={(taskId, choiceId) => {
                          const meetingId = tasks.find((entry) => entry.id === taskId)?.meetingId
                          if (meetingId) {
                            answerOffer(meetingId, choiceId)
                          } else if (board.loops[taskId]) {
                            answerHomeLoop(taskId, choiceId)
                          } else {
                            useHomeBoardStore.setState((state) => ({
                              answers: { ...state.answers, [taskId]: choiceId }
                            }))
                          }
                          setOpenTaskId(null)
                          // The answered row may leave this tab; the keyboard goes back to the tab itself.
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
                    <HomeCard title={t('home.tasks.title', 'My work')} data-home-card="signed-out">
                      <div className="flex flex-col items-start gap-2 px-4 pb-2">
                        <p className="text-[13px] text-foreground">
                          {t(
                            'home.signedOut.line',
                            'Sign in with inAX (the team’s work tracker) to see your work, what waits on you, and what your agents are doing.'
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
