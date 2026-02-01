/**
 * Calendar/Events Service
 *
 * Provides data access for calendar events, RSVPs, and event locations.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 * Each method includes a TODO comment showing the equivalent Supabase query pattern.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
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
import { getChildrenForUserId, getAssignedTeamsForCoach, getChildTeamMemberships } from '../fake/relationships'
import { t } from '@/i18n'
import { buildEventQuery } from './queryHelpers'
import { normalizeSupabaseResponse, createServiceResponse } from './responseHelpers'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'

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
    // Ensure required fields exist
    if (!event.id || !event.team_id || !event.season_id || !event.title || !event.type) {
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
            ? {
                id: event.ticketed_event.id,
                org_id: event.ticketed_event.org_id,
                team_id: event.ticketed_event.team_id,
                event_type: event.ticketed_event.event_type,
                title: event.ticketed_event.title,
                description: event.ticketed_event.description,
                starts_at: event.ticketed_event.starts_at,
                ends_at: event.ticketed_event.ends_at,
                timezone: event.ticketed_event.timezone,
                venue_name: event.ticketed_event.venue_name,
                venue_city: event.ticketed_event.venue_city,
                venue_state: event.ticketed_event.venue_state,
                venue_postal_code: event.ticketed_event.venue_postal_code,
                sales_start_at: event.ticketed_event.sales_start_at,
                sales_end_at: event.ticketed_event.sales_end_at,
                status: event.ticketed_event.status,
                ticket_types: Array.isArray(event.ticketed_event.ticket_types)
                    ? event.ticketed_event.ticket_types.map((tt: any) => ({
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
            }
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
    locationSearch?: string

    // Time context
    timeContext?: 'upcoming' | 'past' | 'all'

    // Sorting
    orderBy?: string
    order?: 'asc' | 'desc'
}

/**
 * Get events for the current user based on their permissions (enforced by RLS)
 */
export async function getEvents(
    context: UserContext,
    params: EventsQueryParams = {}
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const permissions = buildPermissions(context)
            const childTeamMemberships = getChildTeamMemberships()

            // Get all fake events
            let events: CalendarEvent[]

            if (params.startDate && params.endDate) {
                events = getFakeEventsInDateRange(params.startDate, params.endDate)
            } else if (params.teamId) {
                events = getFakeEventsForTeam(params.teamId)
            } else if (params.seasonId) {
                events = getFakeEventsForSeason(params.seasonId)
            } else {
                events = getFakeAllEvents()
            }

            // Apply filters
            if (!params.includeCancelled) {
                events = events.filter((e) => !e.is_cancelled)
            }

            // Debug logging in development
            if (import.meta.env?.DEV) {
                console.log('[eventsService] Before role filtering:', {
                    totalEvents: events.length,
                    permissions: {
                        canViewAllOrgData: permissions.canViewAllOrgData,
                        canViewAssignedTeams: permissions.canViewAssignedTeams,
                        canViewOwnChildrenData: permissions.canViewOwnChildrenData,
                        assignedTeamIds: permissions.assignedTeamIds,
                        ownedChildIds: permissions.ownedChildIds,
                    },
                    childTeamMemberships: childTeamMemberships.length,
                    orgId: context.orgId,
                })
            }

            // Filter by role-based permissions
            events = filterEventsByRole(events, permissions, childTeamMemberships, context.orgId)

            // Debug logging in development
            if (import.meta.env?.DEV) {
                console.log('[eventsService] After role filtering:', {
                    filteredEvents: events.length,
                    eventIds: events.map((e) => e.id),
                })
            }

            // Sort by start time
            events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

            // Apply limit
            if (params.limit) {
                events = events.slice(0, params.limit)
            }

            return { data: events, error: null }
        } catch (err) {
            console.error('getEvents error:', err)
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
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

        return { data: mappedEvents, error: null }
    } catch (err) {
        console.error('getEvents error:', err)
        const classifiedError = classifySupabaseError(err)
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

            let events: CalendarEvent[]
            if (params.startDate && params.endDate) {
                events = getFakeEventsInDateRange(params.startDate, params.endDate)
            } else if (params.teamId) {
                events = getFakeEventsForTeam(params.teamId)
            } else if (params.seasonId) {
                events = getFakeEventsForSeason(params.seasonId)
            } else {
                events = getFakeAllEvents()
            }

            if (!params.includeCancelled) {
                events = events.filter((e) => !e.is_cancelled)
            }

            events = filterEventsByRole(events, permissions, childTeamMemberships, context.orgId)

            return { data: events.length, error: null }
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
            const event = getFakeEventById(eventId)

            if (!event) {
                return { data: null, error: null }
            }

            // Check permissions
            const childTeamMemberships = getChildTeamMemberships()
            const filtered = filterEventsByRole([event], permissions, childTeamMemberships, context.orgId)

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

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, false)
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
    if (USE_FAKE_DATA) {
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
            team_id: formData.team_id,
            season_id: formData.season_id,
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
            const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', formData.team_id).single()
            if (!teamData?.org_id) throw new Error('Failed to get organization ID from team')

            type TicketedEventInsert = Database['public']['Tables']['ticketed_events']['Insert']
            const ticketedEventData: TicketedEventInsert = {
                event_id: eventData.id,
                org_id: teamData.org_id,
                team_id: formData.team_id,
                event_type: formData.ticketing.event_type as Database['public']['Enums']['ticketed_event_type'],
                title: formData.title,
                description: formData.notes || null,
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
                        org_id: teamData.org_id,
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
        return getEventDetails(context, eventData.id)

    } catch (err) {
        console.error('createEvent error:', err)
        const classifiedError = classifySupabaseError(err)
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
    if (USE_FAKE_DATA) {
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
            team_id: formData.team_id,
            season_id: formData.season_id,
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
            const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', formData.team_id).single()

            if (teamData?.org_id) {
                const { data: existingTe } = await supabase.from('ticketed_events').select('id').eq('event_id', eventId).maybeSingle()

                type TicketedEventUpsert = Database['public']['Tables']['ticketed_events']['Insert']
                const teData: TicketedEventUpsert = {
                    event_id: eventId,
                    org_id: teamData.org_id,
                    team_id: formData.team_id,
                    event_type: formData.ticketing.event_type as Database['public']['Enums']['ticketed_event_type'],
                    title: formData.title,
                    description: formData.notes || null,
                    starts_at: start.toISOString(),
                    ends_at: end.toISOString(),
                    timezone: formData.timezone,
                    venue_name: formData.location.venue_name?.trim() || null,
                    status: formData.ticketing.status as TicketedEventStatus,
                    // ... other fields
                    sales_start_at: formData.ticketing.sales_start_at ? new Date(formData.ticketing.sales_start_at).toISOString() : null,
                    sales_end_at: formData.ticketing.sales_end_at ? new Date(formData.ticketing.sales_end_at).toISOString() : (end.toISOString()),

                }

                if (existingTe) {
                    await supabase.from('ticketed_events').update(teData).eq('id', existingTe.id)
                } else {
                    await supabase.from('ticketed_events').insert(teData)
                }
            }
        }

        return getEventDetails(context, eventId)

    } catch (err) {
        console.error('updateEvent error:', err)
        const classifiedError = classifySupabaseError(err)
        return { data: null, error: classifiedError }
    }
}

/**
 * Delete an event
 */
export async function deleteEvent(
    eventId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        return { error: new Error('Cannot delete events in demo mode') }
    }

    try {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        console.error('deleteEvent error:', err)
        const classifiedError = classifySupabaseError(err)
        return { error: classifiedError }
    }
}
