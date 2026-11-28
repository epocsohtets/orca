import React, { useEffect } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { RailPage } from '@/components/rail-page/RailPage'
import { RailPageBand } from '@/components/rail-page/RailPageHeader'
import { DemoMenu } from '@/components/task-page/inax/InaxDemoNote'
import {
  openInaxTask,
  useInaxSourceSelection
} from '@/components/task-page/inax/inax-source-selection'
import { MeetingViewerRadioGroup } from '@/components/meetings/MeetingViewerMenu'
import { MAKO } from '@/components/meetings/meeting-people'
import { signInInaxMock } from '@/lib/inax-mock-account'
import { useHomeBoard } from '@/components/home/use-home-board'
import { resetSample } from '@/components/home/home-sample-reset'
import { setHomeTaskStatus, startHomeLoop } from '@/components/home/home-board-actions'
import type { HomeTask } from '@/components/home/home-board'
import { WorkBoard } from './WorkBoard'
import { HomeTaskItem } from '@/components/home/HomeItemsPanel'

/**
 * Work: the board of my tasks. A task I started with an agent opens its workspace; any other task opens
 * beside the board.
 */
export function WorkSurface(): React.JSX.Element {
  const t = useTranslate()
  const taskId = useInaxSourceSelection((state) => state.taskId)
  const { view, viewerId, projects, signedIn } = useHomeBoard()
  const own = viewerId === MAKO
  // A follow-up task of a meeting that is someone else's opens too, as its panel beside the board.
  const task = [...view.boardTasks, ...view.otherTasks].find((entry) => entry.id === taskId)
  useEffect(() => {
    if (taskId !== null && !task && signedIn) {
      useInaxSourceSelection.setState({ taskId: null })
    }
  }, [taskId, task, signedIn])
  const title = t('appRail.work', 'Work')
  const demo = (
    <DemoMenu>
      <MeetingViewerRadioGroup />
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={resetSample}>
        {t('home.preview.reset', 'Start over')}
      </DropdownMenuItem>
    </DemoMenu>
  )
  const start = (target: HomeTask): void => {
    startHomeLoop(target.id, target.title, target.status)
    openInaxTask(target.id)
  }

  if (!signedIn) {
    return (
      <>
        <RailPageBand>
          <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
        </RailPageBand>
        <div className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-foreground">
            {t('taskLoop.gate.line', 'Sign in to inAX and your tasks appear here.')}
          </p>
          <Button type="button" size="sm" data-inax-sign-in="" onClick={signInInaxMock}>
            {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
          </Button>
        </div>
      </>
    )
  }

  // A colleague's view of the board opens no item: the item list is mine.
  const panel = task && own ? <HomeTaskItem taskId={task.id} /> : null

  return (
    <>
      <RailPageBand data-work-page={task ? 'task' : 'board'}>
        <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight">{title}</h1>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {t('auto.components.TaskPage.inaxSource', 'inAX')}
        </span>
        {demo}
      </RailPageBand>
      <div className="flex min-h-0 flex-1">
        <WorkBoard
          tasks={view.boardTasks}
          projects={projects}
          readOnly={!own}
          openId={task?.id ?? null}
          onOpen={openInaxTask}
          onMove={(id, status) =>
            setHomeTaskStatus(id, status, view.boardTasks.find((entry) => entry.id === id)?.title)
          }
          onStart={start}
        />
        {panel}
      </div>
    </>
  )
}

export default function WorkPage(): React.JSX.Element {
  const t = useTranslate()
  return (
    <RailPage as="main" aria-label={t('appRail.work', 'Work')}>
      <WorkSurface />
    </RailPage>
  )
}
