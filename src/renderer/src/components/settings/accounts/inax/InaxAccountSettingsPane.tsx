import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { INAX_MOCK_ACCOUNT, useInaxMockAccount } from '@/lib/inax-mock-account'
import { OrcaAccountHeader } from '../orca/OrcaAccountSettingsPane'

/** PoC stand-in for the Orca account pane: a mock inAX sign-in with no network. */
export function InaxAccountSettingsPane(): React.JSX.Element {
  const t = useTranslate()
  const signedIn = useInaxMockAccount((state) => state.signedIn)
  return (
    <OrcaAccountHeader
      name={
        signedIn
          ? INAX_MOCK_ACCOUNT.name
          : t('auto.components.settings.inaxAccount.account', 'inAX account')
      }
      connected={signedIn}
      line={
        signedIn
          ? INAX_MOCK_ACCOUNT.email
          : t(
              'auto.components.settings.inaxAccount.signedOut',
              'Sign in to see your inAX tasks in Orca.'
            )
      }
    >
      <Button
        type="button"
        variant={signedIn ? 'outline' : 'default'}
        size="sm"
        onClick={() => useInaxMockAccount.setState({ signedIn: !signedIn })}
      >
        {signedIn
          ? t('auto.components.settings.orcaAccount.signOut', 'Sign out')
          : t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
      </Button>
    </OrcaAccountHeader>
  )
}
