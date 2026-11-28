import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store/index'
import { INAX_INTEGRATION_SECTION_ID } from './task-provider-integration-section-ids'

/** A link on the Orca account page for someone who came looking for their inAX sign-in. */
export function InaxAccountPointer(): React.JSX.Element {
  const t = useTranslate()
  return (
    <p className="mt-4 text-xs text-muted-foreground" data-inax-account-pointer="">
      <Button
        type="button"
        variant="link"
        size="inlineText"
        onClick={() => {
          const state = useAppStore.getState()
          state.openSettingsTarget({
            pane: 'integrations',
            repoId: null,
            sectionId: INAX_INTEGRATION_SECTION_ID
          })
          state.openSettingsPage()
        }}
      >
        {t('taskLoop.settings.pointerLink', 'inAX account')}
      </Button>
    </p>
  )
}
