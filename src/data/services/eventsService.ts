/**
 * Calendar/Events Service
 *
 * Provides data access for calendar events, RSVPs, and event locations.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 * Each method includes a TODO comment showing the equivalent Supabase query pattern.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions, filterEventsByRole } from '../fake/userContext'
import type { CalendarEvent, EventRSVP, EventLocation, RSVPStatus, EventType, EventFormData, TicketedEventStatus } from '../../types/calendar'
import {
    getEventById as getFakeEventById,
    getEventsForTeam as getFakeEventsForTeam,
    getEventsForSeason as getFakeEventsForSeason,
    getEventsInDateRange as getFakeEventsInDateRange,
    getEventLocation as getFakeEventLocation,
    getRSVPsForEvent as getFakeRSVPsForEvent,
    getChildRSVPForEvent as getFakeChildRSVPForEvent,
    getAllEvents as getFakeAllEvents,
} from '../fake/fakeEvents'
import { getTeamById } from '../fake/fakeTeams'
import {
    getFakeTicketedEventByCalendarEventId,
    getFakeTicketedEventById,
    getFakeTicketingEvents,
} from '../fake/fakeTicketingEvents'
import { getChildrenForUserId, getAssignedTeamsForCoach, getChildTeamMemberships } from '../fake/relationships'
import { t } from '@/i18n'
import { buildEventQuery, buildCalendarEventQuery } from './queryHelpers'
import { normalizeSupabaseResponse, createServiceResponse } from './responseHelpers'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'
import { validateDeleteEvent, EVENT_ERRORS } from '../../utils/eventValidation'
import { debug } from '../../lib/debug'

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

function buildPermissions(context: UserContext): PermissionSet {
    const childIds = getChildrenForUserId(context.userId)
    const assignedTeamIds = context.roles.includes('coach')
        ? getAssignedTeamsForCoach(context.userId)
        : []

    return calculatePermissions(context, assignedTeamIds, childIds, [])
}

// ============================================================================
// Type Mappers
// ============================================================================

/**
 * Map Supabase event row to CalendarEvent domain type
 * Handles RSVP config transformation and ensures arrays exist
 */
function mapSupabaseEventToCalendarEvent(event: any): CalendarEvent {
    // Ensure required fields exist - team_id and season_id are now optional
    if (!event.id || !event.title || !event.type) {
        throw new Error('Invalid event data: missing required fields')
    }

    // Ensure rsvp_config always exists with safe defaults
    const rsvpConfig = {
        enabled: event.rsvp_enabled ?? false,
        type: (event.rsvp_enabled && event.rsvp_type) ? (event.rsvp_type as 'general' | 'athlete') : null
    }

    // Ensure arrays exist even if empty
    const rsvps = event.rsvps || []
    const generalRsvps = event.general_rsvps || []

    return {
        ...event,
        rsvp_config: rsvpConfig,
        rsvps,
        general_rsvps: generalRsvps,
        ticketed_event: event.ticketed_event
            ? (() => {
                const ticketedData = Array.isArray(event.ticketed_event) 
                    ? event.ticketed_event[0] 
                    : event.ticketed_event
                
                return ticketedData ? {
                    id: ticketedData.id,
                    org_id: ticketedData.org_id,
                    team_id: ticketedData.team_id,
                    event_type: ticketedData.event_type,
                    title: ticketedData.title,
                    description: ticketedData.description,
                    starts_at: ticketedData.starts_at,
                    ends_at: ticketedData.ends_at,
                    timezone: ticketedData.timezone,
                    venue_name: ticketedData.venue_name,
                    venue_city: ticketedData.venue_city,
                    venue_state: ticketedData.venue_state,
                    venue_postal_code: ticketedData.venue_postal_code,
                    sales_start_at: ticketedData.sales_start_at,
                    sales_end_at: ticketedData.sales_end_at,
                    status: ticketedData.status,
                    visibility: ticketedData.visibility ?? null,
                    ticket_banner_url: ticketedData.ticket_banner_url || null,
                    ticket_types: Array.isArray(ticketedData.ticket_types)
                        ? ticketedData.ticket_types.map((tt: any) => ({
                            id: tt.id,
                            name: tt.name,
                            price_cents: tt.price_cents ?? 0,
                            currency: tt.currency ?? 'USD',
                            capacity_total: tt.capacity_total ?? null,
                            capacity_remaining: tt.capacity_remaining ?? null,
                            sort_order: tt.sort_order ?? null,
                            is_active: tt.is_active ?? null,
                        }))
                        : [],
                } : null
            })()
            : null,
    } as CalendarEvent
}

/**
 * Map Supabase RSVP row to EventRSVP domain type
 * Ensures all required fields are present
 */
function mapSupabaseRSVPToEventRSVP(rsvp: any): EventRSVP {
    const athleteId = rsvp.athlete_id ?? rsvp.child_id
    if (!rsvp.id || !rsvp.event_id || !athleteId) {
        throw new Error('Invalid RSVP data: missing required fields')
    }
    return {
        id: rsvp.id,
        event_id: rsvp.event_id,
        athlete_id: athleteId,
        status: rsvp.status || 'unknown',
        note: rsvp.note || null,
        responded_at: rsvp.responded_at || null,
        responded_by_user_id: rsvp.responded_by_user_id || null,
        created_at: rsvp.created_at || new Date().toISOString(),
        updated_at: rsvp.updated_at || new Date().toISOString(),
        child: rsvp.athlete ? {
            id: rsvp.athlete.id,
            first_name: rsvp.athlete.first_name || '',
            last_name: rsvp.athlete.last_name || '',
        } : undefined,
    } as EventRSVP
}

/**
 * Map Supabase event location row to EventLocation domain type
 */
function mapSupabaseLocationToEventLocation(location: any): EventLocation {
    return location as EventLocation
}

// ============================================================================
// Event Service Functions
// ============================================================================

export interface EventsQueryParams {
    // Existing params
    teamId?: string
    seasonId?: string
    startDate?: Date
    endDate?: Date
    includeCancelled?: boolean
    limit?: number

    // New pagination params
    offset?: number

    // Search
    search?: string

    // Filters
    teamIds?: string[]
    seasonIds?: string[]
    sportIds?: string[]
    eventTypes?: EventType[]
    status?: ('scheduled' | 'cancelled' | 'completed' | 'postponed')[]
    visibleToFans?: boolean
    locationSearch?: string

    // Time context
    timeContext?: 'upcoming' | 'past' | 'all'

    // Sorting
    orderBy?: string
    order?: 'asc' | 'desc'
    
    // Performance optimization
    lightweight?: boolean  // Use lightweight query for calendar grid views
}

/**
 * Lightweight calendar event type - only essential fields for calendar display
 */
export interface CalendarEventSummary {
    id: string
    team_id: string | null
    season_id: string | null
    title: string
    type: EventType
    start_time: string
    end_time: string
    location: string | null
    arrival_time: string | null
    timezone: string
    is_cancelled: boolean
    requires_travel: boolean
    rsvp_enabled: boolean
    rsvp_type: string | null
    visibility: string
    team: { id: string; name: string; org_id: string } | null
    season: { id: string; name: string } | null
}

/**
 * Get events optimized for calendar grid/list display (lightweight query)
 * Uses minimal joins for fast loading - no RSVPs, tickets, or full event details
 * 
 * For full event details, use getEvents() or getEventById() instead
 */
function calendarEventToSummary(e: CalendarEvent): CalendarEventSummary {
    return {
        id: e.id,
        team_id: e.team_id,
        season_id: e.season_id,
        title: e.title,
        type: e.type,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        arrival_time: e.arrival_time,
        timezone: e.timezone,
        is_cancelled: e.is_cancelled,
        requires_travel: e.requires_travel ?? false,
        rsvp_enabled: e.rsvp_config?.enabled ?? false,
        rsvp_type: e.rsvp_config?.type ?? null,
        visibility: (e as { visibility?: string }).visibility ?? 'internal',
        team: e.team ?? null,
        season: e.season ?? null,
    }
}

function getBaseFakeEvents(params: EventsQueryParams): CalendarEvent[] {
    if (params.startDate && params.endDate) {
        return getFakeEventsInDateRange(params.startDate, params.endDate)
    }
    if (params.teamId) {
        return getFakeEventsForTeam(params.teamId)
    }
    if (params.seasonId) {
        return getFakeEventsForSeason(params.seasonId)
    }
    return getFakeAllEvents()
}

function deriveFakeEventStatus(event: CalendarEvent, now: Date): 'scheduled' | 'cancelled' | 'completed' {
    if (event.is_cancelled) return 'cancelled'
    if (new Date(event.end_time).getTime() < now.getTime()) return 'completed'
    return 'scheduled'
}

function normalizeTicketedEventSummary(ticketedEvent: any): NonNullable<CalendarEvent['ticketed_event']> {
    return {
        id: ticketedEvent.id,
        org_id: ticketedEvent.org_id,
        team_id: ticketedEvent.team_id ?? null,
        event_type: ticketedEvent.event_type ?? null,
        title: ticketedEvent.title,
        description: ticketedEvent.description ?? null,
        starts_at: ticketedEvent.starts_at,
        ends_at: ticketedEvent.ends_at,
        timezone: ticketedEvent.timezone ?? null,
        venue_name: ticketedEvent.venue_name ?? null,
        venue_city: ticketedEvent.venue_city ?? null,
        venue_state: ticketedEvent.venue_state ?? null,
        venue_postal_code: ticketedEvent.venue_postal_code ?? null,
        sales_start_at: ticketedEvent.sales_start_at ?? null,
        sales_end_at: ticketedEvent.sales_end_at ?? null,
        status: ticketedEvent.status,
        visibility: ticketedEvent.visibility ?? null,
        event_description: ticketedEvent.event_description ?? null,
        ticket_banner_url: ticketedEvent.ticket_banner_url ?? null,
        ticket_types: (ticketedEvent.ticket_types ?? []).map((ticketType: any) => ({
            id: ticketType.id,
            name: ticketType.name,
            description: ticketType.description ?? null,
            price_cents: ticketType.price_cents ?? 0,
            currency: ticketType.currency ?? 'USD',
            capacity_total: ticketType.capacity_total ?? null,
            capacity_remaining: ticketType.capacity_remaining ?? null,
            sort_order: ticketType.sort_order ?? null,
            is_active: ticketType.is_active ?? null,
        })),
    }
}

function toSyntheticEventLocation(eventId: string, ticketedEvent: any): EventLocation {
    return {
        id: `loc-ticketing-${eventId}`,
        event_id: eventId,
        venue_name: ticketedEvent.venue_name ?? null,
        address_line1: ticketedEvent.venue_address_line1 ?? null,
        address_line2: ticketedEvent.venue_address_line2 ?? null,
        city: ticketedEvent.venue_city ?? null,
        state: ticketedEvent.venue_state ?? null,
        postal_code: ticketedEvent.venue_postal_code ?? null,
        place_id: null,
        country: ticketedEvent.venue_country ?? 'US',
        latitude: null,
        longitude: null,
        is_tbd: false,
        is_virtual: Boolean(ticketedEvent.venue_is_virtual),
        virtual_link: ticketedEvent.venue_virtual_link ?? null,
        created_at: ticketedEvent.created_at,
        updated_at: ticketedEvent.updated_at,
    }
}

function toFallbackEventLocation(event: CalendarEvent): EventLocation | null {
    if (!event.location?.trim()) return null
    return {
        id: `loc-fallback-${event.id}`,
        event_id: event.id,
        venue_name: event.location.trim(),
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        place_id: null,
        country: 'US',
        latitude: null,
        longitude: null,
        is_tbd: false,
        is_virtual: false,
        virtual_link: null,
        created_at: event.created_at,
        updated_at: event.updated_at,
    }
}

function withFakeEventRelations(event: CalendarEvent, orgId: string): CalendarEvent {
    const ticketedEvent = getFakeTicketedEventByCalendarEventId(event.id, orgId)
    const persistedLocation = getFakeEventLocation(event.id)
    const syntheticLocation = ticketedEvent ? toSyntheticEventLocation(event.id, ticketedEvent) : null
    const fallbackLocation = toFallbackEventLocation(event)

    return {
        ...event,
        event_location: persistedLocation ?? syntheticLocation ?? fallbackLocation,
        ticketed_event: ticketedEvent ? normalizeTicketedEventSummary(ticketedEvent) : null,
    }
}

function createSyntheticCalendarEventFromTicketing(calendarEventId: string, ticketedEvent: any): CalendarEvent {
    const start = new Date(ticketedEvent.starts_at)
    const arrival = new Date(start.getTime() - 45 * 60 * 1000).toISOString()
    const locationParts = [ticketedEvent.venue_name, ticketedEvent.venue_city, ticketedEvent.venue_state]
        .filter(Boolean)
        .join(', ')

    const mappedType: EventType =
        ticketedEvent.event_type === 'game'
            ? 'game'
            : ticketedEvent.event_type === 'tournament'
                ? 'tournament'
                : ticketedEvent.event_type === 'fundraiser' || ticketedEvent.event_type === 'social_event'
                    ? 'social'
                    : ticketedEvent.event_type === 'travel'
                        ? 'travel'
                        : 'meeting'

    const isCancelled = ticketedEvent.status === 'cancelled'

    return {
        id: calendarEventId,
        team_id: ticketedEvent.team_id ?? null,
        season_id: ticketedEvent.season_id ?? null,
        title: ticketedEvent.title,
        type: mappedType,
        start_time: ticketedEvent.starts_at,
        end_time: ticketedEvent.ends_at,
        arrival_time: arrival,
        timezone: ticketedEvent.timezone ?? 'America/Chicago',
        location: locationParts || ticketedEvent.venue_name || null,
        notes: ticketedEvent.description ?? ticketedEvent.event_description ?? null,
        uniform_notes: null,
        equipment_notes: null,
        weather_dependent: false,
        external_link: null,
        is_cancelled: isCancelled,
        cancellation_reason: isCancelled ? 'Event cancelled' : null,
        cancelled_at: isCancelled ? ticketedEvent.updated_at : null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: ticketedEvent.created_at,
        updated_at: ticketedEvent.updated_at,
        event_location: toSyntheticEventLocation(calendarEventId, ticketedEvent),
        ticketed_event: normalizeTicketedEventSummary(ticketedEvent),
        team: ticketedEvent.team_id
            ? {
                id: ticketedEvent.team_id,
                name: 'Ticketed Team Event',
                org_id: ticketedEvent.org_id,
            }
            : undefined,
    }
}

function applyFakeEventFilters(
    events: CalendarEvent[],
    params: EventsQueryParams,
    applyPagination: boolean,
): CalendarEvent[] {
    const now = new Date()
    let filtered = [...events]

    if (!params.includeCancelled) {
        filtered = filtered.filter((event) => !event.is_cancelled)
    }

    if (params.timeContext === 'upcoming') {
        filtered = filtered.filter((event) => new Date(event.start_time).getTime() >= now.getTime())
    } else if (params.timeContext === 'past') {
        filtered = filtered.filter((event) => new Date(event.start_time).getTime() < now.getTime())
    }

    if (params.startDate) {
        const startMs = params.startDate.getTime()
        filtered = filtered.filter((event) => new Date(event.start_time).getTime() >= startMs)
    }

    if (params.endDate) {
        const endMs = params.endDate.getTime()
        filtered = filtered.filter((event) => new Date(event.start_time).getTime() <= endMs)
    }

    if (params.teamIds && params.teamIds.length > 0) {
        const allowed = new Set(params.teamIds)
        filtered = filtered.filter((event) => !!event.team_id && allowed.has(event.team_id))
    }

    if (params.seasonIds && params.seasonIds.length > 0) {
        const allowed = new Set(params.seasonIds)
        filtered = filtered.filter((event) => !!event.season_id && allowed.has(event.season_id))
    }

    if (params.sportIds && params.sportIds.length > 0) {
        const allowed = new Set(params.sportIds)
        filtered = filtered.filter((event) => {
            const team = event.team_id ? getTeamById(event.team_id) : null
            return !!team?.sport_id && allowed.has(team.sport_id)
        })
    }

    if (params.eventTypes && params.eventTypes.length > 0) {
        const allowed = new Set(params.eventTypes)
        filtered = filtered.filter((event) => allowed.has(event.type))
    }

    if (params.status && params.status.length > 0) {
        const allowed = new Set(params.status)
        filtered = filtered.filter((event) => allowed.has(deriveFakeEventStatus(event, now)))
    }

    if (params.visibleToFans) {
        filtered = filtered.filter((event) => ((event as { visibility?: string | null }).visibility ?? 'public') === 'public')
    }

    if (params.search && params.search.trim() !== '') {
        const query = params.search.trim().toLowerCase()
        filtered = filtered.filter((event) => {
            const haystack = [
                event.title,
                event.notes,
                event.location,
                event.uniform_notes,
                event.equipment_notes,
                event.team?.name,
                event.season?.name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            return haystack.includes(query)
        })
    }

    if (params.locationSearch && params.locationSearch.trim() !== '') {
        const query = params.locationSearch.trim().toLowerCase()
        filtered = filtered.filter((event) => {
            const locationText = [
                event.location,
                event.event_location?.venue_name,
                event.event_location?.address_line1,
                event.event_location?.city,
                event.event_location?.state,
                event.event_location?.postal_code,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            return locationText.includes(query)
        })
    }

    const orderBy = params.orderBy || 'start_time'
    const sortDirection = params.order === 'desc' ? -1 : 1
    filtered.sort((a, b) => {
        const timeValue = (value: string | null | undefined) => (value ? new Date(value).getTime() : 0)

        let comparison = 0
        switch (orderBy) {
            case 'title':
                comparison = a.title.localeCompare(b.title)
                break
            case 'type':
                comparison = a.type.localeCompare(b.type)
                break
            case 'created_at':
                comparison = timeValue(a.created_at) - timeValue(b.created_at)
                break
            case 'updated_at':
                comparison = timeValue(a.updated_at) - timeValue(b.updated_at)
                break
            case 'end_time':
                comparison = timeValue(a.end_time) - timeValue(b.end_time)
                break
            case 'arrival_time':
                comparison = timeValue(a.arrival_time) - timeValue(b.arrival_time)
                break
            case 'start_time':
            default:
                comparison = timeValue(a.start_time) - timeValue(b.start_time)
                break
        }
        return comparison * sortDirection
    })

    if (!applyPagination) {
        return filtered
    }

    if (params.offset !== undefined && params.limit !== undefined) {
        return filtered.slice(params.offset, params.offset + params.limit)
    }
    if (params.limit !== undefined) {
        return filtered.slice(0, params.limit)
    }
    return filtered
}

export async function getCalendarEvents(
    context: UserContext,
    params: Omit<EventsQueryParams, 'lightweight'> = {}
): Promise<{ data: CalendarEventSummary[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            const childTeamMemberships = getChildTeamMemberships()
            let events: CalendarEvent[]
            if (params.startDate && params.endDate) {
                events = getFakeEventsInDateRange(params.startDate, params.endDate)
            } else {
                events = getFakeAllEvents()
            }
            if (!params.includeCancelled) {
                events = events.filter((e) => !e.is_cancelled)
            }
            events = filterEventsByRole(events, permissions, childTeamMemberships, context.orgId)
            events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            const data = events.map(calendarEventToSummary)
            return { data, error: null }
        } catch (err) {
            console.error('getCalendarEvents (fake) error:', err)
            const classifiedError = classifySupabaseError(err instanceof Error ? err : new Error(String(err)))
            return { data: [], error: classifiedError }
        }
    }

    // Real Supabase implementation with lightweight query
    try {
        let query = buildCalendarEventQuery(supabase)

        // Apply time context
        const now = new Date()
        if (params.timeContext === 'upcoming') {
            query = query.gte('start_time', now.toISOString())
        } else if (params.timeContext === 'past') {
            query = query.lt('start_time', now.toISOString())
        }

        // Apply date range filters
        if (params.startDate) {
            query = query.gte('start_time', params.startDate.toISOString())
        }

        if (params.endDate) {
            query = query.lte('start_time', params.endDate.toISOString())
        }

        // Apply team filters
        if (params.teamId) {
            query = query.eq('team_id', params.teamId)
        }
        if (params.teamIds && params.teamIds.length > 0) {
            query = query.in('team_id', params.teamIds)
        }

        // Apply season filters
        if (params.seasonId) {
            query = query.eq('season_id', params.seasonId)
        }
        if (params.seasonIds && params.seasonIds.length > 0) {
            query = query.in('season_id', params.seasonIds)
        }

        // Apply event type filter
        if (params.eventTypes && params.eventTypes.length > 0) {
            query = query.in('type', params.eventTypes)
        }

        // Apply status filter
        if (params.status && params.status.length > 0) {
            const hasScheduled = params.status.includes('scheduled')
            const hasCancelled = params.status.includes('cancelled')
            const hasCompleted = params.status.includes('completed')

            if (hasCancelled && !hasScheduled && !hasCompleted) {
                query = query.eq('is_cancelled', true)
            } else if (!hasCancelled && (hasScheduled || hasCompleted)) {
                query = query.eq('is_cancelled', false)
            }
        } else if (!params.includeCancelled) {
            query = query.eq('is_cancelled', false)
        }

        if (params.visibleToFans) {
            query = query.eq('visibility', 'public')
        }

        // Apply sorting - use index-friendly ordering
        const sortColumn = params.orderBy || 'start_time'
        const sortOrder = params.order === 'desc' ? { ascending: false } : { ascending: true }
        query = query.order(sortColumn, sortOrder)

        // Apply pagination
        if (params.offset !== undefined && params.limit) {
            query = query.range(params.offset, params.offset + params.limit - 1)
        } else if (params.limit) {
            query = query.limit(params.limit)
        }

        const { data, error } = await query

        if (error) throw error

        return { data: (data || []) as CalendarEventSummary[], error: null }
    } catch (err) {
        console.error('getCalendarEvents error:', err)
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

/**
 * Get events for the current user based on their permissions (enforced by RLS)
 */
export async function getEvents(
    context: UserContext,
    params: EventsQueryParams = {}
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
    console.groupCollapsed(`%cgetEvents: ${JSON.stringify(params)}`, 'color: #666; font-weight: bold;');
    debug.data('EventsService.getEvents', 'Request', { context: { userId: context.userId, orgId: context.orgId }, params })
    debug.perf.start('eventsService.getEvents')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()

            const permissions = buildPermissions(context)
            const childTeamMemberships = getChildTeamMemberships()
            const fakeOrgId = DEMO_ORG_A_ID
            const baseEvents = getBaseFakeEvents(params).map((event) => withFakeEventRelations(event, fakeOrgId))
            const visibleEvents = filterEventsByRole(baseEvents, permissions, childTeamMemberships, fakeOrgId)
            const filteredEvents = applyFakeEventFilters(visibleEvents, params, true)

            return { data: filteredEvents, error: null }
        }

        // Real Supabase implementation - NO FALLBACK
        let query = buildEventQuery(supabase)

        // Apply time context
        const now = new Date()
        if (params.timeContext === 'upcoming') {
            query = query.gte('start_time', now.toISOString())
        } else if (params.timeContext === 'past') {
            query = query.lt('start_time', now.toISOString())
        }

        // Apply date range filters
        if (params.startDate) {
            query = query.gte('start_time', params.startDate.toISOString())
        }

        if (params.endDate) {
            query = query.lte('start_time', params.endDate.toISOString())
        }

        // Apply team filters
        if (params.teamId) {
            query = query.eq('team_id', params.teamId)
        }
        if (params.teamIds && params.teamIds.length > 0) {
            query = query.in('team_id', params.teamIds)
        }

        // Apply season filters
        if (params.seasonId) {
            query = query.eq('season_id', params.seasonId)
        }
        if (params.seasonIds && params.seasonIds.length > 0) {
            query = query.in('season_id', params.seasonIds)
        }

        // Apply event type filter
        if (params.eventTypes && params.eventTypes.length > 0) {
            query = query.in('type', params.eventTypes)
        }

        // Apply status filter
        if (params.status && params.status.length > 0) {
            const hasScheduled = params.status.includes('scheduled')
            const hasCancelled = params.status.includes('cancelled')
            const hasCompleted = params.status.includes('completed')

            if (hasCancelled && !hasScheduled && !hasCompleted) {
                query = query.eq('is_cancelled', true)
            } else if (!hasCancelled && (hasScheduled || hasCompleted)) {
                query = query.eq('is_cancelled', false)
            }
            // If both or neither, don't filter by is_cancelled
        } else if (!params.includeCancelled) {
            query = query.eq('is_cancelled', false)
        }

        if (params.visibleToFans) {
            query = query.eq('visibility', 'public')
        }

        // Apply search (title, notes, venue_name)
        if (params.search && params.search.trim() !== '') {
            const searchTerm = `%${params.search.trim()}%`
            query = query.or(`title.ilike.${searchTerm},notes.ilike.${searchTerm}`)
        }

        // Apply sorting
        const sortColumn = params.orderBy || 'start_time'
        const sortOrder = params.order === 'desc' ? { ascending: false } : { ascending: true }
        query = query.order(sortColumn, sortOrder)

        // Apply pagination
        if (params.offset !== undefined && params.limit) {
            query = query.range(params.offset, params.offset + params.limit - 1)
        } else if (params.limit) {
            query = query.limit(params.limit)
        }

        const { data, error, count: _count } = await query

        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const mappedEvents = Array.isArray(normalizedData)
            ? normalizedData.map(mapSupabaseEventToCalendarEvent)
            : []

            debug.perf.end('eventsService.getEvents')
            debug.data('EventsService.getEvents', 'Response', { eventCount: mappedEvents.length })
            console.groupEnd()
            return { data: mappedEvents, error: null }
        } catch (err) {
            debug.perf.end('eventsService.getEvents')
            debug.error('EventsService.getEvents', 'Error', { error: err, params, context: { userId: context.userId, orgId: context.orgId } })
            const classifiedError = classifySupabaseError(err)
            console.groupEnd()
            return { data: [], error: classifiedError }
        }
}

/**
 * Get total count of events matching the query parameters (for pagination)
 */
export async function getEventsCount(
    context: UserContext,
    params: EventsQueryParams = {}
): Promise<{ data: number; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            const childTeamMemberships = getChildTeamMemberships()
            const baseEvents = getBaseFakeEvents(params).map((event) => withFakeEventRelations(event, context.orgId))
            const visibleEvents = filterEventsByRole(baseEvents, permissions, childTeamMemberships, context.orgId)
            const filteredEvents = applyFakeEventFilters(visibleEvents, params, false)

            return { data: filteredEvents.length, error: null }
        } catch (err) {
            console.error('getEventsCount error:', err)
            return { data: 0, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation
    try {
        let query = supabase.from('events').select('*', { count: 'exact', head: true })

        // Apply same filters as getEvents
        const now = new Date()
        if (params.timeContext === 'upcoming') {
            query = query.gte('start_time', now.toISOString())
        } else if (params.timeContext === 'past') {
            query = query.lt('start_time', now.toISOString())
        }

        if (params.startDate) {
            query = query.gte('start_time', params.startDate.toISOString())
        }
        if (params.endDate) {
            query = query.lte('start_time', params.endDate.toISOString())
        }
        if (params.teamId) {
            query = query.eq('team_id', params.teamId)
        }
        if (params.teamIds && params.teamIds.length > 0) {
            query = query.in('team_id', params.teamIds)
        }
        if (params.seasonId) {
            query = query.eq('season_id', params.seasonId)
        }
        if (params.seasonIds && params.seasonIds.length > 0) {
            query = query.in('season_id', params.seasonIds)
        }
        if (params.eventTypes && params.eventTypes.length > 0) {
            query = query.in('type', params.eventTypes)
        }
        if (params.status && params.status.length > 0) {
            const hasScheduled = params.status.includes('scheduled')
            const hasCancelled = params.status.includes('cancelled')
            const hasCompleted = params.status.includes('completed')

            if (hasCancelled && !hasScheduled && !hasCompleted) {
                query = query.eq('is_cancelled', true)
            } else if (!hasCancelled && (hasScheduled || hasCompleted)) {
                query = query.eq('is_cancelled', false)
            }
        } else if (!params.includeCancelled) {
            query = query.eq('is_cancelled', false)
        }
        if (params.visibleToFans) {
            query = query.eq('visibility', 'public')
        }
        if (params.search && params.search.trim() !== '') {
            const searchTerm = `%${params.search.trim()}%`
            query = query.or(`title.ilike.${searchTerm},notes.ilike.${searchTerm}`)
        }

        const { count, error } = await query

        if (error) throw error

        return { data: count || 0, error: null }
    } catch (err) {
        console.error('getEventsCount error:', err)
        const classifiedError = classifySupabaseError(err)
        return { data: 0, error: classifiedError }
    }
}


/**
 * Get a single event by ID
 */
export async function getEventDetails(
    context: UserContext,
    eventId: string
): Promise<{ data: CalendarEvent | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const permissions = buildPermissions(context)
            const childTeamMemberships = getChildTeamMemberships()
            const event = getFakeEventById(eventId)

            if (event) {
                const enrichedEvent = withFakeEventRelations(event, context.orgId)
                const filtered = filterEventsByRole([enrichedEvent], permissions, childTeamMemberships, context.orgId)
                return { data: filtered[0] ?? null, error: null }
            }

            const ticketedDirect = getFakeTicketedEventById(eventId, context.orgId)
            const ticketedByCalendarId = getFakeTicketedEventByCalendarEventId(eventId, context.orgId)
            const ticketedFallback =
                ticketedDirect ??
                ticketedByCalendarId ??
                getFakeTicketingEvents(context.orgId, { page: 1, perPage: 300 }).data.find((candidate) => candidate.event_id === eventId) ??
                null

            if (!ticketedFallback) {
                return { data: null, error: null }
            }

            const syntheticEventId =
                ticketedDirect && eventId === ticketedDirect.id
                    ? eventId
                    : ticketedFallback.event_id || eventId || `event-${ticketedFallback.id}`
            const syntheticEvent = createSyntheticCalendarEventFromTicketing(syntheticEventId, ticketedFallback)
            const filtered = filterEventsByRole([syntheticEvent], permissions, childTeamMemberships, context.orgId)

            if (filtered.length === 0) {
                return { data: null, error: null }
            }

            return { data: filtered[0], error: null }
        } catch (err) {
            console.error('getEventDetails error:', err)
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        const query: any = buildEventQuery(supabase)
        const { data, error } = await query.eq('id', eventId).single()

        if (error) throw error

        // Debug: Log raw Supabase response
        console.log('[eventsService] Raw Supabase response:', {
            eventId,
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            hasEventLocation: !!data?.event_location,
            eventLocation: data?.event_location,
            hasTicketedEvent: !!data?.ticketed_event,
            ticketedEvent: data?.ticketed_event,
            fullData: data,
        })

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, false)
        console.log('[eventsService] Normalized data:', {
            hasNormalized: !!normalizedData,
            normalizedKeys: normalizedData ? Object.keys(normalizedData) : [],
            hasEventLocation: !!normalizedData?.event_location,
            eventLocation: normalizedData?.event_location,
        })
        if (!normalizedData) {
            return { data: null, error: null }
        }

        const mappedEvent = mapSupabaseEventToCalendarEvent(normalizedData)
        return { data: mappedEvent, error: null }
    } catch (err) {
        console.error('getEventDetails error:', err)
        const classifiedError = classifySupabaseError(err, 'Event')
        return { data: null, error: classifiedError }
    }
}

/**
 * Get upcoming events for the current user
 */
export async function getUpcomingEventsForUser(
    context: UserContext,
    limit: number = 10
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return getEvents(context, {
        startDate: now,
        endDate: thirtyDaysFromNow,
        includeCancelled: false,
        limit,
    })
}

// ============================================================================
// RSVP Service Functions
// ============================================================================

/**
 * Get RSVPs for an event
 */
export async function getEventRSVPs(
    context: UserContext,
    eventId: string
): Promise<{ data: EventRSVP[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const rsvps = getFakeRSVPsForEvent(eventId)

            // Filter by permissions - parents only see their children's RSVPs
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData && permissions.canViewOwnChildrenData) {
                return {
                    data: rsvps.filter((r) => permissions.ownedChildIds.includes(r.athlete_id)),
                    error: null,
                }
            }

            return { data: rsvps, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        const { data, error } = await supabase
            .from('event_rsvps')
            .select(`
                *,
                athlete:athletes(id, first_name, last_name)
            `)
            .eq('event_id', eventId)

        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const mappedRSVPs = Array.isArray(normalizedData)
            ? normalizedData.map(mapSupabaseRSVPToEventRSVP)
            : []

        return { data: mappedRSVPs, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

/**
 * Get RSVP status for a specific child and event
 */
export async function getAthleteEventRSVP(
    context: UserContext,
    eventId: string,
    childId: string
): Promise<{ data: EventRSVP | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            // Check permissions - parents can only see their own children's RSVPs
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData && !permissions.ownedChildIds.includes(childId)) {
                return { data: null, error: null }
            }

            const rsvp = getFakeChildRSVPForEvent(eventId, childId)
            return { data: rsvp ?? null, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        const { data, error } = await supabase
            .from('event_rsvps')
            .select('*')
            .eq('event_id', eventId)
            .eq('athlete_id', childId)
            .maybeSingle()

        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, false)
        if (!normalizedData) {
            return { data: null, error: null }
        }

        const mappedRSVP = mapSupabaseRSVPToEventRSVP(normalizedData)
        return { data: mappedRSVP, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: null, error: classifiedError }
    }
}

/**
 * Update RSVP for a child
 */
export async function updateRSVP(
    context: UserContext,
    eventId: string,
    childId: string,
    status: RSVPStatus,
    note?: string
): Promise<{ data: EventRSVP | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            // Check permissions - parents can only update their own children's RSVPs
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData && !permissions.ownedChildIds.includes(childId)) {
                return { data: null, error: new Error(t('errors.cannotUpdateRsvp')) }
            }

            // In fake data mode, we simulate the update by returning the updated RSVP
            // The fake data module doesn't have a mutation function, so we return what would be updated
            const existing = getFakeChildRSVPForEvent(eventId, childId)
            const updated: EventRSVP = existing
                ? {
                    ...existing,
                    status,
                    note: note ?? null,
                    responded_at: new Date().toISOString(),
                    responded_by_user_id: context.userId,
                    updated_at: new Date().toISOString(),
                    created_at: existing.created_at,
                }
                : {
                    id: `rsvp-${eventId}-${childId}`,
                    event_id: eventId,
                    athlete_id: childId,
                    status,
                    note: note ?? null,
                    responded_at: new Date().toISOString(),
                    responded_by_user_id: context.userId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    child: undefined,
                }

            return { data: updated, error: null }
        } catch (err) {
            console.error('updateRSVP error:', err)
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        type EventRSVPUpsert = Database['public']['Tables']['event_rsvps']['Insert']
        const upsertData = {
            event_id: eventId,
            athlete_id: childId,
            status: status,
            note: note ?? null,
            responded_at: new Date().toISOString(),
            responded_by_user_id: context.userId
        } satisfies EventRSVPUpsert
        const { data, error } = await supabase
            .from('event_rsvps')
            .upsert(upsertData, { onConflict: 'event_id,athlete_id' })
            .select()
            .single()

        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, false)
        if (!normalizedData) {
            return { data: null, error: null }
        }

        const mappedRSVP = mapSupabaseRSVPToEventRSVP(normalizedData)
        return { data: mappedRSVP, error: null }
    } catch (err) {
        console.error('updateRSVP error:', err)
        const classifiedError = classifySupabaseError(err)
        return { data: null, error: classifiedError }
    }
}

// ============================================================================
// Event Location Service Functions
// ============================================================================

/**
 * Get location for an event
 */
export async function getLocationForEvent(
    eventId: string
): Promise<{ data: EventLocation | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const location = getFakeEventLocation(eventId)
            return { data: location ?? null, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        const { data, error } = await supabase
            .from('event_locations')
            .select('*')
            .eq('event_id', eventId)
            .maybeSingle()

        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, false)
        if (!normalizedData) {
            return { data: null, error: null }
        }

        const mappedLocation = mapSupabaseLocationToEventLocation(normalizedData)
        return createServiceResponse(mappedLocation, null)
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return createServiceResponse<EventLocation | null>(null, classifiedError)
    }

    try {
        await simulateDelay()

        const location = getFakeEventLocation(eventId)
        return { data: location ?? null, error: null }
    } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        return { data: null, error: error as Error | null }
    }
}

/**
 * Create a new event
 */
export async function createEvent(
    context: UserContext,
    formData: EventFormData
): Promise<{ data: CalendarEvent | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateEvent: ${formData.title}`, 'color: #666; font-weight: bold;');
    debug.flow('EventsService.createEvent', 'Started', { eventTitle: formData.title, context: { userId: context.userId, orgId: context.orgId } })
    debug.perf.start('eventsService.createEvent')

    if (USE_FAKE_DATA) {
        debug.flow('EventsService.createEvent', 'Skipped - demo mode')
        console.groupEnd()
        return { data: null, error: new Error('Cannot create events in demo mode') }
    }

    try {
        // Validate inputs
        const start = new Date(formData.start_time)
        const end = formData.end_time ? new Date(formData.end_time) : new Date(start)
        if (!formData.end_time) end.setHours(23, 59, 59, 999)

        if (end <= start) throw new Error('End time must be after start time')

        const arrival = formData.arrival_time ? new Date(formData.arrival_time) : null
        if (arrival && arrival >= start) throw new Error('Arrival time must be before start time')

        // 1. Insert Event
        type EventInsert = Database['public']['Tables']['events']['Insert']
        const eventInsertData: EventInsert = {
            title: formData.title,
            type: formData.type,
            org_id: context.orgId,
            team_id: (formData.team_id || null) as unknown as EventInsert['team_id'],
            season_id: (formData.season_id || null) as unknown as EventInsert['season_id'],
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            arrival_time: arrival ? arrival.toISOString() : null,
            timezone: formData.timezone,
            notes: formData.notes,
            uniform_notes: formData.uniform_notes,
            equipment_notes: formData.equipment_notes,
            weather_dependent: formData.weather_dependent,
            external_link: formData.external_link,
            rsvp_enabled: formData.rsvp_enabled,
            rsvp_type: formData.rsvp_enabled ? formData.rsvp_type : null,
            created_by_user_id: context.userId
        }

        const { data: eventData, error: insertError } = await supabase
            .from('events')
            .insert(eventInsertData)
            .select()
            .single()

        if (insertError) throw insertError
        if (!eventData) throw new Error('No data returned from event creation')

        // 2. Insert Location
        type LocationInsert = Database['public']['Tables']['event_locations']['Insert']
        const locationData: LocationInsert = {
            event_id: eventData.id,
            venue_name: formData.location.venue_name || null,
            address_line1: formData.location.address_line1 || null,
            city: formData.location.city || null,
            state: formData.location.state || null,
            postal_code: formData.location.postal_code || null,
            place_id: formData.location.place_id || null,
            latitude: formData.location.latitude ? parseFloat(formData.location.latitude) : null,
            longitude: formData.location.longitude ? parseFloat(formData.location.longitude) : null,
            is_tbd: formData.location.is_tbd,
            is_virtual: formData.location.is_virtual,
            virtual_link: formData.location.virtual_link || null
        }

        const { error: locError } = await supabase.from('event_locations').insert(locationData)
        if (locError) {
            console.error('Location save error', locError)
            // Continue even if location fails, but log it
        }

        // 3. Handle Recurring
        if (formData.recurring?.enabled) {
            type RecurringPatternInsert = Database['public']['Tables']['recurring_event_patterns']['Insert']
            const recurData: RecurringPatternInsert = {
                parent_event_id: eventData.id,
                frequency: formData.recurring.frequency as Database['public']['Enums']['recurrence_frequency'],
                days_of_week: formData.recurring.days_of_week.length > 0 ? formData.recurring.days_of_week : [start.getDay()],
                end_date: formData.recurring.end_date || null,
                max_occurrences: formData.recurring.max_occurrences ? parseInt(formData.recurring.max_occurrences) : null
            }
            const { error: recurError } = await supabase.from('recurring_event_patterns').insert(recurData)
            if (recurError) throw recurError
        }

        // 4. Handle Ticketing
        if (formData.ticketing?.is_ticketed) {
            // Use org_id from context (required for all events)
            const orgId = context.orgId
            if (!orgId) throw new Error('Organization ID is required for ticketed events.')

            type TicketedEventInsert = Database['public']['Tables']['ticketed_events']['Insert']
            const ticketedEventData: TicketedEventInsert = {
                event_id: eventData.id,
                org_id: orgId,
                team_id: formData.team_id || null,
                event_type: formData.ticketing.event_type as Database['public']['Enums']['ticketed_event_type'],
                title: formData.title,
                description: formData.ticketing.internal_description?.trim() || formData.notes || null,
                starts_at: start.toISOString(),
                ends_at: end.toISOString(),
                timezone: formData.timezone,
                venue_name: formData.location.venue_name?.trim() || null,
                venue_address_line1: formData.location.address_line1?.trim() || null,
                venue_city: formData.location.city?.trim() || null,
                venue_state: formData.location.state?.trim() || null,
                venue_postal_code: formData.location.postal_code?.trim() || null,
                venue_country: 'US',
                venue_is_virtual: formData.location.is_virtual,
                venue_virtual_link: formData.location.virtual_link?.trim() || null,
                sales_start_at: formData.ticketing.sales_start_at ? new Date(formData.ticketing.sales_start_at).toISOString() : null,
                sales_end_at: formData.ticketing.sales_end_at ? new Date(formData.ticketing.sales_end_at).toISOString() : (end.toISOString()),
                status: formData.ticketing.status as Database['public']['Enums']['ticketed_event_status'],
                event_description: formData.ticketing.event_description?.trim() || null,
                ticket_banner_url: formData.ticketing.ticket_banner_url?.trim() || null,
            }

            const { data: ticketedEvent, error: ticketedEventError } = await supabase
                .from('ticketed_events')
                .insert(ticketedEventData)
                .select('id')
                .single()

            if (ticketedEventError) throw new Error(`Ticketing setup failed: ${ticketedEventError.message}`)
            if (!ticketedEvent) throw new Error('Failed to create ticketed event')

            if (formData.ticketing.ticket_types && formData.ticketing.ticket_types.length > 0) {
                type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert']
                const ticketTypeInserts: TicketTypeInsert[] = formData.ticketing.ticket_types
                    .filter(tt => tt.name.trim() !== '')
                    .map((tt, index) => ({
                        org_id: orgId,
                        ticketed_event_id: ticketedEvent.id,
                        name: tt.name.trim(),
                        price_cents: Math.round(parseFloat(tt.price_dollars) * 100) || 0,
                        currency: 'USD',
                        capacity_total: tt.capacity ? parseInt(tt.capacity) : null,
                        capacity_remaining: tt.capacity ? parseInt(tt.capacity) : null,
                        sort_order: index,
                        is_active: true,
                    }))

                if (ticketTypeInserts.length > 0) {
                    const { error: ttError } = await supabase.from('ticket_types').insert(ticketTypeInserts)
                    if (ttError) throw new Error(`Failed to create ticket types: ${ttError.message}`)
                }
            }
        }

            // Return the full event
            debug.perf.end('eventsService.createEvent')
            debug.flow('EventsService.createEvent', 'Created successfully', { eventId: eventData.id })
            console.groupEnd()
            return getEventDetails(context, eventData.id)

        } catch (err) {
            debug.perf.end('eventsService.createEvent')
            debug.error('EventsService.createEvent', 'Creation failed', { error: err, formData: { title: formData.title, type: formData.type }, context: { userId: context.userId, orgId: context.orgId } })
            const classifiedError = classifySupabaseError(err)
            console.groupEnd()
            return { data: null, error: classifiedError }
        }
}

/**
 * Update an existing event
 */
export async function updateEvent(
    context: UserContext,
    eventId: string,
    formData: EventFormData
): Promise<{ data: CalendarEvent | null; error: Error | null }> {
    console.groupCollapsed(`%cupdateEvent: ${eventId} - ${formData.title}`, 'color: #666; font-weight: bold;');
    debug.flow('EventsService.updateEvent', 'Started', { eventId, eventTitle: formData.title, context: { userId: context.userId, orgId: context.orgId } })
    debug.perf.start('eventsService.updateEvent')

    if (USE_FAKE_DATA) {
        debug.flow('EventsService.updateEvent', 'Skipped - demo mode')
        console.groupEnd()
        return { data: null, error: new Error('Cannot update events in demo mode') }
    }

    try {
        const start = new Date(formData.start_time)
        const end = formData.end_time ? new Date(formData.end_time) : new Date(start)
        if (!formData.end_time) end.setHours(23, 59, 59, 999)

        if (end <= start) throw new Error('End time must be after start time')

        const arrival = formData.arrival_time ? new Date(formData.arrival_time) : null
        if (arrival && arrival >= start) throw new Error('Arrival time must be before start time')

        // 1. Update Event
        type EventUpdate = Database['public']['Tables']['events']['Update']
        const eventUpdateData: EventUpdate = {
            title: formData.title,
            type: formData.type,
            team_id: (formData.team_id || null) as unknown as EventUpdate['team_id'],
            season_id: (formData.season_id || null) as unknown as EventUpdate['season_id'],
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            arrival_time: arrival ? arrival.toISOString() : null,
            timezone: formData.timezone,
            notes: formData.notes,
            uniform_notes: formData.uniform_notes,
            equipment_notes: formData.equipment_notes,
            weather_dependent: formData.weather_dependent,
            external_link: formData.external_link,
            rsvp_enabled: formData.rsvp_enabled,
            rsvp_type: formData.rsvp_enabled ? formData.rsvp_type : null,
        }

        const { error: updateError } = await supabase
            .from('events')
            .update(eventUpdateData)
            .eq('id', eventId)

        if (updateError) throw updateError

        // 2. Update Location
        // First check if location exists
        const { data: existingLoc } = await supabase.from('event_locations').select('id').eq('event_id', eventId).maybeSingle()

        type LocationUpdate = Database['public']['Tables']['event_locations']['Update']
        const locationData: LocationUpdate = {
            venue_name: formData.location.venue_name || null,
            address_line1: formData.location.address_line1 || null,
            city: formData.location.city || null,
            state: formData.location.state || null,
            postal_code: formData.location.postal_code || null,
            place_id: formData.location.place_id || null,
            latitude: formData.location.latitude ? parseFloat(formData.location.latitude) : null,
            longitude: formData.location.longitude ? parseFloat(formData.location.longitude) : null,
            is_tbd: formData.location.is_tbd,
            is_virtual: formData.location.is_virtual,
            virtual_link: formData.location.virtual_link || null
        }

        if (existingLoc) {
            const { error: locError } = await supabase.from('event_locations').update(locationData).eq('event_id', eventId)
            if (locError) console.error('Location update error', locError)
        } else {
            const { error: locInsertError } = await supabase.from('event_locations').insert({ ...locationData, event_id: eventId })
            if (locInsertError) console.error('Location insert error', locInsertError)
        }

        // 3. Update Ticketing
        // Simplified Logic: Upsert ticketed_event, then upsert ticket_types
        // Note: Removing ticket types or complex syncing is omitted for brevity but should be handled in a full implementation
        if (formData.ticketing?.is_ticketed) {
            // Get org_id from team if team_id is provided
            let orgId: string | null = null
            if (formData.team_id) {
                const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', formData.team_id).single()
                if (teamData?.org_id) orgId = teamData.org_id
            }

            if (orgId) {
                const { data: existingTe } = await supabase.from('ticketed_events').select('id').eq('event_id', eventId).maybeSingle()

                type TicketedEventUpsert = Database['public']['Tables']['ticketed_events']['Insert']
                const teData: TicketedEventUpsert = {
                    event_id: eventId,
                    org_id: orgId,
                    team_id: formData.team_id ?? undefined,
                    event_type: formData.ticketing.event_type as Database['public']['Enums']['ticketed_event_type'],
                    title: formData.title,
                    description: formData.ticketing.internal_description?.trim() || formData.notes || null,
                    starts_at: start.toISOString(),
                    ends_at: end.toISOString(),
                    timezone: formData.timezone,
                    venue_name: formData.location.venue_name?.trim() || null,
                    status: formData.ticketing.status as TicketedEventStatus,
                    // ... other fields
                    sales_start_at: formData.ticketing.sales_start_at ? new Date(formData.ticketing.sales_start_at).toISOString() : null,
                    sales_end_at: formData.ticketing.sales_end_at ? new Date(formData.ticketing.sales_end_at).toISOString() : (end.toISOString()),
                    event_description: formData.ticketing.event_description?.trim() || null,
                    ticket_banner_url: formData.ticketing.ticket_banner_url?.trim() || null,

                }

                if (existingTe) {
                    await supabase.from('ticketed_events').update(teData).eq('id', existingTe.id)
                } else {
                    await supabase.from('ticketed_events').insert(teData)
                }
            }
        }

            debug.perf.end('eventsService.updateEvent')
            debug.flow('EventsService.updateEvent', 'Updated successfully', { eventId })
            console.groupEnd()
            return getEventDetails(context, eventId)

        } catch (err) {
            debug.perf.end('eventsService.updateEvent')
            debug.error('EventsService.updateEvent', 'Update failed', { error: err, eventId, formData: { title: formData.title }, context: { userId: context.userId, orgId: context.orgId } })
            const classifiedError = classifySupabaseError(err)
            console.groupEnd()
            return { data: null, error: classifiedError }
        }
}

/**
 * Delete an event
 */
export async function deleteEvent(
    context: UserContext,
    eventId: string,
    organization: { id: string; roles: string[] } | null
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cdeleteEvent: ${eventId}`, 'color: #666; font-weight: bold;');
    debug.flow('EventsService.deleteEvent', 'Started', { eventId, context: { userId: context.userId, orgId: context.orgId } })
    debug.perf.start('eventsService.deleteEvent')

    if (USE_FAKE_DATA) {
        debug.flow('EventsService.deleteEvent', 'Skipped - demo mode')
        console.groupEnd()
        return { error: new Error('Cannot delete events in demo mode') }
    }

    try {
        const { data: eventData } = await supabase
            .from('events')
            .select('id, start_time, is_cancelled, status, type, created_at, org_id, team_id, parent_tournament_id')
            .eq('id', eventId)
            .single()

        if (!eventData) {
            return { error: new Error('Event not found') }
        }

        const validation = await validateDeleteEvent(context, eventData as any, organization as any, false)
        if (!validation.allowed) {
            return { error: new Error(validation.error || EVENT_ERRORS.DELETE_BLOCKED_PERMISSION) }
        }

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId)

            if (error) throw error

            debug.perf.end('eventsService.deleteEvent')
            debug.flow('EventsService.deleteEvent', 'Deleted successfully', { eventId })
            console.groupEnd()
            return { error: null }
        } catch (err) {
            debug.perf.end('eventsService.deleteEvent')
            debug.error('EventsService.deleteEvent', 'Deletion failed', { error: err, eventId, context: { userId: context.userId, orgId: context.orgId } })
            const classifiedError = classifySupabaseError(err)
            console.groupEnd()
            return { error: classifiedError }
        }
}

// ----------------------------------------------------------------------------
// Compatibility export for tests
// ----------------------------------------------------------------------------

type ServiceResultCompat<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const eventsService = {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvent: getEventDetails,
    getEvents,
    publishEvent: async (): ServiceResultCompat => ({ data: null, error: null }),
    cancelEvent: async (): ServiceResultCompat => ({ data: null, error: null }),
    checkConflicts: async (): ServiceResultCompat => ({ data: null, error: null }),
}
