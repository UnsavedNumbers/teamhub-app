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
import LoadingSpinner from '../../components/common/LoadingSpinner'
import BookmarkButton from '../../components/fan/BookmarkButton'
import NearbyAmenities from '../../components/portal/NearbyAmenities'
import { showError, showSuccess } from '../../utils/toast'
import { getLink, RouteKeys } from '../../utils/routes'
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
    const longParts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'long',
    }).formatToParts(parsedDate)
    const shortParts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(parsedDate)

    const longName = longParts.find(part => part.type === 'timeZoneName')?.value
    const shortName = shortParts.find(part => part.type === 'timeZoneName')?.value

    if (longName && shortName) return `${longName} (${shortName})`
    return longName || shortName || timeZone
  } catch {
    return timeZone
  }
}

export default function FanEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

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

  const loadEventDetail = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
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

      // Check if following the org
      if (org?.id) {
        checkFollowStatus(org.id)
      }

      // Check bookmark status
      checkBookmarkStatus(id)
    } catch (err) {
      console.error('Error loading event:', err)
      setError('Failed to load event details')
    } finally {
      setLoading(false)
    }
  }, [])

  const checkFollowStatus = async (orgId: string) => {
    try {
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
    if (eventId) {
      loadEventDetail(eventId)
    }
  }, [eventId, loadEventDetail])

  // Fetch commute summary when we have both start and destination
  useEffect(() => {
    const fetchCommuteSummary = async () => {
      if (!commuteStartLocation || !event?.venue_address) {
        setCommuteSummary(null)
        return
      }
      
      setLoadingCommute(true)
      setCommuteSummary(null)
      
      try {
        const origins = encodeURIComponent(commuteStartLocation)
        const destinations = encodeURIComponent(getFullAddress())
        
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
  }, [commuteStartLocation, event?.venue_address])

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
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(event?.timezone ? { timeZone: event.timezone } : {}),
    })
  }

  // Get full address
  const getFullAddress = (): string => {
    if (!event) return ''
    const parts = [
      event.venue_address,
      event.venue_city,
      event.venue_state,
      event.venue_zip,
    ].filter(Boolean)
    return parts.join(', ')
  }

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

  // Handle get tickets
  const handleGetTickets = () => {
    if (event?.ticket_event_id) {
      navigate(`/portal/tickets/events/${event.ticket_event_id}`)
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
  const timezoneLabel = formatTimezoneDisplay(event.timezone, event.start_time)

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
              {timezoneLabel && (
                <div className="fan-event-meta-item">
                  <span className="material-symbols-outlined">public</span>
                  <span>{timezoneLabel}</span>
                </div>
              )}
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
                <button
                  className="fan-event-directions-btn"
                  onClick={openInMaps}
                >
                  <span className="material-symbols-outlined">directions</span>
                  Get Directions
                </button>
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
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) {
                      showError('Please sign in to follow organizations')
                      return
                    }
                    const { error } = await supabase
                      .from('fan_org_follows')
                      .insert({ user_id: user.id, org_id: event.org_id })
                    if (error) {
                      showError('Failed to follow organization')
                    } else {
                      setIsFollowingOrg(true)
                      showSuccess(`Now following ${event.org_name}`)
                    }
                  } catch (err) {
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
                              const leaveByTime = leaveByDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                ...(event.timezone ? { timeZone: event.timezone } : {}),
                              })
                              
                              return (
                                <div className="fan-commute-leave-by">
                                  <p className="fan-commute-label">Need to Leave By</p>
                                  <p className="fan-commute-leave-time">{leaveByTime}</p>
                                  <p className="fan-commute-leave-note">
                                    To arrive by {new Date(targetTime).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      ...(event.timezone ? { timeZone: event.timezone } : {}),
                                    })}
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
