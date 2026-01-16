import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

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
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Travel' },
        ]}
      >
        <div className="mb-12">
          <PageTitle>Travel</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            View upcoming travel plans and tournament details.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : plans.length === 0 ? (
          <Card className="text-center py-12">
            <Icon name="flight" size="text-6xl" className="text-slate-400 mb-4" />
            <CardTitle className="mb-2">No upcoming travel</CardTitle>
            <p className="text-slate-500 dark:text-slate-400">Travel plans will appear here when your team has tournaments.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className="overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300"
              >
                <div className="relative h-48 bg-gradient-to-br from-[#137fec]/20 to-slate-100 dark:to-slate-800 flex items-end p-8">
                  <div className="relative z-10 w-full">
                    {plan.status === 'cancelled' ? (
                      <span className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded mb-3">Cancelled</span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-[#137fec] text-white text-xs font-bold uppercase tracking-widest rounded mb-3">Upcoming Trip</span>
                    )}
                    <CardTitle className="mb-2">{plan.title}</CardTitle>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {plan.location} • {formatDateRange(plan.start_date, plan.end_date)}
                    </p>
                  </div>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-4">
                  {plan.venue_name && (
                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <Icon name="location_on" className="text-slate-400" />
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{plan.venue_name}</p>
                        {plan.venue_address && <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{plan.venue_address}</p>}
                      </div>
                    </div>
                  )}
                  {plan.hotel_name && (
                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <Icon name="hotel" className="text-slate-400" />
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{plan.hotel_name}</p>
                        {plan.hotel_address && <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{plan.hotel_address}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{plan.team.name}</span>
                  <span className="text-[#137fec] text-sm font-bold uppercase tracking-wide">View Details</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedPlan && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedPlan(null)}>
            <Card className="max-w-2xl w-full my-8 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="relative h-40 bg-gradient-to-br from-[#137fec]/20 to-slate-100 dark:to-slate-800 flex items-end p-6">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setSelectedPlan(null)} className="w-8 h-8 bg-white/10 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-700/50">
                    <Icon name="close" />
                  </button>
                </div>
                <div>
                  <CardTitle className="mb-1">{selectedPlan.title}</CardTitle>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{formatDateRange(selectedPlan.start_date, selectedPlan.end_date)}</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {selectedPlan.venue_name && (
                  <div>
                    <SectionHeader className="mb-4">Venue</SectionHeader>
                    <Card className="p-4">
                      <CardTitle className="text-lg mb-2">{selectedPlan.venue_name}</CardTitle>
                      {selectedPlan.venue_address && <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{selectedPlan.venue_address}</p>}
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={selectedPlan.maps_url || (selectedPlan.venue_address ? googleMapsLink(selectedPlan.venue_address) : '#')}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2"
                        >
                          <Button variant="primary" className="text-sm px-6 py-2">
                            <Icon name="map" size="text-sm" className="mr-2" />
                            View Maps
                          </Button>
                        </a>
                      </div>
                    </Card>
                  </div>
                )}

                {selectedPlan.hotel_name && (
                  <div>
                    <SectionHeader className="mb-4">Hotel</SectionHeader>
                    <Card className="p-4">
                      <CardTitle className="text-lg mb-2">{selectedPlan.hotel_name}</CardTitle>
                      {selectedPlan.hotel_address && <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{selectedPlan.hotel_address}</p>}
                      <div className="flex flex-wrap gap-2">
                        {selectedPlan.hotel_address && (
                          <a
                            href={googleMapsLink(selectedPlan.hotel_address)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2"
                          >
                            <Button variant="primary" className="text-sm px-6 py-2">
                              <Icon name="map" size="text-sm" className="mr-2" />
                              Maps
                            </Button>
                          </a>
                        )}
                        {selectedPlan.hotel_phone && (
                          <a href={`tel:${selectedPlan.hotel_phone}`}>
                            <Button variant="secondary" className="text-sm px-6 py-2">
                              <Icon name="phone" size="text-sm" className="mr-2" />
                              {selectedPlan.hotel_phone}
                            </Button>
                          </a>
                        )}
                        {selectedPlan.hotel_confirmation && (
                          <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-sm rounded font-bold">
                            Conf: {selectedPlan.hotel_confirmation}
                          </span>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {parseMeetingLocations(selectedPlan.meeting_locations).length > 0 && (
                  <div>
                    <SectionHeader className="mb-4">Meeting Locations</SectionHeader>
                    <div className="space-y-3">
                      {parseMeetingLocations(selectedPlan.meeting_locations).map((m, idx) => (
                        <Card key={idx} className="p-4">
                          <CardTitle className="text-lg mb-2">{m.name}</CardTitle>
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">{m.address}</p>
                          {m.time && <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Time: {m.time}</p>}
                          {m.notes && <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap mb-3">{m.notes}</p>}
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={m.maps_url || googleMapsLink(m.address)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button variant="primary" className="text-sm px-6 py-2">
                                <Icon name="map" size="text-sm" className="mr-2" />
                                View Maps
                              </Button>
                            </a>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPlan.itinerary_file_path && (
                  <div>
                    <SectionHeader className="mb-4">Itinerary</SectionHeader>
                    {downloadError && (
                      <Card className="mb-4 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-3">
                        <p className="text-red-600 dark:text-red-400 text-sm font-bold">{downloadError}</p>
                      </Card>
                    )}
                    <Button
                      variant="primary"
                      onClick={downloadItinerary}
                      disabled={downloadLoading}
                      className="text-sm px-6 py-2"
                    >
                      {downloadLoading ? 'Preparing download' : 'Download itinerary'}
                    </Button>
                  </div>
                )}

                <div>
                  <SectionHeader className="mb-4">Schedule</SectionHeader>
                  <Card className="p-4">
                    {eventsLoading ? (
                      <p className="text-slate-500 dark:text-slate-400">Loading schedule</p>
                    ) : tripEvents.length === 0 ? (
                      <p className="text-slate-500 dark:text-slate-400">No events scheduled during these dates.</p>
                    ) : (
                      <div className="space-y-3">
                        {tripEvents.map((ev) => (
                          <div key={ev.id} className="border-b border-slate-200 dark:border-slate-700 pb-3 last:border-b-0 last:pb-0">
                            <CardTitle className="text-lg mb-1">{ev.title}</CardTitle>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                              {new Date(ev.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                              • {formatEventTime(ev.start_time)}–{formatEventTime(ev.end_time)}
                            </p>
                            {ev.location && <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{ev.location}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {selectedPlan.notes && (
                  <div>
                    <SectionHeader className="mb-4">Notes</SectionHeader>
                    <Card className="p-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{selectedPlan.notes}</p>
                    </Card>
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
