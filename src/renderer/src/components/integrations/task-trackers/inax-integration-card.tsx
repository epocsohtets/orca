import { Hexagon, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { INAX_MOCK_ACCOUNT, useInaxMockAccount } from '@/lib/inax-mock-account'
import { defaultScopeHost } from '@/runtime/hosts/selection/default-creation-host'
import { useAppStore } from '@/store/index'
import {
  IntegrationCardDetails,
  IntegrationCardShell
} from '../presentation/integration-card-shell'
import { useIntegrationSubordinateRowClass } from '../presentation/integration-card-presentation'
import { useProviderAccountScope } from '../../provider-accounts/use-provider-host-scope'
import { ProviderHostScopeControl } from '../../provider-accounts/ProviderHostScopeControl'
import { INAX_INTEGRATION_SECTION_ID } from './task-provider-integration-section-ids'

/** PoC: mock inAX sign-in shaped like the Linear/Jira cards. No network, no credentials. */
export function InaxIntegrationCard(): React.JSX.Element {
  const t = useTranslate()
  const connected = useInaxMockAccount((state) => state.signedIn)
  const settings = useAppStore((s) => s.settings)
  const accountScope = useProviderAccountScope(defaultScopeHost(settings))
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const accountScopeRowClass = useIntegrationSubordinateRowClass('text-xs')

  return (
    <IntegrationCardShell
      settingsSectionId={INAX_INTEGRATION_SECTION_ID}
      icon={<Hexagon className="size-5" />}
      name="inAX"
      description={
        connected
          ? t('auto.components.settings.inaxAccount.providerConnected', '1 account connected')
          : t(
              'auto.components.settings.inaxAccount.providerDescription',
              'Sign in with inAX to browse and start work from your inAX tasks.'
            )
      }
      statusTone={connected ? 'connected' : 'attention'}
      statusLabel={
        connected
          ? t(
              'auto.components.settings.task.tracker.integration.cards.statusConnected',
              'Connected'
            )
          : t(
              'auto.components.settings.task.tracker.integration.cards.statusNotConnected',
              'Not connected'
            )
      }
      actions={
        connected ? null : (
          <Button size="sm" onClick={() => useInaxMockAccount.setState({ signedIn: true })}>
            {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
          </Button>
        )
      }
    >
      <IntegrationCardDetails>
        <ProviderHostScopeControl
          labelPrefix={t(
            'auto.components.settings.task.tracker.integration.cards.account_scope_prefix',
            'Account scope'
          )}
          scope={accountScope}
          className={accountScopeRowClass}
        />
        {connected ? (
          <div className={subordinateRowClass}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {INAX_MOCK_ACCOUNT.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{INAX_MOCK_ACCOUNT.email}</p>
            </div>
            <button
              onClick={() => useInaxMockAccount.setState({ signedIn: false })}
              aria-label={t(
                'auto.components.settings.task.tracker.integration.cards.dd3529015d',
                'Disconnect {{value0}}',
                { value0: INAX_MOCK_ACCOUNT.name }
              )}
              className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
            >
              <Unlink className="size-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t(
              'auto.components.settings.inaxAccount.providerCredentialCopy',
              'Sign in with your inAX account. This preview uses a sample account: nothing is sent or stored, and the sign-in resets when Orca reloads.'
            )}
          </p>
        )}
      </IntegrationCardDetails>
    </IntegrationCardShell>
  )
}
