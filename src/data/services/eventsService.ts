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
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions, filterEventsByRole } from '../fake/userContext'
import {
    fakeEvents,
    fakeEventRSVPs,
    fakeEventLocations,
    getEventById,
    getEventsForTeam,
    getEventsInDateRange,
    getRSVPsForEvent,
    getChildRSVPForEvent,
    getEventLocation,
    getUpcomingEvents,
} from '../fake/fakeEvents'
import { getChildTeamMemberships, getTeamWithDetails } from '../fake/fakeTeams'
import {
    getChildrenForUserId,
    getAssignedTeamsForCoach,
} from '../fake/relationships'
import type { CalendarEvent, EventRSVP, EventLocation, RSVPStatus } from '../../types/calendar'

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
 * Get events for the current user based on their permissions
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('events')
 *   .select(`
 *     *,
 *     team:teams(id, name, org_id),
 *     season:seasons(id, name),
 *     event_location:event_locations(*),
 *     rsvps:event_rsvps(*)
 *   `)
 *   .gte('start_time', startDate)
 *   .lte('start_time', endDate)
 *   .order('start_time', { ascending: true })
 * ```
 */
export async function getEvents(
    context: UserContext,
    params: EventsQueryParams = {}
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        // TODO: Implement real Supabase query
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        let events = [...fakeEvents]

        // Filter by date range if provided
        if (params.startDate && params.endDate) {
            events = events.filter((e) => {
                const eventDate = new Date(e.start_time)
                return eventDate >= params.startDate! && eventDate <= params.endDate!
            })
        }

        // Filter by team if provided
        if (params.teamId) {
            events = events.filter((e) => e.team_id === params.teamId)
        }

        // Filter by season if provided
        if (params.seasonId) {
            events = events.filter((e) => e.season_id === params.seasonId)
        }

        // Filter cancelled events unless explicitly included
        if (!params.includeCancelled) {
            events = events.filter((e) => !e.is_cancelled)
        }

        // Apply role-based filtering
        const childTeamMemberships = getChildTeamMemberships()
        events = filterEventsByRole(events, permissions, childTeamMemberships, context.orgId)

        // Sort by start time
        events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

        // Apply limit
        if (params.limit && params.limit > 0) {
            events = events.slice(0, params.limit)
        }

        return { data: events, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single event by ID
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('events')
 *   .select(`
 *     *,
 *     team:teams(id, name, org_id),
 *     season:seasons(id, name),
 *     event_location:event_locations(*),
 *     rsvps:event_rsvps(*, child:children(id, first_name, last_name))
 *   `)
 *   .eq('id', eventId)
 *   .single()
 * ```
 */
export async function getEventDetails(
    context: UserContext,
    eventId: string
): Promise<{ data: CalendarEvent | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const event = getEventById(eventId)
        if (!event) {
            return { data: null, error: null }
        }

        // Check access permission
        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData) {
            const childTeamMemberships = getChildTeamMemberships()
            const filtered = filterEventsByRole([event], permissions, childTeamMemberships, context.orgId)
            if (filtered.length === 0) {
                return { data: null, error: new Error('Access denied') }
            }
        }

        // Get team details to include sport information
        const teamDetails = getTeamWithDetails(event.team_id)
        
        // Attach RSVPs and location
        const eventWithDetails: CalendarEvent = {
            ...event,
            rsvps: getRSVPsForEvent(eventId),
            event_location: getEventLocation(eventId) ?? null,
            team: teamDetails
                ? {
                      id: teamDetails.id,
                      name: teamDetails.name,
                      org_id: teamDetails.org_id,
                      sport: teamDetails.sport
                          ? {
                                id: teamDetails.sport.id,
                                name: teamDetails.sport.name,
                                color: teamDetails.sport.color,
                                icon: teamDetails.sport.icon,
                            }
                          : undefined,
                  }
                : event.team,
        }

        return { data: eventWithDetails, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
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
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('event_rsvps')
 *   .select(`
 *     *,
 *     child:children(id, first_name, last_name)
 *   `)
 *   .eq('event_id', eventId)
 * ```
 */
export async function getEventRSVPs(
    context: UserContext,
    eventId: string
): Promise<{ data: EventRSVP[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const rsvps = getRSVPsForEvent(eventId)

        // Filter by user's children if not admin
        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData && !permissions.canViewAssignedTeams) {
            const childIds = getChildrenForUserId(context.userId)
            return {
                data: rsvps.filter((r) => childIds.includes(r.child_id)),
                error: null,
            }
        }

        return { data: rsvps, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get RSVP status for a specific child and event
 */
export async function getChildEventRSVP(
    context: UserContext,
    eventId: string,
    childId: string
): Promise<{ data: EventRSVP | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const rsvp = getChildRSVPForEvent(eventId, childId)
        return { data: rsvp ?? null, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Update RSVP for a child
 *
 * TODO: Replace with Supabase upsert:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('event_rsvps')
 *   .upsert({
 *     event_id: eventId,
 *     child_id: childId,
 *     status: status,
 *     note: note,
 *     responded_at: new Date().toISOString(),
 *     responded_by_user_id: context.userId
 *   })
 *   .select()
 *   .single()
 * ```
 */
export async function updateRSVP(
    context: UserContext,
    eventId: string,
    childId: string,
    status: RSVPStatus,
    note?: string
): Promise<{ data: EventRSVP | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        // Verify user has access to this child
        const childIds = getChildrenForUserId(context.userId)
        const permissions = buildPermissions(context)

        if (!permissions.canViewAllOrgData && !childIds.includes(childId)) {
            return { data: null, error: new Error('Access denied: Cannot update RSVP for this child') }
        }

        // Find or create RSVP (in fake data, we just return the updated version)
        const existingRsvp = getChildRSVPForEvent(eventId, childId)
        const updatedRsvp: EventRSVP = {
            id: existingRsvp?.id ?? `rsvp-new-${Date.now()}`,
            event_id: eventId,
            child_id: childId,
            status,
            responded_at: new Date().toISOString(),
            responded_by_user_id: context.userId,
            note: note ?? null,
            created_at: existingRsvp?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
            child: existingRsvp?.child,
        }

        return { data: updatedRsvp, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Event Location Service Functions
// ============================================================================

/**
 * Get location for an event
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('event_locations')
 *   .select('*')
 *   .eq('event_id', eventId)
 *   .single()
 * ```
 */
export async function getLocationForEvent(
    eventId: string
): Promise<{ data: EventLocation | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const location = getEventLocation(eventId)
        return { data: location ?? null, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
