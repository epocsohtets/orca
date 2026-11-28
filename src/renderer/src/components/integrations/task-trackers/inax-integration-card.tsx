import { Hexagon, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { INAX_MOCK_ACCOUNT, signInInaxMock, useInaxMockAccount } from '@/lib/inax-mock-account'
import {
  IntegrationCardDetails,
  IntegrationCardShell
} from '../presentation/integration-card-shell'
import { useIntegrationSubordinateRowClass } from '../presentation/integration-card-presentation'
import { openInaxTask } from '@/components/task-page/inax/inax-source-selection'
import { InaxDemoNote } from '@/components/task-page/inax/InaxDemoNote'
import { INAX_INTEGRATION_SECTION_ID } from './task-provider-integration-section-ids'

/** PoC: the mock inAX account, shaped like the Linear/Jira cards: see it, go to its tasks, disconnect it. */
export function InaxIntegrationCard(): React.JSX.Element {
  const t = useTranslate()
  const connected = useInaxMockAccount((state) => state.signedIn)
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')

  return (
    <IntegrationCardShell
      settingsSectionId={INAX_INTEGRATION_SECTION_ID}
      icon={<Hexagon className="size-5" />}
      name="inAX"
      description={
        connected
          ? t('auto.components.settings.inaxAccount.providerConnected', '1 account connected')
          : t(
              'taskLoop.settings.cardDescription',
              'Sign in and your tasks appear on Home and in Tasks.'
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
        connected ? (
          <Button size="sm" variant="outline" onClick={() => openInaxTask(null)}>
            {t('taskLoop.settings.viewTasks', 'See my work')}
          </Button>
        ) : (
          <Button size="sm" onClick={signInInaxMock}>
            {t('auto.components.settings.inaxAccount.signIn', 'Sign in with inAX')}
          </Button>
        )
      }
    >
      <IntegrationCardDetails>
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
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Unlink className="size-3.5" />
            </button>
          </div>
        ) : (
          <InaxDemoNote />
        )}
      </IntegrationCardDetails>
    </IntegrationCardShell>
  )
}
