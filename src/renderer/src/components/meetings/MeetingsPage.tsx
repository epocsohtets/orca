import React, { useEffect, useRef, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RailPage, RailPageBody, RAIL_PAGE_GUTTER_X } from '@/components/rail-page/RailPage'
import {
  RailPageHeader,
  RailPageMoreMenu,
  RailPageSecondaryButton
} from '@/components/rail-page/RailPageHeader'
import { useAppStore } from '@/store'
import { cn } from '@/lib/class-names'
import { openScheduleForm } from './meeting-navigation'
import { MEETING_PEOPLE, personName } from './meeting-people'
import { meetingAccess } from './meeting-rules'
import { MeetingAgenda } from './MeetingAgenda'
import { MeetingDetail } from './MeetingDetail'
import { MeetingList } from './MeetingList'
import { MeetingScheduleForm } from './MeetingScheduleForm'
import { resetMeetingsSample, scenarioNow, setViewer, useMeetings } from './meetings-store'

const isShown = (element: HTMLElement | null): boolean =>
  element !== null && element.getClientRects().length > 0

/** Meetings: my list or my schedule beside one meeting. Under 640px the two panes take turns. */
export default function MeetingsPage(): React.JSX.Element {
  const t = useTranslate()
  const meetings = useMeetings((state) => state.meetings)
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  const selectedId = useMeetings((state) => state.selectedId)
  const pane = useMeetings((state) => state.pane)
  const composing = useMeetings((state) => state.composing)
  // Narrow only: which pane is showing. Wide shows both and ignores it.
  const [detailOpen, setDetailOpen] = useState(selectedId !== null || composing !== null)
  const listRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLElement>(null)

  const visible = meetings.filter((m) => meetingAccess(m, viewerId, tasks) !== 'none')
  const now = scenarioNow()
  // With nothing picked, show what is next: the soonest meeting still ahead, else the latest one.
  const selected =
    visible.find((m) => m.id === selectedId) ??
    [...visible].sort((a, b) => a.startsAt - b.startsAt).find((m) => m.endsAt >= now) ??
    [...visible].sort((a, b) => b.startsAt - a.startsAt)[0] ??
    null

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

  const select = (id: string): void => {
    useMeetings.setState({ selectedId: id, composing: null, focus: null, depth: 'brief' })
    setDetailOpen(true)
  }
  const title = t('meetings.title', 'Meetings')
  const scheduleLabel = t('meetings.schedule', 'Set up a meeting')
  return (
    <RailPage as="main" aria-label={title}>
      <RailPageHeader
        title={title}
        close={{
          label: t('meetings.close', 'Close Meetings'),
          tooltip: t('meetings.close', 'Close Meetings'),
          onClose: () => useAppStore.getState().closeMeetingsPage()
        }}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="toolbar" data-meeting-viewer="">
                  {/* Not part of the product: the PoC's way to be another person on one machine. */}
                  <Badge variant="outline">{t('meetings.demo', 'Demo')}</Badge>
                  {t('meetings.viewer', 'Seen as {{name}}', { name: personName(viewerId) })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={viewerId} onValueChange={setViewer}>
                  {MEETING_PEOPLE.map((person) => (
                    <DropdownMenuRadioItem key={person.id} value={person.id}>
                      {person.name}
                      <span className="text-muted-foreground">{person.role}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <RailPageSecondaryButton
              icon={<CalendarPlus aria-hidden />}
              label={scheduleLabel}
              aria-label={scheduleLabel}
              onClick={() => {
                openScheduleForm(null)
                setDetailOpen(true)
              }}
            />
            <RailPageMoreMenu>
              <DropdownMenuItem onSelect={resetMeetingsSample}>
                {t('meetings.reset', 'Start the sample data over')}
              </DropdownMenuItem>
            </RailPageMoreMenu>
          </>
        }
      />
      <RailPageBody className="flex-row">
        <div
          ref={listRef}
          className={cn(
            'w-80 shrink-0 border-r border-border @max-[40rem]/rail-page:w-full @max-[40rem]/rail-page:border-r-0',
            detailOpen && '@max-[40rem]/rail-page:hidden'
          )}
        >
          <Tabs
            value={pane}
            onValueChange={(value) =>
              useMeetings.setState({ pane: value === 'agenda' ? 'agenda' : 'list' })
            }
            className="h-full min-h-0"
          >
            <div className="shrink-0 px-4 pt-3">
              <TabsList aria-label={t('meetings.pane.label', 'How to see my meetings')}>
                <TabsTrigger value="list">{t('meetings.pane.list', 'List')}</TabsTrigger>
                <TabsTrigger value="agenda">{t('meetings.pane.agenda', 'Schedule')}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="list" className="min-h-0">
              <div className="h-full overflow-y-auto scrollbar-sleek">
                <MeetingList selectedId={selected?.id ?? null} onSelect={select} />
              </div>
            </TabsContent>
            <TabsContent value="agenda" className="min-h-0">
              <div className="h-full overflow-y-auto scrollbar-sleek">
                <MeetingAgenda selectedId={selected?.id ?? null} onSelect={select} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <section
          ref={detailRef}
          aria-label={
            composing ? scheduleLabel : (selected?.title ?? t('meetings.detailRegion', 'Meeting'))
          }
          className={cn(
            // No display utility here: one on the same element beats the container-query `hidden`.
            'min-h-0 min-w-0 flex-1',
            !detailOpen && '@max-[40rem]/rail-page:hidden'
          )}
        >
          {composing ? (
            <div className={cn('h-full overflow-y-auto py-4 scrollbar-sleek', RAIL_PAGE_GUTTER_X)}>
              <MeetingScheduleForm
                key={composing.conversationId ?? 'blank'}
                conversationId={composing.conversationId}
                startNow={composing.startNow}
                onCancel={() => useMeetings.setState({ composing: null })}
              />
            </div>
          ) : selected ? (
            <MeetingDetail
              key={selected.id}
              meeting={selected}
              onBack={() => setDetailOpen(false)}
            />
          ) : (
            <div className="flex flex-col items-start gap-2 p-6">
              <p className="text-sm font-medium text-foreground">
                {t('meetings.none.title', 'No meetings for {{name}}', {
                  name: personName(viewerId)
                })}
              </p>
              <p className="max-w-prose text-xs text-muted-foreground">
                {t(
                  'meetings.none.detail',
                  'A meeting you are invited to appears on your schedule. You can also set one up now.'
                )}
              </p>
              <Button type="button" size="sm" onClick={() => openScheduleForm(null)}>
                {scheduleLabel}
              </Button>
            </div>
          )}
        </section>
      </RailPageBody>
    </RailPage>
  )
}
