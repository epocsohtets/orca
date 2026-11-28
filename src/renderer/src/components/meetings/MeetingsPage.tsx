import React, { useEffect } from 'react'
import { CalendarPlus, ChevronLeft } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RailPage, RailPageScroll } from '@/components/rail-page/RailPage'
import { HomeCard } from '@/components/home/HomeCard'
import { HomePageHeading, HomeTileRow, type HomeTile } from '@/components/home/HomeHeader'
import { useHomeBoard } from '@/components/home/use-home-board'
import { openMeetingBot, openScheduleForm } from './meeting-navigation'
import { followUpCounts, isParticipant, meetingAccess } from './meeting-rules'
import { sameDay, workWeek } from './meeting-schedule'
import { MeetingAgenda } from './MeetingAgenda'
import { MeetingCreateForm } from './MeetingCreateForm'
import { MeetingDetail } from './MeetingDetail'
import { MeetingList } from './MeetingList'
import { MeetingAgentCard, MeetingWaitingCard } from './MeetingsSideCards'
import { useMeetingText } from './MeetingParts'
import { MeetingViewerMenu } from './MeetingViewerMenu'
import { resetMeetingsSample, scenarioNow, useMeetings, type MeetingsPane } from './meetings-store'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
const PANES: MeetingsPane[] = ['upcoming', 'past', 'agenda']
type TileId = 'today' | 'waiting' | 'week' | 'followUps'

/** Meetings as a board like Home: my meetings, what waits on me, and one meeting's page. */
export default function MeetingsPage(): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const text = useMeetingText()
  const { view, projects } = useHomeBoard()
  const meetings = useMeetings((state) => state.meetings)
  const tasks = useMeetings((state) => state.tasks)
  const viewerId = useMeetings((state) => state.viewerId)
  const selectedId = useMeetings((state) => state.selectedId)
  const pane = useMeetings((state) => state.pane)
  const composing = useMeetings((state) => state.composing)
  const day = useMeetings((state) => state.day)

  const visible = meetings.filter((m) => meetingAccess(m, viewerId, tasks) !== 'none')
  const selected = visible.find((m) => m.id === selectedId) ?? null
  const screen = composing ? 'create' : selected ? `meeting:${selected.id}` : 'index'
  useEffect(() => {
    // Each screen starts at its own name: the keyboard and the scroll go there.
    const heading = document.querySelector<HTMLElement>('[data-meetings-page] [data-page-heading]')
    heading?.scrollIntoView({ block: 'nearest' })
    if (screen !== 'index' && !composing) {
      heading?.focus({ preventScroll: true })
    }
  }, [screen, composing])

  const select = (id: string | null): void => {
    useMeetings.setState({ selectedId: id, composing: null, focus: null, depth: 'brief' })
  }
  const mine = visible.filter((m) => isParticipant(m, viewerId))
  const upcoming = mine.filter((m) => !m.minutes).sort((a, b) => a.startsAt - b.startsAt)
  const past = visible.filter((m) => m.minutes).sort((a, b) => b.startsAt - a.startsAt)
  const today = mine.filter((m) => sameDay(m.startsAt, day))
  const week = workWeek(day, 0)
  const thisWeek = mine.filter((m) => week.some((entry) => sameDay(entry, m.startsAt)))
  const now = scenarioNow()
  const next = upcoming.find((m) => m.endsAt >= now && sameDay(m.startsAt, day))
  const waiting = view.tasks.filter((task) => task.meetingId)
  const counts = followUpCounts(
    past.filter((m) => meetingAccess(m, viewerId, tasks) === 'full').flatMap((m) => m.followUps),
    tasks
  )
  const endedToday = today.filter((m) => m.minutes).length
  const tiles: HomeTile<TileId>[] = [
    {
      id: 'today',
      label: t('meetings.tiles.today', 'Today’s meetings'),
      value: today.length,
      sub: [
        endedToday > 0 ? t('meetings.tiles.ended', 'Ended {{count}}', { count: endedToday }) : null,
        next
          ? t('meetings.tiles.next', 'Next {{time}} · {{title}}', {
              time: text.time(next.startsAt),
              title: next.title
            })
          : t('meetings.tiles.noNext', 'None left today')
      ]
        .filter(Boolean)
        .join(' · ')
    },
    {
      id: 'waiting',
      label: t('home.tiles.waiting', 'Needs me'),
      value: waiting.length,
      sub:
        waiting.length > 0
          ? t('meetings.tiles.waitingSub', 'The meeting agent is waiting')
          : t('home.tasks.emptyWaiting', 'Nothing is waiting for you.')
    },
    {
      id: 'week',
      label: t('meetings.tiles.week', 'This week'),
      value: thisWeek.length,
      sub: t('meetings.tiles.weekSub', 'I host {{host}} · I attend {{attend}}', {
        host: thisWeek.filter((m) => m.hostId === viewerId).length,
        attend: thisWeek.filter((m) => m.hostId !== viewerId).length
      })
    },
    {
      id: 'followUps',
      label: t('meetings.followUps.title', 'Follow-up tasks'),
      value: counts.total,
      sub: t(
        'meetings.tiles.followUpsSub',
        'Done {{done}} · in progress {{inProgress}} · to do {{todo}} · not settled {{open}}',
        {
          done: counts.done,
          inProgress: counts.inProgress,
          todo: counts.todo,
          open: counts.open
        }
      )
    }
  ]
  const setPane = (value: MeetingsPane): void => {
    useMeetings.setState({ pane: value })
  }
  const createLabel = t('meetings.schedule', 'Create meeting')
  const back = (
    <Button
      type="button"
      variant="ghost-muted"
      size="xs"
      className="-ml-2"
      data-meeting-back=""
      onClick={() => select(null)}
    >
      <ChevronLeft aria-hidden />
      {t('meetings.title', 'Meetings')}
    </Button>
  )
  const paneLabels: Record<MeetingsPane, string> = {
    upcoming: t('meetings.pane.upcoming', 'Coming up'),
    past: t('meetings.pane.past', 'Past'),
    agenda: t('meetings.pane.agenda', 'Schedule')
  }

  return (
    <RailPage as="main" data-meetings-page="" data-meetings-screen={screen}>
      <RailPageScroll className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        {/* Why pb-24: the last row scrolls clear of the floating panel toggle. */}
        <div className="rail-page-row-gutter mx-auto flex max-w-6xl flex-col gap-4 pt-6 pb-24">
          {composing ? (
            <>
              <HomePageHeading
                title={createLabel}
                line={t(
                  'meetings.form.line',
                  'The meeting goes on each attendee’s schedule, with the outline and the materials.'
                )}
                before={back}
              />
              <HomeCard title={t('meetings.form.card', 'New meeting')} data-meeting-card="create">
                <div className="px-4 pb-2">
                  <MeetingCreateForm
                    key={composing.conversationId ?? 'blank'}
                    composing={composing}
                    onCancel={() => useMeetings.setState({ composing: null })}
                  />
                </div>
              </HomeCard>
            </>
          ) : selected ? (
            <MeetingDetail key={selected.id} meeting={selected} projects={projects} before={back} />
          ) : (
            <>
              <HomePageHeading
                title={t('meetings.title', 'Meetings')}
                line={uiDateTimeFormat(DATE_OPTIONS, intlLocale).format(day)}
              >
                <MeetingViewerMenu onReset={resetMeetingsSample} />
                <Button
                  type="button"
                  size="sm"
                  data-meeting-create=""
                  onClick={() => openScheduleForm(null)}
                >
                  <CalendarPlus aria-hidden />
                  {createLabel}
                </Button>
              </HomePageHeading>
              <HomeTileRow
                tiles={tiles}
                onSelect={(tile) => {
                  if (tile === 'week') {
                    setPane('agenda')
                  } else if (tile === 'followUps') {
                    setPane('past')
                  } else if (tile === 'today') {
                    setPane('upcoming')
                  } else {
                    document
                      .querySelector<HTMLElement>('[data-meeting-card="waiting"] button')
                      ?.focus()
                  }
                }}
              />
              <div className="grid items-start gap-4 @min-[60rem]/rail-page:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
                <HomeCard title={t('meetings.mine', 'My meetings')} data-meeting-card="list">
                  <Tabs
                    value={pane}
                    onValueChange={(value) =>
                      setPane(PANES.find((key) => key === value) ?? 'upcoming')
                    }
                  >
                    <div className="px-4 pb-2">
                      <TabsList aria-label={t('meetings.mine', 'My meetings')}>
                        {PANES.map((key) => (
                          <TabsTrigger key={key} value={key} data-meeting-pane={key}>
                            {paneLabels[key]}
                            {key === 'agenda' ? null : (
                              <span className="tabular-nums">
                                {key === 'upcoming' ? upcoming.length : past.length}
                              </span>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                    <TabsContent value={pane}>
                      {pane === 'agenda' ? (
                        <MeetingAgenda projects={projects} onSelect={select} />
                      ) : (
                        <MeetingList
                          meetings={pane === 'upcoming' ? upcoming : past}
                          projects={projects}
                          empty={
                            pane === 'upcoming'
                              ? t(
                                  'meetings.list.emptyUpcoming',
                                  'Nothing is scheduled. A meeting you create or are invited to appears here.'
                                )
                              : t(
                                  'meetings.list.emptyPast',
                                  'No minutes yet. They arrive when a recording ends.'
                                )
                          }
                          onSelect={select}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </HomeCard>
                <div className="flex min-w-0 flex-col gap-4">
                  <MeetingWaitingCard rows={waiting} projects={projects} onSelect={select} />
                  <MeetingAgentCard onOpen={openMeetingBot} />
                </div>
              </div>
            </>
          )}
        </div>
      </RailPageScroll>
    </RailPage>
  )
}
