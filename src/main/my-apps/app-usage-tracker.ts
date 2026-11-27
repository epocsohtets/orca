import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { app, powerMonitor } from 'electron'
import { runProcess } from '@orca/process-host'
import {
  recordAppUsageSample,
  type AppCheckout,
  type AppCheckoutDraft,
  type AppUsageDay
} from '../../shared/my-apps/app-usage'
import type { RegisteredApp } from '../../shared/my-apps/my-app-types'

const POLL_MS = 5_000
const IDLE_SECONDS = 300
const LSAPPINFO_TIMEOUT_MS = 3_000

type LoadedDay = { file: string; day: AppUsageDay }
let cached: { file: string; loaded: Promise<LoadedDay> } | null = null

function dayFile(now: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return join(app.getPath('userData'), 'app-usage', `${key}.json`)
}

async function readDay(file: string): Promise<LoadedDay> {
  const day: AppUsageDay = { sessions: [], checkouts: [] }
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf-8'))
    if (parsed && typeof parsed === 'object') {
      if ('sessions' in parsed && Array.isArray(parsed.sessions)) {
        day.sessions = parsed.sessions
      }
      if ('checkouts' in parsed && Array.isArray(parsed.checkouts)) {
        day.checkouts = parsed.checkouts
      }
    }
  } catch {
    // Missing or unreadable day file: start the day empty.
  }
  return { file, day }
}

function loadDay(now = new Date()): Promise<LoadedDay> {
  const file = dayFile(now)
  if (cached?.file !== file) {
    cached = { file, loaded: readDay(file) }
  }
  return cached.loaded
}

async function saveDay({ file, day }: LoadedDay): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  // Why: write-then-rename keeps the day file whole if the app quits mid-write.
  const tmp = `${file}.${randomUUID()}.tmp`
  await writeFile(tmp, `${JSON.stringify(day)}\n`, { mode: 0o600 })
  await rename(tmp, file)
}

// lsappinfo reads LaunchServices: app identity only, and no permission prompt.
async function frontmostAppPath(): Promise<string | null> {
  const front = await runProcess({
    program: 'lsappinfo',
    args: ['front'],
    timeoutMs: LSAPPINFO_TIMEOUT_MS
  })
  const info = await runProcess({
    program: 'lsappinfo',
    args: ['info', '-only', 'bundlepath', front.stdout.trim()],
    timeoutMs: LSAPPINFO_TIMEOUT_MS
  })
  // Matches both `bundle path="…"` and `"LSBundlePath"="…"`, which differ by macOS version.
  return /path"?="([^"]+\.app)"/i.exec(info.stdout)?.[1] ?? null
}

async function sample(getApps: () => RegisteredApp[] | undefined): Promise<void> {
  const active = (getApps() ?? []).filter((entry) => !entry.paused)
  if (active.length === 0 || powerMonitor.getSystemIdleTime() > IDLE_SECONDS) {
    return
  }
  const front = await frontmostAppPath().catch(() => null)
  // Why: some system apps report a cryptex path that differs from the /Applications one.
  const match =
    front &&
    active.find((entry) => entry.path === front || basename(entry.path) === basename(front))
  if (!match) {
    return
  }
  const today = await loadDay()
  recordAppUsageSample(today.day.sessions, { path: match.path, name: match.name }, Date.now())
  await saveDay(today)
}

export function startAppUsageTracker(getApps: () => RegisteredApp[] | undefined): void {
  if (process.platform !== 'darwin') {
    return
  }
  // The poll is the feature: macOS gives no permission-free push signal for the frontmost app.
  setInterval(() => void sample(getApps).catch(() => {}), POLL_MS).unref()
}

export async function getAppUsageToday(): Promise<AppUsageDay> {
  return (await loadDay()).day
}

export async function saveAppCheckouts(drafts: AppCheckoutDraft[]): Promise<AppUsageDay> {
  const today = await loadDay()
  const savedAt = Date.now()
  today.day.checkouts.push(
    ...drafts.map((draft): AppCheckout => ({ ...draft, id: randomUUID(), savedAt }))
  )
  await saveDay(today)
  return today.day
}
