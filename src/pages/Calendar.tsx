
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import { supabase } from '../lib/supabase'
import { 
  getCalendarEvents,
  updateRSVP, 
  getSports,
  getAthletes, 
  getTeams,
  isGeneralRSVP, 
  isAthleteRSVP 
} from '../data/services'
import { getFanCalendar } from '../data/services/fanService'
import type { CalendarEventSummary } from '../data/services/eventsService'
import type { CalendarEvent as FanCalendarEvent } from '../types/staffAndFan'
import { getContactForCategory } from '../data/services/organizationContactsService'
import { USE_FAKE_DATA } from '../data/config'
import { getTeamById as getFakeTeamById } from '../data/fake/fakeTeams'
import { getChildTeamMemberships } from '../data/fake/fakeTeams'
import { 
    CalendarEvent, 
    CalendarViewMode, 
    CalendarFilters, 
    EventType,
    formatEventDate, 
    formatEventTimeRange, 
    formatEventLocation,
    getEventLocationMapsUrl,
    RSVPStatus,
    RSVPType
} from '../types/calendar'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import CalendarGrid from '../components/calendar/CalendarGrid'
import AddToCalendarActions from '../components/calendar/AddToCalendarActions'
import EventFilters from '../components/calendar/EventFilters'
import RSVPButton from '../components/calendar/RSVPButton'
import GeneralRSVPForm from '../components/calendar/GeneralRSVPForm'
import EventCard from '../components/calendar/EventCard'
import { type SportInfo } from '../utils/sportContext'
import { useI18n } from '../i18n/useI18n'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { readCalendarCache, writeCalendarCache } from '../features/calendar/cache'
import type { CalendarExportEvent } from '../features/calendar/addToCalendar'
import { buildIcsDataUrl, sanitizeCalendarFilename } from '../features/calendar/addToCalendar'
import { getLink, RouteKeys } from '../utils/routes'
import {
    filterByClassification,
    countByClassification,
    getNextUpcomingEvent,
    getNow
} from '../utils/eventClassification'

// Default filters
const defaultFilters: CalendarFilters = {
    childIds: [],
    teamIds: [],
    eventTypes: [],
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    showCancelled: false
}

// Number of events to show per page in agenda view (3x3 grid)
const EVENTS_PER_PAGE = 9

// Default date range for upcoming events (next 30 days)
const UPCOMING_RANGE_DAYS = 30

type TimeContext = 'upcoming' | 'past' | 'all'

function getCalendarPageCacheScope(userId: string | undefined, fanView: boolean): string {
  return `portal-calendar:${userId ?? 'anonymous'}:${fanView ? 'fan' : 'org'}`
}

function toCalendarExportEvent(event: CalendarEvent): CalendarExportEvent {
  const location = event.event_location
    ? [event.event_location.venue_name, formatEventLocation(event.event_location)]
        .filter(Boolean)
        .join(' ')
        .trim()
    : event.location

  return {
    id: event.id,
    title: event.title,
    startTime: event.start_time,
    endTime: event.end_time,
    location: location || null,
    description: event.notes,
    url: typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}${getLink(RouteKeys.PORTAL_EVENT_DETAIL, { eventId: event.id })}`,
  }
}

function toFanCalendarExportEvent(event: FanCalendarEvent): CalendarExportEvent {
  return {
    id: event.id,
    title: event.title,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    description: event.description,
    url: typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}${getLink(RouteKeys.FAN_EVENT_DETAIL, { eventId: event.id })}`,
  }
}

function downloadEventsAsCalendar(events: CalendarEvent[], fallbackName: string): boolean {
  const icsUrl = buildIcsDataUrl(events.map(toCalendarExportEvent))
  if (!icsUrl || typeof document === 'undefined') {
    return false
  }

  const link = document.createElement('a')
  link.href = icsUrl
  link.download = `${sanitizeCalendarFilename(fallbackName, 'schedule')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return true
}

function downloadFanEventsAsCalendar(events: FanCalendarEvent[], fallbackName: string): boolean {
  const icsUrl = buildIcsDataUrl(events.map(toFanCalendarExportEvent))
  if (!icsUrl || typeof document === 'undefined') {
    return false
  }

  const link = document.createElement('a')
  link.href = icsUrl
  link.download = `${sanitizeCalendarFilename(fallbackName, 'schedule')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return true
}

export default function Calendar() {
  // Add lifecycle logging
  useDebugLifecycle('Calendar')

  // I18n hook - will throw if I18nProvider is missing (correct behavior)
  const { t } = useI18n()
  
  // Safe translation helper with fallbacks
  // Wraps the t() function to handle missing keys gracefully
  const safeT = useCallback((key: string, fallback: string = key): string => {
    try {
      // Type assertion needed because t() expects specific keys, but we want to handle dynamic keys
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = t(key as any, undefined)
      // If translation returns the key itself (not found), use fallback
      return result && result !== key ? result : fallback
    } catch (error) {
      // If translation throws, use fallback
      console.warn(`Translation failed for key: ${key}`, error)
      return fallback
    }
  }, [t])

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [fanEvents, setFanEvents] = useState<FanCalendarEvent[]>([])
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('agenda')
  const [fanView, setFanView] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [children, setChildren] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [childTeamIdsByChild, setChildTeamIdsByChild] = useState<Record<string, string[]>>({})
  const [eventSports, setEventSports] = useState<Record<string, SportInfo | null>>({})
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [schedulingContact, setSchedulingContact] = useState<{ name: string; email: string; phone?: string | null } | null>(null)
  
  // Tab state - default to 'upcoming', persist user selection
  const [timeContext, setTimeContext] = useState<TimeContext>(() => {
    const saved = localStorage.getItem('calendar-time-context')
    return (saved === 'past' || saved === 'all') ? saved : 'upcoming'
  })
  
  // Track if user manually selected a tab (to prevent auto-switch)
  const [userSelectedTab, setUserSelectedTab] = useState(false)
  
  const { context, isReady } = useUserContext()
  const { isOnline } = useOnlineStatus()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Save time context to localStorage when it changes
  useEffect(() => {
    if (timeContext !== 'upcoming') {
      localStorage.setItem('calendar-time-context', timeContext)
    } else {
      localStorage.removeItem('calendar-time-context')
    }
  }, [timeContext])
  
  // Handler for manual tab selection
  const handleTimeContextChange = (newContext: TimeContext) => {
    setUserSelectedTab(true)
    setTimeContext(newContext)
  }

  const mapSummaryToCalendarEvent = useCallback((summary: CalendarEventSummary): CalendarEvent => ({
    id: summary.id,
    team_id: summary.team_id,
    season_id: summary.season_id,
    title: summary.title,
    type: summary.type,
    start_time: summary.start_time,
    end_time: summary.end_time,
    arrival_time: summary.arrival_time,
    timezone: summary.timezone,
    location: summary.location,
    notes: null,
    uniform_notes: null,
    equipment_notes: null,
    weather_dependent: false,
    external_link: null,
    is_cancelled: summary.is_cancelled,
    cancellation_reason: null,
    cancelled_at: null,
    cancelled_by_user_id: null,
    created_by_user_id: null,
    created_at: summary.start_time,
    updated_at: summary.start_time,
    requires_travel: summary.requires_travel,
    rsvp_config: {
      enabled: summary.rsvp_enabled,
      type: summary.rsvp_type as RSVPType | null,
    },
    team: summary.team ?? undefined,
    season: summary.season ?? undefined,
    rsvps: [],
    general_rsvps: [],
  }), [])

  const fetchData = useCallback(async () => {
    if (!isReady || !context) return
    setLoading(true)
    setError(null)
    const cacheScope = getCalendarPageCacheScope(context.userId, fanView)
    let nextFanEvents: FanCalendarEvent[] = []
    let nextEventSports: Record<string, SportInfo | null> = {}
    
    try {
      if (fanView) {
        const { data: fanData, error: fanError } = await getFanCalendar()
        if (fanError) {
          console.error('Error fetching fan calendar:', fanError)
          setFanEvents([])
        } else {
          nextFanEvents = (fanData?.events || []) as FanCalendarEvent[]
          setFanEvents(nextFanEvents)
        }
      }

      // Determine date range based on view and time context
      const now = new Date()
      let start: Date
      let end: Date
      
      // Check if user has navigated to a specific month (not current month)
      const isCurrentMonth = currentDate.getMonth() === now.getMonth() && 
                             currentDate.getFullYear() === now.getFullYear()
      
      if (viewMode === 'month') {
          // Month view: always filter to selected month
          start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          // Set end to end of day
          end.setHours(23, 59, 59, 999)
      } else if (timeContext === 'upcoming') {
          // Upcoming: next 30 days (per spec)
          // Include grace window (2 hours back) to properly classify events that just ended
          start = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
          end = new Date(now)
          end.setDate(end.getDate() + UPCOMING_RANGE_DAYS)
      } else if (timeContext === 'past') {
          // Past: filter to selected month if user navigated to a specific month
          if (!isCurrentMonth && currentDate < now) {
              // User navigated to a past month - filter to that month
              start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
              end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
              end.setHours(23, 59, 59, 999)
          } else {
              // Default: reasonable window (1 year back)
              // Include grace window to avoid overlap with upcoming classification
              start = new Date(now)
              start.setFullYear(start.getFullYear() - 1)
              end = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago (grace window)
          }
      } else {
          // All: filter to selected month if user navigated to a specific month
          if (!isCurrentMonth) {
              start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
              end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
              end.setHours(23, 59, 59, 999)
          } else {
              // Default: reasonable 6-month window for performance
              // Include grace window buffer
              start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              start.setTime(start.getTime() - 2 * 60 * 60 * 1000) // 2 hours before start
              end = new Date(now.getFullYear(), now.getMonth() + 6, 0)   // 6 months in the future
          }
      }
      
      // Fetch user children for RSVP matching
      const { data: childrenData, error: childrenError } = await getAthletes(context)
      if (childrenError) {
        console.error('Error fetching children:', childrenError)
        setChildTeamIdsByChild({})
      } else {
        const nextChildren = childrenData || []
        setChildren(nextChildren)

        if (nextChildren.length === 0) {
          setChildTeamIdsByChild({})
        } else if (USE_FAKE_DATA) {
          const memberships = getChildTeamMemberships()
          const nextChildTeamIdsByChild = nextChildren.reduce<Record<string, string[]>>((accumulator, child) => {
            accumulator[child.id] = memberships
              .filter((membership) => membership.childId === child.id)
              .map((membership) => membership.teamId)
            return accumulator
          }, {})
          setChildTeamIdsByChild(nextChildTeamIdsByChild)
        } else {
          const childIds = nextChildren.map((child) => child.id)
          const { data: membershipRows, error: membershipsError } = await supabase
            .from('team_memberships')
            .select('athlete_id, team_id')
            .in('athlete_id', childIds)

          if (membershipsError) {
            console.error('Error fetching child team memberships:', membershipsError)
            setChildTeamIdsByChild({})
          } else {
            const nextChildTeamIdsByChild = childIds.reduce<Record<string, string[]>>((accumulator, childId) => {
              accumulator[childId] = []
              return accumulator
            }, {})

            for (const membership of membershipRows || []) {
              if (!membership?.athlete_id || !membership?.team_id) continue
              nextChildTeamIdsByChild[membership.athlete_id] ||= []
              nextChildTeamIdsByChild[membership.athlete_id].push(membership.team_id)
            }

            setChildTeamIdsByChild(nextChildTeamIdsByChild)
          }
        }
      }

      // Use lightweight calendar query for list views (faster, fewer joins)
      // Full event details are loaded on-demand when viewing individual events
      const { data, error: eventsError } = await getCalendarEvents(context, {
        startDate: start,
        endDate: end,
        includeCancelled: filters.showCancelled,
        eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes : undefined,
      })

      if (eventsError) {
        console.error('Error fetching events:', eventsError)
        const cached = readCalendarCache<{
          events: CalendarEvent[]
          fanEvents: FanCalendarEvent[]
          eventSports: Record<string, SportInfo | null>
        }>(cacheScope)

        if (cached) {
          setEvents(cached.data.events)
          setFanEvents(cached.data.fanEvents)
          setEventSports(cached.data.eventSports)
          setError(isOnline ? (eventsError.message || 'Failed to load events') : safeT('common.error.offline', 'You appear to be offline. Please reconnect and try again.'))
        } else {
          setError(eventsError.message || 'Failed to load events')
          setEvents([])
          setEventSports({})
        }
      } else {
          // Events are already filtered server-side via the query params
          const filtered = (data || []).map(mapSummaryToCalendarEvent)
          setEvents(filtered)

          // Resolve event sports in batch (one teams query + one sports query).
          // This restores local sport card images without reintroducing N+1 calls.
          const teamIds = Array.from(
            new Set(
              filtered
                .map((event) => event.team_id)
                .filter((teamId): teamId is string => typeof teamId === 'string' && teamId.length > 0),
            ),
          )

          if (teamIds.length === 0) {
            setEventSports({})
          } else {
            const [teamsResult, sportsResult] = await Promise.all([
              getTeams(context),
              getSports(context),
            ])

            const sportById = new Map<string, SportInfo>()
            for (const sport of sportsResult.data || []) {
              if (!sport?.id || !sport?.name) continue
              sportById.set(sport.id, {
                id: sport.id,
                name: sport.name,
                color: sport.color || 'var(--org-btn-primary-bg, #137fec)',
                icon: sport.icon || undefined,
              })
            }

            const teamSportById = new Map<string, SportInfo>()
            for (const team of teamsResult.data || []) {
              const teamWithSport = team as (typeof team) & {
                sport?: { id?: string; name?: string; color?: string | null; icon?: string | null } | null
              }

              if (!team?.id || !teamIds.includes(team.id)) continue

              const joinedSport = teamWithSport.sport
              if (joinedSport?.id && joinedSport?.name) {
                teamSportById.set(team.id, {
                  id: joinedSport.id,
                  name: joinedSport.name,
                  color: joinedSport.color || 'var(--org-btn-primary-bg, #137fec)',
                  icon: joinedSport.icon || undefined,
                })
                continue
              }

              const fallbackSportId = (team as { sport_id?: string | null }).sport_id
              if (fallbackSportId) {
                const fallbackSport = sportById.get(fallbackSportId)
                if (fallbackSport) {
                  teamSportById.set(team.id, fallbackSport)
                }
              }
            }

            nextEventSports = {}
            for (const event of filtered) {
              if (!event.team_id) {
                nextEventSports[event.id] = null
                continue
              }
              const mappedSport = teamSportById.get(event.team_id) || null
              if (mappedSport) {
                nextEventSports[event.id] = mappedSport
                continue
              }

              // Demo safety net: if permission-filtered team queries return empty,
              // resolve team->sport directly from static fake data.
              if (USE_FAKE_DATA) {
                const fallbackTeam = getFakeTeamById(event.team_id)
                const fallbackSportId = fallbackTeam?.sport_id
                if (fallbackSportId) {
                  nextEventSports[event.id] = sportById.get(fallbackSportId) || null
                  continue
                }
              }

              nextEventSports[event.id] = null
            }

            setEventSports(nextEventSports)
          }

          writeCalendarCache(cacheScope, {
            events: filtered,
            fanEvents: nextFanEvents,
            eventSports: nextEventSports,
          })
      }
    } catch (err) {
      console.error('Unexpected error in fetchData:', err)
      const cached = readCalendarCache<{
        events: CalendarEvent[]
        fanEvents: FanCalendarEvent[]
        eventSports: Record<string, SportInfo | null>
      }>(cacheScope)
      if (cached) {
        setEvents(cached.data.events)
        setFanEvents(cached.data.fanEvents)
        setEventSports(cached.data.eventSports)
      } else {
        setEvents([])
      }
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }

    // Fetch scheduling contact (independent of events)
    try {
        const { data: contact } = await getContactForCategory(context.orgId, 'scheduling')
        if (contact) {
            setSchedulingContact({
                name: `${contact.first_name} ${contact.last_name}`,
                email: contact.email,
                phone: contact.phone
            })
        }
    } catch (err) {
        console.warn('Failed to load scheduling contact', err)
    }
  }, [context, fanView, isOnline, isReady, currentDate, safeT, timeContext, viewMode, filters, mapSummaryToCalendarEvent])

  // Restore state from query params on mount
  useEffect(() => {
    const viewParam = searchParams.get('view')
    const dateParam = searchParams.get('date')
    const teamsParam = searchParams.get('teams')
    const childrenParam = searchParams.get('children')
    const typesParam = searchParams.get('types')
    
    if (viewParam && ['agenda', 'week', 'month'].includes(viewParam)) {
      setViewMode(viewParam as CalendarViewMode)
    }
    
    if (dateParam) {
      const parsedDate = new Date(dateParam)
      if (!isNaN(parsedDate.getTime())) {
        setCurrentDate(parsedDate)
      }
    }
    
    if (teamsParam || childrenParam || typesParam) {
      setFilters(prev => ({
        ...prev,
        teamIds: teamsParam ? teamsParam.split(',').filter(Boolean) : prev.teamIds,
        childIds: childrenParam ? childrenParam.split(',').filter(Boolean) : prev.childIds,
        eventTypes: typesParam ? typesParam.split(',').filter(Boolean).filter((t): t is EventType => {
          const validTypes: EventType[] = ['practice', 'game', 'tournament', 'meeting', 'tryout', 'travel', 'pickup_dropoff', 'social', 'blackout']
          return validTypes.includes(t as EventType)
        }) : prev.eventTypes,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - intentionally excluding searchParams to avoid re-running on every param change

  // Sync filters and view mode to URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (viewMode !== 'agenda') params.set('view', viewMode)
    if (currentDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]
      if (dateStr !== todayStr) params.set('date', dateStr)
    }
    if (filters.teamIds.length > 0) params.set('teams', filters.teamIds.join(','))
    if (filters.childIds.length > 0) params.set('children', filters.childIds.join(','))
    if (filters.eventTypes.length > 0) params.set('types', filters.eventTypes.join(','))
    
    const newSearch = params.toString()
    const currentSearch = searchParams.toString()
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true })
    }
  }, [viewMode, currentDate, filters, searchParams, setSearchParams])

  useEffect(() => {
    fetchData()
  }, [fetchData, fanView])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEvent) {
        setSelectedEvent(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedEvent])

  const handleRSVPChange = async (eventId: string, childId: string, newStatus: RSVPStatus) => {
      // Guard: Ensure context is ready and has userId
      if (!isReady || !context?.userId) {
        console.error('Cannot update RSVP: context not ready')
        setError('Cannot update RSVP: please refresh the page')
        return
      }

      const rsvpKey = `${eventId}-${childId}`
      setRsvpLoading(prev => ({ ...prev, [rsvpKey]: true }))

      // Store original state for rollback
      const originalEvents = [...events]
      const originalSelectedEvent = selectedEvent

      // Optimistic update
      setEvents(prev => prev.map(e => {
            if (e.id !== eventId) return e
            const newRSVPs = e.rsvps ? [...e.rsvps] : []
            const idx = newRSVPs.findIndex(r => r.athlete_id === childId)
            const mockRSVP = { 
                id: 'temp', 
                event_id: eventId, 
                athlete_id: childId, 
                status: newStatus, 
                responded_at: new Date().toISOString(), 
                responded_by_user_id: context.userId, 
                note: null, 
                created_at: new Date().toISOString(), 
                updated_at: new Date().toISOString() 
            }
            
            if (idx >= 0) {
                newRSVPs[idx] = { ...newRSVPs[idx], status: newStatus, responded_at: new Date().toISOString() }
            } else {
                newRSVPs.push(mockRSVP)
            }
            return { ...e, rsvps: newRSVPs }
      }))

      // Update selected event if open
      if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(prev => {
              if(!prev) return null
              const newRSVPs = prev.rsvps ? [...prev.rsvps] : []
              const idx = newRSVPs.findIndex(r => r.athlete_id === childId)
              if (idx >= 0) {
                  newRSVPs[idx] = { ...newRSVPs[idx], status: newStatus, responded_at: new Date().toISOString() }
              } else {
                  newRSVPs.push({ 
                    id: 'temp', 
                    event_id: eventId, 
                    athlete_id: childId, 
                    status: newStatus, 
                    responded_at: new Date().toISOString(), 
                    responded_by_user_id: context.userId, 
                    note: null, 
                    created_at: new Date().toISOString(), 
                    updated_at: new Date().toISOString() 
                })
              }
              return { ...prev, rsvps: newRSVPs }
          })
      }

      try {
        const { data, error: rsvpError } = await updateRSVP(context, eventId, childId, newStatus)
        
        if (rsvpError) {
          // Rollback optimistic update
          setEvents(originalEvents)
          setSelectedEvent(originalSelectedEvent)
          setError(rsvpError.message || 'Failed to update RSVP')
          console.error('RSVP update error:', rsvpError)
        } else if (data) {
          // Update with server response
          setEvents(prev => prev.map(e => {
            if (e.id !== eventId) return e
            const newRSVPs = e.rsvps ? [...e.rsvps] : []
            const idx = newRSVPs.findIndex(r => r.athlete_id === childId)
            if (idx >= 0) {
              newRSVPs[idx] = data
            } else {
              newRSVPs.push(data)
            }
            return { ...e, rsvps: newRSVPs }
          }))

          if (selectedEvent && selectedEvent.id === eventId) {
            setSelectedEvent(prev => {
              if (!prev) return null
              const newRSVPs = prev.rsvps ? [...prev.rsvps] : []
              const idx = newRSVPs.findIndex(r => r.athlete_id === childId)
              if (idx >= 0) {
                newRSVPs[idx] = data
              } else {
                newRSVPs.push(data)
              }
              return { ...prev, rsvps: newRSVPs }
            })
          }
        }
      } catch (err) {
        // Rollback optimistic update
        setEvents(originalEvents)
        setSelectedEvent(originalSelectedEvent)
        setError(err instanceof Error ? err.message : 'Failed to update RSVP')
        console.error('RSVP update error:', err)
      } finally {
        setRsvpLoading(prev => {
          const next = { ...prev }
          delete next[rsvpKey]
          return next
        })
      }
  }

  const mapUrl = selectedEvent?.event_location ? getEventLocationMapsUrl(selectedEvent.event_location) : null

  // Classify and filter events based on current state
  const now = getNow()
  const allEvents = fanView ? [] : events // Fan events handled separately in the fan calendar branch below
  
  // Apply filters first (event type, team, show canceled)
  const filteredEvents = allEvents.filter(event => {
    // Event type filter
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
      return false
    }
    
    // Team filter
    if (filters.teamIds.length > 0 && event.team_id && !filters.teamIds.includes(event.team_id)) {
      return false
    }
    
    // Child filter (for guardian view)
    if (filters.childIds.length > 0) {
      const selectedTeamIds = new Set(
        filters.childIds.flatMap((childId) => childTeamIdsByChild[childId] ?? []),
      )

      if (selectedTeamIds.size === 0 || !event.team_id) {
        return false
      }

      return selectedTeamIds.has(event.team_id)
    }
    
    return true
  })
  
  // Classify events
  const counts = countByClassification(filteredEvents, filters.showCancelled, now)
  const upcomingEvents = filterByClassification(filteredEvents, 'upcoming', filters.showCancelled, now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const pastEvents = filterByClassification(filteredEvents, 'past', filters.showCancelled, now)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  // Get events to display based on time context
  const getDisplayEvents = (): CalendarEvent[] => {
    let eventsToShow: CalendarEvent[] = []
    
    if (timeContext === 'upcoming') {
      eventsToShow = upcomingEvents
    } else if (timeContext === 'past') {
      eventsToShow = pastEvents
    } else {
      // All: combine upcoming and past, sorted appropriately
      eventsToShow = [...upcomingEvents, ...pastEvents]
    }
    
    // Filter to selected month if user has navigated to a specific month
    // (and not in month view, which already filters server-side)
    if (viewMode !== 'month') {
      const isCurrentMonth = currentDate.getMonth() === now.getMonth() && 
                             currentDate.getFullYear() === now.getFullYear()
      
      if (!isCurrentMonth) {
        // User navigated to a specific month - filter events to that month
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        
        eventsToShow = eventsToShow.filter(event => {
          const eventDate = new Date(event.start_time)
          return eventDate >= monthStart && eventDate <= monthEnd
        })
      }
    }
    
    return eventsToShow
  }
  
  const displayEvents = getDisplayEvents()
  const nextUpcomingEvent = getNextUpcomingEvent(filteredEvents, filters.showCancelled, now)
  
  // Auto-switch to Past tab if no upcoming events but past events exist
  // Only auto-switch if user hasn't manually selected a tab
  useEffect(() => {
    if (!userSelectedTab && timeContext === 'upcoming' && counts.upcoming === 0 && counts.past > 0 && !loading) {
      setTimeContext('past')
    }
  }, [counts.upcoming, counts.past, timeContext, loading, userSelectedTab])
  
  // Role helpers
  const isGuardian = context?.roles.includes('parent') ?? false
  const isAthlete = context?.roles.includes('athlete') ?? false
  const isCoach = context?.roles.includes('coach') ?? false
  const isStaff = context?.roles.includes('staff') ?? false
  const isAdmin = context?.roles.includes('org_admin') ?? false
  const isFan = fanView
  
  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: getLink(RouteKeys.PORTAL_DASHBOARD) },
          { label: safeT('calendar.title', 'Calendar') },
        ]}
      >
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1">
              <PageTitle>{safeT('calendar.title', 'Events')}</PageTitle>
              {nextUpcomingEvent && counts.upcoming > 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-light tracking-wide mt-1">
                  Next up: {nextUpcomingEvent.title} — {formatEventDate(nextUpcomingEvent.start_time, nextUpcomingEvent.timezone)} {formatEventTimeRange(nextUpcomingEvent.start_time, nextUpcomingEvent.end_time, nextUpcomingEvent.timezone)}
                </p>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              {(isCoach || isAdmin || isStaff) && (
                 <Button onClick={() => navigate(getLink(RouteKeys.PORTAL_CALENDAR_CREATE))} className="w-full sm:w-auto">
                    <Icon name="add" className="mr-2" />
                    Create Event
                 </Button>
              )}

                <Button
                variant="secondary"
                onClick={() => {
                  const exportSucceeded = fanView
                    ? downloadFanEventsAsCalendar(fanEvents, 'fan-schedule')
                    : downloadEventsAsCalendar(displayEvents, 'portal-schedule')

                  if (!exportSucceeded) {
                    setError(safeT('calendar.errors.exportFailed', 'Unable to generate a calendar file for the current selection.'))
                  }
                }}
                disabled={loading || (fanView ? fanEvents.length === 0 : displayEvents.length === 0)}
                className="w-full sm:w-auto"
              >
                <Icon name="calendar_add_on" className="mr-2" />
                {safeT('calendar.event.addToCalendar', 'Add to Calendar')}
              </Button>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 w-full sm:w-auto">
                {(['agenda', 'week', 'month'] as CalendarViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setViewMode(v)
                      setCurrentPage(1) // Reset page when changing view
                    }}
                    disabled={loading}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      viewMode === v
                        ? 'bg-[var(--org-btn-primary-bg)] text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {safeT(`calendar.views.${v}`, v)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Time Context Tabs */}
          {!fanView && (
            <div className="mb-4 flex gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1">
              <button
                onClick={() => handleTimeContextChange('upcoming')}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-sm font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  timeContext === 'upcoming'
                    ? 'bg-[var(--org-btn-primary-bg)] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Upcoming {counts.upcoming > 0 && `(${counts.upcoming})`}
              </button>
              <button
                onClick={() => handleTimeContextChange('past')}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-sm font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  timeContext === 'past'
                    ? 'bg-[var(--org-btn-primary-bg)] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Past {counts.past > 0 && `(${counts.past})`}
              </button>
              <button
                onClick={() => handleTimeContextChange('all')}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-sm font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  timeContext === 'all'
                    ? 'bg-[var(--org-btn-primary-bg)] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
            </div>
          )}

          {!isOnline && (
            <Card className="p-4 mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <Icon name="wifi_off" className="text-amber-600 dark:text-amber-300 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-100">
                    {safeT('calendar.errors.offlineTitle', 'You are offline')}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {safeT('calendar.errors.offlineDescription', 'Cached events remain available when present, but live updates are paused until your connection returns.')}
                  </p>
                </div>
              </div>
            </Card>
          )}
          
          {/* Fan View Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fanView}
                onChange={(e) => setFanView(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)]"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Fan View (includes events from followed organizations, bookmarks, and tickets)
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="lg:col-span-1 order-2 lg:order-1">
                 <EventFilters filters={filters} onFiltersChange={setFilters} />
                 
                 {/* Mini Calendar Navigation could go here too */}
                 <Card className="p-4">
                     <div className="flex items-center justify-between mb-2">
                         <button 
                           onClick={() => {
                             const newDate = new Date(currentDate)
                             newDate.setMonth(newDate.getMonth() - 1)
                             setCurrentDate(newDate)
                           }} 
                           className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                           disabled={loading}
                           aria-label="Previous month"
                         >
                             <Icon name="chevron_left" className="text-slate-500 dark:text-slate-400" />
                         </button>
                         <span className="font-bold text-slate-700 dark:text-slate-300">
                             {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric'})}
                         </span>
                         <button 
                           onClick={() => {
                             const newDate = new Date(currentDate)
                             newDate.setMonth(newDate.getMonth() + 1)
                             setCurrentDate(newDate)
                           }}
                           className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                           disabled={loading}
                           aria-label="Next month"
                         >
                             <Icon name="chevron_right" className="text-slate-500 dark:text-slate-400" />
                         </button>
                     </div>
                     <button 
                       onClick={() => setCurrentDate(new Date())} 
                       className="w-full text-xs font-bold text-[var(--org-link-color)] text-center py-1 hover:underline transition-colors"
                       disabled={loading}
                     >
                         Jump to Today
                     </button>
                 </Card>

                 {/* Scheduling Contact */}
                 {schedulingContact && (
                    <Card className="p-4 mt-6 bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Schedule Questions?</h3>
                        <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">{schedulingContact.name}</p>
                        <a href={`mailto:${schedulingContact.email}`} className="text-sm text-[var(--org-link-color)] hover:underline block break-all">
                            {schedulingContact.email}
                        </a>
                        {schedulingContact.phone && (
                            <a href={`tel:${schedulingContact.phone}`} className="text-sm text-slate-500 hover:text-slate-700 block mt-1">
                                {schedulingContact.phone}
                            </a>
                        )}
                    </Card>
                 )}
            </div>

            <div className="lg:col-span-3 order-1 lg:order-2">
                {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                    <p className="mt-4 text-sm text-slate-500">Loading events...</p>
                </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Icon name="error_outline" size="text-4xl" className="text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setError(null)
                        fetchData()
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : fanView ? (
                  // Fan view (existing logic)
                  fanEvents.length === 0 ? (
                    <Card className="text-center py-12">
                      <Icon name="event" size="text-6xl" className="text-slate-400 mb-4" />
                      <CardTitle className="mb-2">{safeT('calendar.noEvents.title', 'No events')}</CardTitle>
                      <p className="text-slate-500 dark:text-slate-400">
                        No events from your followed organizations, bookmarks, or tickets.
                      </p>
                    </Card>
                  ) : (
                    <CalendarGrid 
                        events={fanEvents.map((fe) => ({
                          id: fe.id,
                          title: fe.title,
                          start_time: fe.start_time,
                          end_time: fe.end_time,
                          location: fe.location || null,
                          type: fe.event?.type || 'other',
                          description: fe.event?.description || null,
                          rsvps: [],
                          event_location: null,
                        })) as unknown as CalendarEvent[]}
                        eventSports={eventSports}
                        viewMode={viewMode}
                        currentDate={currentDate}
                        currentPage={currentPage}
                        eventsPerPage={EVENTS_PER_PAGE}
                        onEventClick={setSelectedEvent}
                        onDateChange={setCurrentDate}
                        onPageChange={setCurrentPage}
                    />
                  )
                ) : (
                  // Main events view with scenarios
                  (() => {
                    // Check if filters are hiding all events
                    const hasActiveFilters = filters.eventTypes.length > 0 || filters.teamIds.length > 0 || filters.childIds.length > 0
                    const filteredCount = displayEvents.length
                    const totalCount = filteredEvents.length
                    
                    // Scenario 6: Filters applied and hiding all results
                    if (hasActiveFilters && filteredCount === 0 && totalCount > 0) {
                      return (
                        <Card className="text-center py-12">
                          <Icon name="filter_list" size="text-6xl" className="text-slate-400 mb-4" />
                          <CardTitle className="mb-2">No events match your filters</CardTitle>
                          <p className="text-slate-500 dark:text-slate-400 mb-4">
                            Try adjusting your filters to see more events.
                          </p>
                          <Button
                            variant="secondary"
                            onClick={() => setFilters({ ...defaultFilters })}
                          >
                            Clear Filters
                          </Button>
                        </Card>
                      )
                    }
                    
                    // Scenario 4: No events at all
                    if (totalCount === 0) {
                      return (
                        <Card className="text-center py-12">
                          <Icon name="event" size="text-6xl" className="text-slate-400 mb-4" />
                          <CardTitle className="mb-2">No events yet</CardTitle>
                          <p className="text-slate-500 dark:text-slate-400 mb-4">
                            Events will appear here once scheduled.
                          </p>
                          {(isCoach || isAdmin || isStaff) && (
                            <Button onClick={() => navigate(getLink(RouteKeys.PORTAL_CALENDAR_CREATE))}>
                              <Icon name="add" className="mr-2" />
                              Create First Event
                            </Button>
                          )}
                          {isGuardian && (
                            <Button variant="secondary" onClick={() => navigate(getLink(RouteKeys.PORTAL_ATHLETES))}>
                              View Teams
                            </Button>
                          )}
                          {isFan && (
                            <p className="text-sm text-slate-500 mt-4">
                              Follow organizations to see public events
                            </p>
                          )}
                        </Card>
                      )
                    }
                    
                    // Scenario 2: Exactly one upcoming event (spotlight layout)
                    if (timeContext === 'upcoming' && counts.upcoming === 1 && nextUpcomingEvent) {
                      const calendarExportEvent = toCalendarExportEvent(nextUpcomingEvent)
                      const ticketedEventId = nextUpcomingEvent.ticketed_event?.id ?? null
                      const eventMapUrl = nextUpcomingEvent.event_location 
                        ? getEventLocationMapsUrl(nextUpcomingEvent.event_location)
                        : nextUpcomingEvent.location
                          ? `https://maps.google.com/?q=${encodeURIComponent(nextUpcomingEvent.location)}`
                          : null
                      
                      return (
                        <div className="space-y-6">
                          {/* Spotlight Card */}
                          <Card className="p-6 border-2 border-[var(--org-btn-primary-bg)]">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-black uppercase tracking-wider text-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)]/10 px-2 py-1 rounded">
                                    {safeT(`calendar.eventTypes.${nextUpcomingEvent.type}`, nextUpcomingEvent.type)}
                                  </span>
                                  {nextUpcomingEvent.ticketed_event && (
                                    <span className="text-xs font-black uppercase tracking-wider text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                                      Ticketed
                                    </span>
                                  )}
                                </div>
                                <CardTitle className="text-2xl mb-2">{nextUpcomingEvent.title}</CardTitle>
                                {nextUpcomingEvent.team && (
                                  <p className="text-sm font-bold text-[var(--org-link-color)] mb-4">
                                    {nextUpcomingEvent.team.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                  <Icon name="event" className="text-slate-500 dark:text-slate-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {formatEventDate(nextUpcomingEvent.start_time, nextUpcomingEvent.timezone)}
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {formatEventTimeRange(nextUpcomingEvent.start_time, nextUpcomingEvent.end_time, nextUpcomingEvent.timezone)}
                                  </p>
                                </div>
                              </div>
                              
                              {(nextUpcomingEvent.event_location?.venue_name || nextUpcomingEvent.location) && (
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                    <Icon name="location_on" className="text-slate-500 dark:text-slate-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                                      {nextUpcomingEvent.event_location?.venue_name || nextUpcomingEvent.location}
                                    </p>
                                    {nextUpcomingEvent.event_location && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {formatEventLocation(nextUpcomingEvent.event_location)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                              {(isGuardian || isAthlete) && (
                                <AddToCalendarActions
                                  event={calendarExportEvent}
                                  layout="inline"
                                  googleVariant="secondary"
                                  icsVariant="secondary"
                                  buttonClassName="px-4 py-2"
                                />
                              )}
                              
                              {eventMapUrl && (
                                <a
                                  href={eventMapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium"
                                >
                                  <Icon name="directions" size="text-sm" />
                                  Directions
                                </a>
                              )}
                              
                              {ticketedEventId && (
                                <>
                                  {(isGuardian || isFan) ? (
                                    <Button
                                      variant="primary"
                                      onClick={() => navigate(getLink(RouteKeys.PORTAL_TICKET_EVENT_DETAIL, { eventId: ticketedEventId }))}
                                    >
                                      Buy Tickets
                                    </Button>
                                  ) : null}
                                </>
                              )}
                              
                              {nextUpcomingEvent.rsvp_config?.enabled && !nextUpcomingEvent.is_cancelled && (
                                <Button
                                  variant="secondary"
                                  onClick={() => setSelectedEvent(nextUpcomingEvent)}
                                >
                                  RSVP
                                </Button>
                              )}
                            </div>
                          </Card>
                          
                          {/* Past Events Preview */}
                          {counts.past > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                  Past Events
                                </h3>
                                <button
                                  onClick={() => setTimeContext('past')}
                                  className="text-sm text-[var(--org-link-color)] hover:underline"
                                >
                                  View all past ({counts.past})
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pastEvents.slice(0, 5).map(event => (
                                  <EventCard
                                    key={event.id}
                                    event={event}
                                    sport={eventSports[event.id] || null}
                                    onClick={() => setSelectedEvent(event)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                    
                    // Scenario 3: No upcoming events, past events exist
                    if (timeContext === 'upcoming' && counts.upcoming === 0 && counts.past > 0) {
                      return (
                        <div className="space-y-4">
                          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                              No upcoming events scheduled. Showing past events.
                            </p>
                          </Card>
                          {(isCoach || isAdmin) && (
                            <div className="flex justify-center">
                              <Button onClick={() => navigate(getLink(RouteKeys.PORTAL_CALENDAR_CREATE))}>
                                <Icon name="add" className="mr-2" />
                                Create Event
                              </Button>
                            </div>
                          )}
                          {isGuardian && (
                            <div className="flex justify-center">
                              <Button variant="secondary" onClick={() => navigate(getLink(RouteKeys.PORTAL_CALENDAR))}>
                                View Full Calendar
                              </Button>
                            </div>
                          )}
                          <CalendarGrid 
                            events={pastEvents}
                            eventSports={eventSports}
                            viewMode={viewMode}
                            currentDate={currentDate}
                            currentPage={currentPage}
                            eventsPerPage={EVENTS_PER_PAGE}
                            onEventClick={setSelectedEvent}
                            onDateChange={setCurrentDate}
                            onPageChange={setCurrentPage}
                          />
                        </div>
                      )
                    }
                    
                    // Scenario 1 & default: Multiple events (grid/list view)
                    return (
                      <CalendarGrid 
                        events={displayEvents}
                        eventSports={eventSports}
                        viewMode={viewMode}
                        currentDate={currentDate}
                        currentPage={currentPage}
                        eventsPerPage={EVENTS_PER_PAGE}
                        onEventClick={setSelectedEvent}
                        onDateChange={setCurrentDate}
                        onPageChange={setCurrentPage}
                      />
                    )
                  })()
                )}
            </div>
        </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
        >
            <div className="max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Card className="p-0 overflow-hidden">
                <div className={`h-2 w-full ${selectedEvent.is_cancelled ? 'bg-red-500' : 'bg-[var(--org-btn-primary-bg)]'}`} />
                <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                        <div className="flex items-center gap-2 mb-1">
                            {selectedEvent.is_cancelled && <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">{safeT('calendar.event.cancelled', 'Cancelled').toUpperCase()}</span>}
                             <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{safeT(`calendar.eventTypes.${selectedEvent.type}`, selectedEvent.type)}</span>
                        </div>
                        <CardTitle className="mb-1 text-2xl">{selectedEvent.title}</CardTitle>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--org-link-color)]">{selectedEvent.team?.name}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedEvent(null)} 
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                          aria-label="Close event details"
                        >
                        <Icon name="close" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                <Icon name="event" className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{formatEventDate(selectedEvent.start_time, selectedEvent.timezone)}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{formatEventTimeRange(selectedEvent.start_time, selectedEvent.end_time, selectedEvent.timezone)}</p>
                            </div>
                        </div>

                        {selectedEvent.arrival_time && (
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                                <Icon name="schedule" className="text-amber-500 dark:text-amber-400" />
                             </div>
                            <p className="font-bold text-slate-900 dark:text-white">
                                {safeT('calendar.event.arriveBy', 'Arrive by {{time}}').replace('{{time}}', new Date(selectedEvent.arrival_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))}
                            </p>
                        </div>
                        )}

                        {(selectedEvent.event_location?.venue_name || selectedEvent.location) && (
                        <div className="flex items-start gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                <Icon name="location_on" className="text-slate-500 dark:text-slate-400" />
                             </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedEvent.event_location?.venue_name || selectedEvent.location}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedEvent.event_location ? formatEventLocation(selectedEvent.event_location) : ''}</p>
                                {mapUrl && (
                                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--org-link-color)] hover:underline flex items-center gap-1 mt-1">
                                        {safeT('calendar.event.getDirections', 'Get Directions')} <Icon name="open_in_new" size="text-[10px]" />
                                    </a>
                                )}
                            </div>
                        </div>
                        )}

                        {selectedEvent.notes && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{selectedEvent.notes}</p>
                            </div>
                        )}

                         {/* RSVP Section - Only show if RSVP is enabled */}
                        {selectedEvent.rsvp_config?.enabled && isReady && context?.userId && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3">{safeT('calendar.rsvp.yourResponse', 'Your Response')}</h4>
                                
                                {isGeneralRSVP(selectedEvent) ? (
                                    <GeneralRSVPForm 
                                        eventId={selectedEvent.id}
                                        userId={context.userId}
                                        currentRSVP={selectedEvent.general_rsvps?.find(r => r.user_id === context.userId) || null}
                                        disabled={selectedEvent.is_cancelled || false}
                                        onRSVPUpdate={(updatedRSVP) => {
                                          // Update selected event with new RSVP
                                          setSelectedEvent(prev => {
                                            if (!prev) return null
                                            const newGeneralRSVPs = prev.general_rsvps ? [...prev.general_rsvps] : []
                                            const idx = newGeneralRSVPs.findIndex(r => r.user_id === context.userId)
                                            if (idx >= 0) {
                                              newGeneralRSVPs[idx] = updatedRSVP
                                            } else {
                                              newGeneralRSVPs.push(updatedRSVP)
                                            }
                                            return { ...prev, general_rsvps: newGeneralRSVPs }
                                          })
                                          // Update events list
                                          setEvents(prev => prev.map(e => {
                                            if (e.id !== selectedEvent.id) return e
                                            const newGeneralRSVPs = e.general_rsvps ? [...e.general_rsvps] : []
                                            const idx = newGeneralRSVPs.findIndex(r => r.user_id === context.userId)
                                            if (idx >= 0) {
                                              newGeneralRSVPs[idx] = updatedRSVP
                                            } else {
                                              newGeneralRSVPs.push(updatedRSVP)
                                            }
                                            return { ...e, general_rsvps: newGeneralRSVPs }
                                          }))
                                        }}
                                    />
                                ) : isAthleteRSVP(selectedEvent) ? (
                                    children.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No children connected to account.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {children.map(child => {
                                                const rsvp = selectedEvent.rsvps?.find(r => r.athlete_id === child.id)
                                                const rsvpKey = `${selectedEvent.id}-${child.id}`
                                                return (
                                                    <RSVPButton 
                                                        key={child.id}
                                                        eventId={selectedEvent.id}
                                                        childId={child.id}
                                                        childName={child.first_name}
                                                        currentStatus={rsvp?.status || 'unknown'}
                                                        onStatusChange={(s) => handleRSVPChange(selectedEvent.id, child.id, s)}
                                                        disabled={selectedEvent.is_cancelled || rsvpLoading[rsvpKey] || false}
                                                    />
                                                )
                                            })}
                                        </div>
                                    )
                                ) : null}
                            </div>
                        )}
                    </div>

                    {(isGuardian || isAthlete) && (
                      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                          {safeT('calendar.event.addToCalendar', 'Add to Calendar')}
                        </h4>
                        <AddToCalendarActions
                          event={toCalendarExportEvent(selectedEvent)}
                          googleVariant="secondary"
                          icsVariant="secondary"
                          buttonClassName="w-full justify-center"
                        />
                      </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                const params = new URLSearchParams()
                                params.set('view', viewMode)
                                params.set('date', currentDate.toISOString().split('T')[0])
                                if (filters.teamIds.length > 0) params.set('teams', filters.teamIds.join(','))
                                if (filters.childIds.length > 0) params.set('children', filters.childIds.join(','))
                                if (filters.eventTypes.length > 0) params.set('types', filters.eventTypes.join(','))
                                const detailPath = fanView
                                  ? getLink(RouteKeys.FAN_EVENT_DETAIL, { eventId: selectedEvent.id })
                                  : getLink(RouteKeys.PORTAL_EVENT_DETAIL, { eventId: selectedEvent.id })
                                navigate(params.toString() ? `${detailPath}?${params.toString()}` : detailPath)
                                setSelectedEvent(null)
                            }}
                            className="w-full"
                        >
                        {safeT('common.viewDetails', 'View Details')}
                        </Button>
                    </div>
                </div>
              </Card>
            </div>
        </div>
      )}
      </PortalLayout>
  )
}
