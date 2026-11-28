import { create } from 'zustand'

export const INAX_MOCK_ACCOUNT = { name: 'inAX · makko', email: 'makko@inax.example' }

const STORAGE_KEY = 'orca.poc.inax-mock-signed-in'

function readSignedIn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// shortcut: mock sign-in is a flag in this window's localStorage so it survives a reload; replace with real inAX auth when it exists.
export const useInaxMockAccount = create<{ signedIn: boolean }>(() => ({
  signedIn: readSignedIn()
}))

useInaxMockAccount.subscribe((state) => {
  try {
    localStorage.setItem(STORAGE_KEY, state.signedIn ? '1' : '0')
  } catch {
    // A blocked store only costs the mock its memory.
  }
})

/** Signs in where the person stands: the mock has no browser step to leave for. */
export function signInInaxMock(): void {
  useInaxMockAccount.setState({ signedIn: true })
}
