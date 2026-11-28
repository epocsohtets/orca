import { useRef } from 'react'
import { Languages } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { LanguagePickerDialog } from '@/components/languages/LanguagePickerDialog'
import { currentFocusTarget, firstConnected } from '@/components/languages/focus-return'
import type { OnboardingLanguageOffer } from './use-onboarding-language-offer'

/**
 * Header language control: the language mark and the word in the current language; with an offer it also
 * names the offered language in its own script, e.g. "Language · italiano".
 */
export function OnboardingLanguageSwitcherButton({
  offer,
  onOpen,
  buttonRef
}: {
  offer: OnboardingLanguageOffer | null
  onOpen: () => void
  buttonRef?: React.Ref<HTMLButtonElement>
}): React.JSX.Element {
  const t = useTranslate()
  return (
    // Why the icon: it is the way out for anyone who cannot read the current language.
    <Button ref={buttonRef} variant="ghost" size="sm" onClick={onOpen}>
      <Languages />
      {/* Why a span: Button is flex with a gap, which would split the label's text runs. */}
      <span>
        {t('settings.appearance.language.title', 'Language')}
        {offer ? (
          <>
            {' · '}
            <bdi lang={offer.locale}>{offer.name}</bdi>
          </>
        ) : null}
      </span>
    </Button>
  )
}

export function OnboardingLanguageSwitcher({
  offer,
  open,
  onOpenChange
}: {
  offer: OnboardingLanguageOffer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const opener = useRef<HTMLElement | null>(null)
  const languageButton = useRef<HTMLButtonElement | null>(null)
  return (
    <>
      <OnboardingLanguageSwitcherButton
        offer={offer}
        buttonRef={languageButton}
        onOpen={() => {
          opener.current = currentFocusTarget()
          onOpenChange(true)
        }}
      />
      <LanguagePickerDialog
        open={open}
        onOpenChange={onOpenChange}
        onboarding
        returnFocus={() => firstConnected(opener.current, languageButton.current)}
      />
    </>
  )
}
