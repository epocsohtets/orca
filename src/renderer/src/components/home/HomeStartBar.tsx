import React, { useId, useState } from 'react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { openBotHomeTab, useBots } from '@/lib/bot-catalog'
import { HOME_META_CLASS } from './HomeSection'

/** Where anything starts: one input and three quiet starters. It starts flows that already exist; it sends nothing. */
export function HomeStartBar({
  inputRef
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
}): React.JSX.Element {
  const t = useTranslate()
  const bots = useBots()
  const inputId = useId()
  const messageId = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const draft = text.trim()

  // The composer has no prompt field to seed, so the text becomes the new workspace's name.
  const startWithAgent = (): void =>
    useAppStore
      .getState()
      .openModal('new-workspace-composer', draft ? { prefilledName: draft } : {})
  const askBot = (): void => {
    const bot = bots[0]
    if (!bot) {
      useAppStore.getState().openModal('bot-templates')
      return
    }
    setPending(true)
    void openBotHomeTab(bot, draft ? { draft } : undefined).finally(() => setPending(false))
  }
  const validate = (): boolean => {
    // An empty field is fine until the user asks to start; only-spaces is a mistake worth naming.
    const invalid = text.length > 0 && draft.length === 0
    setError(
      invalid ? t('home.start.errorBlank', 'Type what you want to do, then press Start.') : null
    )
    return !invalid
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setNote(null)
        if (!draft) {
          setError(t('home.start.errorBlank', 'Type what you want to do, then press Start.'))
          inputRef.current?.focus()
          return
        }
        startWithAgent()
      }}
    >
      <Label htmlFor={inputId}>{t('home.start.label', 'What do you want to do?')}</Label>
      <div className="flex min-w-0 gap-2">
        <Input
          ref={inputRef}
          id={inputId}
          value={text}
          disabled={pending}
          autoComplete="off"
          placeholder={t(
            'home.start.placeholder',
            'For example: finish the SSO login for INAX-128'
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || note ? messageId : undefined}
          onChange={(event) => {
            setText(event.target.value)
            if (error && event.target.value.trim()) {
              setError(null)
            }
          }}
          onBlur={validate}
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {t('home.start.submit', 'Start')}
        </Button>
      </div>
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : note ? (
        <p id={messageId} role="status" className={HOME_META_CLASS}>
          {note}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pending}
          onClick={startWithAgent}
        >
          {t('home.start.agent', 'Start a task with an agent')}
        </Button>
        <Button type="button" variant="outline" size="xs" disabled={pending} onClick={askBot}>
          {t('home.start.bot', 'Ask a bot')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pending}
          onClick={() => {
            setError(null)
            setNote(t('home.start.meetingNote', 'Meetings are not connected in this PoC.'))
          }}
        >
          {t('home.start.meeting', 'Start a meeting')}
        </Button>
      </div>
    </form>
  )
}
