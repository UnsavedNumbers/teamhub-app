import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getTravelPlanById, formatDateRange } from '../data/services/travelService'
import { getEvents } from '../data/services/eventsService'
import type { FakeTravelPlan } from '../data/fake/fakeTravel'
import type { CalendarEvent } from '../types/calendar'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

interface MeetingLocation {
  name: string
  address: string
  time?: string
  notes?: string | null
  maps_url?: string | null
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

// Helper functions for links and integrations
function googleMapsLink(query: string) {
  const q = encodeURIComponent(query)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

function appleMapsLink(query: string) {
  const q = encodeURIComponent(query)
  return `https://maps.apple.com/?q=${q}`
}

function wazeLink(query: string) {
  const q = encodeURIComponent(query)
  return `https://waze.com/ul?q=${q}`
}

function uberLink(address: string) {
  const dest = encodeURIComponent(address)
  return `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`
}

function lyftLink(address: string) {
  const dest = encodeURIComponent(address)
  return `https://lyft.com/ride?destination[address]=${dest}`
}

function googleCalendarLink(event: { title: string; startTime: string; endTime: string; location?: string; notes?: string }) {
  const start = new Date(event.startTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const end = new Date(event.endTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const details = event.notes ? encodeURIComponent(event.notes) : ''
  const location = event.location ? encodeURIComponent(event.location) : ''
  const text = encodeURIComponent(event.title)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
}

function appleCalendarLink(event: { title: string; startTime: string; endTime: string; location?: string }) {
  // Download .ics file format
  const start = new Date(event.startTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const end = new Date(event.endTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const location = event.location || ''
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`
  
  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

// Helper to get team name from team_id (temporary until we have proper team data)
const getTeamName = (teamId: string): string => {
  const teamNames: Record<string, string> = {
    'team-u10-soccer-001': 'U10 Lightning',
    'team-u12-soccer-002': 'U12 Thunder',
    'team-u10-basketball-003': 'U10 Hawks',
    'team-u12-basketball-004': 'U12 Eagles',
    'team-u14-soccer-elite-005': 'U14 Elite Storm',
    'team-u16-soccer-elite-006': 'U16 Elite Hurricanes',
  }
  return teamNames[teamId] ?? 'Unknown Team'
}

export default function TravelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  
  const [plan, setPlan] = useState<FakeTravelPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [tripEvents, setTripEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)


  useEffect(() => {
    if (!isReady || !id) return

    async function fetchPlan() {
      const { data, error } = await getTravelPlanById(context, id!)
      
      if (error || !data) {
        console.error('Error fetching travel plan:', error)
        navigate('/portal/travel')
      } else {
        setPlan(data)
      }
      setLoading(false)
    }

    fetchPlan()
  }, [id, context, isReady, navigate])

  useEffect(() => {
    if (!plan || !isReady) return

    (async () => {
      setEventsLoading(true)
      try {
        const startDate = new Date(plan.start_date)
        const endDate = new Date(plan.end_date)
        endDate.setHours(23, 59, 59, 999)

        const { data, error } = await getEvents(context, {
          startDate,
          endDate,
          teamId: plan.team_id,
        })

        if (error) {
          console.error('Error fetching events:', error)
          setTripEvents([])
        } else {
          setTripEvents(data)
        }
      } finally {
        setEventsLoading(false)
      }
    })()
  }, [plan, context, isReady])

  function formatEventTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function handleCopy(text: string, label: string) {
    copyToClipboard(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Travel', path: '/portal/travel' },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (!plan) {
    return null
  }

  const meetingLocations = parseMeetingLocations(plan.meeting_locations)
  const teamName = getTeamName(plan.team_id)

  // Emergency contact info (placeholder - would come from team/org data)
  const emergencyContact = {
    name: 'Coach Mike Johnson',
    phone: '(555) 123-4567',
    role: 'Head Coach',
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Travel', path: '/portal/travel' },
        { label: plan.title },
      ]}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <PageTitle>{plan.title}</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              {plan.location} • {formatDateRange(plan.start_date, plan.end_date)}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">
              {teamName}
            </p>
          </div>
          {plan.status === 'cancelled' && (
            <span className="inline-block px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded">
              Cancelled
            </span>
          )}
        </div>

        {/* Quick Summary Banner */}
        <Card className="bg-gradient-to-r from-[#137fec]/5 to-slate-50 dark:to-slate-800/50 border-l-4 border-[#137fec] p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Duration</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} Days
              </p>
            </div>
            {plan.hotel_name && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Lodging</p>
                <p className="text-lg font-black text-slate-900 dark:text-white truncate">{plan.hotel_name}</p>
              </div>
            )}
            {tripEvents.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Events</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{tripEvents.length} scheduled</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation & Timing */}
          {plan.venue_name && plan.venue_address && (
            <div>
              <Card className="p-6 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="location_on" size="text-2xl" />
                  Venue Location
                </div>
                <div className="pt-12">
                  <CardTitle className="text-xl mb-2">{plan.venue_name}</CardTitle>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">{plan.venue_address}</p>
                
                {/* Smart Map Links */}
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Open in Maps</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={googleMapsLink(plan.venue_address)} target="_blank" rel="noreferrer">
                      <Button variant="primary" className="text-sm px-4 py-2">
                        <Icon name="map" size="text-sm" className="mr-2" />
                        Google Maps
                      </Button>
                    </a>
                    <a href={appleMapsLink(plan.venue_address)} target="_blank" rel="noreferrer">
                      <Button variant="secondary" className="text-sm px-4 py-2">
                        <Icon name="map" size="text-sm" className="mr-2" />
                        Apple Maps
                      </Button>
                    </a>
                    <a href={wazeLink(plan.venue_address)} target="_blank" rel="noreferrer">
                      <Button variant="secondary" className="text-sm px-4 py-2">
                        <Icon name="navigation" size="text-sm" className="mr-2" />
                        Waze
                      </Button>
                    </a>
                    <Button 
                      variant="secondary" 
                      className="text-sm px-4 py-2"
                      onClick={() => handleCopy(plan.venue_address!, 'Address')}
                    >
                      <Icon name={copiedText === 'Address' ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
                      {copiedText === 'Address' ? 'Copied!' : 'Copy Address'}
                    </Button>
                  </div>
                </div>

                {/* Ride-Share Shortcuts */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Need a Ride?</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={uberLink(plan.venue_address)} target="_blank" rel="noreferrer">
                      <Button variant="secondary" className="text-sm px-4 py-2">
                        <Icon name="local_taxi" size="text-sm" className="mr-2" />
                        Uber
                      </Button>
                    </a>
                    <a href={lyftLink(plan.venue_address)} target="_blank" rel="noreferrer">
                      <Button variant="secondary" className="text-sm px-4 py-2">
                        <Icon name="local_taxi" size="text-sm" className="mr-2" />
                        Lyft
                      </Button>
                    </a>
                  </div>
                </div>
                </div>
              </Card>
            </div>
          )}

          {/* Hotel Information */}
          {plan.hotel_name && (
            <div>
              <Card className="p-6 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="hotel" size="text-2xl" />
                  Lodging
                </div>
                <div className="pt-12">
                  <CardTitle className="text-xl mb-2">{plan.hotel_name}</CardTitle>
                {plan.hotel_address && <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">{plan.hotel_address}</p>}
                
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {plan.hotel_phone && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Phone</p>
                      <a href={`tel:${plan.hotel_phone}`} className="text-[#137fec] font-bold hover:underline">
                        {plan.hotel_phone}
                      </a>
                    </div>
                  )}
                  {plan.hotel_confirmation && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Confirmation</p>
                      <p className="font-mono text-slate-900 dark:text-white font-bold">{plan.hotel_confirmation}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {plan.hotel_phone && (
                    <a href={`tel:${plan.hotel_phone}`}>
                      <Button variant="primary" className="text-sm px-4 py-2">
                        <Icon name="phone" size="text-sm" className="mr-2" />
                        Call Front Desk
                      </Button>
                    </a>
                  )}
                  {plan.hotel_address && (
                    <a href={googleMapsLink(plan.hotel_address)} target="_blank" rel="noreferrer">
                      <Button variant="secondary" className="text-sm px-4 py-2">
                        <Icon name="map" size="text-sm" className="mr-2" />
                        View on Maps
                      </Button>
                    </a>
                  )}
                  {plan.hotel_confirmation && (
                    <Button 
                      variant="secondary" 
                      className="text-sm px-4 py-2"
                      onClick={() => handleCopy(plan.hotel_confirmation!, 'Confirmation')}
                    >
                      <Icon name={copiedText === 'Confirmation' ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
                      {copiedText === 'Confirmation' ? 'Copied!' : 'Copy Confirmation'}
                    </Button>
                  )}
                </div>
                </div>
              </Card>
            </div>
          )}

          {/* Meeting Locations */}
          {meetingLocations.length > 0 && (
            <div>
              <div className="mb-4">
                <div className="inline-block bg-black text-white px-4 py-2 flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="group" size="text-2xl" />
                  Meeting Locations
                </div>
              </div>
              <div className="space-y-4">
                {meetingLocations.map((meeting, idx) => (
                  <Card key={idx} className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg">{meeting.name}</CardTitle>
                      {meeting.time && (
                        <span className="text-sm font-bold text-[#137fec] bg-[#137fec]/10 px-3 py-1 rounded">
                          {meeting.time}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{meeting.address}</p>
                    {meeting.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
                        {meeting.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <a href={meeting.maps_url || googleMapsLink(meeting.address)} target="_blank" rel="noreferrer">
                        <Button variant="primary" className="text-sm px-4 py-2">
                          <Icon name="map" size="text-sm" className="mr-2" />
                          View on Maps
                        </Button>
                      </a>
                      <Button 
                        variant="secondary" 
                        className="text-sm px-4 py-2"
                        onClick={() => handleCopy(meeting.address, `Meeting ${idx}`)}
                      >
                        <Icon name={copiedText === `Meeting ${idx}` ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
                        {copiedText === `Meeting ${idx}` ? 'Copied!' : 'Copy Address'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Event Schedule */}
          <div>
            <Card className="p-6 relative">
              <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                <Icon name="event" size="text-2xl" />
                Event Schedule
              </div>
              <div className="pt-12">
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#137fec]"></div>
                </div>
              ) : tripEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="event_busy" size="text-5xl" className="text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No events scheduled during these dates.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tripEvents.map((event) => (
                    <div key={event.id} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{event.title}</CardTitle>
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                            • {formatEventTime(event.start_time)}–{formatEventTime(event.end_time)}
                          </p>
                          {event.event_location?.venue_name && (
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                              <Icon name="location_on" size="text-sm" />
                              {event.event_location.venue_name}
                            </p>
                          )}
                        </div>
                        <a
                          href={googleCalendarLink({
                            title: event.title,
                            startTime: event.start_time,
                            endTime: event.end_time,
                            location: event.event_location?.venue_name || '',
                            notes: event.notes || '',
                          })}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="secondary" className="text-xs px-3 py-1">
                            <Icon name="calendar_today" size="text-xs" className="mr-1" />
                            Add to Calendar
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </Card>
          </div>

          {/* Additional Notes */}
          {plan.notes && (
            <div>
              <Card className="p-6 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                  <Icon name="notes" size="text-2xl" />
                  Additional Notes
                </div>
                <div className="pt-12">
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {plan.notes}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions & Emergency Info */}
        <div className="space-y-6">
          {/* Emergency Contact Card */}
          <Card className="p-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="emergency" size="text-2xl" className="text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-900 dark:text-red-100">Emergency Contact</CardTitle>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Coach (Urgent)</p>
                <p className="font-black text-red-900 dark:text-red-100">{emergencyContact.name}</p>
                <a href={`tel:${emergencyContact.phone}`} className="text-red-600 dark:text-red-400 font-bold hover:underline">
                  {emergencyContact.phone}
                </a>
              </div>
              <div className="pt-3 border-t border-red-200 dark:border-red-900">
                <a href={`tel:${emergencyContact.phone}`}>
                  <Button variant="primary" className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Icon name="phone" size="text-sm" className="mr-2" />
                    Call Coach Now
                  </Button>
                </a>
              </div>
            </div>
          </Card>

          {/* Quick Calendar Actions */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Icon name="calendar_add_on" size="text-xl" />
              Add to Calendar
            </CardTitle>
            <div>
              <a
                href={googleCalendarLink({
                  title: plan.title,
                  startTime: plan.start_date,
                  endTime: plan.end_date,
                  location: plan.location,
                  notes: plan.notes || '',
                })}
                target="_blank"
                rel="noreferrer"
                className="block mb-3"
              >
                <Button variant="secondary" className="w-full text-sm justify-start">
                  <Icon name="event" size="text-sm" className="mr-2" />
                  Google Calendar
                </Button>
              </a>
              <a
                href={appleCalendarLink({
                  title: plan.title,
                  startTime: plan.start_date,
                  endTime: plan.end_date,
                  location: plan.location,
                })}
                download={`${plan.title}.ics`}
                className="block"
              >
                <Button variant="secondary" className="w-full text-sm justify-start">
                  <Icon name="event" size="text-sm" className="mr-2" />
                  Apple Calendar
                </Button>
              </a>
            </div>
          </Card>

          {/* Offline Access */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Icon name="download" size="text-xl" />
              Offline Access
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Download itinerary for offline access during your trip.
            </p>
            <Button variant="primary" className="w-full text-sm" disabled>
              <Icon name="picture_as_pdf" size="text-sm" className="mr-2" />
              Download PDF (Coming Soon)
            </Button>
          </Card>

          {/* Nearby Services */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Icon name="store" size="text-xl" />
              Nearby Services
            </CardTitle>
            <div>
              <a
                href={`https://www.google.com/maps/search/restaurants+near+${encodeURIComponent(plan.location)}`}
                target="_blank"
                rel="noreferrer"
                className="block mb-3"
              >
                <Button variant="secondary" className="w-full text-sm justify-start">
                  <Icon name="restaurant" size="text-sm" className="mr-2" />
                  Find Restaurants
                </Button>
              </a>
              <a
                href={`https://www.google.com/maps/search/grocery+near+${encodeURIComponent(plan.location)}`}
                target="_blank"
                rel="noreferrer"
                className="block mb-3"
              >
                <Button variant="secondary" className="w-full text-sm justify-start">
                  <Icon name="local_grocery_store" size="text-sm" className="mr-2" />
                  Grocery Stores
                </Button>
              </a>
              <a
                href={`https://www.google.com/maps/search/pharmacy+near+${encodeURIComponent(plan.location)}`}
                target="_blank"
                rel="noreferrer"
                className="block mb-3"
              >
                <Button variant="secondary" className="w-full text-sm justify-start">
                  <Icon name="local_pharmacy" size="text-sm" className="mr-2" />
                  Pharmacies
                </Button>
              </a>
              <a
                href={`https://www.google.com/maps/search/hospital+near+${encodeURIComponent(plan.location)}`}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button variant="secondary" className="w-full text-sm justify-start">
                  <Icon name="local_hospital" size="text-sm" className="mr-2" />
                  Urgent Care
                </Button>
              </a>
            </div>
          </Card>

          {/* Weather Info */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Icon name="wb_sunny" size="text-xl" />
              Weather
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Check the forecast for {plan.location}
            </p>
            <a
              href={`https://weather.com/weather/tenday/l/${encodeURIComponent(plan.location)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" className="w-full text-sm">
                <Icon name="cloud" size="text-sm" className="mr-2" />
                View Forecast
              </Button>
            </a>
          </Card>

          {/* Last Updated */}
          <Card className="p-4 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Icon name="info" size="text-sm" />
              <span>Last updated: {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}</span>
            </div>
          </Card>
        </div>
      </div>
    </PortalLayout>
  )
}
