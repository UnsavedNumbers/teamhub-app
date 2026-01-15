import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface TravelPlan {
  id: string
  team_id: string
  season_id: string
  title: string
  location: string
  destination_city: string | null
  destination_state: string | null
  venue_name: string | null
  venue_address: string | null
  start_date: string
  end_date: string
  hotel_name: string | null
  hotel_address: string | null
  hotel_phone: string | null
  hotel_confirmation: string | null
  maps_url: string | null
  notes: string | null
  itinerary_file_path: string | null
  meeting_locations: unknown | null
  status: 'draft' | 'published' | 'cancelled'
  team: { name: string }
}

interface TripEvent {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  location: string | null
}

interface MeetingLocation {
  name: string
  address: string
  time?: string
  notes?: string
  maps_url?: string
}

function parseMeetingLocations(value: unknown): MeetingLocation[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => {
      const o = v as Partial<MeetingLocation> | null
      if (!o) return null
      if (typeof o.name !== 'string' || typeof o.address !== 'string') return null
      return {
        name: o.name,
        address: o.address,
        time: typeof o.time === 'string' ? o.time : undefined,
        notes: typeof o.notes === 'string' ? o.notes : undefined,
        maps_url: typeof o.maps_url === 'string' ? o.maps_url : undefined,
      }
    })
    .filter(Boolean) as MeetingLocation[]
}

function googleMapsLink(query: string) {
  const q = encodeURIComponent(query)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export default function Travel() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null)
  const [tripEvents, setTripEvents] = useState<TripEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const { profile } = useAuth()

  useEffect(() => {
    if (profile) fetchPlans()
  }, [profile])

  async function fetchPlans() {
    const { data } = await supabase
      .from('travel_plans')
      .select(
        'id, team_id, season_id, title, location, destination_city, destination_state, venue_name, venue_address, start_date, end_date, hotel_name, hotel_address, hotel_phone, hotel_confirmation, maps_url, notes, itinerary_file_path, meeting_locations, status, team:teams(name)'
      )
      .order('start_date', { ascending: true })
      .gte('start_date', new Date().toISOString().split('T')[0])
      .in('status', ['published', 'cancelled'])

    setPlans((data as unknown as TravelPlan[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedPlan) return
    ;(async () => {
      setEventsLoading(true)
      try {
        const startIso = `${selectedPlan.start_date}T00:00:00.000Z`
        const endIso = `${selectedPlan.end_date}T23:59:59.999Z`
        const { data } = await supabase
          .from('events')
          .select('id, title, type, start_time, end_time, location')
          .eq('team_id', selectedPlan.team_id)
          .eq('season_id', selectedPlan.season_id)
          .gte('start_time', startIso)
          .lte('start_time', endIso)
          .order('start_time', { ascending: true })

        setTripEvents((data as unknown as TripEvent[]) || [])
      } finally {
        setEventsLoading(false)
      }
    })()
  }, [selectedPlan])

  function formatDateRange(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
  }

  function formatEventTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  async function downloadItinerary() {
    if (!selectedPlan?.itinerary_file_path) return
    setDownloadError(null)
    setDownloadLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('travel-itinerary-signed-url', {
        body: { itinerary_file_path: selectedPlan.itinerary_file_path },
      })
      if (error) throw error
      const url = (data as { signed_url?: string } | null)?.signed_url
      if (!url) throw new Error('Could not create download link')
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to download itinerary')
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border-b border-neutral-200 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/portal/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors mr-4">← Dashboard</Link>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Travel</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-slate-800 rounded-xl text-center py-12 px-6">
            <span className="text-6xl mb-4 block">✈️</span>
            <h3 className="text-lg font-bold text-white mb-2">No Upcoming Travel</h3>
            <p className="text-slate-400">Travel plans will appear here when your team has tournaments.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                onClick={() => setSelectedPlan(plan)}
                className="bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
              >
                {/* Hero Section */}
                <div className="relative h-48 bg-gradient-to-br from-blue-600/30 to-slate-900 flex items-end p-6">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800')] bg-cover bg-center opacity-30"></div>
                  <div className="relative z-10">
                    {plan.status === 'cancelled' ? (
                      <span className="inline-block px-2 py-1 bg-red-600 text-white text-xs font-bold uppercase rounded mb-2">Cancelled</span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-bold uppercase rounded mb-2">Upcoming Trip</span>
                    )}
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">{plan.title}</h2>
                    <p className="text-blue-300 font-bold uppercase tracking-wide text-sm mt-1">
                      {plan.location} • {formatDateRange(plan.start_date, plan.end_date)}
                    </p>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="p-6 grid md:grid-cols-2 gap-4">
                  {plan.venue_name && (
                    <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg">
                      <span className="text-2xl">📍</span>
                      <div>
                        <p className="font-bold text-white">{plan.venue_name}</p>
                        {plan.venue_address && <p className="text-sm text-slate-400">{plan.venue_address}</p>}
                      </div>
                    </div>
                  )}
                  {plan.hotel_name && (
                    <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg">
                      <span className="text-2xl">🏨</span>
                      <div>
                        <p className="font-bold text-white">{plan.hotel_name}</p>
                        {plan.hotel_address && <p className="text-sm text-slate-400">{plan.hotel_address}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6 flex justify-between items-center">
                  <span className="text-sm text-slate-400">{plan.team.name}</span>
                  <span className="text-blue-400 text-sm font-bold">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedPlan(null)}>
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="relative h-40 bg-gradient-to-br from-blue-600/30 to-slate-900 flex items-end p-6 rounded-t-xl">
              <div className="absolute top-4 right-4">
                <button onClick={() => setSelectedPlan(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedPlan.title}</h2>
                <p className="text-blue-300 text-sm font-bold uppercase">{formatDateRange(selectedPlan.start_date, selectedPlan.end_date)}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Venue */}
              {selectedPlan.venue_name && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Venue</h3>
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <p className="font-bold text-white text-lg">{selectedPlan.venue_name}</p>
                    {selectedPlan.venue_address && <p className="text-slate-400">{selectedPlan.venue_address}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <a
                        href={selectedPlan.maps_url || (selectedPlan.venue_address ? googleMapsLink(selectedPlan.venue_address) : '#')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Maps
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Hotel */}
              {selectedPlan.hotel_name && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Hotel</h3>
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <p className="font-bold text-white text-lg">{selectedPlan.hotel_name}</p>
                    {selectedPlan.hotel_address && <p className="text-slate-400 mb-2">{selectedPlan.hotel_address}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedPlan.hotel_address && (
                        <a
                          href={googleMapsLink(selectedPlan.hotel_address)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          🗺️ Maps
                        </a>
                      )}
                      {selectedPlan.hotel_phone && (
                        <a href={`tel:${selectedPlan.hotel_phone}`} className="px-4 py-2 bg-slate-700 text-white font-bold text-sm rounded-lg hover:bg-slate-600 transition-colors">
                          📞 {selectedPlan.hotel_phone}
                        </a>
                      )}
                      {selectedPlan.hotel_confirmation && (
                        <span className="px-4 py-2 bg-slate-700 text-slate-300 font-mono text-sm rounded-lg">
                          Conf: {selectedPlan.hotel_confirmation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Meeting Locations */}
              {parseMeetingLocations(selectedPlan.meeting_locations).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Meeting Locations</h3>
                  <div className="space-y-3">
                    {parseMeetingLocations(selectedPlan.meeting_locations).map((m, idx) => (
                      <div key={idx} className="p-4 bg-slate-900/50 rounded-lg">
                        <p className="font-bold text-white">{m.name}</p>
                        <p className="text-slate-400">{m.address}</p>
                        {m.time && <p className="text-slate-300 mt-1">Time: {m.time}</p>}
                        {m.notes && <p className="text-slate-300 mt-2 whitespace-pre-wrap">{m.notes}</p>}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <a
                            href={m.maps_url || googleMapsLink(m.address)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Maps
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Itinerary Download */}
              {selectedPlan.itinerary_file_path && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Itinerary</h3>
                  {downloadError && (
                    <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-200 text-sm mb-2">
                      {downloadError}
                    </div>
                  )}
                  <button
                    onClick={downloadItinerary}
                    disabled={downloadLoading}
                    className="px-4 py-2 bg-white text-slate-900 font-bold text-sm rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    {downloadLoading ? 'Preparing download…' : 'Download itinerary'}
                  </button>
                </div>
              )}

              {/* Schedule */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Schedule</h3>
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  {eventsLoading ? (
                    <p className="text-slate-400">Loading schedule…</p>
                  ) : tripEvents.length === 0 ? (
                    <p className="text-slate-400">No events scheduled during these dates.</p>
                  ) : (
                    <div className="space-y-3">
                      {tripEvents.map((ev) => (
                        <div key={ev.id} className="border-b border-slate-700/50 pb-3 last:border-b-0 last:pb-0">
                          <p className="text-white font-bold">{ev.title}</p>
                          <p className="text-slate-400 text-sm">
                            {new Date(ev.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                            • {formatEventTime(ev.start_time)}–{formatEventTime(ev.end_time)}
                          </p>
                          {ev.location && <p className="text-slate-400 text-sm">{ev.location}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedPlan.notes && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Notes</h3>
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedPlan.notes}</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
