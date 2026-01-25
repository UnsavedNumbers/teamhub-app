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
import type { CalendarEvent, EventRSVP, EventLocation, RSVPStatus } from '../../types/calendar'
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
    } as CalendarEvent
}

/**
 * Map Supabase RSVP row to EventRSVP domain type
 * Ensures all required fields are present
 */
function mapSupabaseRSVPToEventRSVP(rsvp: any): EventRSVP {
    if (!rsvp.id || !rsvp.event_id || !rsvp.child_id) {
        throw new Error('Invalid RSVP data: missing required fields')
    }
    return {
        id: rsvp.id,
        event_id: rsvp.event_id,
        child_id: rsvp.child_id,
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
    teamId?: string
    seasonId?: string
    startDate?: Date
    endDate?: Date
    includeCancelled?: boolean
    limit?: number
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
            .order('start_time', { ascending: true })

        // Apply filters
        if (params.startDate) {
            query = query.gte('start_time', params.startDate.toISOString())
        }

        if (params.endDate) {
            query = query.lte('start_time', params.endDate.toISOString())
        }

        if (params.teamId) {
            query = query.eq('team_id', params.teamId)
        }

        if (params.seasonId) {
            query = query.eq('season_id', params.seasonId)
        }

        if (!params.includeCancelled) {
            query = query.eq('is_cancelled', false)
        }

        if (params.limit) {
            query = query.limit(params.limit)
        }

        const { data, error } = await query

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
                    data: rsvps.filter((r) => permissions.ownedChildIds.includes(r.child_id)),
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
            .eq('child_id', childId)
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
                    child_id: childId,
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
            child_id: childId,
            status: status,
            note: note ?? null,
            responded_at: new Date().toISOString(),
            responded_by_user_id: context.userId
        } satisfies EventRSVPUpsert
        const { data, error } = await supabase
            .from('event_rsvps')
            .upsert(upsertData, { onConflict: 'event_id,child_id' })
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
