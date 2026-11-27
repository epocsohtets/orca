import { create } from 'zustand'

export const INAX_MOCK_ACCOUNT = { name: 'inAX · makko', email: 'makko@inax.example' }

// shortcut: mock sign-in is in-memory view state and resets on reload; replace with real inAX auth when it exists.
export const useInaxMockAccount = create<{ signedIn: boolean }>(() => ({ signedIn: false }))
