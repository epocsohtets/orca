import { create } from 'zustand'
import { useAppStore } from '@/store'
import { worksWithoutCode } from '../../../../../shared/settings/work-styles'
import { useHomeBoardStore } from '@/components/home/home-board-store'
import { useMeetings } from '@/components/meetings/meetings-store'
import { MAKO } from '@/components/meetings/meeting-people'
import { openTaskWorkspace } from '@/components/work/work-task-workspace'

type InaxSourceSelection = {
  /** Null until the person picks a source; then inAX is the default for people who work without code. */
  selected: boolean | null
  /** The task whose conversation is open; null shows the board. */
  taskId: string | null
}

const STORAGE_KEY = 'orca.poc.inax-source-selection'
const EMPTY: InaxSourceSelection = { selected: null, taskId: null }

function readSaved(): InaxSourceSelection {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return saved && typeof saved === 'object' ? { ...EMPTY, ...saved } : EMPTY
  } catch {
    return EMPTY
  }
}

// shortcut: inAX is not a TaskProvider, so its selection lives in this window's localStorage; make it a
// TaskProvider with a persisted default source when it gets a backend.
export const useInaxSourceSelection = create<InaxSourceSelection>(() => readSaved())

useInaxSourceSelection.subscribe((state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // A blocked store only costs the mock its memory.
  }
})

/** Whether Tasks shows inAX: the person's own pick, else inAX first for people who work without code. */
export function useInaxSelected(): boolean {
  const selected = useInaxSourceSelection((state) => state.selected)
  const withoutCode = useAppStore((s) => worksWithoutCode(s.settings))
  return selected ?? withoutCode
}

function openOnBoard(taskId: string | null): void {
  useInaxSourceSelection.setState({ selected: true, taskId })
  useAppStore.getState().openTaskPage()
}

/** Opens a task: its workspace when I started it with an agent, else the board with the task beside it. */
export function openInaxTask(taskId: string | null): void {
  const mine = useMeetings.getState().viewerId === MAKO
  if (!taskId || !mine || !useHomeBoardStore.getState().loops[taskId]) {
    openOnBoard(taskId)
    return
  }
  void openTaskWorkspace(taskId).then((opened) => {
    if (opened) {
      // The board shows no open task behind the workspace.
      useInaxSourceSelection.setState({ taskId: null })
    } else {
      openOnBoard(taskId)
    }
  })
}
