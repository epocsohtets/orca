// A bot whose items this window serves itself instead of a bot host: the item panel's components read
// and write it through the usual bot calls, and its chat opens wherever the server says.
export type LocalBotItems = {
  call: (method: string, params: unknown) => Promise<unknown>
  openChat: (chatId: string) => void
}

const served = new Map<string, LocalBotItems>()

export function serveLocalBotItems(botId: string, items: LocalBotItems): () => void {
  served.set(botId, items)
  return () => {
    if (served.get(botId) === items) {
      served.delete(botId)
    }
  }
}

export function localBotItems(botId: unknown): LocalBotItems | undefined {
  return typeof botId === 'string' ? served.get(botId) : undefined
}
