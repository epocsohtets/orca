import type { MeetingResult, MeetingTurn } from './meeting-types'

export const ME = 'Mako'
export const JIWOO = 'Jiwoo Han'
export const SORA = 'Sora Lim'
export const DANIEL = 'Daniel Park'

const turns = (speakers: string[], lines: [number, number, string][]): MeetingTurn[] =>
  lines.map(([at, speaker, text]) => ({ at, speaker: speakers[speaker], text }))

export const SSO_REVIEW: MeetingResult = {
  summary:
    'SSO for the tenant admin console is ready for a staged rollout. The team keeps the legacy callback URL for one release, ships to three pilot tenants next week, and holds the general release until the role picker regression is confirmed fixed in production.',
  decisions: [
    'Keep the legacy SSO callback URL for one release, then remove it.',
    'Pilot with three tenants before the general release.',
    'Session lifetime stays at 8 hours; tenants cannot change it in this release.'
  ],
  minutes: [
    {
      topic: 'Rollout plan',
      points: [
        'Mako showed the SSO login flow end to end on staging (INAX-128).',
        'Pilot tenants: Northwind, Kestrel and Alder. Daniel contacts their admins.',
        'General release follows one clean week of pilot use.'
      ]
    },
    {
      topic: 'Legacy callback URL',
      points: [
        'Two tenants still have the old URL in their identity provider.',
        'Removing it now would lock them out; it stays for one release with a deprecation notice.'
      ]
    },
    {
      topic: 'Role picker regression',
      points: [
        'The focus fix (INAX-119) is merged. Jiwoo checks it against the SSO role mapping screen.',
        'Sora asked for an audit log entry on every SSO role change.'
      ]
    }
  ],
  transcript: turns(
    [ME, JIWOO, SORA, DANIEL],
    [
      [
        4,
        0,
        'Thanks for joining. I want to leave with a rollout date for SSO, so let me start with where the build is.'
      ],
      [
        15,
        0,
        'The login flow works end to end on staging. You pick your identity provider, sign in there, and land in the console with the mapped role.'
      ],
      [31, 1, 'Does that include the tenants that still use the old callback URL?'],
      [
        38,
        0,
        'It does, because I kept the legacy route. That is the first thing I need a decision on.'
      ],
      [47, 2, 'How many tenants are on the old URL?'],
      [
        52,
        0,
        'Two. Both configured their identity provider more than a year ago and never touched it again.'
      ],
      [
        63,
        3,
        'I know both admins. If we remove the route they are locked out the same day, and they will call me.'
      ],
      [74, 3, 'I would rather give them a notice and one release to change it.'],
      [
        82,
        2,
        'One release is fine with me, as long as the route is logged. I want to see who still hits it.'
      ],
      [93, 0, 'Agreed. I will add a counter and a deprecation notice in the admin console.'],
      [104, 1, 'Then the decision is: keep it for one release, remove it in the next.'],
      [111, 0, 'Yes. Next topic, the pilot.'],
      [118, 3, 'I have three tenants who asked for SSO by name: Northwind, Kestrel and Alder.'],
      [
        129,
        3,
        'They are different sizes, so we see a small team, a mid one, and one with nested groups.'
      ],
      [141, 2, 'Nested groups worry me. Does the role mapping flatten them?'],
      [148, 0, 'It reads the first level only. Nested groups map to the parent role for now.'],
      [
        159,
        2,
        'That needs to be written down for the pilot admins, or they will file it as a bug.'
      ],
      [168, 3, 'I will put it in the pilot note. Can I get two lines from you, Mako?'],
      [175, 0, 'Sure, I will send them today.'],
      [181, 1, 'How long does the pilot run before we open it to everyone?'],
      [188, 0, 'I was thinking one clean week. No lockouts, no role mismatches.'],
      [197, 1, 'One week works. I need that time anyway to check the role picker.'],
      [206, 0, 'Right, the focus regression. Where is that?'],
      [
        212,
        1,
        'The fix is merged. What I have not done is test it on the SSO role mapping screen, which uses the same picker.'
      ],
      [226, 1, 'I will do that before the pilot starts.'],
      [
        233,
        2,
        'While you are in there: every role change made through SSO should write an audit log entry.'
      ],
      [
        244,
        0,
        'It writes one on first login. It does not write one when the mapping changes later.'
      ],
      [254, 2, 'Then that is a gap. Compliance asks for exactly that case.'],
      [262, 0, 'Fair. I can add it, it is small. It should not block the pilot though.'],
      [271, 2, 'Not the pilot. But it blocks the general release for me.'],
      [
        279,
        3,
        'One more from the customer side: session lifetime. Kestrel asked if they can set it to twelve hours.'
      ],
      [
        291,
        0,
        'It is fixed at eight hours. A per-tenant setting is more work than it sounds, because of token refresh.'
      ],
      [303, 3, 'I can tell them eight for now. I just need to say when it might change.'],
      [
        311,
        0,
        'Not in this release. Let us collect the ask and look at it after the general release.'
      ],
      [
        321,
        1,
        'So to repeat: legacy URL stays one release, pilot with three tenants, eight hour sessions.'
      ],
      [332, 0, 'Yes. I will write up the follow-ups. Thanks, everyone.']
    ]
  )
}

export const GATEWAY_PREVIOUS: MeetingResult = {
  summary:
    'Failed SFTP uploads are the main source of gateway support tickets. The team agreed on retry with backoff and a per-tenant webhook rate limit, and asked for a failure dashboard before the next sync.',
  decisions: ['Retry failed SFTP uploads up to five times with exponential backoff.'],
  minutes: [
    {
      topic: 'SFTP failures',
      points: [
        'About 3% of uploads fail on the first attempt; most succeed when retried by hand.',
        'Jiwoo owns the retry change (INAX-127).'
      ]
    },
    {
      topic: 'Webhook load',
      points: ['The per-tenant rate limit (INAX-112) is live and held up during the last spike.']
    }
  ],
  transcript: turns(
    [ME, JIWOO, SORA],
    [
      [
        5,
        1,
        "I went through last month's gateway tickets. Most of them are the same thing: an SFTP upload fails once and nobody retries it."
      ],
      [19, 2, 'How often is once?'],
      [
        23,
        1,
        'Around three percent of uploads. Nearly all of them go through when support retries by hand.'
      ],
      [
        34,
        0,
        'Then we should retry for them. Backoff, a cap, and an alert when the cap is reached.'
      ],
      [45, 1, 'Five attempts with exponential backoff is what I would start with. I can take it.'],
      [
        55,
        2,
        'I would like to see failures per tenant somewhere before we meet again, so we know if it worked.'
      ],
      [66, 0, 'A small dashboard is enough. I will ask for one.'],
      [73, 2, 'And the webhook rate limit held during the spike on Tuesday, so that one is done.']
    ]
  )
}

// What the mock "processing" step reveals for a recording made in the app.
export const RECORDED_SAMPLE: MeetingResult = {
  summary:
    'Sample result. A short sync on open work: one decision on scope and two actions to follow up.',
  decisions: ['Limit the first version to the admin console; the public API follows later.'],
  minutes: [
    {
      topic: 'Scope',
      points: [
        'The first version covers the admin console only.',
        'The public API is tracked separately.'
      ]
    }
  ],
  transcript: turns(
    [ME, JIWOO],
    [
      [3, 0, 'Quick sync. I want to agree on what goes into the first version.'],
      [11, 1, 'I would keep it to the admin console. The public API needs its own review.'],
      [20, 0, 'Agreed. I will note the API as a separate piece of work.'],
      [28, 1, 'Can you also share the draft with Sora before Friday?'],
      [34, 0, 'Yes. I will send it today and ask for comments.'],
      [41, 1, 'Good. That is all from me.']
    ]
  )
}
