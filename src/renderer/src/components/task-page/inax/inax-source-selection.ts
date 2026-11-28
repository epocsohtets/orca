import { create } from 'zustand'
import { useAppStore } from '@/store'
import { worksWithoutCode } from '../../../../../shared/settings/work-styles'

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

/** Opens Work: the board, or one task's conversation. */
export function openInaxTask(taskId: string | null): void {
  useInaxSourceSelection.setState({ selected: true, taskId })
  useAppStore.getState().openTaskPage()
}
