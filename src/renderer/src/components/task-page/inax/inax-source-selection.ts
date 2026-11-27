import { create } from 'zustand'

// shortcut: inAX is not a TaskProvider, so its selection is view state only; make it a TaskProvider when it gets a backend.
export const useInaxSourceSelection = create<{ selected: boolean }>(() => ({ selected: false }))
