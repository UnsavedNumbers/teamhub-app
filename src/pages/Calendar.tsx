import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

interface Event {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  arrival_time: string | null
  location: string | null
  notes: string | null
  team: { name: string }
}

type ViewMode = 'agenda' | 'week' | 'month'

export default function Calendar() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('agenda')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const { profile } = useAuth()

  useEffect(() => {
    fetchEvents()
  }, [profile])

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, title, type, start_time, end_time, arrival_time, location, notes, team:teams(name)')
      .order('start_time', { ascending: true })
      .gte('start_time', new Date().toISOString())
      .limit(50)

    setEvents((data as unknown as Event[]) || [])
    setLoading(false)
  }

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
  }

  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.start_time).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  return (
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Schedule' },
        ]}
      >
        <div className="mb-12 flex items-end justify-between">
          <div>
            <PageTitle>Schedule</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
              View upcoming events and activities.
            </p>
          </div>
          <div className="flex gap-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded p-1">
            {(['agenda', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-colors ${
                  view === v
                    ? 'bg-[#137fec] text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
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
                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left"
                    >
                      <Card className={`p-6 border-l-4 ${typeColors[event.type] || 'border-l-slate-300'} hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300`}>
                        <div className="flex items-center gap-4">
                          <div className="min-w-[70px]">
                            <p className="font-black text-slate-900 dark:text-white text-lg">{formatTime(event.start_time)}</p>
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-1">{event.title}</CardTitle>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{event.team.name}</p>
                          </div>
                        </div>
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
            <Card className="max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
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
            </Card>
          </div>
        )}
      </PortalLayout>
    </>
  )
}
