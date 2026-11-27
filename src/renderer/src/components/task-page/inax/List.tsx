import { cn } from '@/lib/class-names'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GitHubUserAvatar } from '@/components/github/github-user-avatar'
import {
  GITHUB_TASK_GRID_CLASS,
  GITHUB_TASK_HEADER_SURFACE_CLASS,
  GITHUB_TASK_STICKY_ID_CELL_CLASS,
  GITHUB_TASK_STICKY_ID_HEADER_CLASS,
  GITHUB_TASK_STICKY_TITLE_CELL_CLASS,
  GITHUB_TASK_STICKY_TITLE_HEADER_CLASS,
  formatRelativeTime
} from '../task-page-source-context'
import { INAX_MOCK_TASKS, type InaxTaskStatus } from './inax-mock-tasks'

// Same columns as the GitHub issue grid without its trailing action column.
const INAX_TASK_GRID_CLASS = cn(
  GITHUB_TASK_GRID_CLASS,
  'grid-cols-[72px_minmax(320px,1fr)_84px_100px_92px]'
)

// Tones reused from the GitHub work-item state badge.
const INAX_STATUS_TONES: Record<InaxTaskStatus, string> = {
  open: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  inProgress: 'border-border/60 text-foreground',
  done: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300'
}

export function TaskPageInaxList(): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const statusLabels: Record<InaxTaskStatus, string> = {
    // Why: the shared 'Open' key is translated as the verb.
    open: t('auto.components.TaskPage.inaxStatusOpen', 'Open'),
    inProgress: t('auto.components.TaskPage.inaxStatusInProgress', 'In progress'),
    done: t('auto.components.TaskPage.18451e99df', 'Done')
  }
  return (
    <div
      className="mt-3 flex min-h-0 min-w-0 max-h-full flex-col overflow-hidden rounded-md border border-border/50 bg-background shadow-sm"
      data-task-list="inax"
    >
      <div className="min-h-0 flex-initial overflow-auto scrollbar-sleek scrollbar-sleek-lg">
        <div
          className={cn(
            'sticky top-0 z-40 grid h-8 gap-3 border-b border-border/50 px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground [&>span]:flex [&>span]:items-center',
            GITHUB_TASK_HEADER_SURFACE_CLASS,
            INAX_TASK_GRID_CLASS
          )}
        >
          <span className={GITHUB_TASK_STICKY_ID_HEADER_CLASS}>
            {t('auto.components.TaskPage.eb10c32872', 'ID')}
          </span>
          <span className={GITHUB_TASK_STICKY_TITLE_HEADER_CLASS}>
            {t('auto.components.TaskPage.5eccb3c841', 'Title / Context')}
          </span>
          <span>{t('auto.components.TaskPage.d2a876ca53', 'Assignee')}</span>
          <span>{t('auto.components.TaskPage.154b0fa623', 'Status')}</span>
          <span>{t('auto.components.TaskPage.f362667d55', 'Updated')}</span>
        </div>
        <div className="divide-y divide-border/40">
          {INAX_MOCK_TASKS.map((task) => (
            <div
              key={task.id}
              className={cn(
                'group/github-task-row grid min-h-12 gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                INAX_TASK_GRID_CLASS
              )}
            >
              <div className={GITHUB_TASK_STICKY_ID_CELL_CLASS}>
                <span className="inline-flex items-center rounded-md border border-border/40 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted-foreground">
                  {task.id}
                </span>
              </div>
              <div className={GITHUB_TASK_STICKY_TITLE_CELL_CLASS}>
                <h3 className="truncate text-[13px] font-medium text-foreground">{task.title}</h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-muted-foreground">
                  <span>{task.author}</span>
                  <span>{task.project}</span>
                  {task.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-border/40 bg-muted/30 px-1.5 py-0 text-[10px] text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex min-w-0 items-center text-xs text-muted-foreground">
                {task.assignee ? (
                  // Why: a blank login renders initials instead of requesting a GitHub avatar.
                  <GitHubUserAvatar
                    login=""
                    name={task.assignee}
                    title={task.assignee}
                    className="size-5"
                  />
                ) : (
                  <span className="text-muted-foreground/60">-</span>
                )}
              </div>
              <div className="flex items-center">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none',
                    INAX_STATUS_TONES[task.status]
                  )}
                >
                  {statusLabels[task.status]}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-[11px] text-muted-foreground">
                    {formatRelativeTime(task.updatedAt)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {new Date(task.updatedAt).toLocaleString(intlLocale)}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
