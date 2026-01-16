import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getEvents } from '../data/services/eventsService'
import { getPrimarySportFromEvents, getSportFromEvent, type SportInfo } from '../utils/sportContext'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import { SportHero } from '../components/portal/SportHero'
import { SportCardImage } from '../components/portal/SportCardImage'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

type ViewMode = 'agenda' | 'week' | 'month'

interface DisplayEvent {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  arrival_time: string | null
  location: string | null
  notes: string | null
  team: { name: string; id?: string }
  team_id?: string
}

export default function Calendar() {
  const [events, setEvents] = useState<DisplayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('agenda')
  const [selectedEvent, setSelectedEvent] = useState<DisplayEvent | null>(null)
  const [primarySport, setPrimarySport] = useState<SportInfo | null>(null)
  const [eventSports, setEventSports] = useState<Record<string, SportInfo | null>>({})

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    const { data, error } = await getEvents(context, {
      startDate: now,
      endDate: thirtyDaysFromNow,
      includeCancelled: false,
      limit: 50,
    })

    if (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    } else {
      // Transform CalendarEvent to DisplayEvent format
      const displayEvents: DisplayEvent[] = data.map(event => ({
        id: event.id,
        title: event.title,
        type: event.type,
        start_time: event.start_time,
        end_time: event.end_time,
        arrival_time: event.arrival_time ?? null,
        location: event.event_location?.venue_name ?? null,
        notes: event.notes ?? null,
        team: { name: event.team?.name ?? 'Unknown Team', id: event.team?.id },
        team_id: event.team_id,
      }))
      setEvents(displayEvents)
      
      // Load primary sport from events
      getPrimarySportFromEvents(context, data).then(sport => {
        if (sport) setPrimarySport(sport)
      })
      
      // Load sports for individual events
      const sportsMap: Record<string, SportInfo | null> = {}
      Promise.all(
        data.map(async (event) => {
          if (event.team_id) {
            const sport = await getSportFromEvent(context, event.id)
            if (sport) sportsMap[event.id] = sport
          }
        })
      ).then(() => setEventSports(sportsMap))
    }
    setLoading(false)
  }, [context])

  useEffect(() => {
    if (!isReady) return
    fetchEvents()
  }, [isReady, fetchEvents])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit'
    })
  }

  const typeColors: Record<string, string> = {
    practice: 'border-l-[#137fec]',
    game: 'border-l-emerald-500',
    tournament: 'border-l-amber-500',
    meeting: 'border-l-purple-500',
    travel: 'border-l-cyan-500',
  }

  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.start_time).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, DisplayEvent[]>)

  return (
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Schedule' },
        ]}
      >
        {/* Sport Hero Section */}
        <div className="-mx-6 mb-8">
          <SportHero sport={primarySport} height="40vh">
            <div className="max-w-[1200px] mx-auto px-6 pb-8">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <PageTitle className="text-white">Schedule</PageTitle>
                  <p className="text-white/80 text-lg font-light tracking-wide">
                    View upcoming events and activities.
                  </p>
                </div>
                <div className="flex gap-1 bg-white/10 dark:bg-slate-900/50 border border-white/20 dark:border-slate-700 rounded p-1">
                  {(['agenda', 'week', 'month'] as ViewMode[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-colors ${
                        view === v
                          ? 'bg-[#137fec] text-white'
                          : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SportHero>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12">
            <Icon name="event" size="text-4xl" className="text-slate-400 mb-4" />
            <CardTitle className="mb-2">No events scheduled</CardTitle>
            <p className="text-slate-500 dark:text-slate-400">Check back later for scheduled activities.</p>
          </Card>
        ) : view === 'agenda' ? (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date}>
                <SectionHeader className="mb-4">{formatDate(dayEvents[0].start_time)}</SectionHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left"
                    >
                      <Card className={`p-0 border-l-0 ${typeColors[event.type] || 'border-slate-300'} hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300 overflow-hidden h-full`}>
                        <SportCardImage sport={eventSports[event.id] || null} height="aspect-[4/3] h-auto">
                          <div className="flex flex-col justify-end h-full">
                            <div className={`inline-block px-2 py-1 mb-2 text-xs font-black uppercase tracking-wider text-white border-l-4 ${typeColors[event.type] || 'border-l-slate-300'}`}>
                              {formatTime(event.start_time)}
                            </div>
                            <CardTitle className="text-lg mb-1 text-white">{event.title}</CardTitle>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/80">{event.team.name}</p>
                          </div>
                        </SportCardImage>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">{view.charAt(0).toUpperCase() + view.slice(1)} view coming soon.</p>
          </Card>
        )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
            <div className="max-w-md w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <CardTitle className="mb-1">{selectedEvent.title}</CardTitle>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{selectedEvent.team.name}</p>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <Icon name="close" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon name="event" className="text-slate-400" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{formatDate(selectedEvent.start_time)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}</p>
                  </div>
                </div>

                {selectedEvent.arrival_time && (
                  <div className="flex items-center gap-3">
                    <Icon name="schedule" className="text-amber-500" />
                    <p className="font-bold text-slate-900 dark:text-white">Arrive by {formatTime(selectedEvent.arrival_time)}</p>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-3">
                    <Icon name="location_on" className="text-slate-400" />
                    <p className="font-bold text-slate-900 dark:text-white">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.notes && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEvent.notes}</p>
                </div>
              )}
            </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate(`/portal/events/${selectedEvent.id}`)
                    setSelectedEvent(null)
                  }}
                  className="w-full"
                >
                  View Full Details & RSVP
                </Button>
              </div>
              </Card>
            </div>
        </div>
      )}
      </PortalLayout>
    </>
  )
}
