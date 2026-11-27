import { create } from 'zustand'
import { EMPTY_HOME_BOARD_STATE, type HomeBoardState } from './home-board'

const STORAGE_KEY = 'orca.poc.home-board.v3'

function readSaved(): HomeBoardState {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return saved && typeof saved === 'object'
      ? { ...EMPTY_HOME_BOARD_STATE, ...saved }
      : EMPTY_HOME_BOARD_STATE
  } catch {
    return EMPTY_HOME_BOARD_STATE
  }
}

// shortcut: the mock board lives in this window's localStorage so it survives a reload; move it to the inAX
// backend when tasks, answers and the day record have one.
export const useHomeBoardStore = create<HomeBoardState>(() => readSaved())

useHomeBoardStore.subscribe((state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // A full or blocked store only costs the mock its memory.
  }
})

export function resetHomeBoard(): void {
  useHomeBoardStore.setState(EMPTY_HOME_BOARD_STATE)
}
