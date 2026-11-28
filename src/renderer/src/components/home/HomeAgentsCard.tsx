import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  HOME_FOCUS_RING_CLASS,
  HOME_META_CLASS,
  HOME_ROW_DETAIL_CLASS,
  HomeAvatar,
  HomeCard,
  HomeWhoMarker
} from './HomeCard'
import type { HomeAgent, HomeAgentState } from './home-board'

const HEAD_CLASS =
  'px-4 py-2 text-left text-2xs font-medium whitespace-nowrap uppercase tracking-wider'
const CELL_CLASS = 'px-4 py-2 align-middle'

/** One line per agent or bot: what it is doing, its state, how far along it is. Waiting on me comes first. */
export function HomeAgentsCard({
  agents,
  openId,
  onOpen,
  onRevealTask
}: {
  agents: readonly HomeAgent[]
  openId: string | null
  /** Goes to the agent's conversation; a bot without one opens in place. */
  onOpen: (id: string) => void
  onRevealTask: (taskId: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const stateLabels: Record<HomeAgentState, string> = {
    waiting: t('home.agents.waiting', 'Waiting for my answer'),
    working: t('home.agents.working', 'Working'),
    blocked: t('home.agents.blocked', 'Blocked'),
    idle: t('home.agents.idle', 'Resting')
  }
  const stageLabels = [
    t('home.agents.stageNone', 'Not started'),
    t('home.agents.stagePlan', 'Plan'),
    t('home.agents.stageWork', 'Work'),
    t('home.agents.stageReview', 'Review')
  ]

  return (
    <HomeCard title={t('home.agents.title', 'Agents')} data-home-card="agents">
      <div className="scrollbar-sleek overflow-x-auto border-t border-border">
        <table className="w-full min-w-[40rem] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className={HEAD_CLASS}>
                {t('home.agents.colWho', 'Name')}
              </th>
              <th scope="col" className={HEAD_CLASS}>
                {t('home.agents.colDoing', 'Doing now')}
              </th>
              <th scope="col" className={HEAD_CLASS}>
                {t('home.agents.colState', 'State')}
              </th>
              <th scope="col" className={HEAD_CLASS}>
                {t('home.agents.colProgress', 'Progress')}
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-right`}>
                {t('home.agents.colLast', 'Last activity')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map((agent) => {
              const open = openId === agent.id
              return (
                <React.Fragment key={agent.id}>
                  <tr
                    data-home-agent={agent.id}
                    className="cursor-pointer transition-colors motion-reduce:transition-none hover:bg-accent"
                    onClick={() => onOpen(agent.id)}
                  >
                    <th scope="row" className={`${CELL_CLASS} text-left font-medium`}>
                      <button
                        type="button"
                        className={`${HOME_FOCUS_RING_CLASS} -mx-2 flex min-h-6 items-center gap-2 rounded-md px-2 text-left text-foreground`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpen(agent.id)
                        }}
                      >
                        <HomeAvatar name={agent.name} />
                        <span className="whitespace-nowrap">{agent.name}</span>
                      </button>
                    </th>
                    <td className={`${CELL_CLASS} text-foreground`}>
                      <span className="line-clamp-2">{agent.doing}</span>
                    </td>
                    <td className={`${CELL_CLASS} whitespace-nowrap`}>
                      <HomeWhoMarker
                        who={agent.state}
                        label={agent.stateLabel ?? stateLabels[agent.state]}
                      />
                    </td>
                    <td className={CELL_CLASS}>
                      <span className="flex items-center gap-2">
                        <Progress
                          value={(agent.stage / 3) * 100}
                          aria-label={t('home.agents.stageOf', '{{stage}} · {{step}} of 3', {
                            stage: stageLabels[agent.stage],
                            step: agent.stage
                          })}
                          className="h-1.5 w-16"
                        />
                        <span className={`whitespace-nowrap ${HOME_META_CLASS}`}>
                          {stageLabels[agent.stage]}
                        </span>
                      </span>
                    </td>
                    <td className={`${CELL_CLASS} text-right whitespace-nowrap ${HOME_META_CLASS}`}>
                      {agent.last}
                    </td>
                  </tr>
                  {open ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className={HOME_ROW_DETAIL_CLASS}>
                          <ul className="flex flex-col gap-1">
                            {agent.lines.map((line) => (
                              <li key={line} className="text-xs text-foreground">
                                <span className="font-medium">{agent.name}</span>
                                {' · '}
                                {line}
                              </li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap items-center gap-2">
                            {agent.state === 'waiting' && agent.taskId ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => agent.taskId && onRevealTask(agent.taskId)}
                              >
                                {t('home.agents.answerInTask', 'Answer it')}
                              </Button>
                            ) : agent.taskId ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => agent.taskId && onRevealTask(agent.taskId)}
                              >
                                {t('home.agents.showTask', 'Show its task')}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </HomeCard>
  )
}
