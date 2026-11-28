// The open item's Chat row: the chat it belongs to, opened on click.
import { ExternalLink, House, MessageSquare } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotItem } from '../../../../../shared/bots/bot-items'
import { openBotSession } from '../bot-session-open'

export function BotItemChatRow({
  bot,
  item,
  title
}: {
  bot: Bot
  item: BotItem
  title: string
}): React.JSX.Element {
  const t = useTranslate()
  const ChatIcon = item.chat.kind === 'home' ? House : MessageSquare
  return (
    <>
      <dt className="leading-6 text-muted-foreground">{t('bots.items.field.chat', 'Chat')}</dt>
      <dd className="flex h-6 items-center">
        <button
          type="button"
          className="flex min-w-0 items-center gap-1.5 text-foreground hover:underline"
          onClick={() => openBotSession(bot, item.chat.id)}
        >
          <ChatIcon className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{title}</span>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </dd>
    </>
  )
}
