import React, { useRef, useState } from 'react'
import { Link2, Paperclip, X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/class-names'
import { getFileTypeIcon } from '@/lib/file-icons/file-type-icons'
import { formatBytes } from '../../../../shared/text/format-bytes'
import type { MeetingMaterial } from './meeting-types'

/** Orca's own file-type icons, as chat's file pills use them; a link has its own. */
function materialIcon(material: MeetingMaterial): React.JSX.Element {
  return React.createElement(material.kind === 'link' ? Link2 : getFileTypeIcon(material.name), {
    'aria-hidden': true,
    className: 'size-4 shrink-0 text-muted-foreground'
  })
}

function linkHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Attached materials, one row each: type icon, name, size (or the link's site), and a way to take it off. */
export function MeetingMaterialList({
  materials,
  onRemove,
  disabled
}: {
  materials: readonly MeetingMaterial[]
  onRemove?: (index: number) => void
  disabled?: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  if (materials.length === 0) {
    return null
  }
  return (
    <ul className={onRemove ? 'divide-y divide-border rounded-md border border-border' : undefined}>
      {materials.map((material, index) => (
        <li
          key={`${material.name}:${material.kind === 'file' ? material.size : material.url}`}
          data-meeting-material={material.kind}
          className={
            onRemove
              ? 'flex min-h-9 items-center gap-2.5 px-3 py-1.5'
              : 'flex h-9 items-center gap-2 border-t border-border'
          }
        >
          {materialIcon(material)}
          <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
            {material.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {material.kind === 'file'
              ? material.size > 0
                ? formatBytes(material.size)
                : ''
              : linkHost(material.url)}
          </span>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              aria-label={t('meetings.form.removeMaterial', 'Remove “{{name}}”', {
                name: material.name
              })}
              onClick={() => onRemove(index)}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * Materials as attachments: pick files, drop them here, or attach a link.
 * shortcut: a file keeps its name and size only, nothing is uploaded; store the file when meetings have a backend.
 */
export function MeetingMaterialsField({
  id,
  value,
  disabled,
  onChange
}: {
  id: string
  value: readonly MeetingMaterial[]
  disabled?: boolean
  onChange: (materials: MeetingMaterial[]) => void
}): React.JSX.Element {
  const t = useTranslate()
  const picker = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [linking, setLinking] = useState(false)
  const [url, setUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const addFiles = (files: FileList | null): void => {
    const added = Array.from(files ?? []).map((file): MeetingMaterial => ({
      kind: 'file',
      name: file.name,
      size: file.size
    }))
    if (added.length > 0) {
      onChange([...value, ...added])
    }
  }
  const checkUrl = (): string | null =>
    /^https?:\/\/\S+\.\S+/.test(url.trim())
      ? null
      : t(
          'meetings.form.linkInvalid',
          'Enter the full address, starting with https://, such as https://example.com/file.'
        )
  const addLink = (): void => {
    const error = checkUrl()
    setLinkError(error)
    if (error) {
      return
    }
    onChange([
      ...value,
      { kind: 'link', name: linkName.trim() || linkHost(url.trim()), url: url.trim() }
    ])
    setUrl('')
    setLinkName('')
    setLinking(false)
  }
  return (
    <div className="flex flex-col gap-2">
      <MeetingMaterialList
        materials={value}
        disabled={disabled}
        onRemove={(index) => onChange(value.filter((_, entry) => entry !== index))}
      />
      <div
        data-meeting-drop-zone={dragging ? 'over' : 'idle'}
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md border border-dashed border-border px-3 py-2.5 transition-colors motion-reduce:transition-none',
          dragging && 'border-ring bg-accent',
          disabled && 'pointer-events-none opacity-50'
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          addFiles(event.dataTransfer.files)
        }}
      >
        <Paperclip aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 basis-40 text-xs text-muted-foreground">
          {dragging
            ? t('meetings.form.dropNow', 'Drop to attach.')
            : t('meetings.form.dropHere', 'Drop files here, or')}
        </span>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <Button
          id={id}
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled}
          onClick={() => picker.current?.click()}
        >
          {t('meetings.form.pickFiles', 'Choose files')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={disabled}
          aria-expanded={linking}
          data-meeting-add-link=""
          onClick={() => setLinking(!linking)}
        >
          <Link2 aria-hidden />
          {t('meetings.form.addLink', 'Attach a link')}
        </Button>
      </div>
      {linking ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              autoFocus
              type="url"
              className="h-8 min-w-56 flex-[2]"
              aria-label={t('meetings.form.linkUrl', 'Link address')}
              aria-invalid={Boolean(linkError)}
              aria-describedby={linkError ? `${id}-link-error` : undefined}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value)
                if (linkError) {
                  setLinkError(null)
                }
              }}
              onBlur={() => setLinkError(url.trim() ? checkUrl() : null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addLink()
                }
              }}
            />
            <Input
              className="h-8 min-w-32 flex-1"
              aria-label={t('meetings.form.linkName', 'Name to show (optional)')}
              placeholder={t('meetings.form.linkName', 'Name to show (optional)')}
              value={linkName}
              onChange={(event) => setLinkName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addLink()
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addLink}>
              {t('meetings.form.attach', 'Attach')}
            </Button>
          </div>
          {linkError ? (
            <p id={`${id}-link-error`} role="alert" className="text-xs text-destructive">
              {linkError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
