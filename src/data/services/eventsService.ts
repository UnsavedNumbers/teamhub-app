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
import { t } from '../../i18n'
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
 * Get events for the current user based on their permissions (enforced by RLS)
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * let query = supabase
 *   .from('events')
 *   .select(`
 *     *,
 *     team:teams(id, name, org_id),
 *     season:seasons(id, name),
 *     event_location:event_locations(*),
 *     rsvps:event_rsvps(*),
 *     recurring_pattern:recurring_event_patterns(*)
 *   `)
 *   .order('start_time', { ascending: true })
 * // Apply filters...
 * ```
 */
export async function getEvents(
    context: UserContext,
    params: EventsQueryParams = {}
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        try {
            let query = supabase
                .from('events')
                .select(`
                    *,
                    team:teams(id, name, org_id),
                    season:seasons(id, name),
                    event_location:event_locations(*),
                    rsvps:event_rsvps(*, child:children(id, first_name, last_name)),
                    general_rsvps:event_general_rsvps(*),
                    recurring_pattern:recurring_event_patterns(*)
                `)
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

            // Transform RSVP config for each event with safe defaults
            if (data && Array.isArray(data)) {
                data.forEach((event: any) => {
                    // Ensure rsvp_config always exists with safe defaults
                    event.rsvp_config = {
                        enabled: event.rsvp_enabled ?? false,
                        type: (event.rsvp_enabled && event.rsvp_type) ? (event.rsvp_type as 'general' | 'athlete') : null
                    }
                    // Ensure arrays exist even if empty
                    if (!event.rsvps) event.rsvps = []
                    if (!event.general_rsvps) event.general_rsvps = []
                })
            }

            return { data: (data || []) as unknown as CalendarEvent[], error: null }
        } catch (err) {
            console.error('getEvents error:', err)
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

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
 *     rsvps:event_rsvps(*, child:children(id, first_name, last_name)),
 *     recurring_pattern:recurring_event_patterns(*)
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
        try {
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    team:teams(id, name, org_id),
                    season:seasons(id, name),
                    event_location:event_locations(*),
                    rsvps:event_rsvps(*, child:children(id, first_name, last_name)),
                    general_rsvps:event_general_rsvps(*),
                    recurring_pattern:recurring_event_patterns(*)
                `)
                .eq('id', eventId)
                .single()

            // Transform RSVP config
            if (data) {
                (data as any).rsvp_config = {
                    enabled: data.rsvp_enabled ?? false,
                    type: data.rsvp_type as 'none' | 'general' | 'athlete' | null
                }
            }

            if (error) throw error

            return { data: data as unknown as CalendarEvent, error: null }
        } catch (err) {
            console.error('getEventDetails error:', err)
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        await simulateDelay()

        const event = getFakeEventById(eventId)
        if (!event) {
            return { data: null, error: null }
        }

        // Check if user has access to this event
        const permissions = buildPermissions(context)
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
        try {
            const { data, error } = await supabase
                .from('event_rsvps')
                .select(`
                    *,
                    child:children(id, first_name, last_name)
                `)
                .eq('event_id', eventId)

            if (error) throw error

            return { data: data as EventRSVP[], error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

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

/**
 * Get RSVP status for a specific child and event
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('event_rsvps')
 *   .select('*')
 *   .eq('event_id', eventId)
 *   .eq('child_id', childId)
 *   .maybeSingle()
 * ```
 */
export async function getChildEventRSVP(
    context: UserContext,
    eventId: string,
    childId: string
): Promise<{ data: EventRSVP | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        try {
            const { data, error } = await supabase
                .from('event_rsvps')
                .select('*')
                .eq('event_id', eventId)
                .eq('child_id', childId)
                .maybeSingle()

            if (error) throw error

            return { data: data as EventRSVP | null, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

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

/**
 * Update RSVP for a child
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('event_rsvps')
 *   .upsert({
 *     event_id: eventId,
 *     child_id: childId,
 *     status: status,
 *     note: note ?? null,
 *     responded_at: new Date().toISOString(),
 *     responded_by_user_id: context.userId
 *   }, { onConflict: 'event_id,child_id' })
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
        try {
            const { data, error } = await supabase
                .from('event_rsvps')
                .upsert({
                    event_id: eventId,
                    child_id: childId,
                    status: status,
                    note: note ?? null,
                    responded_at: new Date().toISOString(),
                    responded_by_user_id: context.userId
                }, { onConflict: 'event_id,child_id' })
                .select()
                .single()

            if (error) throw error

            return { data: data as EventRSVP, error: null }
        } catch (err) {
            console.error('updateRSVP error:', err)
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

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
 *   .maybeSingle()
 * ```
 */
export async function getLocationForEvent(
    eventId: string
): Promise<{ data: EventLocation | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        try {
            const { data, error } = await supabase
                .from('event_locations')
                .select('*')
                .eq('event_id', eventId)
                .maybeSingle()

            if (error) throw error

            return { data: data as EventLocation | null, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        await simulateDelay()

        const location = getFakeEventLocation(eventId)
        return { data: location ?? null, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
