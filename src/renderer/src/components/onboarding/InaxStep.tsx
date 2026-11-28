import { Hexagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { INAX_MOCK_ACCOUNT, signInInaxMock } from '@/lib/inax-mock-account'
import { useHomeBoard } from '../home/use-home-board'
import { InaxDemoNote } from '../task-page/inax/InaxDemoNote'

/** Sign in to inAX on the page, then see what it found. Skipping leaves the same button on Home and Tasks. */
export function InaxStep({ signedIn }: { signedIn: boolean }): React.JSX.Element {
  const t = useTranslate()
  const { counts } = useHomeBoard().view
  return (
    <div
      className="flex max-w-xl flex-col items-start gap-4 rounded-lg border border-border p-5"
      data-onboarding-inax={signedIn ? 'signed-in' : 'signed-out'}
    >
      <div className="flex items-center gap-3">
        <Hexagon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t('auto.components.TaskPage.inaxSource', 'inAX')}
          </p>
          {signedIn ? (
            <p className="text-xs text-muted-foreground">{INAX_MOCK_ACCOUNT.email}</p>
          ) : null}
        </div>
      </div>
      {signedIn ? (
        <p role="status" className="text-[15px] leading-relaxed text-foreground">
          {t('taskLoop.onboarding.found', '{{open}} tasks assigned to you · {{due}} due today', {
            open: counts.open,
            due: counts.dueToday
          })}
        </p>
      ) : (
        <Button type="button" data-inax-sign-in="" onClick={signInInaxMock}>
          {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
        </Button>
      )}
      <InaxDemoNote />
    </div>
  )
}
