import type { Translate } from '@/i18n/use-translate'
import type { HomeTimelineEntry } from './home-day'

// shortcut: the whole day is mock; each part names the source it needs in the PoC report.

export type HomeNeedKind = 'question' | 'followUps' | 'review'
export type HomeNeed = { id: HomeNeedKind; title: string; detail: string; action: string }

export function buildHomeNeeds(t: Translate): HomeNeed[] {
  return [
    {
      id: 'question',
      title: t('home.needs.questionTitle', 'Decide: keep the legacy SSO callback URL?'),
      detail: t(
        'home.needs.questionDetail',
        'Claude Code · INAX-128 · it continues when you answer'
      ),
      action: t('home.needs.answer', 'Answer')
    },
    {
      id: 'followUps',
      title: t(
        'home.needs.followUpsTitle',
        'Assign the 3 follow-ups from the weekly product meeting'
      ),
      detail: t('home.needs.followUpsDetail', 'Meeting bot · minutes are ready'),
      action: t('home.needs.assign', 'Assign')
    },
    {
      id: 'review',
      title: t('home.needs.reviewTitle', 'Approve or return the INAX-119 fix'),
      detail: t('home.needs.reviewDetail', 'Codex · pull request ready, tests pass'),
      action: t('home.needs.review', 'Review')
    }
  ]
}

const at = (hour: number, minute = 0): number => hour * 60 + minute

/** `apps` are the names registered in Settings > My apps; app blocks appear only for those. */
export function buildHomeTimeline(t: Translate, apps: readonly string[]): HomeTimelineEntry[] {
  const me = t('home.timeline.me', 'Me')
  const entries: HomeTimelineEntry[] = [
    {
      id: 'night-fix',
      at: at(-2),
      text: t('home.timeline.nightFix', 'Fixed the role picker tests and opened a pull request'),
      actor: 'Codex',
      task: 'INAX-119'
    },
    {
      id: 'standup',
      at: at(6, 10),
      text: t('home.timeline.standup', 'Posted yesterday’s summary to the team channel'),
      actor: t('home.timeline.standupBot', 'Standup bot')
    },
    {
      id: 'moved-128',
      at: at(9, 5),
      text: t('home.timeline.moved128', 'Moved INAX-128 to In progress'),
      actor: 'Claude Code',
      task: 'INAX-128'
    },
    {
      id: 'browser',
      at: at(10, 40),
      text: t('home.timeline.browser', 'stablyai/orca issues · 3 visits'),
      actor: t('home.timeline.browserActor', 'Browser · me'),
      suggestTask: 'INAX-124'
    },
    {
      id: 'meeting',
      at: at(11),
      text: t('home.timeline.meeting', 'Weekly product meeting · minutes ready, 3 follow-ups'),
      actor: t('home.timeline.meetingBot', 'Meeting bot')
    },
    {
      id: 'sso-form',
      at: at(13, 10),
      text: t('home.timeline.ssoForm', 'Added the SSO login form and its tests'),
      actor: 'Claude Code',
      task: 'INAX-128'
    },
    {
      id: 'done-119',
      at: at(17, 30),
      text: t('home.timeline.done119', 'Moved INAX-119 to Done'),
      actor: 'Codex',
      task: 'INAX-119'
    },
    {
      id: 'review-128',
      at: at(18, 10),
      text: t('home.timeline.review128', 'Opened the INAX-128 pull request for review'),
      actor: 'Claude Code',
      task: 'INAX-128'
    }
  ]
  if (apps[0]) {
    entries.push({
      id: 'app-1',
      at: at(9, 20),
      text: t('home.timeline.appLong', '{{app}} · 1h 20m', { app: apps[0] }),
      actor: me,
      task: 'INAX-128'
    })
  }
  if (apps[1]) {
    entries.push({
      id: 'app-2',
      at: at(13, 50),
      text: t('home.timeline.appShort', '{{app}} · 25m', { app: apps[1] }),
      actor: me,
      suggestTask: 'INAX-128'
    })
  }
  return entries
}

export type HomeNextItem = { id: string; at: number; title: string; detail: string }

export function buildHomeNext(t: Translate): HomeNextItem[] {
  return [
    {
      id: 'weekly',
      at: at(11),
      title: t('home.next.weekly', 'Weekly product meeting'),
      detail: t('home.next.weeklyDetail', 'Agenda ready')
    },
    {
      id: 'design-review',
      at: at(15),
      title: t('home.next.designReview', 'Design review'),
      detail: t('home.next.designReviewDetail', 'Prep ready · 2 open questions')
    },
    {
      id: 'one-on-one',
      at: at(19, 30),
      title: t('home.next.oneOnOne', '1:1 with Jiwoo'),
      detail: t('home.next.oneOnOneDetail', 'Tomorrow’s topics drafted')
    }
  ]
}

export type HomeWrapUpDraft = { task: string; title: string; text: string }

export function buildHomeWrapUp(t: Translate): HomeWrapUpDraft[] {
  return [
    {
      task: 'INAX-128',
      title: 'Add SSO login to the tenant admin console',
      text: t(
        'home.wrapUp.draft128',
        'Added the SSO login form and tests; pull request is in review. Waiting on a decision about the legacy callback URL.'
      )
    },
    {
      task: 'INAX-119',
      title: 'Fix role picker losing focus after search',
      text: t('home.wrapUp.draft119', 'Fixed and merged; the role picker keeps focus after search.')
    },
    {
      task: 'INAX-124',
      title: 'Show per-tenant usage on the billing page',
      text: t('home.wrapUp.draft124', 'Started reading related issues; no code yet.')
    }
  ]
}
