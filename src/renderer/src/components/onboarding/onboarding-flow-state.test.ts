import { describe, expect, it } from 'vitest'
import { onboardingPageIds } from './onboarding-flow-state'

const MAC_WITH_GH = { skipIntegrations: true, skipWindowsTerminal: true }

describe('onboarding pages by work style', () => {
  it('gives someone who works without code two pages: how they work, then inAX sign-in', () => {
    expect(onboardingPageIds({ ...MAC_WITH_GH, skipDeveloperSteps: true })).toEqual([
      'work_style',
      'inax'
    ])
  })

  it('keeps the developer pages, without the inAX page, for Code or nothing chosen', () => {
    expect(onboardingPageIds({ ...MAC_WITH_GH, skipDeveloperSteps: false })).toEqual([
      'work_style',
      'agent_surface',
      'agent',
      'theme',
      'notifications'
    ])
  })
})
