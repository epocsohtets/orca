import React, { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RAIL_PAGE_GUTTER_X } from '@/components/rail-page/RailPage'
import { RailPageCount } from '@/components/rail-page/RailPageHeader'
import { cn } from '@/lib/class-names'
import { isOpenFollowUp } from './meeting-follow-ups'
import { formatMeetingDay, formatMeetingTime } from './meeting-time-format'
import { MeetingFollowUpsTab } from './MeetingFollowUpsTab'
import { inaxTaskStatus, MeetingEmptyState } from './MeetingParts'
import { MeetingPrepTab } from './MeetingPrepTab'
import { MeetingRecorder } from './MeetingRecorder'
import { MeetingMinutesTab, MeetingTranscriptTab } from './MeetingResultTabs'
import type { Meeting } from './meeting-types'

const MEETING_TABS = ['prep', 'transcript', 'minutes', 'followUps'] as const
type MeetingTab = (typeof MEETING_TABS)[number]

// The panel scrolls in a plain wrapper: TabsContent owns its own spacing and focus style.
const TAB_PANEL = cn(
  'h-full overflow-y-auto pt-2 pb-4 scrollbar-sleek in-focus-visible:ring-2 in-focus-visible:ring-ring in-focus-visible:ring-inset',
  RAIL_PAGE_GUTTER_X
)

/** Mount with `key={meeting.id}` so the tab resets per meeting. */
export function MeetingDetail({
  meeting,
  previous,
  otherRecording,
  onBack
}: {
  meeting: Meeting
  previous: Meeting | null
  otherRecording: boolean
  onBack: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const [tab, setTab] = useState<MeetingTab>(meeting.phase === 'ready' ? 'minutes' : 'prep')
  // Processing that finishes while the meeting is open reveals its transcript.
  const [seenPhase, setSeenPhase] = useState(meeting.phase)
  if (seenPhase !== meeting.phase) {
    setSeenPhase(meeting.phase)
    if (seenPhase === 'processing' && meeting.phase === 'ready') {
      setTab('transcript')
    }
  }

  const { result, phase } = meeting
  const openCount = meeting.followUps.filter((f) => isOpenFollowUp(f, inaxTaskStatus)).length
  const when = `${formatMeetingDay(meeting.startsAt, intlLocale)} · ${formatMeetingTime(meeting.startsAt, intlLocale)}`
  const pending =
    phase === 'processing' ? (
      <MeetingEmptyState
        title={t('meetings.empty.processingTitle', 'Processing the recording')}
        detail={t(
          'meetings.empty.processingDetail',
          'The transcript, minutes and follow-ups appear here when processing finishes. Prep stays available.'
        )}
      />
    ) : phase === 'stopped' ? (
      <MeetingEmptyState
        title={t('meetings.empty.stoppedTitle', 'Recorded, minutes not created')}
        detail={t(
          'meetings.empty.stoppedDetail',
          'Select Create minutes above to get the transcript, summary and follow-ups.'
        )}
      />
    ) : phase === 'recording' ? (
      <MeetingEmptyState
        title={t('meetings.empty.recordingTitle', 'Recording in progress')}
        detail={t(
          'meetings.empty.recordingDetail',
          'Stop the recording, then create minutes to get the transcript, summary and follow-ups.'
        )}
      />
    ) : (
      <MeetingEmptyState
        title={t('meetings.empty.idleTitle', 'Not recorded yet')}
        detail={t(
          'meetings.empty.idleDetail',
          'Start recording above. The transcript, minutes and follow-ups appear here after the meeting.'
        )}
      />
    )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className={cn('flex shrink-0 flex-col gap-3 pt-4 pb-3', RAIL_PAGE_GUTTER_X)}>
        <div className="flex items-start gap-2">
          {/* The span carries the rule: Button's own display would beat it. */}
          <span className="-ml-1.5 @min-[40rem]/rail-page:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon-toolbar"
              aria-label={t('meetings.backToList', 'Back to the meeting list')}
              onClick={onBack}
            >
              <ArrowLeft aria-hidden />
            </Button>
          </span>
          <div className="min-w-0 flex-1">
            <h2
              tabIndex={-1}
              data-meeting-detail-title=""
              className="text-base font-semibold tracking-tight text-foreground outline-none"
            >
              {meeting.title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {when}
              {meeting.calendar
                ? ` – ${formatMeetingTime(meeting.calendar.endsAt, intlLocale)} · ${meeting.calendar.location}`
                : ` · ${t('meetings.noCalendarEntry', 'No calendar entry')}`}
              {' · '}
              {t('meetings.attendeeCount', 'Attendees {{count}}', {
                count: meeting.attendees.length
              })}
            </p>
          </div>
        </div>
        <MeetingRecorder meeting={meeting} otherRecording={otherRecording} />
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(MEETING_TABS.find((id) => id === value) ?? tab)}
        className="min-h-0 flex-1"
      >
        <div className={cn('shrink-0 overflow-x-auto border-b border-border', RAIL_PAGE_GUTTER_X)}>
          <TabsList variant="line" className="-mx-2">
            <TabsTrigger value="prep">{t('meetings.tab.prep', 'Prep')}</TabsTrigger>
            <TabsTrigger value="transcript">
              {t('meetings.tab.transcript', 'Transcript')}
            </TabsTrigger>
            <TabsTrigger value="minutes">{t('meetings.tab.minutes', 'Minutes')}</TabsTrigger>
            <TabsTrigger value="followUps">
              {t('meetings.tab.followUps', 'Follow-ups')}
              {openCount > 0 ? <RailPageCount value={openCount} /> : null}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="prep" className="min-h-0">
          <div className={TAB_PANEL}>
            <MeetingPrepTab meeting={meeting} previous={previous} />
          </div>
        </TabsContent>
        <TabsContent value="transcript" className="min-h-0">
          <div className={TAB_PANEL}>
            {result ? <MeetingTranscriptTab result={result} /> : pending}
          </div>
        </TabsContent>
        <TabsContent value="minutes" className="min-h-0">
          <div className={TAB_PANEL}>
            {result ? <MeetingMinutesTab result={result} /> : pending}
          </div>
        </TabsContent>
        <TabsContent value="followUps" className="min-h-0">
          <div className={TAB_PANEL}>
            {!result ? (
              pending
            ) : meeting.followUps.length > 0 ? (
              <MeetingFollowUpsTab meetingId={meeting.id} followUps={meeting.followUps} />
            ) : (
              <MeetingEmptyState
                title={t('meetings.empty.noFollowUpsTitle', 'No follow-ups')}
                detail={t('meetings.empty.noFollowUpsDetail', 'This meeting produced no actions.')}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
