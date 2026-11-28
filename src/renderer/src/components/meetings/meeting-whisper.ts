import { personName } from './meeting-people'
import { PROMO_DEFAULTS } from './meeting-sample-promo'
import { detectMeetingTalk, type MeetingTalk } from './meeting-talk-detection'
import type { MeetingDraft } from './meetings-store'

export type ChatLine = {
  id: string
  authorId: string
  text: string
  /** Sample lines name who the meeting agent asks; a typed line asks its writer. */
  whisperFor?: string
}

export type MeetingWhisper = { messageId: string; talk: MeetingTalk }

/**
 * The meeting agent's question to one person about one chat. It is asked of a single person (the writer of the
 * line, or the person a sample line names) and nobody else in the chat gets it. Once that person says "no
 * thanks", the chat is not asked about again; a line that already became a meeting is not asked about twice.
 */
export function whisperFor(args: {
  lines: readonly ChatLine[]
  viewerId: string
  dismissed: boolean
  handledMessageIds: readonly string[]
  now: number
}): MeetingWhisper | null {
  if (args.dismissed) {
    return null
  }
  for (const line of args.lines.toReversed()) {
    if ((line.whisperFor ?? line.authorId) !== args.viewerId) {
      continue
    }
    const talk = detectMeetingTalk(line.text, args.now)
    if (talk) {
      // Only the newest such line asks; an older one is not brought back after it.
      return args.handledMessageIds.includes(line.id) ? null : { messageId: line.id, talk }
    }
  }
  return null
}

/** The meeting the agent would create from what it read: when, who (the chat's people), and about what. */
export function whisperMeetingDraft(
  conversation: { id: string; kind: 'dm' | 'group'; name: string; memberIds: readonly string[] },
  talk: MeetingTalk,
  viewerId: string
): MeetingDraft {
  const attendeeIds = conversation.memberIds.filter((id) => id !== viewerId)
  // The promotion chat is the prepared sample: its subject, outline and materials are known.
  const preset = conversation.id === PROMO_DEFAULTS.conversationId ? PROMO_DEFAULTS : null
  return {
    title:
      preset?.title ??
      (talk.topic
        ? `${talk.topic} 회의`
        : conversation.kind === 'group'
          ? `${conversation.name} 회의`
          : `${personName(attendeeIds[0] ?? viewerId)} 님과의 회의`),
    attendeeIds,
    startsAt: talk.startsAt,
    endsAt: talk.endsAt,
    place: preset?.place ?? '',
    outline: preset?.outline ?? '',
    materials: preset?.materials ?? [],
    sample: preset ? 'promo' : 'generic',
    project: preset ? 'promo' : 'campaign'
  }
}
