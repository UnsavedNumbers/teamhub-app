/**
 * Travel Service (Event-Based)
 *
 * Provides data access for travel events and trips.
 * Travel is now a computed property of events, not a separate entity.
 *
 * Key Changes from travel_plans approach:
 * - Travel is detected from event attributes (hotel, overnight, location, etc.)
 * - Events are grouped into "trips" for better UX
 * - Uses existing events RLS for visibility
 *
 * Implements:
 * - Issue 3: Multi-day event grouping into trips
 * - Issue 7: Type-safe nullable field handling
 * - Issue 8: Uses existing events RLS
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions } from '../fake/userContext'
import {
    type TravelEvent,
    type TravelTrip,
    type TravelDetectionResult,
    detectTravelEvent,
    groupEventsIntoTrips,
    formatTravelDateRange,
    getHotelInfo,
    getMeetingLocations,
} from '../../utils/travelDetection'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import {
    getChildrenForUserId,
    getAssignedTeamsForCoach,
    getTeamsForUserChildren,
} from '../fake/relationships'
import { fakeEvents } from '../fake/fakeEvents'
import { fakeTravelPlans, type FakeTravelPlan } from '../fake/fakeTravel'

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
    formatTravelDateRange,
    formatTravelDateRange as formatDateRange, // Backward compatibility
    detectTravelEvent,
    groupEventsIntoTrips,
    getHotelInfo,
    getMeetingLocations,
}

export type { TravelEvent, TravelTrip, TravelDetectionResult, FakeTravelPlan }

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

/**
 * Convert a fake travel plan to a travel event format for backward compatibility
 */
function convertTravelPlanToEvent(plan: FakeTravelPlan): TravelEvent {
    return {
        id: plan.id,
        team_id: plan.team_id,
        season_id: plan.season_id,
        title: plan.title,
        type: 'tournament',
        start_time: new Date(plan.start_date).toISOString(),
        end_time: new Date(plan.end_date + 'T23:59:59').toISOString(),
        arrival_time: null,
        timezone: 'America/New_York',
        location: plan.location,
        notes: plan.notes,
        uniform_notes: null,
        equipment_notes: null,
        weather_dependent: false,
        external_link: null,
        is_cancelled: plan.status === 'cancelled',
        cancellation_reason: plan.status === 'cancelled' ? 'Event cancelled' : null,
        cancelled_at: plan.cancelled_at,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        requires_travel: true,
        overnight: plan.end_date !== plan.start_date,
        departure_time: null,
        return_time: null,
        hotel_name: plan.hotel_name,
        hotel_address: plan.hotel_address,
        hotel_phone: plan.hotel_phone,
        hotel_confirmation: plan.hotel_confirmation,
        transportation_notes: null,
        itinerary_file_path: plan.itinerary_file_path,
        meeting_locations: plan.meeting_locations,
        travel_override: null,
        team: { id: plan.team_id, name: getTeamName(plan.team_id), org_id: plan.org_id },
        season: { id: plan.season_id, name: 'Spring 2024' },
        event_location: plan.destination_city ? {
            id: `loc-${plan.id}`,
            event_id: plan.id,
            venue_name: plan.venue_name,
            address_line1: plan.venue_address,
            address_line2: null,
            city: plan.destination_city,
            state: plan.destination_state,
            postal_code: null,
            place_id: null,
            country: 'US',
            latitude: null,
            longitude: null,
            is_tbd: false,
            is_virtual: false,
            virtual_link: null,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
        } : null,
    }
}

// Helper to get team name from team_id
function getTeamName(teamId: string): string {
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

// ============================================================================
// Travel Events Query Params
// ============================================================================

export interface TravelEventsQueryParams {
    teamId?: string
    upcomingOnly?: boolean
    includeCancelled?: boolean
}

// ============================================================================
// Travel Event Service Functions
// ============================================================================

/**
 * Get travel events based on user permissions
 * Travel events are regular events with travel indicators detected.
 *
 * Uses Supabase RPC: get_travel_events_for_team for real data
 * For fake data, filters events using detectTravelEvent utility
 */
export async function getTravelEvents(
    context: UserContext,
    params: TravelEventsQueryParams = {}
): Promise<{ data: TravelEvent[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        // Fake data mode - use fake travel plans converted to events
        try {
        await simulateDelay()

        const permissions = buildPermissions(context)

        // Get travel plans and convert to travel events
        let travelEvents: TravelEvent[] = fakeTravelPlans
            .filter(p => p.org_id === context.orgId)
            .filter(p => params.includeCancelled || p.status !== 'cancelled')
            .filter(p => p.status === 'published' || p.status === 'cancelled')
            .map(convertTravelPlanToEvent)

        // Also check regular events with travel indicators
        const regularTravelEvents: TravelEvent[] = fakeEvents
            .filter(e => {
                const asTravelEvent = e as unknown as TravelEvent
                return detectTravelEvent(asTravelEvent).isTravel
            })
            .map(e => e as unknown as TravelEvent)

        // Merge, avoiding duplicates
        const eventIds = new Set(travelEvents.map(e => e.id))
        for (const event of regularTravelEvents) {
            if (!eventIds.has(event.id)) {
                travelEvents.push(event)
            }
        }

        // Filter by upcoming
        if (params.upcomingOnly) {
            const now = new Date()
            travelEvents = travelEvents.filter(e => new Date(e.start_time) >= now)
        }

        // Filter by team
        if (params.teamId) {
            travelEvents = travelEvents.filter(e => e.team_id === params.teamId)
        }

        // Apply role-based filtering (using same logic as events)
        // In fake data demo mode, show all published travel for the org
        if (USE_FAKE_DATA && !permissions.canViewAllOrgData) {
            // Demo mode: show travel plans for demonstration
            // In real mode, would filter by team access
        } else if (!permissions.canViewAllOrgData) {
            const accessibleTeamIds = new Set<string>()

            if (permissions.canViewAssignedTeams) {
                permissions.assignedTeamIds.forEach(id => accessibleTeamIds.add(id))
            }

            if (permissions.canViewOwnChildrenData) {
                getTeamsForUserChildren(context.userId).forEach(id => accessibleTeamIds.add(id))
            }

            travelEvents = travelEvents.filter(e => accessibleTeamIds.has(e.team_id))
        }

        // Sort by start date
        travelEvents.sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )

        return { data: travelEvents, error: null }
        } catch (err) {
            console.error('getTravelEvents error:', err)
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        // Query events where travel indicators are present
        let query: any = supabase
            .from('events')
            .select(`
          *,
          team:teams(id, name, org_id),
          season:seasons(id, name),
          event_location:event_locations(*)
        `)
            .order('start_time', { ascending: true })

        // Filter by travel indicators - events that have travel fields set
        // or are of type 'travel' or 'tournament'
        query = query.or(
            'requires_travel.eq.true,overnight.eq.true,hotel_name.neq.,type.eq.travel,type.eq.tournament'
        )

        if (params.upcomingOnly) {
            query = query.gte('start_time', new Date().toISOString())
        }

        if (params.teamId) {
            query = query.eq('team_id', params.teamId)
        }

        if (!params.includeCancelled) {
            query = query.eq('is_cancelled', false)
        }

        const { data, error } = await query

        if (error) throw error

        // Further filter using is_travel_event RPC if needed
        // For now, client-side detection provides consistent behavior
        const travelEvents = (data || [])
            .map((e: any) => e as unknown as TravelEvent)
            .filter((e: TravelEvent) => detectTravelEvent(e).isTravel)

        return { data: travelEvents, error: null }
    } catch (err) {
        console.error('getTravelEvents error:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get travel events grouped into trips (Issue 3 implementation)
 * Groups events that are:
 * - Same team
 * - Within 7 days of each other
 * - Same location (if available)
 */
export async function getTravelTrips(
    context: UserContext,
    params: TravelEventsQueryParams = {}
): Promise<{ data: TravelTrip[]; error: Error | null }> {
    const { data: events, error } = await getTravelEvents(context, params)

    if (error) {
        return { data: [], error }
    }

    // Group events into trips
    const trips = groupEventsIntoTrips(events)

    return { data: trips, error: null }
}

/**
 * Get a single travel event by ID
 */
export async function getTravelEventDetails(
    context: UserContext,
    eventId: string
): Promise<{ data: TravelEvent | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        try {
            const { data, error } = await supabase
                .from('events')
                .select(`
          *,
          team:teams(id, name, org_id),
          season:seasons(id, name),
          event_location:event_locations(*)
        `)
                .eq('id', eventId)
                .single()

            if (error) throw error

            const travelEvent = data as unknown as TravelEvent
            if (!detectTravelEvent(travelEvent).isTravel) {
                return { data: null, error: new Error('Event is not a travel event') }
            }

            return { data: travelEvent, error: null }
        } catch (err) {
            console.error('getTravelEventDetails error:', err)
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Fake data mode
    try {
        await simulateDelay()

        // Check travel plans first
        const plan = fakeTravelPlans.find(p => p.id === eventId)
        if (plan) {
            if (plan.org_id !== context.orgId) {
                return { data: null, error: new Error('Access denied') }
            }
            return { data: convertTravelPlanToEvent(plan), error: null }
        }

        // Check regular events
        const event = fakeEvents.find(e => e.id === eventId)
        if (event) {
            const travelEvent = event as unknown as TravelEvent
            if (!detectTravelEvent(travelEvent).isTravel) {
                return { data: null, error: new Error('Event is not a travel event') }
            }
            return { data: travelEvent, error: null }
        }

        return { data: null, error: null }
    } catch (err) {
        console.error('getTravelEventDetails error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get upcoming travel events for parent portal
 */
export async function getUpcomingTravelEventsForUser(
    context: UserContext
): Promise<{ data: TravelEvent[]; error: Error | null }> {
    return getTravelEvents(context, { upcomingOnly: true })
}

/**
 * Get upcoming travel trips for parent portal (grouped view)
 */
export async function getUpcomingTravelTripsForUser(
    context: UserContext
): Promise<{ data: TravelTrip[]; error: Error | null }> {
    return getTravelTrips(context, { upcomingOnly: true })
}

/**
 * Get travel events for a specific team
 */
export async function getTravelEventsForTeam(
    context: UserContext,
    teamId: string
): Promise<{ data: TravelEvent[]; error: Error | null }> {
    return getTravelEvents(context, { teamId })
}

// ============================================================================
// Travel Override Functions
// ============================================================================

/**
 * Set travel override for an event
 */
export async function setTravelOverride(
    _context: UserContext,
    eventId: string,
    isTravel: boolean,
    reason?: string
): Promise<{ error: Error | null }> {
    if (!USE_FAKE_DATA) {
        try {
            const { error } = await supabase.rpc('set_travel_override', {
                p_event_id: eventId,
                p_is_travel: isTravel,
                p_reason: reason ?? null,
            } as any)

            if (error) throw error

            return { error: null }
        } catch (err) {
            console.error('setTravelOverride error:', err)
            return { error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Fake data mode - just simulate success
    await simulateDelay()
    return { error: null }
}

/**
 * Clear travel override for an event
 */
export async function clearTravelOverride(
    _context: UserContext,
    eventId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        // Fake data mode
        await simulateDelay()
        return { error: null }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        const { error } = await supabase.rpc('clear_travel_override', {
            p_event_id: eventId,
        } as any)

        if (error) throw error

        return { error: null }
    } catch (err) {
        console.error('clearTravelOverride error:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Backward Compatibility - Legacy Travel Plan Functions
// ============================================================================

// These functions maintain backward compatibility with existing UI until migration is complete

export interface TravelPlansQueryParams {
    teamId?: string
    status?: 'draft' | 'published' | 'cancelled'
    upcomingOnly?: boolean
}

/**
 * @deprecated Use getTravelEvents instead
 * Kept for backward compatibility during migration
 */
export async function getTravelPlans(
    context: UserContext,
    params: TravelPlansQueryParams = {}
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        // Convert to event-based approach for fake data
        const { data: events, error } = await getTravelEvents(context, {
            teamId: params.teamId,
            upcomingOnly: params.upcomingOnly,
            includeCancelled: params.status === 'cancelled',
        })

        if (error) {
            return { data: [], error }
        }

        // Convert back to FakeTravelPlan format for backward compatibility
        const plans = events.map(e => convertEventToTravelPlan(e))

        // Filter by status if specified
        if (params.status && params.status !== 'cancelled') {
            return { data: plans.filter(p => p.status === params.status), error: null }
        }

        return { data: plans, error: null }
    }

    // Real Supabase implementation - query travel_plans table directly
    try {
        let query = supabase
            .from('travel_plans')
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .order('start_date', { ascending: true })

        // Filter by team
        if (params.teamId) {
            query = query.eq('team_id', params.teamId)
        }

        // Filter by status
        if (params.status) {
            query = query.eq('status', params.status)
        } else {
            // Default: only published and cancelled (parents can't see drafts)
            query = query.in('status', ['published', 'cancelled'])
        }

        // Filter by upcoming only
        if (params.upcomingOnly) {
            const today = new Date().toISOString().split('T')[0]
            query = query.gte('start_date', today)
        }

        const { data, error } = await query

        if (error) throw error

        // Map Supabase rows to FakeTravelPlan format
        const plans: FakeTravelPlan[] = (data || []).map((row: any) => ({
            id: row.id,
            org_id: row.team?.org_id || '',
            team_id: row.team_id,
            season_id: row.season_id,
            title: row.title,
            location: row.location,
            destination_city: row.destination_city || null,
            destination_state: row.destination_state || null,
            venue_name: row.venue_name || null,
            venue_address: row.venue_address || null,
            start_date: row.start_date,
            end_date: row.end_date,
            hotel_name: row.hotel_name || null,
            hotel_address: row.hotel_address || null,
            hotel_phone: row.hotel_phone || null,
            hotel_confirmation: row.hotel_confirmation || null,
            check_in_time: null,
            check_out_time: null,
            maps_url: row.maps_url || null,
            notes: row.notes || null,
            itinerary_file_path: row.itinerary_file_path || null,
            meeting_locations: row.meeting_locations || null,
            status: row.status || 'published',
            published_at: row.published_at || null,
            cancelled_at: row.cancelled_at || null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }))

        return { data: plans, error: null }
    } catch (err) {
        console.error('getTravelPlans error:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Convert a TravelEvent back to FakeTravelPlan format
 */
function convertEventToTravelPlan(event: TravelEvent): FakeTravelPlan {
    return {
        id: event.id,
        org_id: event.team?.org_id || '',
        team_id: event.team_id,
        season_id: event.season_id,
        title: event.title,
        location: event.location || event.event_location?.city || '',
        destination_city: event.event_location?.city || null,
        destination_state: event.event_location?.state || null,
        venue_name: event.event_location?.venue_name || null,
        venue_address: event.event_location?.address_line1 || null,
        start_date: event.start_time.split('T')[0],
        end_date: event.end_time.split('T')[0],
        hotel_name: event.hotel_name || null,
        hotel_address: event.hotel_address || null,
        hotel_phone: event.hotel_phone || null,
        hotel_confirmation: event.hotel_confirmation || null,
        check_in_time: null,
        check_out_time: null,
        maps_url: null,
        notes: event.notes,
        itinerary_file_path: event.itinerary_file_path || null,
        meeting_locations: event.meeting_locations || null,
        status: event.is_cancelled ? 'cancelled' : 'published',
        published_at: event.created_at,
        cancelled_at: event.cancelled_at,
        created_at: event.created_at,
        updated_at: event.updated_at,
    }
}

/**
 * @deprecated Use getTravelEventDetails instead
 */
export async function getTravelPlanDetails(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        const { data: event, error } = await getTravelEventDetails(context, planId)

        if (error || !event) {
            return { data: null, error }
        }

        return { data: convertEventToTravelPlan(event), error: null }
    }

    // Real Supabase implementation - query travel_plans table directly
    try {
        const { data, error } = await supabase
            .from('travel_plans')
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .eq('id', planId)
            .single()

        if (error) throw error

        if (!data) {
            return { data: null, error: null }
        }

        // Map Supabase row to FakeTravelPlan format
        const plan: FakeTravelPlan = {
            id: data.id,
            org_id: data.team?.org_id || '',
            team_id: data.team_id,
            season_id: data.season_id,
            title: data.title,
            location: data.location,
            destination_city: (data as any).destination_city || null,
            destination_state: (data as any).destination_state || null,
            venue_name: data.venue_name || null,
            venue_address: data.venue_address || null,
            start_date: data.start_date,
            end_date: data.end_date,
            hotel_name: data.hotel_name || null,
            hotel_address: data.hotel_address || null,
            hotel_phone: data.hotel_phone || null,
            hotel_confirmation: data.hotel_confirmation || null,
            check_in_time: null,
            check_out_time: null,
            maps_url: (data as any).maps_url || null,
            notes: data.notes || null,
            itinerary_file_path: (data as any).itinerary_file_path || null,
            meeting_locations: (data as any).meeting_locations || null,
            status: (data as any).status || 'published',
            published_at: (data as any).published_at || null,
            cancelled_at: (data as any).cancelled_at || null,
            created_at: data.created_at || '',
            updated_at: data.updated_at || '',
        }

        return { data: plan, error: null }
    } catch (err) {
        console.error('getTravelPlanDetails error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single travel plan by ID (convenience function for detail view)
 */
export async function getTravelPlanById(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    return getTravelPlanDetails(context, planId)
}

/**
 * @deprecated Use getUpcomingTravelEventsForUser instead
 */
export async function getUpcomingTravelPlansForUser(
    context: UserContext
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    return getTravelPlans(context, { upcomingOnly: true })
}

/**
 * @deprecated Use getTravelEventsForTeam instead
 */
export async function getTravelPlansForTeamId(
    context: UserContext,
    teamId: string
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    return getTravelPlans(context, { teamId })
}

// ============================================================================
// Admin Functions (Backward Compatibility)
// ============================================================================

/**
 * @deprecated Events are managed through event admin, not separate travel admin
 */
export async function getAllTravelPlansAdmin(
    context: UserContext
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    return getTravelPlans(context, {})
}

/**
 * @deprecated Use event status management instead
 */
export async function publishTravelPlan(
    context: UserContext,
    eventId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    // In the new model, events are published, not travel plans
    // This is a no-op for backward compatibility
    return getTravelPlanDetails(context, eventId)
}

/**
 * @deprecated Use event cancellation instead
 */
export async function cancelTravelPlan(
    context: UserContext,
    eventId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        // Fake data mode - just return the plan details
        return getTravelPlanDetails(context, eventId)
    }

    // Real Supabase implementation - NO FALLBACK
    // In the new model, cancel the event
    try {
        type EventUpdate = Database['public']['Tables']['events']['Update']
        const updateData = {
            is_cancelled: true,
            cancellation_reason: 'Cancelled via admin panel',
            cancelled_at: new Date().toISOString(),
        } satisfies EventUpdate
        const { error } = await supabase
            .from('events')
            .update(updateData)
            .eq('id', eventId)

        if (error) throw error

        return getTravelPlanDetails(context, eventId)
    } catch (err) {
        console.error('cancelTravelPlan error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
