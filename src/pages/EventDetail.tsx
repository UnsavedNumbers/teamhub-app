import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getEventDetails, updateRSVP, getAthletes, deleteEvent } from '../data/services'
import type { RSVPStatus } from '../types/calendar'
import { getSportFromEvent } from '../utils/sportContext'
import { getDisplayLocation } from '../utils/homeLocation'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import VenueInsights from '../components/portal/VenueInsights'
import NearbyAmenities from '../components/portal/NearbyAmenities'
import { PhotoSection } from '../components/galleries/PhotoSection'
import { useT } from '../i18n/useI18n'

interface Event {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  arrival_time: string | null
  location: string | null
  notes: string | null
  team: { name: string; id: string }
  event_location?: {
    place_id: string | null
    venue_name: string | null
    venue_address: string | null
    latitude: number | null
    longitude: number | null
  } | null
  ticketed_event?: {
    id: string
    status: string
    ticket_types: { price_cents: number; currency: string }[]
  } | null
}

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface Attendance {
  id: string
  athlete_id: string
  status: RSVPStatus
  note: string | null
}

// Helper function to build full address from EventLocation fields
function buildVenueAddress(location: { venue_name?: string | null; address_line1?: string | null; address_line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null } | null): string {
  if (!location) return ''

  const parts: string[] = []

  if (location.venue_name) {
    parts.push(location.venue_name)
  }

  const streetParts: string[] = []
  if (location.address_line1) streetParts.push(location.address_line1)
  if (location.address_line2) streetParts.push(location.address_line2)
  if (streetParts.length > 0) parts.push(streetParts.join(' '))

  const cityParts: string[] = []
  if (location.city) cityParts.push(location.city)
  if (location.state) cityParts.push(location.state)
  if (location.postal_code) cityParts.push(location.postal_code)
  if (cityParts.length > 0) parts.push(cityParts.join(' '))

  return parts.filter(Boolean).join(', ')
}

// Helper functions for links and integrations
function googleMapsLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  const q = encodeURIComponent(query.trim())
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

function appleMapsLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  const q = encodeURIComponent(query.trim())
  return `https://maps.apple.com/?q=${q}`
}

function wazeLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  const q = encodeURIComponent(query.trim())
  return `https://waze.com/ul?q=${q}`
}

function uberLink(address: string | null | undefined): string | null {
  if (!address || address.trim() === '') return null
  const dest = encodeURIComponent(address.trim())
  return `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`
}

function lyftLink(address: string | null | undefined): string | null {
  if (!address || address.trim() === '') return null
  const dest = encodeURIComponent(address.trim())
  return `https://lyft.com/ride?destination[address]=${dest}`
}

function googleCalendarLink(event: { title: string; startTime: string; endTime: string; location?: string; notes?: string }): string | null {
  try {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date in calendar link:', event)
      return null
    }
    
    const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const details = event.notes ? encodeURIComponent(event.notes) : ''
    const location = event.location ? encodeURIComponent(event.location) : ''
    const text = encodeURIComponent(event.title || 'Event')
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
  } catch (err) {
    console.error('Error generating Google Calendar link:', err)
    return null
  }
}

function appleCalendarLink(event: { title: string; startTime: string; endTime: string; location?: string }): string | null {
  try {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date in calendar link:', event)
      return null
    }
    
    // Download .ics file format
    const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const location = event.location || ''
    const title = event.title || 'Event'
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${title.replace(/[,;\\]/g, '')}
LOCATION:${location.replace(/[,;\\]/g, '')}
END:VEVENT
END:VCALENDAR`
    
    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`
  } catch (err) {
    console.error('Error generating Apple Calendar link:', err)
    return null
  }
}

async function copyToClipboard(text: string): Promise<{ success: boolean; error?: Error }> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        document.body.removeChild(textArea)
        return { success: true }
      } catch (err) {
        document.body.removeChild(textArea)
        return { success: false, error: err instanceof Error ? err : new Error('Failed to copy') }
      }
    }
    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Failed to copy to clipboard') }
  }
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const t = useT()
  const { profile } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [orgSlug, setOrgSlug] = useState<string | null>(null)
  const [commuteStartLocation, setCommuteStartLocation] = useState<string>(() => {
    const saved = localStorage.getItem('commuteStartLocation')
    return saved || ''
  })
  const [isEditingCommute, setIsEditingCommute] = useState(false)
  const [commuteInputValue, setCommuteInputValue] = useState(commuteStartLocation)
  const [commuteSummary, setCommuteSummary] = useState<{
    distance: string
    duration: string
    durationInTraffic?: string
  } | null>(null)
  const [loadingCommute, setLoadingCommute] = useState(false)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const location = useLocation()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Default commute start location to user's home address if not already set
  useEffect(() => {
    if (!commuteStartLocation && profile) {
      const homeLocation = getDisplayLocation(profile)
      if (homeLocation) {
        setCommuteStartLocation(homeLocation)
        setCommuteInputValue(homeLocation)
        localStorage.setItem('commuteStartLocation', homeLocation)
      }
    }
  }, [profile, commuteStartLocation])

  // Fetch commute summary when we have both start and destination
  useEffect(() => {
    const fetchCommuteSummary = async () => {
      if (!commuteStartLocation || !event?.location) {
        setCommuteSummary(null)
        return
      }
      
      setLoadingCommute(true)
      setCommuteSummary(null)
      
      try {
        const origins = encodeURIComponent(commuteStartLocation)
        const destinations = encodeURIComponent(event.location)
        
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/distance-matrix?origins=${origins}&destinations=${destinations}`
        const { data } = await supabase.auth.getSession()
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${data.session?.access_token}`,
          },
        })
        
        const result = await response.json()
        
        if (result?.status === 'OK' && result.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const element = result.rows[0].elements[0]
          setCommuteSummary({
            distance: element.distance?.text || '',
            duration: element.duration?.text || '',
            durationInTraffic: element.duration_in_traffic?.text,
          })
        }
      } catch (err) {
        // Silently fail - commute info is nice-to-have
      } finally {
        setLoadingCommute(false)
      }
    }
    
    fetchCommuteSummary()
  }, [commuteStartLocation, event?.location])

  const fetchData = useCallback(async () => {
    if (!isReady || !eventId) return
    
    setLoading(true)
    
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await getEventDetails(context, eventId)

      // If event_location is missing due to RLS, try to fetch it directly
      if (eventData && !eventData.event_location) {
        const { data: locationData, error: locationError } = await supabase
          .from('event_locations')
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle()

        if (!locationError && locationData && isMountedRef.current) {
          ;(eventData as any).event_location = locationData
        }
      }

      if (!isMountedRef.current) return

      if (eventError || !eventData) {
        // Preserve query params when redirecting back to calendar
        const searchParams = new URLSearchParams(location.search)
        const returnPath = searchParams.toString() 
          ? `/portal/calendar?${searchParams.toString()}` 
          : '/portal/calendar'
        navigate(returnPath)
        return
      }

      setEvent({
        id: eventData.id,
        title: eventData.title,
        type: eventData.type,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        arrival_time: eventData.arrival_time,
        location: buildVenueAddress(eventData.event_location),
        notes: eventData.notes,
        team: {
          name: eventData.team?.name ?? 'Team',
          id: eventData.team?.id ?? ''
        },
        event_location: eventData.event_location ? {
          place_id: eventData.event_location.place_id,
          venue_name: eventData.event_location.venue_name,
          venue_address: buildVenueAddress(eventData.event_location),
          latitude: eventData.event_location.latitude ?? null,
          longitude: eventData.event_location.longitude ?? null,
        } : null,
        ticketed_event: eventData.ticketed_event ? {
          id: eventData.ticketed_event.id,
          status: eventData.ticketed_event.status,
          ticket_types: eventData.ticketed_event.ticket_types || []
        } : null,
      })

      // Fetch children
      const { data: childData } = await getAthletes(context)
      if (isMountedRef.current) {
        setChildren(childData.map(c => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
        })))
      }

      // Fetch RSVPs
      if (eventData.rsvps) {
        const map: Record<string, Attendance> = {}
        eventData.rsvps.forEach((rsvp) => {
          map[rsvp.athlete_id] = {
            id: rsvp.id,
            athlete_id: rsvp.athlete_id,
            status: rsvp.status,
            note: rsvp.note,
          }
        })
        if (isMountedRef.current) {
          setAttendance(map)
        }
      }

      if (eventId) {
        await getSportFromEvent(context, eventId)
      }
    } catch (err) {
      console.error('Error fetching event details:', err)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [eventId, context, isReady, navigate, location])

  useEffect(() => {
    if (eventId && isReady) fetchData()
  }, [eventId, isReady, fetchData])

  useEffect(() => {
    if (!context?.orgId) return
    let cancelled = false

    const loadOrgSlug = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', context.orgId)
        .maybeSingle()

      if (!cancelled && !error) {
        setOrgSlug(data?.slug ?? null)
      }
    }

    loadOrgSlug()

    return () => {
      cancelled = true
    }
  }, [context?.orgId])

  async function handleRsvp(childId: string, status: RSVPStatus) {
    if (!eventId) return
    
    setSaving(childId)
    
    const { data, error } = await updateRSVP(context, eventId, childId, status)
    
    if (!error && data) {
      setAttendance(prev => ({
        ...prev,
        [childId]: {
          id: data.id,
          athlete_id: data.athlete_id,
          status: data.status,
          note: data.note,
        }
      }))
    }
    
    setSaving(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const handleDelete = async () => {
    if (!eventId || !window.confirm('Are you sure you want to delete this event? This cannot be undone.')) return
    
    setLoading(true)
    const { error } = await deleteEvent(eventId)
    if (error) {
      alert(error.message)
      setLoading(false)
    } else {
      navigate('/portal/calendar')
    }
  }

  async function handleCopy(text: string, label: string) {
    if (!text) {
      setCopyError('Nothing to copy')
      setTimeout(() => setCopyError(null), 3000)
      return
    }

    const result = await copyToClipboard(text)
    if (result.success) {
      setCopiedText(label)
      setCopyError(null)
      setTimeout(() => setCopiedText(null), 2000)
    } else {
      setCopyError(result.error?.message || 'Failed to copy')
      setTimeout(() => setCopyError(null), 3000)
    }
  }

  function handleSaveCommuteLocation() {
    const trimmed = commuteInputValue.trim()
    setCommuteStartLocation(trimmed)
    localStorage.setItem('commuteStartLocation', trimmed)
    setIsEditingCommute(false)
  }

  function getCommuteDirectionsUrl(): string | null {
    if (!commuteStartLocation || !venueAddress) return null
    const origin = encodeURIComponent(commuteStartLocation.trim())
    const dest = encodeURIComponent(venueAddress.trim())
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&traffic=1`
  }

  const canManage = context?.roles.includes('org_admin') || context?.roles.includes('coach')

  const statusStyles: Record<RSVPStatus, string> = {
    going: 'bg-emerald-500 text-white',
    late: 'bg-amber-500 text-white',
    not_going: 'bg-red-500 text-white',
    unknown: 'bg-slate-500 text-white',
  }

  const statusInactiveStyles = 'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Calendar', path: '/portal/calendar' },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (!event) return null

  const searchParams = new URLSearchParams(location.search)
  const venueAddress = (event.event_location as any)?.venue_address || event.location
  
  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { 
          label: 'Calendar', 
          path: searchParams.toString() 
            ? `/portal/calendar?${searchParams.toString()}` 
            : '/portal/calendar' 
        },
        { label: event.title },
      ]}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <PageTitle>{event.title}</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              {formatDate(event.start_time)} • {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">
              {event.team.name}
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(`/portal/calendar/events/${eventId}/edit`)}>
                <Icon name="edit" />
              </Button>
              <Button variant="secondary" onClick={handleDelete}>
                <Icon name="delete" />
              </Button>
            </div>
          )}
        </div>

        {/* Quick Summary Banner */}
        <Card className="bg-gradient-to-r from-[var(--org-btn-primary-bg, #137fec)]/5 to-slate-50 dark:to-slate-800/50 border-l-4 border-[var(--org-btn-primary-bg, #137fec)] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Event Type</p>
              <p className="text-lg font-black text-slate-900 dark:text-white capitalize">{event.type}</p>
            </div>
            {event.arrival_time && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Arrive By</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{formatTime(event.arrival_time)}</p>
              </div>
            )}
            {venueAddress && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Location</p>
                <p className="text-lg font-black text-slate-900 dark:text-white truncate">{venueAddress.split(',')[0]}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tickets Required Banner */}
      {event.ticketed_event && (
        <Card className="mb-6 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="confirmation_number" />
                Tickets Required
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                {event.ticketed_event.ticket_types.length > 0 && 
                  `Starting from $${(Math.min(...event.ticketed_event.ticket_types.map(t => t.price_cents)) / 100).toFixed(2)}`
                }
              </p>
            </div>
            <Button
              onClick={() => {
                if (orgSlug) {
                  navigate(`/o/${orgSlug}/tickets/events/${event.ticketed_event?.id}`)
                }
              }}
              disabled={!orgSlug}
            >
              Get Tickets
            </Button>
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Venue Location */}
          {venueAddress ? (
            <Card className="p-6 relative">
              <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                <Icon name="location_on" size="text-2xl" />
                Venue Location
              </div>
              <div className="pt-12">
                {event.event_location?.venue_name && (
                  <CardTitle className="text-xl mb-4">{event.event_location.venue_name}</CardTitle>
                )}
                <div className="mb-4 text-slate-700 dark:text-slate-300">
                  {(event.event_location as any)?.address_line1 && (
                    <p className="text-base">{(event.event_location as any).address_line1}</p>
                  )}
                  {(event.event_location as any)?.address_line2 && (
                    <p className="text-base">{(event.event_location as any).address_line2}</p>
                  )}
                  <p className="text-base">
                    {[(event.event_location as any)?.city, (event.event_location as any)?.state, (event.event_location as any)?.postal_code].filter(Boolean).join(', ')}
                  </p>
                </div>

                {/* Smart Map Links */}
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Open in Maps</p>
                  <div className="flex flex-wrap gap-2">
                    {googleMapsLink(venueAddress) ? (
                      <a href={googleMapsLink(venueAddress)!} target="_blank" rel="noreferrer">
                        <Button variant="primary" className="text-sm px-4 py-2">
                          <Icon name="map" size="text-sm" className="mr-2" />
                          Google Maps
                        </Button>
                      </a>
                    ) : (
                      <Button variant="primary" className="text-sm px-4 py-2" disabled>
                        <Icon name="map" size="text-sm" className="mr-2" />
                        Google Maps
                      </Button>
                    )}
                    {appleMapsLink(venueAddress) ? (
                      <a href={appleMapsLink(venueAddress)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="map" size="text-sm" className="mr-2" />
                          Apple Maps
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="map" size="text-sm" className="mr-2" />
                        Apple Maps
                      </Button>
                    )}
                    {wazeLink(venueAddress) ? (
                      <a href={wazeLink(venueAddress)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="navigation" size="text-sm" className="mr-2" />
                          Waze
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="navigation" size="text-sm" className="mr-2" />
                        Waze
                      </Button>
                    )}
                    <Button 
                      variant="secondary" 
                      className="text-sm px-4 py-2"
                      onClick={() => handleCopy(venueAddress, 'Address')}
                    >
                      <Icon name={copiedText === 'Address' ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
                      {copiedText === 'Address' ? 'Copied!' : 'Copy Address'}
                    </Button>
                    {copyError && copiedText === 'Address' && (
                      <span className="text-xs text-red-500">{copyError}</span>
                    )}
                  </div>
                </div>

                {/* Ride-Share Shortcuts */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Need a Ride?</p>
                  <div className="flex flex-wrap gap-2">
                    {uberLink(venueAddress) ? (
                      <a href={uberLink(venueAddress)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="local_taxi" size="text-sm" className="mr-2" />
                          Uber
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="local_taxi" size="text-sm" className="mr-2" />
                        Uber
                      </Button>
                    )}
                    {lyftLink(venueAddress) ? (
                      <a href={lyftLink(venueAddress)!} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="text-sm px-4 py-2">
                          <Icon name="local_taxi" size="text-sm" className="mr-2" />
                          Lyft
                        </Button>
                      </a>
                    ) : (
                      <Button variant="secondary" className="text-sm px-4 py-2" disabled>
                        <Icon name="local_taxi" size="text-sm" className="mr-2" />
                        Lyft
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 relative">
              <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                <Icon name="location_off" size="text-2xl" />
                No Location Info
              </div>
              <div className="pt-12">
                <p className="text-slate-600 dark:text-slate-300">
                  This event doesn't have a venue location set yet.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {canManage ? (
                    <Button
                      variant="primary"
                      className="mt-4"
                      onClick={() => navigate(`/portal/calendar/events/${eventId}/edit`)}
                    >
                      <Icon name="edit" size="text-sm" className="mr-2" />
                      Add Location
                    </Button>
                  ) : (
                    'Contact your team administrator to update the event location.'
                  )}
                </p>
              </div>
            </Card>
          )}

          {/* Commute Info */}
          {venueAddress && (
            <Card className="p-6 relative">
              <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                <Icon name="directions_car" size="text-2xl" />
                Commute Info
              </div>
              <div className="pt-12">
                {!isEditingCommute ? (
                  <div className="space-y-4">
                    {commuteStartLocation ? (
                      <>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Your Starting Point</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{commuteStartLocation}</p>
                          </div>
                          <Button
                            variant="secondary"
                            className="text-xs px-3 py-1"
                            onClick={() => {
                              setIsEditingCommute(true)
                              setCommuteInputValue(commuteStartLocation)
                            }}
                          >
                            <Icon name="edit" size="text-sm" className="mr-1" />
                            Edit
                          </Button>
                        </div>
                        
                        {loadingCommute ? (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-slate-900 dark:border-white mr-3"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">Calculating route...</span>
                          </div>
                        ) : commuteSummary ? (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Distance</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{commuteSummary.distance}</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                                  {commuteSummary.durationInTraffic ? 'With Traffic' : 'Duration'}
                                </p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">
                                  {commuteSummary.durationInTraffic || commuteSummary.duration}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        
                        {getCommuteDirectionsUrl() && (
                          <a
                            href={getCommuteDirectionsUrl()!}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            <Button variant="primary" className="w-full">
                              <Icon name="navigation" size="text-sm" className="mr-2" />
                              Get Directions with Traffic
                            </Button>
                          </a>
                        )}
                      </>
                    ) : (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Set Your Starting Location</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                          Save your home, work, or any starting point to quickly get directions with current traffic conditions.
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => setIsEditingCommute(true)}
                          className="w-full"
                        >
                          <Icon name="add_location" size="text-sm" className="mr-2" />
                          Set Starting Location
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Enter Your Starting Location</p>
                    <input
                      type="text"
                      value={commuteInputValue}
                      onChange={(e) => setCommuteInputValue(e.target.value)}
                      placeholder="e.g., 123 Main St, City, State"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg,#137fec)]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={handleSaveCommuteLocation}
                        disabled={!commuteInputValue.trim()}
                        className="flex-1"
                      >
                        <Icon name="check" size="text-sm" className="mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setIsEditingCommute(false)
                          setCommuteInputValue(commuteStartLocation)
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Venue Insights */}
          {event.event_location?.place_id && (
            <VenueInsights placeId={event.event_location.place_id} />
          )}

          {/* Event Notes */}
          {event.notes && (
            <Card className="p-6 relative">
              <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
                <Icon name="notes" size="text-2xl" />
                Event Notes
              </div>
              <div className="pt-12">
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-4 rounded">
                  {event.notes}
                </p>
              </div>
            </Card>
          )}

          {/* RSVP Section */}
          <Card className="p-6 relative">
            <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
              <Icon name="how_to_reg" size="text-2xl" />
              RSVP
            </div>
            <div className="pt-12">
              {children.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-4">{t('portal.events.noChildren')}</p>
                  <Button variant="primary" onClick={() => navigate('/portal/athletes')}>
                    {t('portal.events.add')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {children.map((child) => {
                    const att = attendance[child.id]
                    return (
                      <div key={child.id} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                          <CardTitle className="text-lg">{child.first_name} {child.last_name}</CardTitle>
                          {saving === child.id && (
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Saving...</span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {(['going', 'late', 'not_going'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleRsvp(child.id, status)}
                              disabled={saving === child.id}
                              className={`flex-1 py-3 px-4 rounded font-bold text-sm uppercase tracking-wide transition-colors min-h-[44px] ${
                                att?.status === status
                                  ? statusStyles[status]
                                  : statusInactiveStyles
                              }`}
                            >
                              {status === 'going' ? 'Going' : status === 'late' ? 'Running Late' : 'Not Going'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          
          {/* Event Photos */}
          {eventId && (
            <PhotoSection
              entityType="event"
              entityId={eventId}
              title="Event Photos"
            />
          )}

          {/* Add to Calendar */}
          <Card className="p-6">
            <CardTitle className="text-lg mb-3 flex items-center gap-2">
              <Icon name="calendar_today" />
              Add to Calendar
            </CardTitle>
            <div className="space-y-2">
              {googleCalendarLink({
                title: event.title,
                startTime: event.start_time,
                endTime: event.end_time,
                location: venueAddress || '',
              }) ? (
                <a
                  href={googleCalendarLink({
                    title: event.title,
                    startTime: event.start_time,
                    endTime: event.end_time,
                    location: venueAddress || '',
                  })!}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button variant="primary" className="w-full">
                    <Icon name="event" size="text-sm" className="mr-2" />
                    Google Calendar
                  </Button>
                </a>
              ) : (
                <Button variant="primary" className="w-full" disabled>
                  <Icon name="event" size="text-sm" className="mr-2" />
                  Google Calendar
                </Button>
              )}
              {appleCalendarLink({
                title: event.title,
                startTime: event.start_time,
                endTime: event.end_time,
                location: venueAddress || '',
              }) ? (
                <a
                  href={appleCalendarLink({
                    title: event.title,
                    startTime: event.start_time,
                    endTime: event.end_time,
                    location: venueAddress || '',
                  })!}
                  download={`${event.title}.ics`}
                  className="block"
                >
                  <Button variant="primary" className="w-full">
                    <Icon name="apple" size="text-sm" className="mr-2" />
                    Apple Calendar
                  </Button>
                </a>
              ) : (
                <Button variant="primary" className="w-full" disabled>
                  <Icon name="apple" size="text-sm" className="mr-2" />
                  Apple Calendar
                </Button>
              )}
            </div>
          </Card>

          {/* Nearby Amenities */}
          {/* placeId (Google Place ID) is preferred over lat/lng for more accurate results */}
          <NearbyAmenities
            placeId={event.event_location?.place_id}
            latitude={event.event_location?.latitude}
            longitude={event.event_location?.longitude}
            eventType={event.type}
            eventStartTime={event.start_time}
            variant="event"
          />

          {/* Weather */}
          {venueAddress && (
            <Card className="p-6">
              <CardTitle className="text-lg mb-3 flex items-center gap-2">
                <Icon name="wb_sunny" />
                Weather Forecast
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Check the weather for event day
              </p>
              <a
                href={`https://www.google.com/search?q=weather+${encodeURIComponent(venueAddress)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" className="w-full">
                  <Icon name="cloud" size="text-sm" className="mr-2" />
                  View Forecast
                </Button>
              </a>
            </Card>
          )}

        </div>
      </div>

    </PortalLayout>
  )
}
