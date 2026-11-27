import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { Button } from '@/components/ui/button'
import { HOME_META_CLASS, HomeProjectDot, HomeWhoMarker } from '@/components/home/HomeCard'
import type { HomeTask } from '@/components/home/home-board'
import type { HomeProject } from '@/components/home/home-board-mock'
import { inaxStatusTo } from '@/components/home/home-task-loop-script'
import { homeSampleMoment } from '@/components/home/home-day'
import { InaxStatusBadge } from './inax-status-badge'
import { InaxDemoNote } from './InaxDemoNote'

const NOTE_TIME: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
}

/** One inAX task: what it is, when it is due, where it stands, and the notes left on it. */
export function TaskPageInaxTaskDetail({
  task,
  project,
  onBack,
  onStart,
  onOpenChat,
  onFinish
}: {
  task: HomeTask
  project: HomeProject
  onBack: () => void
  /** Hands a task that is mine to an agent. */
  onStart: () => void
  /** Opens the conversation a task already has. */
  onOpenChat: () => void
  onFinish: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const statusTo = inaxStatusTo(t)
  const hasChat = task.loop !== undefined || task.who !== null
  const notes = task.notes ?? []

  return (
    <article
      data-inax-task-detail={task.id}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm"
    >
      <header className="flex-none border-b border-border px-5 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <Button
            type="button"
            variant="ghost-muted"
            size="xs"
            className="-ml-2 self-start"
            onClick={onBack}
          >
            <ChevronLeft className="size-3.5" />
            {t('home.tasks.title', 'My work')}
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <h2 className="min-w-0 flex-1 text-lg leading-snug font-semibold text-foreground">
              {task.title}
            </h2>
            {task.done ? null : hasChat ? (
              <Button type="button" size="sm" data-inax-open-chat="" onClick={onOpenChat}>
                {t('taskLoop.detail.openChat', 'Open the conversation')}
              </Button>
            ) : (
              <Button type="button" size="sm" data-inax-start="" onClick={onStart}>
                {t('taskLoop.detail.start', 'Start with an agent')}
              </Button>
            )}
          </div>
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">{t('taskLoop.detail.status', 'Status')}</dt>
              <dd>{task.status ? <InaxStatusBadge status={task.status} /> : null}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">{t('taskLoop.detail.due', 'Due')}</dt>
              <dd
                className={
                  task.due === 'overdue' && !task.done ? 'text-destructive' : 'text-foreground'
                }
              >
                {task.dueLabel}
              </dd>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <dt className="text-muted-foreground">{t('taskLoop.detail.project', 'Project')}</dt>
              <dd className="min-w-0">
                <HomeProjectDot project={project} />
              </dd>
            </div>
            {task.who && task.whoLabel ? (
              <div className="flex min-w-0 items-center gap-2">
                <dt className="text-muted-foreground">{t('taskLoop.detail.who', 'Who has it')}</dt>
                <dd className="min-w-0">
                  <HomeWhoMarker who={task.who} label={task.whoLabel} />
                </dd>
              </div>
            ) : null}
          </dl>
          <InaxDemoNote />
        </div>
      </header>
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('taskLoop.detail.description', 'Description')}
            </h3>
            <p className="text-[13px] leading-relaxed text-foreground">{task.detail}</p>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('taskLoop.detail.notes', 'Progress notes')}
            </h3>
            {notes.length === 0 ? (
              <p className={HOME_META_CLASS}>
                {t(
                  'taskLoop.detail.notesEmpty',
                  'No notes yet. A note an agent writes is kept here once you confirm it.'
                )}
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    data-inax-note=""
                    className="flex flex-col gap-1 border-l-2 border-border pl-3"
                  >
                    <p className="text-[13px] leading-relaxed whitespace-pre-line text-foreground">
                      {note.text}
                    </p>
                    <p className={HOME_META_CLASS}>
                      {t(
                        'taskLoop.detail.noteBy',
                        'Written by the agent, confirmed by Mako · {{when}} · status changed {{to}}',
                        {
                          when: uiDateTimeFormat(NOTE_TIME, intlLocale).format(
                            homeSampleMoment(note.at)
                          ),
                          to: statusTo[note.status]
                        }
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {task.hasDraft ? (
            <section className="flex flex-col gap-2" data-inax-attached="">
              <h3 className="text-sm font-semibold text-foreground">
                {t('taskLoop.detail.attached', 'Attached')}
              </h3>
              <p className="text-[13px] text-foreground">
                {t(
                  'taskLoop.detail.attachedDraft',
                  'The agent’s draft. It has not been sent to anyone; the reviewer reads it here.'
                )}{' '}
                <Button type="button" variant="link" size="inlineText" onClick={onOpenChat}>
                  {t('taskLoop.proposal.output', 'Open the draft')}
                </Button>
              </p>
            </section>
          ) : null}
          {!task.done && task.who === null && !task.loop ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={onFinish}
            >
              {t('taskLoop.detail.finish', 'I finished it myself: move to Done')}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
