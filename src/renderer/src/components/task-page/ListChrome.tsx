import type { TaskPageComposerActionsModel } from './use-task-page-composer-actions'
import { cn } from '@/lib/class-names'
import { TaskPageSourceBar } from './SourceBar'
import { AlertCircle } from 'lucide-react'
import { TaskPageGitHubModeControls } from './github/listing/ModeControls'
import { TaskPageProviderFilters } from './ProviderFilters'
import { useInaxSelected, useInaxSourceSelection } from './inax/inax-source-selection'
export function TaskPageListChrome({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element | null {
  const { taskSourceAvailabilityNotice, taskPageListChromeHidden } = model
  const inaxSelected = useInaxSelected()
  // A task's page and its conversation take the whole content area, as a GitHub item's page does.
  const inaxTaskOpen = useInaxSourceSelection((state) => state.taskId !== null) && inaxSelected
  return (
    <div
      className={cn(
        'flex-none flex flex-col gap-2',
        (taskPageListChromeHidden || inaxTaskOpen) && 'hidden'
      )}
    >
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <TaskPageSourceBar model={model} />

          {inaxSelected ? null : taskSourceAvailabilityNotice ? (
            <div
              role="status"
              className="flex max-w-3xl items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
              title={taskSourceAvailabilityNotice.title}
            >
              <AlertCircle className="size-3.5 flex-none" />
              <span className="min-w-0 truncate">{taskSourceAvailabilityNotice.label}</span>
            </div>
          ) : null}

          {inaxSelected ? null : (
            <>
              <TaskPageGitHubModeControls model={model} />

              <TaskPageProviderFilters model={model} />
            </>
          )}
        </div>
      </section>
    </div>
  )
}
