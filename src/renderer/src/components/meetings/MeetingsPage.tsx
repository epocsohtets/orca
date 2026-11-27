import React, { useEffect, useRef, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { RailPage, RailPageBody, RailPageScroll } from '@/components/rail-page/RailPage'
import { RailPageHeader, RailPageMoreMenu } from '@/components/rail-page/RailPageHeader'
import { useAppStore } from '@/store'
import { cn } from '@/lib/class-names'
import { MeetingDetail } from './MeetingDetail'
import { MeetingList } from './MeetingList'
import { NewMeetingPopover } from './NewMeetingPopover'
import { selectMeeting, useMeetingsMock } from './meetings-mock'

const isShown = (element: HTMLElement | null): boolean =>
  element !== null && element.getClientRects().length > 0

/** Meetings: a list beside the selected meeting. Under 640px the two panes take turns. */
export default function MeetingsPage(): React.JSX.Element {
  const t = useTranslate()
  const allMeetings = useMeetingsMock((state) => state.meetings)
  const selectedId = useMeetingsMock((state) => state.selectedId)
  // Review aid for the PoC: the mock always has meetings, so the empty page needs a switch.
  const [showEmpty, setShowEmpty] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  // Narrow only: which pane is showing. Wide shows both and ignores it.
  const [detailOpen, setDetailOpen] = useState(false)
  // Read once per mount: the groups are a snapshot of the day.
  const [now] = useState(() => Date.now())
  const listRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLElement>(null)

  const meetings = showEmpty ? [] : allMeetings
  const selected = meetings.find((m) => m.id === selectedId) ?? null
  const previous = meetings.find((m) => m.id === selected?.previousMeetingId) ?? null
  const recordingId = allMeetings.find((m) => m.phase === 'recording')?.id ?? null

  // Narrow swaps the panes, which hides the focused control; move focus into the pane that replaced it.
  useEffect(() => {
    const active = document.activeElement
    // A hidden control can stay the active element until the next frame.
    if (active instanceof HTMLElement && active !== document.body && isShown(active)) {
      return
    }
    if (detailOpen && !isShown(listRef.current)) {
      detailRef.current?.querySelector<HTMLElement>('[data-meeting-detail-title]')?.focus()
    } else if (!detailOpen && !isShown(detailRef.current)) {
      listRef.current?.querySelector<HTMLElement>('[data-current]')?.focus()
    }
  }, [detailOpen])

  const title = t('meetings.title', 'Meetings')
  return (
    <RailPage as="main" aria-label={title}>
      <RailPageHeader
        title={title}
        close={{
          label: t('meetings.close', 'Close Meetings'),
          tooltip: t('meetings.close', 'Close Meetings'),
          onClose: () => useAppStore.getState().closeMeetingsPage()
        }}
        count={meetings.length}
        actions={
          <>
            <NewMeetingPopover
              open={newOpen}
              onOpenChange={setNewOpen}
              onStarted={() => {
                setShowEmpty(false)
                setDetailOpen(true)
              }}
            />
            <RailPageMoreMenu>
              <DropdownMenuCheckboxItem checked={showEmpty} onCheckedChange={setShowEmpty}>
                {t('meetings.pocShowEmpty', 'PoC: show the page with no meetings')}
              </DropdownMenuCheckboxItem>
            </RailPageMoreMenu>
          </>
        }
      />
      <RailPageBody className="flex-row">
        {meetings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
            <h2 className="text-sm font-medium text-foreground">
              {t('meetings.empty.noMeetingsTitle', 'No meetings yet')}
            </h2>
            <p className="max-w-sm text-xs text-muted-foreground">
              {t(
                'meetings.empty.noMeetingsDetail',
                'Start a meeting to record it. Its transcript, minutes and follow-ups stay here, and the follow-ups feed the next meeting.'
              )}
            </p>
            <Button type="button" size="sm" className="mt-3" onClick={() => setNewOpen(true)}>
              {t('meetings.new.button', 'New meeting')}
            </Button>
          </div>
        ) : (
          <>
            <RailPageScroll
              ref={listRef}
              className={cn(
                'w-80 shrink-0 overflow-y-auto border-r border-border scrollbar-sleek @max-[40rem]/rail-page:w-full @max-[40rem]/rail-page:border-r-0',
                detailOpen && '@max-[40rem]/rail-page:hidden'
              )}
            >
              <MeetingList
                meetings={meetings}
                selectedId={selected?.id ?? null}
                now={now}
                onSelect={(id) => {
                  selectMeeting(id)
                  setDetailOpen(true)
                }}
              />
            </RailPageScroll>
            <section
              ref={detailRef}
              aria-label={selected?.title ?? t('meetings.detailRegion', 'Meeting')}
              className={cn(
                // No display utility here: one on the same element beats the container-query `hidden`.
                'min-h-0 min-w-0 flex-1',
                !detailOpen && '@max-[40rem]/rail-page:hidden'
              )}
            >
              {selected ? (
                <MeetingDetail
                  key={selected.id}
                  meeting={selected}
                  previous={previous}
                  otherRecording={recordingId !== null && recordingId !== selected.id}
                  onBack={() => setDetailOpen(false)}
                />
              ) : (
                <p className="p-6 text-xs text-muted-foreground">
                  {t('meetings.selectOne', 'Select a meeting from the list.')}
                </p>
              )}
            </section>
          </>
        )}
      </RailPageBody>
    </RailPage>
  )
}
