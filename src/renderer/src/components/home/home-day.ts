export type HomePhase = 'morning' | 'day' | 'evening'

/** Morning until 11:00, evening from 17:00. `minutes` counts from today's midnight. */
export function homePhaseForMinutes(minutes: number): HomePhase {
  if (minutes < 11 * 60) {
    return 'morning'
  }
  return minutes >= 17 * 60 ? 'evening' : 'day'
}

/** The clock each preview phase pretends it is. */
export const HOME_PREVIEW_MINUTES: Record<HomePhase, number> = {
  morning: 9 * 60 + 10,
  day: 14 * 60 + 20,
  evening: 18 * 60 + 40
}

export type HomeTimelineEntry = {
  id: string
  /** Minutes from today's midnight; negative is yesterday evening. */
  at: number
  text: string
  /** Who or what did it: an agent, a bot, an app, or me. */
  actor: string
  task?: string
  /** Set when the app is unsure the entry is work: the task it would link to. */
  suggestTask?: string
}

export type HomeEntryAnswer = 'linked' | 'notWork'

/** The day so far: nothing later than `minutes`, newest first. */
export function visibleTimeline(
  entries: readonly HomeTimelineEntry[],
  minutes: number
): HomeTimelineEntry[] {
  return entries.filter((entry) => entry.at <= minutes).sort((a, b) => b.at - a.at)
}

export function unansweredEntries(
  entries: readonly HomeTimelineEntry[],
  answers: Readonly<Record<string, HomeEntryAnswer>>
): HomeTimelineEntry[] {
  return entries.filter((entry) => entry.suggestTask && !answers[entry.id])
}
