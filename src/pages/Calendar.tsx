import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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
    // For parents, events are filtered by RLS based on their children's team memberships
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
    practice: 'border-l-blue-500',
    game: 'border-l-green-500',
    tournament: 'border-l-amber-500',
    meeting: 'border-l-purple-500',
  }

  // Group events by date for agenda view
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.start_time).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/portal/dashboard" className="text-slate-400 hover:text-white transition-colors">← Dashboard</Link>
              <h1 className="text-xl font-bold text-white">Calendar</h1>
            </div>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {(['agenda', 'week', 'month'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm font-medium rounded capitalize transition-colors ${
                    view === v ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No upcoming events.</p>
          </div>
        ) : view === 'agenda' ? (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date}>
                <h2 className="text-sm font-medium text-slate-400 mb-3">{formatDate(dayEvents[0].start_time)}</h2>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left card border-l-4 ${typeColors[event.type]} hover:border-primary-500/50 transition-colors`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="min-w-[70px]">
                          <p className="font-medium text-white">{formatTime(event.start_time)}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{event.title}</h3>
                          <p className="text-sm text-slate-400">{event.team.name}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-slate-400">{view.charAt(0).toUpperCase() + view.slice(1)} view coming soon.</p>
          </div>
        )}
      </main>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedEvent.title}</h2>
                <p className="text-slate-400">{selectedEvent.team.name}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-white">{formatDate(selectedEvent.start_time)}</p>
                  <p className="text-sm text-slate-400">{formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}</p>
                </div>
              </div>

              {selectedEvent.arrival_time && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-white">Arrive by {formatTime(selectedEvent.arrival_time)}</p>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-white">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.notes && (
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
