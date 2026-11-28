import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { botRefKey } from '@/lib/bot-hosts'
import { useNow } from '@/lib/window-activity/use-now'
import { cn } from '@/lib/class-names'
import { BotItemsSection } from '@/components/bots/items/BotItemsSection'
import { BotItemPane } from '@/components/bots/items/BotItemPane'
import { BotItemView } from '@/components/bots/items/BotItemView'
import { useBotItems } from '@/components/bots/items/use-bot-items'
import { useBotItemsSeenAtOpen } from '@/components/bots/items/use-bot-items-seen-mark'
import { useBotItemsShownList } from '@/components/bots/items/use-bot-items-shown-list'
import { useBotItemWalk } from '@/components/bots/items/use-bot-item-walk'
import { useBotItemBackFocus } from '@/components/bots/items/use-bot-item-back-focus'
import type { BotNeedsYouAsks } from '@/components/bots/BotNeedsYouSection'
import {
  BOT_ITEM_GROUP_IDS,
  BOT_ITEM_NO_FILTER,
  type BotItemFilter
} from '../../../../shared/bots/bot-item-groups'
import { botItemWalkReturnRow } from '../../../../shared/bots/bot-item-walk'
import { homeTasksBot, useHomeItemsPanel } from './home-task-items-host'
import { taskItemUid } from './home-task-item-model'
import { useSidePanelInset } from './use-side-panel-inset'

/** `openHomeItem` with this opens the first row of 내 확인 필요: the start of the day-end pass. */
export const FIRST_NEEDS_YOU = '\u0000needs-you'

const NO_ASKS: BotNeedsYouAsks = { needs: [], stoppedForSignIn: [], itemOf: () => null }

/**
 * Home's right panel: my 업무 as Orca's item panel lists a bot's items, in its groups, and one 업무 opened in
 * the list's place with its timeline, its ask and the 1 / N stepper. The same components as a bot's Home tab.
 */
export function HomeItemsPanel({ className }: { className?: string }): React.JSX.Element {
  const t = useTranslate()
  useSidePanelInset()
  const bot = useMemo(() => homeTasksBot(t('taskLoop.agent.name', 'Task agent')), [t])
  const items = useBotItems(bot)
  const read = items.read
  const seenAtOpen = useBotItemsSeenAtOpen(bot, read, items.landed)
  const [filter, setFilter] = useState<BotItemFilter>(BOT_ITEM_NO_FILTER)
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const clock = useNow(60_000)
  const list = useBotItemsShownList(bot, read, filter, clock, seenAtOpen ?? '')
  const walk = useBotItemWalk(list, botRefKey(bot))
  const scroll = useRef<HTMLDivElement | null>(null)
  useBotItemBackFocus(walk.uid !== null, scroll)
  // A row or 업무 정리 elsewhere on Home opens its 업무 here, once the list has it.
  const request = useHomeItemsPanel((state) => state.request)
  useEffect(() => {
    if (!request || !read) {
      return
    }
    const uid = request.uid === FIRST_NEEDS_YOU ? list.groups.needs_you[0]?.uid : request.uid
    if (uid && read.items.some((item) => item.uid === uid)) {
      useHomeItemsPanel.setState({ request: null })
      setReturnTo(null)
      walk.open(uid)
    }
  }, [request, read, list.groups, walk])
  const back = (): void => {
    const left = walk.close()
    const listed = BOT_ITEM_GROUP_IDS.flatMap((id) => list.groups[id].map((item) => item.uid))
    setReturnTo(left ? botItemWalkReturnRow(left.walk, left.uid, listed) : null)
  }
  return (
    <aside
      aria-label={t('home.tasks.title', 'My work')}
      data-home-items-panel=""
      className={cn(
        '@container/item-pane flex w-[380px] shrink-0 flex-col border-l border-border bg-sidebar',
        className
      )}
    >
      {walk.uid ? (
        <BotItemPane
          bot={bot}
          uid={walk.uid}
          listed={read?.items.find((item) => item.uid === walk.uid)}
          walk={walk}
          offline={false}
          onBack={back}
        />
      ) : (
        <div
          ref={scroll}
          data-bot-items-scroller=""
          tabIndex={-1}
          className="@container scrollbar-sleek flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto py-3 pr-2 pl-3.5 outline-none"
        >
          <BotItemsSection
            bot={bot}
            list={list}
            seenEventId={seenAtOpen}
            filter={filter}
            onFilter={setFilter}
            now={clock}
            focusUid={returnTo}
            onOpen={(item) => {
              setReturnTo(null)
              walk.open(item.uid)
            }}
            botRead={items}
            asks={NO_ASKS}
            offline={false}
            focusFallback={scroll}
            scroller={scroll}
          />
        </div>
      )}
    </aside>
  )
}

/** One 업무 as its item, alone: beside the Work board and in a task workspace's sidebar. */
export function HomeTaskItem({
  taskId,
  className
}: {
  taskId: string
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  const bot = useMemo(() => homeTasksBot(t('taskLoop.agent.name', 'Task agent')), [t])
  return (
    <aside
      aria-label={t('home.tasks.title', 'My work')}
      data-work-task-panel={taskId}
      className={cn(
        '@container/item-pane flex w-[380px] shrink-0 flex-col border-l border-border bg-sidebar pt-2',
        className
      )}
    >
      <BotItemView key={taskId} bot={bot} uid={taskItemUid(taskId)} />
    </aside>
  )
}
