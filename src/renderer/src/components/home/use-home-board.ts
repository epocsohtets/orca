import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAppStore } from '@/store'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { useInaxMockAccount } from '@/lib/inax-mock-account'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { homeLoopPhase } from './home-task-loop'
import { useHomeBoardStore } from './home-board-store'
import { buildHomeProjects } from './home-board-mock'
import { buildHomeBoardView } from './home-board-view'
import {
  HOME_PREVIEW_MINUTES,
  formatHomeDuration,
  homePhaseForMinutes,
  homeSampleDay,
  homeSampleMoment,
  type HomePhase
} from './home-day'

/** The sample board as it stands now, for Home and for the inAX task screens: one world, one store. */
export function useHomeBoard(preview: 'auto' | HomePhase = 'auto') {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  const myApps = useAppStore((s) => s.settings?.myApps)
  // The whole mock board is one small object, read as it is.
  const board = useSyncExternalStore(useHomeBoardStore.subscribe, useHomeBoardStore.getState)
  // Read once per mount: the page shows a snapshot of the day.
  const [mountedAt] = useState(() => Date.now())
  const [now, setNow] = useState(mountedAt)
  const working = Object.values(board.loops).some((loop) => homeLoopPhase(loop, now) === 'working')
  useEffect(() => {
    if (!working) {
      return
    }
    // The scripted agent's steps arrive on the real clock; the tick stops when no agent is working.
    return installWindowVisibilityInterval({ run: () => setNow(Date.now()), intervalMs: 1000 })
  }, [working])

  const sampleDay = homeSampleDay(mountedAt)
  // One clock for the whole board: the sample day's, also at night and on a weekend.
  const minutes =
    preview === 'auto'
      ? Math.floor((homeSampleMoment(mountedAt) - sampleDay) / 60_000)
      : HOME_PREVIEW_MINUTES[preview]
  const phase = homePhaseForMinutes(minutes)
  const duration = (value: number): string =>
    formatHomeDuration(value, {
      hours: (count) => t('home.day.hours', '{{count}} hr', { count }),
      minutes: (count) => t('home.day.minutes', '{{count}} min', { count })
    })
  const app = myApps?.find((entry) => !entry.paused)?.name
  const view = buildHomeBoardView(t, {
    board,
    minutes,
    now,
    phase,
    sampleDay,
    intlLocale,
    signedIn,
    app,
    duration
  })
  return {
    board,
    view,
    projects: buildHomeProjects(t),
    signedIn,
    myApps,
    app,
    phase,
    sampleDay,
    duration,
    now
  }
}
