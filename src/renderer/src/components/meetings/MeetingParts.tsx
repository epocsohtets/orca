import React from 'react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { Label } from '@/components/ui/label'
import { INAX_MOCK_TASKS, type InaxTaskStatus } from '@/components/task-page/inax/inax-mock-tasks'
import { useInaxSourceSelection } from '@/components/task-page/inax/inax-source-selection'

export const MEETING_FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

export const inaxTaskStatus = (taskId: string): InaxTaskStatus | undefined =>
  INAX_MOCK_TASKS.find((task) => task.id === taskId)?.status

export function useInaxStatusLabels(): Record<InaxTaskStatus, string> {
  const t = useTranslate()
  return {
    open: t('auto.components.TaskPage.inaxStatusOpen', 'Open'),
    inProgress: t('auto.components.TaskPage.inaxStatusInProgress', 'In progress'),
    done: t('auto.components.TaskPage.18451e99df', 'Done')
  }
}

/** One titled block in a meeting tab; `action` sits at the end of the heading row. */
export function MeetingSection({
  title,
  action,
  children
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="min-w-0">
      <div className="mb-1.5 flex min-h-6 items-center justify-between gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** An inAX task reference; opens Tasks on the inAX source. */
export function InaxTaskChip({ taskId }: { taskId: string }): React.JSX.Element {
  const t = useTranslate()
  return (
    <button
      type="button"
      aria-label={t('meetings.openTask', 'Open {{id}} in Tasks', { id: taskId })}
      className={cn(
        'inline-flex h-6 shrink-0 cursor-pointer items-center rounded-md border border-border px-1.5 font-mono text-2xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        MEETING_FOCUS_RING
      )}
      onClick={() => {
        useInaxSourceSelection.setState({ selected: true })
        useAppStore.getState().openTaskPage()
      }}
    >
      {taskId}
    </button>
  )
}

/** A tab with nothing to show yet: what is missing, and the action that gets it when there is one. */
export function MeetingEmptyState({
  title,
  detail,
  children
}: {
  title: string
  detail: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-start gap-1 py-6">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-prose text-xs text-muted-foreground">{detail}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  )
}

/** Label above the control, help under the label, error under the control. */
export function MeetingFormField({
  id,
  label,
  description,
  error,
  children
}: {
  id: string
  label: string
  description?: string
  error?: string | null
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p id={`${id}-description`} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** The aria wiring an input inside MeetingFormField needs. */
export function fieldAria(
  id: string,
  error: string | null | undefined,
  hasDescription = false
): { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined } {
  return {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : hasDescription ? `${id}-description` : undefined
  }
}
