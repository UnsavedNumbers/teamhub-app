/**
 * Fan Event Detail Page
 * 
 * Comprehensive event detail view for fans.
 * Shows: Event info, venue details, registration/tickets, location, share options
 * 
 * URL/ROUTE: /fan/events/:eventId
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../../data/config'
import { getOrganizationById } from '../../data/fake/fakeOrganizations'
import { getSeasonById, getTeamById } from '../../data/fake/fakeTeams'
import { getFakeTicketedEventByCalendarEventId, getFakeTicketTypesForEvent, getFakeTicketedEventById } from '../../data/fake/fakeTicketingEvents'
import { followOrg, getBookmarkedEvents, getFollowedOrgs } from '../../data/services/fanService'
import AddToCalendarActions from '../../components/calendar/AddToCalendarActions'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import BookmarkButton from '../../components/fan/BookmarkButton'
import NearbyAmenities from '../../components/portal/NearbyAmenities'
import { VenueMapActionButtons, VenueRideShareButtons } from '../../components/portal/VenueActionButtons'
import { showError, showSuccess } from '../../utils/toast'
import { getLink, RouteKeys } from '../../utils/routes'
import { appendTicketCheckoutRole } from '../../utils/ticketCheckoutRole'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { readCalendarCache, writeCalendarCache } from '../../features/calendar/cache'
import type { CalendarExportEvent } from '../../features/calendar/addToCalendar'
import { isValidUUID } from '../../utils/routeValidation'
import { appleMapsLink, copyToClipboard, googleMapsLink, lyftLink, uberLink, wazeLink } from '../../utils/venueActionLinks'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'

// Event status types
type EventStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'

interface EventDetail {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  arrival_time: string | null
  timezone: string
  location: string | null
  type: string
  is_cancelled: boolean
  visibility: string
  weather_dependent: boolean
  external_link: string | null
  notes: string | null
  uniform_notes: string | null
  equipment_notes: string | null
  // Organization info
  org_id: string
  org_name: string
  org_slug: string
  org_logo_url: string | null
  org_public_description: string | null
  // Venue info
  venue_name: string | null
  venue_address: string | null
  venue_city: string | null
  venue_state: string | null
  venue_zip: string | null
  place_id: string | null
  latitude: number | null
  longitude: number | null
  // Ticketing info
  is_ticketed: boolean
  ticket_event_id: string | null
  ticket_price_min: number | null
  ticket_price_max: number | null
  tickets_available: boolean
  // Weather (if available)
  weather_temp: number | null
  weather_condition: string | null
  weather_icon: string | null
  // Relationships
  team_name: string | null
  season_name: string | null
}

function hashSeed(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatDurationFromMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(1, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours <= 0) return `${minutes} min`
  if (minutes === 0) return `${hours} hour`
  return `${hours} hour ${minutes} min`
}

function buildFakeWeather(startTime: string, seedInput: string): { temp: number; condition: string } {
  const seed = hashSeed(`${seedInput}|${startTime}`)
  const month = new Date(startTime).getMonth()
  const isWinter = month === 11 || month <= 1
  const isSummer = month >= 5 && month <= 8

  const baseTemp = 58 + (seed % 20)
  const seasonalAdjustment = isWinter ? -12 : isSummer ? 14 : 0
  const temperature = clamp(baseTemp + seasonalAdjustment, 25, 102)

  const warmConditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Windy', 'Light Rain']
  const coolConditions = ['Cloudy', 'Windy', 'Light Rain', 'Foggy', 'Overcast']
  const winterConditions = ['Cloudy', 'Windy', 'Light Snow', 'Cold Rain', 'Partly Cloudy']
  const conditionPool = isWinter ? winterConditions : isSummer ? warmConditions : coolConditions

  return {
    temp: temperature,
    condition: conditionPool[seed % conditionPool.length],
  }
}

function buildFakeCommuteSummary(origin: string, destination: string, startTime: string): {
  distance: string
  duration: string
  durationInTraffic: string
} {
  const seed = hashSeed(`${origin}|${destination}`)
  const distanceMiles = 3 + (seed % 280) / 10 // 3.0 - 30.9 mi
  const baseMinutes = distanceMiles * (1.9 + ((seed >> 3) % 7) / 10)

  const startDate = new Date(startTime)
  const startHour = startDate.getHours()
  const rushHour = (startHour >= 7 && startHour <= 9) || (startHour >= 16 && startHour <= 18)
  const trafficPenaltyMinutes = rushHour ? 12 + (seed % 14) : 4 + (seed % 9)

  return {
    distance: `${distanceMiles >= 10 ? Math.round(distanceMiles) : distanceMiles.toFixed(1)} mi`,
    duration: formatDurationFromMinutes(baseMinutes),
    durationInTraffic: formatDurationFromMinutes(baseMinutes + trafficPenaltyMinutes),
  }
}

function buildFakeEventDetail(eventId: string): EventDetail | null {
  const ticketedFromCalendar = getFakeTicketedEventByCalendarEventId(eventId)
  const standaloneTicketedEvent = getFakeTicketedEventById(eventId)
  const ticketedEvent = ticketedFromCalendar || standaloneTicketedEvent

  if (!ticketedEvent) return null

  const teamId = ticketedEvent.team_id || null
  const team = teamId ? getTeamById(teamId) : null
  const orgId = ticketedEvent.org_id || team?.org_id || ''
  const org = orgId ? getOrganizationById(orgId) : undefined
  const season = ticketedEvent.season_id ? getSeasonById(ticketedEvent.season_id) : null

  const ticketTypes = getFakeTicketTypesForEvent(ticketedEvent.id, ticketedEvent.org_id)
  const ticketPrices = ticketTypes.map((type) => type.price_cents / 100)
  const fakeWeather = buildFakeWeather(
    ticketedEvent.starts_at || new Date().toISOString(),
    `${orgId}|${teamId || 'org'}|${ticketedEvent?.venue_city || org?.city || ''}`,
  )

  const minPrice = ticketPrices.length > 0 ? Math.min(...ticketPrices) : null
  const maxPrice = ticketPrices.length > 0 ? Math.max(...ticketPrices) : null

  return {
    id: ticketedEvent.id || eventId,
    title: ticketedEvent.title || 'Event',
    description: ticketedEvent.description || ticketedEvent.event_description || null,
    start_time: ticketedEvent.starts_at || new Date().toISOString(),
    end_time: ticketedEvent.ends_at || ticketedEvent.starts_at || new Date().toISOString(),
    arrival_time: null,
    timezone: ticketedEvent.timezone || org?.timezone || 'America/New_York',
    location: ticketedEvent.venue_name || null,
    type: String(ticketedEvent.event_type || 'event'),
    is_cancelled: ticketedEvent.status === 'cancelled',
    visibility: ticketedEvent.visibility || 'public',
    weather_dependent: false,
    external_link: null,
    notes: ticketedEvent.event_description || null,
    uniform_notes: null,
    equipment_notes: null,
    org_id: orgId,
    org_name: org?.name || 'Organization',
    org_slug: org?.slug || '',
    org_logo_url: org?.logo_url || null,
    org_public_description: org?.website || null,
    venue_name: ticketedEvent?.venue_name || null,
    venue_address: ticketedEvent?.venue_address_line1 || null,
    venue_city: ticketedEvent?.venue_city || org?.city || null,
    venue_state: ticketedEvent?.venue_state || org?.state || null,
    venue_zip: ticketedEvent?.venue_postal_code || org?.postal_code || null,
    place_id: null,
    latitude: null,
    longitude: null,
    is_ticketed: true,
    ticket_event_id: ticketedEvent.id,
    ticket_price_min: minPrice,
    ticket_price_max: maxPrice,
    tickets_available: ticketedEvent ? ticketedEvent.status === 'published' : false,
    weather_temp: fakeWeather.temp,
    weather_condition: fakeWeather.condition,
    weather_icon: getWeatherIcon(fakeWeather.condition),
    team_name: team?.name || null,
    season_name: season?.name || null,
  }
}

function getFanEventDetailCacheScope(eventId: string): string {
  return `fan-event-detail:${eventId}`
}

function toCalendarExportEvent(event: EventDetail, fullAddress: string): CalendarExportEvent {
  return {
    id: event.id,
    title: event.title,
    startTime: event.start_time,
    endTime: event.end_time,
    location: fullAddress || event.location,
    description: event.description || event.notes,
    url: typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}${getLink(RouteKeys.FAN_EVENT_DETAIL, { eventId: event.id })}`,
  }
}

// Weather icon mapping
const getWeatherIcon = (condition: string | null): string => {
  if (!condition) return 'wb_sunny'
  const lower = condition.toLowerCase()
  if (lower.includes('rain')) return 'rainy'
  if (lower.includes('cloud')) return 'cloud'
  if (lower.includes('snow')) return 'ac_unit'
  if (lower.includes('storm')) return 'thunderstorm'
  if (lower.includes('fog')) return 'foggy'
  if (lower.includes('wind')) return 'air'
  return 'wb_sunny'
}

// Format temperature
const formatTemp = (temp: number | null): string => {
  if (temp === null) return '--'
  return `${Math.round(temp)}°F`
}

const formatTimezoneDisplay = (timeZone: string | null | undefined, referenceDate: string): string => {
  if (!timeZone) return ''

  const parsedDate = new Date(referenceDate)
  if (Number.isNaN(parsedDate.getTime())) return timeZone

  try {
    const shortParts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(parsedDate)

    const shortName = shortParts.find(part => part.type === 'timeZoneName')?.value

    return shortName || timeZone
  } catch {
    return timeZone
  }
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanEventDetail() {
  useDebugLifecycle('FanEventDetail')
  
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { isOnline } = useOnlineStatus()

  // State
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowingOrg, setIsFollowingOrg] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
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
  const [copiedVenueAddress, setCopiedVenueAddress] = useState(false)
  const [venueCopyError, setVenueCopyError] = useState<string | null>(null)
  const [usingCachedEvent, setUsingCachedEvent] = useState(false)

  const loadEventDetail = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    setUsingCachedEvent(false)
    const cacheScope = getFanEventDetailCacheScope(id)

    try {
      if (USE_FAKE_DATA) {
        const fakeEvent = buildFakeEventDetail(id)
        if (!fakeEvent) {
          setError('Event not found')
          setLoading(false)
          return
        }

        setEvent(fakeEvent)
        writeCalendarCache(cacheScope, fakeEvent)
        if (fakeEvent.org_id) {
          checkFollowStatus(fakeEvent.org_id)
        }
        checkBookmarkStatus(id)
        setLoading(false)
        return
      }

      // First check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      // Load event with organization details
      // Note: We select all event fields plus related data
      const { data, error: fetchError } = await supabase
        .from('events')
        .select(`
          *,
          organizations (
            id,
            name,
            slug,
            logo_url,
            description
          ),
          teams (
            id,
            name
          ),
          seasons (
            id,
            name
          ),
          event_locations (
            venue_name,
            address_line1,
            city,
            state,
            postal_code
          ),
          ticketed_events (
            id,
            venue_name,
            status
          )
        `)
        .eq('id', id)
        .maybeSingle()

      console.log('Event query result:', { data, fetchError, user: !!user })

      if (fetchError) {
        console.error('Error fetching event:', fetchError)
        throw fetchError
      }

      if (!data) {
        const cached = readCalendarCache<EventDetail>(cacheScope)
        if (cached) {
          setEvent(cached.data)
          setUsingCachedEvent(true)
          setLoading(false)
          return
        }
        setError('Event not found')
        setLoading(false)
        return
      }

      // Transform the data - handle joined tables that may return arrays
      // Using any type here due to complex Supabase query result structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataAny = data as any
      const team = Array.isArray(dataAny.teams) ? dataAny.teams[0] : dataAny.teams
      const org = Array.isArray(dataAny.organizations) ? dataAny.organizations[0] : dataAny.organizations
      const eventLocation = Array.isArray(dataAny.event_locations) ? dataAny.event_locations[0] : dataAny.event_locations
      const ticketedEvent = Array.isArray(dataAny.ticketed_events) ? dataAny.ticketed_events[0] : dataAny.ticketed_events
      const season = Array.isArray(dataAny.seasons) ? dataAny.seasons[0] : dataAny.seasons

      const eventDetail: EventDetail = {
        id: dataAny.id,
        title: dataAny.title,
        description: dataAny.description,
        start_time: dataAny.start_time,
        end_time: dataAny.end_time,
        arrival_time: dataAny.arrival_time,
        timezone: dataAny.timezone || 'America/New_York',
        location: dataAny.location,
        type: dataAny.type,
        is_cancelled: dataAny.is_cancelled || false,
        visibility: dataAny.visibility || 'private',
        weather_dependent: dataAny.weather_dependent || false,
        external_link: dataAny.external_link,
        notes: dataAny.notes,
        uniform_notes: dataAny.uniform_notes,
        equipment_notes: dataAny.equipment_notes,
        org_id: org?.id || '',
        org_name: org?.name || 'Organization',
        org_slug: org?.slug || '',
        org_logo_url: org?.logo_url || null,
        org_public_description: org?.description || null,
        venue_name: eventLocation?.venue_name || ticketedEvent?.venue_name || null,
        venue_address: eventLocation?.address_line1 || null,
        venue_city: eventLocation?.city || null,
        venue_state: eventLocation?.state || null,
        venue_zip: eventLocation?.postal_code || null,
        place_id: eventLocation?.place_id || null,
        latitude: eventLocation?.latitude || null,
        longitude: eventLocation?.longitude || null,
        is_ticketed: !!ticketedEvent,
        ticket_event_id: ticketedEvent?.id || null,
        ticket_price_min: null, // Would need separate query to ticket_types
        ticket_price_max: null,
        tickets_available: ticketedEvent?.status === 'published',
        weather_temp: null,
        weather_condition: null,
        weather_icon: null,
        team_name: team?.name || null,
        season_name: season?.name || null,
      }

      setEvent(eventDetail)
      writeCalendarCache(cacheScope, eventDetail)

      // Check if following the org
      if (org?.id) {
        checkFollowStatus(org.id)
      }

      // Check bookmark status
      checkBookmarkStatus(id)
    } catch (err) {
      console.error('Error loading event:', err)
      const cached = readCalendarCache<EventDetail>(cacheScope)
      if (cached) {
        setEvent(cached.data)
        setUsingCachedEvent(true)
      } else {
        setError('Failed to load event details')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const checkFollowStatus = async (orgId: string) => {
    try {
      if (USE_FAKE_DATA) {
        const { data } = await getFollowedOrgs()
        setIsFollowingOrg((data || []).some((follow) => follow.org_id === orgId))
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('fan_org_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single()

      setIsFollowingOrg(!!data)
    } catch {
      // Not following
    }
  }

  const checkBookmarkStatus = async (eventIdParam: string) => {
    try {
      if (USE_FAKE_DATA) {
        const { data } = await getBookmarkedEvents()
        setIsBookmarked((data || []).some((bookmark) => bookmark.event_id === eventIdParam))
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('fan_event_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', eventIdParam)
        .single()

      setIsBookmarked(!!data)
    } catch {
      // Not bookmarked
    }
  }

  useEffect(() => {
    if (!eventId) {
      setError('Event not found')
      setLoading(false)
      return
    }

    if (!USE_FAKE_DATA && !isValidUUID(eventId)) {
      setError('Invalid event link')
      setLoading(false)
      return
    }

    loadEventDetail(eventId)
  }, [eventId, loadEventDetail])

  // Fetch commute summary when we have both start and destination
  useEffect(() => {
    const fetchCommuteSummary = async () => {
      const eventStartTime = event?.start_time ?? ''
      const destination = [
        event?.venue_address,
        event?.venue_city,
        event?.venue_state,
        event?.venue_zip,
      ]
        .filter(Boolean)
        .join(', ')

      if (!commuteStartLocation || !destination) {
        setCommuteSummary(null)
        return
      }
      
      setLoadingCommute(true)
      setCommuteSummary(null)
      
      try {
        if (USE_FAKE_DATA && eventStartTime) {
          setCommuteSummary(buildFakeCommuteSummary(commuteStartLocation, destination, eventStartTime))
          return
        }

        const origins = encodeURIComponent(commuteStartLocation)
        const destinations = encodeURIComponent(destination)
        
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/distance-matrix?origins=${origins}&destinations=${destinations}`
        const { data } = await supabase.auth.getSession()
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${data.session?.access_token}`,
          },
        })
        
        if (!response.ok) {
          console.error('Distance matrix API error:', response.status, response.statusText)
          setLoadingCommute(false)
          return
        }
        
        const result = await response.json()
        console.log('Distance matrix response:', result)
        
        if (result?.status === 'OK' && result.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const element = result.rows[0].elements[0]
          setCommuteSummary({
            distance: element.distance?.text || '',
            duration: element.duration?.text || '',
            durationInTraffic: element.duration_in_traffic?.text,
          })
        } else {
          console.error('Distance matrix failed:', result?.status, result?.rows?.[0]?.elements?.[0])
        }
      } catch (err) {
        console.error('Error fetching commute summary:', err)
      } finally {
        setLoadingCommute(false)
      }
    }
    
    fetchCommuteSummary()
  }, [commuteStartLocation, event?.start_time, event?.venue_address, event?.venue_city, event?.venue_state, event?.venue_zip])

  // Helper functions for commute info
  const handleSaveCommuteLocation = () => {
    const trimmed = commuteInputValue.trim()
    setCommuteStartLocation(trimmed)
    localStorage.setItem('commuteStartLocation', trimmed)
    setIsEditingCommute(false)
  }

  const getCommuteDirectionsUrl = (): string | null => {
    if (!commuteStartLocation || !getFullAddress()) return null
    const origin = encodeURIComponent(commuteStartLocation.trim())
    const dest = encodeURIComponent(getFullAddress().trim())
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&traffic=1`
  }

  // Get event status
  const getEventStatus = (): EventStatus => {
    if (!event) return 'upcoming'
    if (event.is_cancelled) return 'cancelled'

    const now = new Date()
    const start = new Date(event.start_time)
    const end = new Date(event.end_time)

    if (now >= start && now <= end) return 'live'
    if (now > end) return 'completed'
    return 'upcoming'
  }

  // Format date
  const formatEventDate = (dateStr: string, includeDay = true): string => {
    const date = new Date(dateStr)
    const options: Intl.DateTimeFormatOptions = {
      weekday: includeDay ? 'long' : undefined,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      ...(event?.timezone ? { timeZone: event.timezone } : {}),
    }
    return date.toLocaleDateString('en-US', options)
  }

  // Format time
  const formatEventTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const tz = formatTimezoneDisplay(event?.timezone, dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(event?.timezone ? { timeZone: event.timezone } : {}),
    }) + (tz ? ` ${tz}` : '')
  }

  const formatEventClockWithZone = (dateInput: string | Date): string => {
    const value = typeof dateInput === 'string' ? dateInput : dateInput.toISOString()
    return formatEventTime(value)
  }

  // Get full address
  const getFullAddress = useCallback((): string => {
    if (!event) return ''
    const parts = [
      event.venue_address,
      event.venue_city,
      event.venue_state,
      event.venue_zip,
    ].filter(Boolean)
    return parts.join(', ')
  }, [event])

  // Handle share
  const handleShare = async (platform: 'copy' | 'twitter' | 'facebook') => {
    const url = window.location.href
    const title = event?.title || 'Event'
    const text = `Check out ${title}!`

    setShareMenuOpen(false)

    switch (platform) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url)
          showSuccess('Link copied to clipboard')
        } catch {
          showError('Failed to copy link')
        }
        break
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          '_blank'
        )
        break
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank'
        )
        break
    }
  }

  // Open in maps
  const openInMaps = () => {
    const address = getFullAddress()
    if (address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        '_blank'
      )
    }
  }

  const handleCopyVenueAddress = async () => {
    const address = getFullAddress()
    if (!address) {
      setVenueCopyError('Nothing to copy')
      setTimeout(() => setVenueCopyError(null), 3000)
      return
    }

    const result = await copyToClipboard(address)
    if (result.success) {
      setCopiedVenueAddress(true)
      setVenueCopyError(null)
      setTimeout(() => setCopiedVenueAddress(false), 2000)
      return
    }

    setVenueCopyError(result.error?.message || 'Failed to copy address')
    setTimeout(() => setVenueCopyError(null), 3000)
  }

  // Handle get tickets
  const handleGetTickets = () => {
    if (event?.ticket_event_id) {
      const ticketEventPath = getLink(RouteKeys.PORTAL_TICKET_EVENT_DETAIL, { eventId: event.ticket_event_id })
      navigate(appendTicketCheckoutRole(ticketEventPath, 'fan'))
    }
  }

  // Navigate to org profile
  const handleOrgClick = () => {
    if (event?.org_slug) {
      navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { orgId: event.org_slug }))
    }
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="fan-event-detail">
        <div className="fan-empty-state">
          <span className="material-symbols-outlined fan-empty-icon">event_busy</span>
          <h3 className="fan-empty-title">{error || 'Event not found'}</h3>
          <p className="fan-empty-text">
            The event you're looking for may have been removed or doesn't exist.
          </p>
          <button
            className="fan-btn fan-btn-primary"
            onClick={() => navigate(getLink(RouteKeys.FAN_SCHEDULE))}
          >
            Back to Schedule
          </button>
        </div>
      </div>
    )
  }

  const status = getEventStatus()
  const fullAddress = getFullAddress()
  const calendarExportEvent = toCalendarExportEvent(event, fullAddress)
  return (
    <div className="fan-event-detail">
      {/* Breadcrumb */}
      <nav className="fan-event-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to={getLink(RouteKeys.FAN_HOME)}>Home</Link>
          </li>
          <li>
            <span className="material-symbols-outlined">chevron_right</span>
            <Link to={getLink(RouteKeys.FAN_SCHEDULE)}>Events</Link>
          </li>
          <li>
            <span className="material-symbols-outlined">chevron_right</span>
            <span className="current">{event.title}</span>
          </li>
        </ol>
      </nav>

      {/* Two Column Layout */}
      <div className="fan-event-layout">
        {/* Main Content */}
        <div className="fan-event-main">
          {(!isOnline || usingCachedEvent) && (
            <section className="fan-event-card">
              <h2 className="fan-event-card-title">
                <span className="material-symbols-outlined">wifi_off</span>
                Offline mode
              </h2>
              <p className="fan-event-sidebar-text">
                {usingCachedEvent
                  ? 'Showing the last cached version of this event.'
                  : 'Live updates are unavailable until your connection returns.'}
              </p>
            </section>
          )}

          {/* Header Section */}
          <header className="fan-event-header-section">
            {/* Status Badge */}
            <div className="fan-event-status-row">
              <span className={`fan-event-status-badge fan-event-status-${status}`}>
                {status === 'live' && (
                  <span className="fan-event-status-dot"></span>
                )}
                {status === 'live' ? 'Live Now' : 
                 status === 'completed' ? 'Completed' :
                 status === 'cancelled' ? 'Cancelled' : 'Upcoming'}
              </span>
              {event.type && (
                <span className="fan-event-type-badge">{event.type}</span>
              )}
            </div>

            {/* Title */}
            <h1 className="fan-event-page-title">{event.title}</h1>

            {/* Date, Time, Location */}
            <div className="fan-event-meta-row">
              <div className="fan-event-meta-item">
                <span className="material-symbols-outlined">calendar_today</span>
                <span>{formatEventDate(event.start_time)}</span>
              </div>
              <div className="fan-event-meta-item">
                <span className="material-symbols-outlined">schedule</span>
                <span>
                  {formatEventTime(event.start_time)}
                  {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                </span>
              </div>
              {(event.venue_name || event.location) && (
                <div className="fan-event-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>{event.venue_name || event.location}</span>
                </div>
              )}
            </div>

            {/* Org Info */}
            <div className="fan-event-org-row" onClick={handleOrgClick}>
              <div className="fan-event-org-logo">
                {event.org_logo_url ? (
                  <img src={event.org_logo_url} alt={event.org_name} />
                ) : (
                  <span className="material-symbols-outlined">apartment</span>
                )}
              </div>
              <div className="fan-event-org-info">
                <span className="fan-event-org-name">{event.org_name}</span>
                {event.team_name && (
                  <span className="fan-event-team-name">{event.team_name}</span>
                )}
              </div>
            </div>
            {event.org_public_description && (
              <p className="fan-event-org-description">{event.org_public_description}</p>
            )}

            {/* Action Buttons */}
            <div className="fan-event-actions-row">
              <BookmarkButton
                eventId={event.id}
                isBookmarked={isBookmarked}
                onToggle={setIsBookmarked}
                variant="default"
                className="fan-event-action-btn"
              />
              <div className="fan-event-share-wrapper">
                <button
                  className="fan-event-action-btn"
                  onClick={() => setShareMenuOpen(!shareMenuOpen)}
                  aria-label="Share event"
                >
                  <span className="material-symbols-outlined">share</span>
                  <span>Share</span>
                </button>
                {shareMenuOpen && (
                  <div className="fan-event-share-dropdown">
                    <button onClick={() => handleShare('copy')}>
                      <span className="material-symbols-outlined">link</span>
                      Copy Link
                    </button>
                    <button onClick={() => handleShare('twitter')}>
                      <span className="material-symbols-outlined">alternate_email</span>
                      Twitter
                    </button>
                    <button onClick={() => handleShare('facebook')}>
                      <span className="material-symbols-outlined">public</span>
                      Facebook
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Event Description Card */}
          {event.description && (
            <section className="fan-event-card">
              <h2 className="fan-event-card-title">
                <span className="material-symbols-outlined">info</span>
                About This Event
              </h2>
              <div 
                className="fan-event-description"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </section>
          )}

          {/* Venue Details Card */}
          {(event.venue_name || fullAddress) && (
            <section className="fan-event-card">
              <h2 className="fan-event-card-title">
                <span className="material-symbols-outlined">place</span>
                Venue Details
              </h2>
              <div className="fan-event-venue-info">
                {event.venue_name && (
                  <h3 className="fan-event-venue-name">{event.venue_name}</h3>
                )}
                {fullAddress && (
                  <p className="fan-event-venue-address">{fullAddress}</p>
                )}
                {fullAddress && (
                  <div style={{ marginTop: '12px' }}>
                    <p className="fan-commute-label">Open in Maps</p>
                    <VenueMapActionButtons
                      googleUrl={googleMapsLink(fullAddress)}
                      appleUrl={appleMapsLink(fullAddress)}
                      wazeUrl={wazeLink(fullAddress)}
                      onCopyAddress={handleCopyVenueAddress}
                      copied={copiedVenueAddress}
                      copyError={venueCopyError}
                      fullWidth
                    />
                  </div>
                )}
                {fullAddress && (
                  <div style={{ marginTop: '12px' }}>
                    <p className="fan-commute-label">Need a Ride?</p>
                    <VenueRideShareButtons
                      uberUrl={uberLink(fullAddress)}
                      lyftUrl={lyftLink(fullAddress)}
                      fullWidth
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Weather Card (for outdoor events) */}
          {event.weather_dependent && (
            <section className="fan-event-card fan-event-weather-card">
              <h2 className="fan-event-card-title">
                <span className="material-symbols-outlined">wb_sunny</span>
                Weather Forecast
              </h2>
              <div className="fan-event-weather-info">
                <div className="fan-event-weather-main">
                  <span className="material-symbols-outlined fan-event-weather-icon">
                    {getWeatherIcon(event.weather_condition)}
                  </span>
                  <span className="fan-event-weather-temp">
                    {formatTemp(event.weather_temp)}
                  </span>
                </div>
                <p className="fan-event-weather-note">
                  This is an outdoor event. Weather conditions may affect the schedule.
                </p>
              </div>
            </section>
          )}

          {/* Event notes are intentionally hidden from fans */}
        </div>

        {/* Sidebar */}
        <aside className="fan-event-sidebar">
          {/* Registration/Tickets Card */}
          <div className="fan-event-sidebar-card fan-event-tickets-card">
            {event.is_ticketed ? (
              <>
                <h3 className="fan-event-sidebar-title">Get Tickets</h3>
                {(event.ticket_price_min !== null || event.ticket_price_max !== null) && (
                  <div className="fan-event-price-range">
                    {event.ticket_price_min === event.ticket_price_max ? (
                      <span className="fan-event-price">${event.ticket_price_min?.toFixed(2)}</span>
                    ) : (
                      <span className="fan-event-price">
                        ${event.ticket_price_min?.toFixed(2)} - ${event.ticket_price_max?.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
                <div className="fan-event-ticket-meta">
                  {event.ticket_price_min !== null && (
                    <span className="fan-event-ticket-from">From ${event.ticket_price_min.toFixed(2)}</span>
                  )}
                  <span className="fan-event-ticket-date">{formatEventDate(event.start_time, false)}</span>
                </div>
                <button
                  className="fan-btn fan-btn-primary fan-event-cta-btn"
                  onClick={handleGetTickets}
                  disabled={!event.tickets_available}
                >
                  {event.tickets_available ? 'Get Tickets' : 'Sold Out'}
                </button>
                <div className="fan-event-payment-methods">
                  <span className="material-symbols-outlined">credit_card</span>
                  <span className="material-symbols-outlined">account_balance</span>
                  <span className="material-symbols-outlined">payments</span>
                </div>
              </>
            ) : (
              <>
                <h3 className="fan-event-sidebar-title">Event Access</h3>
                <p className="fan-event-sidebar-text">
                  {status === 'upcoming' 
                    ? 'This event does not require tickets.'
                    : 'This event has already taken place.'}
                </p>
                <div className="fan-event-arrival-time">
                  <span className="material-symbols-outlined">schedule</span>
                  <span>Starts at: {formatEventTime(event.start_time)}</span>
                </div>
              </>
            )}
          </div>

          {/* Organization Card */}
          <div className="fan-event-sidebar-card">
            <h3 className="fan-event-sidebar-title">Hosted By</h3>
            <div 
              className="fan-event-sidebar-org"
              onClick={handleOrgClick}
              role="button"
              tabIndex={0}
            >
              <div className="fan-event-sidebar-org-logo">
                {event.org_logo_url ? (
                  <img src={event.org_logo_url} alt={event.org_name} />
                ) : (
                  <span className="material-symbols-outlined">apartment</span>
                )}
              </div>
              <div className="fan-event-sidebar-org-info">
                <span className="fan-event-sidebar-org-name">{event.org_name}</span>
                <span className="fan-event-sidebar-org-link">View Profile →</span>
              </div>
            </div>
            {!isFollowingOrg && (
              <button
                className="fan-btn fan-btn-primary"
                onClick={async () => {
                  try {
                    const { error } = await followOrg(event.org_id)
                    if (error) {
                      showError('Failed to follow organization')
                    } else {
                      setIsFollowingOrg(true)
                      showSuccess(`Now following ${event.org_name}`)
                    }
                  } catch {
                    showError('Failed to follow organization')
                  }
                }}
                style={{ marginTop: 'var(--spacing-3)' }}
              >
                <span className="material-symbols-outlined">add</span>
                Follow
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="fan-event-sidebar-card">
            <h3 className="fan-event-sidebar-title">Quick Actions</h3>
            <div className="fan-event-quick-actions">
              <div style={{ marginBottom: '12px' }}>
                <AddToCalendarActions
                  event={calendarExportEvent}
                  googleVariant="secondary"
                  icsVariant="secondary"
                  buttonClassName="w-full justify-center"
                />
              </div>
              {fullAddress && (
                <button 
                  className="fan-event-quick-action"
                  onClick={openInMaps}
                >
                  <span className="material-symbols-outlined">directions</span>
                  <span>Get Directions</span>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              )}
              <button 
                className="fan-event-quick-action"
                onClick={() => handleShare('copy')}
              >
                <span className="material-symbols-outlined">share</span>
                <span>Share Event</span>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              {event.external_link && (
                <button 
                  className="fan-event-quick-action"
                  onClick={() => window.open(event.external_link!, '_blank')}
                >
                  <span className="material-symbols-outlined">open_in_new</span>
                  <span>External Link</span>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              )}
            </div>
          </div>

          {/* Commute Info */}
          {fullAddress && status === 'upcoming' && (
            <div className="fan-event-sidebar-card">
              <h3 className="fan-event-sidebar-title">
                <span className="material-symbols-outlined">directions_car</span>
                Commute Info
              </h3>
              {!isEditingCommute ? (
                <>
                  {commuteStartLocation ? (
                    <>
                      <div className="fan-commute-location">
                        <div className="fan-commute-location-header">
                          <p className="fan-commute-label">Your Starting Point</p>
                          <button
                            className="fan-commute-edit-btn"
                            onClick={() => {
                              setIsEditingCommute(true)
                              setCommuteInputValue(commuteStartLocation)
                            }}
                          >
                            <span className="material-symbols-outlined">edit</span>
                            Edit
                          </button>
                        </div>
                        <p className="fan-commute-address">{commuteStartLocation}</p>
                      </div>
                      
                      {loadingCommute ? (
                        <div className="fan-commute-loading">
                          <div className="fan-commute-spinner"></div>
                          <span>Calculating route...</span>
                        </div>
                      ) : commuteSummary ? (
                        <>
                          <div className="fan-commute-stats">
                            <div>
                              <p className="fan-commute-stat-label">Distance</p>
                              <p className="fan-commute-stat-value">{commuteSummary.distance}</p>
                            </div>
                            <div>
                              <p className="fan-commute-stat-label">
                                {commuteSummary.durationInTraffic ? 'With Traffic' : 'Duration'}
                              </p>
                              <p className="fan-commute-stat-value">
                                {commuteSummary.durationInTraffic || commuteSummary.duration}
                              </p>
                            </div>
                          </div>
                          {(() => {
                            const targetTime = event.start_time
                            const durationText = commuteSummary.durationInTraffic || commuteSummary.duration
                            const hoursMatch = durationText.match(/(\d+)\s*hour/)
                            const minsMatch = durationText.match(/(\d+)\s*min/)
                            const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
                            const mins = minsMatch ? parseInt(minsMatch[1]) : 0
                            const totalMinutes = hours * 60 + mins
                            
                            if (totalMinutes > 0) {
                              const targetDate = new Date(targetTime)
                              const leaveByDate = new Date(targetDate.getTime() - totalMinutes * 60 * 1000)
                              const leaveByTime = formatEventClockWithZone(leaveByDate)
                              
                              return (
                                <div className="fan-commute-leave-by">
                                  <p className="fan-commute-label">Need to Leave By</p>
                                  <p className="fan-commute-leave-time">{leaveByTime}</p>
                                  <p className="fan-commute-leave-note">
                                    To arrive by {formatEventClockWithZone(targetTime)}
                                    {' (start time)'}
                                  </p>
                                </div>
                              )
                            }
                            return null
                          })()}
                        </>
                      ) : null}
                      
                      {getCommuteDirectionsUrl() && (
                        <a
                          href={getCommuteDirectionsUrl()!}
                          target="_blank"
                          rel="noreferrer"
                          className="fan-btn fan-btn-primary"
                          style={{ display: 'block', marginTop: 'var(--spacing-4)' }}
                        >
                          <span className="material-symbols-outlined">navigation</span>
                          Get Directions with Traffic
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="fan-event-sidebar-text">
                        Save your home, work, or any starting point to quickly get directions with current traffic conditions.
                      </p>
                      <button
                        className="fan-btn fan-btn-primary"
                        onClick={() => setIsEditingCommute(true)}
                        style={{ width: '100%' }}
                      >
                        <span className="material-symbols-outlined">add_location</span>
                        Set Starting Location
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="fan-commute-edit-form">
                  <p className="fan-commute-label">Enter Your Starting Location</p>
                  <input
                    type="text"
                    value={commuteInputValue}
                    onChange={(e) => setCommuteInputValue(e.target.value)}
                    placeholder="e.g., 123 Main St, City, State"
                    className="fan-commute-input"
                    autoFocus
                  />
                  <div className="fan-commute-actions">
                    <button
                      className="fan-btn fan-btn-primary"
                      onClick={handleSaveCommuteLocation}
                      disabled={!commuteInputValue.trim()}
                    >
                      <span className="material-symbols-outlined">check</span>
                      Save
                    </button>
                    <button
                      className="fan-btn fan-btn-outline"
                      onClick={() => {
                        setIsEditingCommute(false)
                        setCommuteInputValue(commuteStartLocation)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nearby Amenities */}
          {status === 'upcoming' && (
            <NearbyAmenities
              placeId={event.place_id}
              latitude={event.latitude}
              longitude={event.longitude}
              eventType={event.type}
              eventStartTime={event.start_time}
              variant="fan"
            />
          )}

          {/* Need Help Card */}
          <div className="fan-event-sidebar-card fan-event-help-card">
            <h3 className="fan-event-sidebar-title">Need Help?</h3>
            <p className="fan-event-sidebar-text">
              Have questions about this event? Contact the organization for more information.
            </p>
            <button 
              className="fan-btn fan-btn-outline"
              onClick={handleOrgClick}
            >
              Contact Organization
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Fixed CTA */}
      {event.is_ticketed && event.tickets_available && status === 'upcoming' && (
        <div className="fan-event-mobile-cta">
          <div className="fan-event-mobile-cta-info">
            <span className="fan-event-mobile-cta-price">
              From ${event.ticket_price_min?.toFixed(2) || '0.00'}
            </span>
            <span className="fan-event-mobile-cta-date">
              {formatEventDate(event.start_time, false)}
            </span>
          </div>
          <button
            className="fan-btn fan-btn-primary"
            onClick={handleGetTickets}
          >
            Get Tickets
          </button>
        </div>
      )}
    </div>
  )
}
