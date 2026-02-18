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
import { debug } from '../../lib/debug'
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
import { fakeTravelPlans, type FakeTravelPlan, type MeetingLocation } from '../fake/fakeTravel'
import { isValidUUID } from '../../utils/uuid'

const supabaseAny = supabase as any
import { safeParseJSONB } from '../../utils/featureDiscovery/jsonbUtils'
import { getSeasonById, getTeamById } from '../fake/fakeTeams'
import {
    TRAVEL_CONTACT_CATEGORIES,
    type TravelContactCategory,
    type ResolvedContact,
    type ResolvedTravelContacts,
    type TravelPlanContactRow,
    TRAVEL_CONTACT_CATEGORY_LABELS,
} from '../../types/travelContacts'
import { getErrorMessage } from '../../utils/errorUtils'
import { getOrganizationTravelContacts } from './organizationTravelContactsService'

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

/**
 * Normalize date to ISO date string format (YYYY-MM-DD)
 * Handles Date objects, ISO strings, and date strings
 */
function normalizeToISODate(date: string | Date): string {
    if (date instanceof Date) {
        return date.toISOString().split('T')[0]
    }
    // If it's already a date string, extract just the date part
    const dateStr = date.trim()
    if (dateStr.includes('T')) {
        return dateStr.split('T')[0]
    }
    return dateStr
}

/**
 * Validate if a value is a valid File object
 */
function isValidFile(file: unknown): file is File {
    return file instanceof File &&
        typeof file.name === 'string' &&
        typeof file.size === 'number' &&
        file.size > 0
}

function toError(err: unknown, fallbackMessage: string): Error {
    if (err instanceof Error) return err
    const message = getErrorMessage(err)
    return new Error(message || fallbackMessage)
}

const fakeTravelPlanContactsStore = new Map<
    string,
    Record<TravelContactCategory, TravelPlanContactRow | null>
>()

function isSupportedFakeTravelPlanId(planId: string | null | undefined): planId is string {
    return typeof planId === 'string' && planId.trim().length > 0
}

function createFakeTravelPlanContactRow(
    planId: string,
    category: TravelContactCategory,
    overrides: Partial<TravelPlanContactRow> = {},
): TravelPlanContactRow {
    return {
        id: overrides.id ?? `tpc-${planId}-${category}`,
        travel_plan_id: planId,
        category,
        is_custom: overrides.is_custom ?? false,
        first_name: overrides.first_name ?? null,
        last_name: overrides.last_name ?? null,
        email: overrides.email ?? null,
        phone: overrides.phone ?? null,
        updated_at: overrides.updated_at ?? new Date().toISOString(),
    }
}

function emptyTravelPlanContactResult(): Record<TravelContactCategory, TravelPlanContactRow | null> {
    return TRAVEL_CONTACT_CATEGORIES.reduce((acc, category) => {
        acc[category] = null
        return acc
    }, {} as Record<TravelContactCategory, TravelPlanContactRow | null>)
}

function ensureFakeTravelPlanContacts(planId: string): Record<TravelContactCategory, TravelPlanContactRow | null> {
    const existing = fakeTravelPlanContactsStore.get(planId)
    if (existing) return existing

    const seeded = TRAVEL_CONTACT_CATEGORIES.reduce((acc, category) => {
        // Default fake behavior: plan inherits org contacts unless explicitly customized.
        acc[category] = createFakeTravelPlanContactRow(planId, category, { is_custom: false })
        return acc
    }, {} as Record<TravelContactCategory, TravelPlanContactRow | null>)

    fakeTravelPlanContactsStore.set(planId, seeded)
    return seeded
}

function hasContactData(row: TravelPlanContactRow | null | undefined): boolean {
    if (!row) return false
    return Boolean(
        (row.first_name && row.first_name.trim()) ||
        (row.last_name && row.last_name.trim()) ||
        (row.email && row.email.trim()) ||
        (row.phone && row.phone.trim()),
    )
}

/**
 * Map Supabase travel plan row to FakeTravelPlan domain model
 */
function mapSupabaseTravelPlan(row: TravelPlanRow): FakeTravelPlan {
    const plan: FakeTravelPlan = {
        id: row.id,
        org_id: row.team?.org_id ?? '',
        team_id: row.team_id,
        season_id: row.season_id,
        title: row.title,
        location: row.location,
        destination_city: row.destination_city ?? null,
        destination_state: row.destination_state ?? null,
        venue_name: row.venue_name ?? null,
        venue_address: row.venue_address ?? null,
        venue_place_id: (row as any).venue_place_id ?? null,
        venue_lat: (row as any).venue_lat ?? null,
        venue_lng: (row as any).venue_lng ?? null,
        start_date: row.start_date,
        end_date: row.end_date,
        hotel_name: row.hotel_name ?? null,
        hotel_address: row.hotel_address ?? null,
        hotel_phone: row.hotel_phone ?? null,
        hotel_confirmation: row.hotel_confirmation ?? null,
        check_in_time: null,
        check_out_time: null,
        maps_url: row.maps_url ?? null,
        notes: row.notes ?? null,
        itinerary_file_path: row.itinerary_file_path ?? null,
        meeting_locations: safeParseJSONB(row.meeting_locations, null) as MeetingLocation[] | null,
        status: row.status,
        published_at: row.published_at ?? null,
        cancelled_at: row.cancelled_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }

    // Add new fields if they exist in the row (they might not if types aren't fully updated everywhere)
    // For FakeTravelPlan we'll just keep the base structure for now to avoid breaking other files
    // The service handles the DTOs but the internal model might not need all raw place IDs for display
    // Add team and season info if available
    if (row.team) {
        plan.team = {
            id: row.team.id,
            name: row.team.name
        }
    }

    if (row.season) {
        plan.season = {
            id: row.season.id,
            name: row.season.name
        }
    }

    return plan
}

/**
 * Validate team belongs to user's organization
 */
async function validateTeamBelongsToOrg(
    _context: UserContext,
    teamId: string
): Promise<{ valid: boolean; orgId: string | null; error: Error | null }> {
    if (!isValidUUID(teamId)) {
        return { valid: false, orgId: null, error: new Error('Invalid team ID format') }
    }

    if (USE_FAKE_DATA) {
        // In fake data, assume team belongs to context org
        return { valid: true, orgId: _context.orgId ?? null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('teams')
            .select('org_id')
            .eq('id', teamId)
            .single()

        if (error) throw error
        if (!data) {
            return { valid: false, orgId: null, error: new Error('Team not found') }
        }

        const teamOrgId = data.org_id as string | null
        if (!teamOrgId || teamOrgId !== _context.orgId) {
            return {
                valid: false,
                orgId: teamOrgId,
                error: new Error('Team does not belong to your organization')
            }
        }

        return { valid: true, orgId: teamOrgId, error: null }
    } catch (err) {
        return {
            valid: false,
            orgId: null,
            error: err instanceof Error ? err : new Error('Failed to validate team')
        }
    }
}

/**
 * Validate team-season relationship exists
 */
async function validateTeamSeasonRelationship(
    _context: UserContext,
    teamId: string,
    seasonId: string
): Promise<{ valid: boolean; error: Error | null }> {
    if (!isValidUUID(teamId) || !isValidUUID(seasonId)) {
        return { valid: false, error: new Error('Invalid team or season ID format') }
    }

    if (USE_FAKE_DATA) {
        // In fake data, assume relationship exists
        return { valid: true, error: null }
    }

    try {
        // Check team_seasons table first
        const { data: teamSeasonData, error: teamSeasonError } = await supabase
            .from('team_seasons')
            .select('team_id')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .single()

        if (!teamSeasonError && teamSeasonData) {
            return { valid: true, error: null }
        }

        // Fallback: check if season has direct team_id (legacy)
        const { data: seasonData, error: seasonError } = await supabase
            .from('seasons')
            .select('team_id')
            .eq('id', seasonId)
            .single()

        if (seasonError) throw seasonError
        if (!seasonData || (seasonData.team_id as string | null) !== teamId) {
            return { valid: false, error: new Error('Selected season is not available for this team') }
        }

        return { valid: true, error: null }
    } catch (err) {
        return {
            valid: false,
            error: err instanceof Error ? err : new Error('Failed to validate team-season relationship')
        }
    }
}

/**
 * Sanitize filename for storage path
 */
function sanitizeFilename(filename: string): string {
    // Remove special chars, keep alphanumeric, dots, dashes, underscores
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    // Limit length to 255 chars
    return sanitized.length > 255 ? sanitized.substring(0, 255) : sanitized
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
// Type Definitions
// ============================================================================

/**
 * ISO Date String type (YYYY-MM-DD format)
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' }

/**
 * DTO for creating a new travel plan
 */
export interface CreateTravelPlanDTO {
    team_id: string
    season_id: string
    title: string
    location: string // formatted address or manually entered text
    destination_city?: string | null
    destination_state?: string | null
    destination_state_code?: string | null
    destination_country?: string | null
    destination_place_id?: string | null
    destination_lat?: number | null
    destination_lng?: number | null
    start_date: string
    end_date: string
    venue_name?: string | null
    venue_address?: string | null
    venue_place_id?: string | null
    venue_lat?: number | null
    venue_lng?: number | null
    hotel_name?: string | null
    hotel_address?: string | null
    hotel_place_id?: string | null
    hotel_lat?: number | null
    hotel_lng?: number | null
    hotel_phone?: string | null // kept for backward compatibility but populated from place
    hotel_confirmation?: string | null
    maps_url?: string | null // kept for backward compatibility
    notes?: string | null
    itinerary_file?: File | null
}

/**
 * DTO for updating an existing travel plan
 */
export interface UpdateTravelPlanDTO {
    title?: string
    location?: string
    destination_city?: string | null
    destination_state?: string | null
    start_date?: string
    end_date?: string
    venue_name?: string | null
    venue_address?: string | null
    venue_place_id?: string | null
    venue_lat?: number | null
    venue_lng?: number | null
    hotel_name?: string | null
    hotel_address?: string | null
    hotel_phone?: string | null
    hotel_confirmation?: string | null
    maps_url?: string | null
    notes?: string | null
    itinerary_file?: File | null
}

/**
 * Supabase row type for travel_plans with joins
 */
export interface TravelPlanRow {
    id: string
    team_id: string
    season_id: string
    title: string
    location: string
    destination_city: string | null
    destination_state: string | null
    venue_name: string | null
    venue_address: string | null
    start_date: string
    end_date: string
    hotel_name: string | null
    hotel_address: string | null
    hotel_phone: string | null
    hotel_confirmation: string | null
    maps_url: string | null
    notes: string | null
    itinerary_file_path: string | null
    meeting_locations: unknown
    status: 'draft' | 'published' | 'cancelled'
    published_at: string | null
    cancelled_at: string | null
    created_at: string
    updated_at: string
    team: { id: string; name: string; org_id: string } | null
    season: { id: string; name: string } | null
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
    console.groupCollapsed(`%cgetTravelEvents: ${JSON.stringify(params)}`, 'color: #666; font-weight: bold;');
    debug.data('TravelService.getTravelEvents', 'Request', { context: { userId: context.userId, orgId: context.orgId }, params })
    debug.perf.start('travelService.getTravelEvents')

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
                // Use end_time >= now so ongoing trips are included
                travelEvents = travelEvents.filter(e => new Date(e.end_time) >= now)
            }

            // Filter by team
            if (params.teamId) {
                travelEvents = travelEvents.filter(e => e.team_id === params.teamId)
            }

            // Apply role-based filtering (using same logic as events)
            if (!permissions.canViewAllOrgData) {
                const accessibleTeamIds = new Set<string>()

                if (permissions.canViewAssignedTeams) {
                    permissions.assignedTeamIds.forEach(id => accessibleTeamIds.add(id))
                }

                if (permissions.canViewOwnChildrenData) {
                    getTeamsForUserChildren(context.userId).forEach(id => accessibleTeamIds.add(id))
                }

                travelEvents = travelEvents.filter(e => (e.team_id ? accessibleTeamIds.has(e.team_id) : false))
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

        debug.perf.end('travelService.getTravelEvents')
        debug.data('TravelService.getTravelEvents', 'Response', { eventCount: travelEvents.length })
        console.groupEnd()
        return { data: travelEvents, error: null }
    } catch (err) {
        debug.perf.end('travelService.getTravelEvents')
        debug.error('TravelService.getTravelEvents', 'Failed to fetch travel events', { error: err, context: { userId: context.userId, orgId: context.orgId }, params })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetTravelTrips: ${JSON.stringify(params)}`, 'color: #666; font-weight: bold;');
    debug.data('TravelService.getTravelTrips', 'Request', { context: { userId: context.userId, orgId: context.orgId }, params })
    debug.perf.start('travelService.getTravelTrips')

    try {
        const { data: events, error } = await getTravelEvents(context, params)

        if (error) {
            debug.perf.end('travelService.getTravelTrips')
            debug.error('TravelService.getTravelTrips', 'Failed to get travel events', { error, params })
            console.groupEnd()
            return { data: [], error }
        }

        // Group events into trips
        const trips = groupEventsIntoTrips(events)

        debug.perf.end('travelService.getTravelTrips')
        debug.data('TravelService.getTravelTrips', 'Response', { tripCount: trips.length, eventCount: events.length })
        console.groupEnd()
        return { data: trips, error: null }
    } catch (err) {
        debug.perf.end('travelService.getTravelTrips')
        debug.error('TravelService.getTravelTrips', 'Exception getting travel trips', { error: err, params })
        console.groupEnd()
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single travel event by ID
 */
export async function getTravelEventDetails(
    context: UserContext,
    eventId: string
): Promise<{ data: TravelEvent | null; error: Error | null }> {
    console.groupCollapsed(`%cgetTravelEventDetails: ${eventId}`, 'color: #666; font-weight: bold;');
    debug.data('TravelService.getTravelEventDetails', 'Request', { eventId, orgId: context.orgId })
    debug.perf.start('travelService.getTravelEventDetails')

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
                debug.perf.end('travelService.getTravelEventDetails')
                debug.error('TravelService.getTravelEventDetails', 'Access denied (fake)', { eventId, planOrgId: plan.org_id, contextOrgId: context.orgId })
                console.groupEnd()
                return { data: null, error: new Error('Access denied') }
            }
            debug.perf.end('travelService.getTravelEventDetails')
            debug.data('TravelService.getTravelEventDetails', 'Response (fake, from plan)', { eventId, hasData: true })
            console.groupEnd()
            return { data: convertTravelPlanToEvent(plan), error: null }
        }

        // Check regular events
        const event = fakeEvents.find(e => e.id === eventId)
        if (event) {
            const travelEvent = event as unknown as TravelEvent
            if (!detectTravelEvent(travelEvent).isTravel) {
                debug.perf.end('travelService.getTravelEventDetails')
                debug.error('TravelService.getTravelEventDetails', 'Event is not a travel event (fake)', { eventId })
                console.groupEnd()
                return { data: null, error: new Error('Event is not a travel event') }
            }
            debug.perf.end('travelService.getTravelEventDetails')
            debug.data('TravelService.getTravelEventDetails', 'Response (fake, from event)', { eventId, hasData: true })
            console.groupEnd()
            return { data: travelEvent, error: null }
        }

        debug.perf.end('travelService.getTravelEventDetails')
        debug.data('TravelService.getTravelEventDetails', 'Response (not found, fake)', { eventId })
        console.groupEnd()
        return { data: null, error: null }
    } catch (err) {
        debug.perf.end('travelService.getTravelEventDetails')
        debug.error('TravelService.getTravelEventDetails', 'Failed to get travel event details (fake)', { error: err, eventId })
        console.groupEnd()
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
    console.groupCollapsed(`%csetTravelOverride: ${eventId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.setTravelOverride', 'Setting travel override', { eventId, isTravel, reason })
    debug.perf.start('travelService.setTravelOverride')

    if (!USE_FAKE_DATA) {
        try {
            const { error } = await supabase.rpc('set_travel_override', {
                p_event_id: eventId,
                p_is_travel: isTravel,
                p_reason: reason ?? null,
            } as any)

            if (error) throw error

            debug.perf.end('travelService.setTravelOverride')
            debug.flow('TravelService.setTravelOverride', 'Travel override set successfully', { eventId, isTravel })
            console.groupEnd()
            return { error: null }
        } catch (err) {
            debug.perf.end('travelService.setTravelOverride')
            debug.error('TravelService.setTravelOverride', 'Failed to set travel override', { error: err, eventId, isTravel })
            console.groupEnd()
            console.error('setTravelOverride error:', err)
            return { error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Fake data mode - just simulate success
    await simulateDelay()
    debug.perf.end('travelService.setTravelOverride')
    debug.flow('TravelService.setTravelOverride', 'Travel override set (fake)', { eventId, isTravel })
    console.groupEnd()
    return { error: null }
}

/**
 * Clear travel override for an event
 */
export async function clearTravelOverride(
    _context: UserContext,
    eventId: string
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cclearTravelOverride: ${eventId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.clearTravelOverride', 'Clearing travel override', { eventId })
    debug.perf.start('travelService.clearTravelOverride')

    if (USE_FAKE_DATA) {
        // Fake data mode
        await simulateDelay()
        debug.perf.end('travelService.clearTravelOverride')
        debug.flow('TravelService.clearTravelOverride', 'Travel override cleared (fake)', { eventId })
        console.groupEnd()
        return { error: null }
    }

    // Real Supabase implementation - NO FALLBACK
    try {
        const { error } = await supabase.rpc('clear_travel_override', {
            p_event_id: eventId,
        } as any)

        if (error) throw error

        debug.perf.end('travelService.clearTravelOverride')
        debug.flow('TravelService.clearTravelOverride', 'Travel override cleared successfully', { eventId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('travelService.clearTravelOverride')
        debug.error('TravelService.clearTravelOverride', 'Failed to clear travel override', { error: err, eventId })
        console.groupEnd()
        console.error('clearTravelOverride error:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Travel Plan CRUD Operations
// ============================================================================

/**
 * Create a new travel plan
 */
export async function createTravelPlan(
    context: UserContext,
    data: CreateTravelPlanDTO
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateTravelPlan: ${data.title}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.createTravelPlan', 'Creating travel plan', { title: data.title, teamId: data.team_id, seasonId: data.season_id })
    debug.perf.start('travelService.createTravelPlan')

    try {
        // Validate required fields
        if (!data.team_id || !data.season_id || !data.title || !data.location || !data.start_date || !data.end_date) {
            debug.perf.end('travelService.createTravelPlan')
            debug.error('TravelService.createTravelPlan', 'Missing required fields', { title: data.title })
            console.groupEnd()
            return { data: null, error: new Error('Missing required fields') }
        }

        // Validate UUIDs
        if (!isValidUUID(data.team_id) || !isValidUUID(data.season_id)) {
            debug.perf.end('travelService.createTravelPlan')
            debug.error('TravelService.createTravelPlan', 'Invalid UUID format', { teamId: data.team_id, seasonId: data.season_id })
            console.groupEnd()
            return { data: null, error: new Error('Invalid team or season ID format') }
        }

        // Validate dates
        const normalizedStart = normalizeToISODate(data.start_date)
        const normalizedEnd = normalizeToISODate(data.end_date)
        if (normalizedEnd < normalizedStart) {
            debug.perf.end('travelService.createTravelPlan')
            debug.error('TravelService.createTravelPlan', 'Invalid date range', { startDate: normalizedStart, endDate: normalizedEnd })
            console.groupEnd()
            return { data: null, error: new Error('End date must be on or after start date') }
        }

        // Validate team belongs to org
        const teamValidation = await validateTeamBelongsToOrg(context, data.team_id)
        if (!teamValidation.valid || !teamValidation.orgId) {
            return { data: null, error: teamValidation.error ?? new Error('Team validation failed') }
        }

        // Validate team-season relationship
        const seasonValidation = await validateTeamSeasonRelationship(context, data.team_id, data.season_id)
        if (!seasonValidation.valid) {
            return { data: null, error: seasonValidation.error ?? new Error('Season validation failed') }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()

            const newPlan: FakeTravelPlan = {
                id: `travel-${Date.now()}`,
                org_id: teamValidation.orgId,
                team_id: data.team_id,
                season_id: data.season_id,
                title: data.title,
                location: data.location,
                destination_city: data.destination_city ?? null,
                destination_state: data.destination_state ?? null,
                venue_name: data.venue_name ?? null,
                venue_address: data.venue_address ?? null,
                venue_place_id: (data as any).venue_place_id ?? null,
                venue_lat: (data as any).venue_lat ?? null,
                venue_lng: (data as any).venue_lng ?? null,
                start_date: normalizedStart,
                end_date: normalizedEnd,
                hotel_name: data.hotel_name ?? null,
                hotel_address: data.hotel_address ?? null,
                hotel_phone: data.hotel_phone ?? null,
                hotel_confirmation: data.hotel_confirmation ?? null,
                check_in_time: null,
                check_out_time: null,
                maps_url: data.maps_url ?? null,
                notes: data.notes ?? null,
                itinerary_file_path: null,
                meeting_locations: null,
                status: 'draft',
                published_at: null,
                cancelled_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            // Handle file upload in fake mode
            if (data.itinerary_file && isValidFile(data.itinerary_file)) {
                newPlan.itinerary_file_path = `${teamValidation.orgId}/${data.team_id}/${newPlan.id}/${data.itinerary_file.name}`
            }

            fakeTravelPlans.push(newPlan)
            debug.perf.end('travelService.createTravelPlan')
            debug.flow('TravelService.createTravelPlan', 'Travel plan created (fake)', { planId: newPlan.id, title: data.title })
            console.groupEnd()
            return { data: newPlan, error: null }
        }

        // Real Supabase implementation
        let filePath: string | null = null

        // Upload file first if provided
        if (data.itinerary_file && isValidFile(data.itinerary_file)) {
            const objectPath = `${teamValidation.orgId}/${data.team_id}/temp/${Date.now()}-${sanitizeFilename(data.itinerary_file.name)}`

            const { error: uploadError } = await supabase.storage
                .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                .upload(`travel-itineraries/${objectPath}`, data.itinerary_file, {
                    upsert: false,
                    contentType: data.itinerary_file.type || 'application/pdf',
                })

            if (uploadError) {
                return { data: null, error: new Error(`File upload failed: ${uploadError.message}`) }
            }

            filePath = objectPath
        }

        // Insert travel plan
        // Note: Database types may not include all columns from migration 033
        // Use type assertion for extended columns
        const insertData = {
            team_id: data.team_id,
            season_id: data.season_id,
            title: data.title,
            location: data.location,
            destination_city: data.destination_city ?? null,
            destination_state: data.destination_state ?? null,
            destination_state_code: data.destination_state_code ?? null,
            destination_country: data.destination_country ?? null,
            destination_place_id: data.destination_place_id ?? null,
            destination_lat: data.destination_lat ?? null,
            destination_lng: data.destination_lng ?? null,
            venue_name: data.venue_name ?? null,
            venue_address: data.venue_address ?? null,
            venue_place_id: data.venue_place_id ?? null,
            venue_lat: data.venue_lat ?? null,
            venue_lng: data.venue_lng ?? null,
            start_date: normalizedStart,
            end_date: normalizedEnd,
            hotel_name: data.hotel_name ?? null,
            hotel_address: data.hotel_address ?? null,
            hotel_place_id: data.hotel_place_id ?? null,
            hotel_lat: data.hotel_lat ?? null,
            hotel_lng: data.hotel_lng ?? null,
            hotel_phone: data.hotel_phone ?? null,
            hotel_confirmation: data.hotel_confirmation ?? null,
            maps_url: data.maps_url ?? null,
            notes: data.notes ?? null,
            itinerary_file_path: filePath,
            status: 'draft',
        } as Database['public']['Tables']['travel_plans']['Insert'] & {
            destination_city?: string | null
            destination_state?: string | null
            destination_state_code?: string | null
            destination_country?: string | null
            destination_place_id?: string | null
            destination_lat?: number | null
            destination_lng?: number | null
            venue_place_id?: string | null
            venue_lat?: number | null
            venue_lng?: number | null
            hotel_place_id?: string | null
            hotel_lat?: number | null
            hotel_lng?: number | null
            maps_url?: string | null
            itinerary_file_path?: string | null
            status?: string
        }

        const { data: inserted, error: insertError } = await supabase
            .from('travel_plans')
            .insert(insertData)
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .single()

        if (insertError) {
            // Cleanup uploaded file if insert failed
            if (filePath) {
                await supabase.storage
                    .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                    .remove([`travel-itineraries/${filePath}`])
                    .catch(err => console.error('Failed to cleanup uploaded file:', err))
            }
            debug.perf.end('travelService.createTravelPlan')
            debug.error('TravelService.createTravelPlan', 'Failed to insert travel plan', { error: insertError, title: data.title })
            console.groupEnd()
            return { data: null, error: new Error(`Failed to create travel plan: ${insertError.message}`) }
        }

        // Update file path with actual plan ID if needed
        if (filePath && inserted.id) {
            const finalPath = `${teamValidation.orgId}/${data.team_id}/${inserted.id}/${sanitizeFilename(data.itinerary_file!.name)}`
            if (filePath !== finalPath) {
                // Move file to final location
                const { error: moveError } = await supabase.storage
                    .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                    .move(`travel-itineraries/${filePath}`, `travel-itineraries/${finalPath}`)

                if (!moveError) {
                    await supabase
                        .from('travel_plans')
                        .update({ itinerary_file_path: finalPath } as any)
                        .eq('id', inserted.id)
                }
            }
        }

        const plan = mapSupabaseTravelPlan(inserted as TravelPlanRow)

        // Distribute notifications
        if (plan?.id) {
            const { distributeTravelCreatedNotifications } = await import('./travelNotifications')
            distributeTravelCreatedNotifications({
                travel_id: plan.id,
                team_id: data.team_id,
                org_id: teamValidation.orgId,
                title: data.title,
                start_date: normalizedStart,
                created_by_user_id: context.userId
            }).catch(err => console.error('Failed to distribute travel notifications:', err))
        }

        debug.perf.end('travelService.createTravelPlan')
        debug.flow('TravelService.createTravelPlan', 'Travel plan created successfully', { planId: plan?.id, title: data.title })
        console.groupEnd()
        return { data: plan, error: null }
    } catch (err) {
        debug.perf.end('travelService.createTravelPlan')
        debug.error('TravelService.createTravelPlan', 'Exception creating travel plan', { error: err, title: data.title })
        console.groupEnd()
        console.error('createTravelPlan error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error creating travel plan') }
    }
}

/**
 * Update an existing travel plan
 */
export async function updateTravelPlan(
    context: UserContext,
    planId: string,
    data: UpdateTravelPlanDTO
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    console.groupCollapsed(`%cupdateTravelPlan: ${planId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.updateTravelPlan', 'Updating travel plan', { planId, updates: Object.keys(data) })
    debug.perf.start('travelService.updateTravelPlan')

    try {
        // Validate UUID
        if (!isValidUUID(planId)) {
            debug.perf.end('travelService.updateTravelPlan')
            debug.error('TravelService.updateTravelPlan', 'Invalid plan ID format', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Invalid plan ID format') }
        }

        // Validate dates if provided
        if (data.start_date && data.end_date) {
            const normalizedStart = normalizeToISODate(data.start_date)
            const normalizedEnd = normalizeToISODate(data.end_date)
            if (normalizedEnd < normalizedStart) {
                debug.perf.end('travelService.updateTravelPlan')
                debug.error('TravelService.updateTravelPlan', 'Invalid date range', { planId, startDate: normalizedStart, endDate: normalizedEnd })
                console.groupEnd()
                return { data: null, error: new Error('End date must be on or after start date') }
            }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()

            const planIndex = fakeTravelPlans.findIndex(p => p.id === planId)
            if (planIndex === -1) {
                debug.perf.end('travelService.updateTravelPlan')
                debug.error('TravelService.updateTravelPlan', 'Travel plan not found (fake)', { planId })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan not found') }
            }

            const existingPlan = fakeTravelPlans[planIndex]
            if (existingPlan.org_id !== (context.orgId ?? '')) {
                debug.perf.end('travelService.updateTravelPlan')
                debug.error('TravelService.updateTravelPlan', 'Travel plan does not belong to org (fake)', { planId, planOrgId: existingPlan.org_id, contextOrgId: context.orgId })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan does not belong to your organization') }
            }

            // Update plan
            const updatedPlan: FakeTravelPlan = {
                ...existingPlan,
                title: data.title ?? existingPlan.title,
                location: data.location ?? existingPlan.location,
                destination_city: data.destination_city ?? existingPlan.destination_city,
                destination_state: data.destination_state ?? existingPlan.destination_state,
                start_date: data.start_date ? normalizeToISODate(data.start_date) : existingPlan.start_date,
                end_date: data.end_date ? normalizeToISODate(data.end_date) : existingPlan.end_date,
                venue_name: data.venue_name ?? existingPlan.venue_name,
                venue_address: data.venue_address ?? existingPlan.venue_address,
                venue_place_id: data.venue_place_id ?? existingPlan.venue_place_id,
                venue_lat: data.venue_lat ?? existingPlan.venue_lat,
                venue_lng: data.venue_lng ?? existingPlan.venue_lng,
                hotel_name: data.hotel_name ?? existingPlan.hotel_name,
                hotel_address: data.hotel_address ?? existingPlan.hotel_address,
                hotel_phone: data.hotel_phone ?? existingPlan.hotel_phone,
                hotel_confirmation: data.hotel_confirmation ?? existingPlan.hotel_confirmation,
                maps_url: data.maps_url ?? existingPlan.maps_url,
                notes: data.notes ?? existingPlan.notes,
                updated_at: new Date().toISOString(),
            }

            // Handle file upload/replace
            if (data.itinerary_file && isValidFile(data.itinerary_file)) {
                updatedPlan.itinerary_file_path = `${existingPlan.org_id}/${existingPlan.team_id}/${planId}/${data.itinerary_file.name}`
            }

            fakeTravelPlans[planIndex] = updatedPlan
            return { data: updatedPlan, error: null }
        }

        // Real Supabase implementation
        // Fetch existing plan for validation and optimistic locking
        const { data: existingPlan, error: fetchError } = await supabase
            .from('travel_plans')
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .eq('id', planId)
            .single()

        if (fetchError || !existingPlan) {
            return { data: null, error: new Error('Travel plan not found') }
        }

        // Validate plan belongs to org
        const existingPlanTyped = existingPlan as TravelPlanRow
        if (existingPlanTyped.team?.org_id !== context.orgId) {
            return { data: null, error: new Error('Travel plan does not belong to your organization') }
        }

        let newFilePath: string | null = null
        const oldFilePath: string | null = existingPlanTyped.itinerary_file_path ?? null

        // Handle file upload/replace
        if (data.itinerary_file && isValidFile(data.itinerary_file)) {
            newFilePath = `${existingPlanTyped.team?.org_id ?? context.orgId}/${existingPlanTyped.team_id}/${planId}/${Date.now()}-${sanitizeFilename(data.itinerary_file.name)}`

            const { error: uploadError } = await supabase.storage
                .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                .upload(`travel-itineraries/${newFilePath}`, data.itinerary_file, {
                    upsert: false,
                    contentType: data.itinerary_file.type || 'application/pdf',
                })

            if (uploadError) {
                return { data: null, error: new Error(`File upload failed: ${uploadError.message}`) }
            }
        }

        // Build update data
        const updateData: Record<string, any> = {}
        if (data.title !== undefined) updateData.title = data.title
        if (data.location !== undefined) updateData.location = data.location
        if (data.destination_city !== undefined) updateData.destination_city = data.destination_city
        if (data.destination_state !== undefined) updateData.destination_state = data.destination_state
        if (data.start_date !== undefined) updateData.start_date = normalizeToISODate(data.start_date)
        if (data.end_date !== undefined) updateData.end_date = normalizeToISODate(data.end_date)
        if (data.venue_name !== undefined) updateData.venue_name = data.venue_name
        if (data.venue_address !== undefined) updateData.venue_address = data.venue_address
        if (data.venue_place_id !== undefined) updateData.venue_place_id = data.venue_place_id
        if (data.venue_lat !== undefined) updateData.venue_lat = data.venue_lat
        if (data.venue_lng !== undefined) updateData.venue_lng = data.venue_lng
        if (data.hotel_name !== undefined) updateData.hotel_name = data.hotel_name
        if (data.hotel_address !== undefined) updateData.hotel_address = data.hotel_address
        if (data.hotel_phone !== undefined) updateData.hotel_phone = data.hotel_phone
        if (data.hotel_confirmation !== undefined) updateData.hotel_confirmation = data.hotel_confirmation
        if (data.maps_url !== undefined) updateData.maps_url = data.maps_url
        if (data.notes !== undefined) updateData.notes = data.notes
        if (newFilePath !== null) updateData.itinerary_file_path = newFilePath

        // Update with optimistic locking
        // Ensure updated_at is a string for optimistic locking
        const updatedAtValue = existingPlanTyped.updated_at ?? new Date().toISOString()
        const { data: updated, error: updateError } = await supabase
            .from('travel_plans')
            .update(updateData)
            .eq('id', planId)
            .eq('updated_at', updatedAtValue) // Optimistic locking
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .single()

        if (updateError) {
            // Cleanup new file if update failed
            if (newFilePath) {
                await supabase.storage
                    .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                    .remove([`travel-itineraries/${newFilePath}`])
                    .catch(err => console.error('Failed to cleanup uploaded file:', err))
            }
            debug.perf.end('travelService.updateTravelPlan')
            debug.error('TravelService.updateTravelPlan', 'Failed to update travel plan', { error: updateError, planId })
            console.groupEnd()
            return { data: null, error: new Error(`Failed to update travel plan: ${updateError.message}`) }
        }

        if (!updated) {
            debug.perf.end('travelService.updateTravelPlan')
            debug.error('TravelService.updateTravelPlan', 'Optimistic locking failure', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan was modified by another user. Please refresh and try again.') }
        }

        // Delete old file if replaced
        if (oldFilePath && newFilePath && oldFilePath !== newFilePath) {
            await supabase.storage
                .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                .remove([`travel-itineraries/${oldFilePath}`])
                .catch(err => console.error('Failed to delete old file:', err))
        }

        const plan = mapSupabaseTravelPlan(updated as TravelPlanRow)
        debug.perf.end('travelService.updateTravelPlan')
        debug.flow('TravelService.updateTravelPlan', 'Travel plan updated successfully', { planId })
        console.groupEnd()
        return { data: plan, error: null }
    } catch (err) {
        debug.perf.end('travelService.updateTravelPlan')
        debug.error('TravelService.updateTravelPlan', 'Exception updating travel plan', { error: err, planId })
        console.groupEnd()
        console.error('updateTravelPlan error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error updating travel plan') }
    }
}

/**
 * Upload travel itinerary file
 */
export async function uploadTravelItinerary(
    context: UserContext,
    planId: string,
    file: File
): Promise<{ data: string | null; error: Error | null }> {
    console.groupCollapsed(`%cuploadTravelItinerary: ${planId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.uploadTravelItinerary', 'Uploading travel itinerary', { planId, fileName: file.name, fileSize: file.size })
    debug.perf.start('travelService.uploadTravelItinerary')

    try {
        // Validate UUID
        if (!isValidUUID(planId)) {
            debug.perf.end('travelService.uploadTravelItinerary')
            debug.error('TravelService.uploadTravelItinerary', 'Invalid plan ID format', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Invalid plan ID format') }
        }

        // Validate file
        if (!isValidFile(file)) {
            debug.perf.end('travelService.uploadTravelItinerary')
            debug.error('TravelService.uploadTravelItinerary', 'Invalid file object', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Invalid file object') }
        }

        // Validate file type and size
        const isValidType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        if (!isValidType) {
            debug.perf.end('travelService.uploadTravelItinerary')
            debug.error('TravelService.uploadTravelItinerary', 'Invalid file type', { planId, fileType: file.type })
            console.groupEnd()
            return { data: null, error: new Error('File must be a PDF') }
        }

        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            debug.perf.end('travelService.uploadTravelItinerary')
            debug.error('TravelService.uploadTravelItinerary', 'File size exceeds limit', { planId, fileSize: file.size })
            console.groupEnd()
            return { data: null, error: new Error('File size exceeds 10MB limit') }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()
            const filePath = `${context.orgId ?? 'org'}/${planId}/${Date.now()}-${sanitizeFilename(file.name)}`
            debug.perf.end('travelService.uploadTravelItinerary')
            debug.flow('TravelService.uploadTravelItinerary', 'Itinerary uploaded (fake)', { planId, filePath })
            console.groupEnd()
            return { data: filePath, error: null }
        }

        // Get plan to determine org_id and team_id
        const { data: plan, error: planError } = await supabase
            .from('travel_plans')
            .select('team_id, team:teams(org_id)')
            .eq('id', planId)
            .single()

        if (planError || !plan) {
            return { data: null, error: new Error('Travel plan not found') }
        }

        const orgId = (plan.team as { org_id: string } | null)?.org_id ?? context.orgId ?? ''
        const objectPath = `${orgId}/${(plan as { team_id: string }).team_id}/${planId}/${Date.now()}-${sanitizeFilename(file.name)}`

        const { error: uploadError } = await supabase.storage
            .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
            .upload(`travel-itineraries/${objectPath}`, file, {
                upsert: false,
                contentType: file.type || 'application/pdf',
            })

        if (uploadError) {
            debug.perf.end('travelService.uploadTravelItinerary')
            debug.error('TravelService.uploadTravelItinerary', 'File upload failed', { error: uploadError, planId })
            console.groupEnd()
            return { data: null, error: new Error(`File upload failed: ${uploadError.message}`) }
        }

        // Update plan with file path
        // Note: Database types may not include itinerary_file_path column
        const { error: updateError } = await supabase
            .from('travel_plans')
            .update({ itinerary_file_path: objectPath } as any)
            .eq('id', planId)

        if (updateError) {
            // Cleanup uploaded file if update failed
            await supabase.storage
                .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                .remove([`travel-itineraries/${objectPath}`])
                .catch(err => console.error('Failed to cleanup uploaded file:', err))
            debug.perf.end('travelService.uploadTravelItinerary')
            debug.error('TravelService.uploadTravelItinerary', 'Failed to update travel plan', { error: updateError, planId })
            console.groupEnd()
            return { data: null, error: new Error(`Failed to update travel plan: ${updateError.message}`) }
        }

        debug.perf.end('travelService.uploadTravelItinerary')
        debug.flow('TravelService.uploadTravelItinerary', 'Itinerary uploaded successfully', { planId, filePath: objectPath })
        console.groupEnd()
        return { data: objectPath, error: null }
    } catch (err) {
        debug.perf.end('travelService.uploadTravelItinerary')
        debug.error('TravelService.uploadTravelItinerary', 'Exception uploading itinerary', { error: err, planId })
        console.groupEnd()
        console.error('uploadTravelItinerary error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error uploading file') }
    }
}

/**
 * Get signed URL for travel itinerary download
 */
export async function getTravelItinerarySignedUrl(
    _context: UserContext,
    planId: string
): Promise<{ data: string | null; error: Error | null }> {
    try {
        // Validate UUID
        if (!isValidUUID(planId)) {
            return { data: null, error: new Error('Invalid plan ID format') }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()
            return { data: 'https://example.com/fake-itinerary.pdf', error: null }
        }

        // Get plan with file path
        const { data: plan, error: planError } = await supabase
            .from('travel_plans')
            .select('itinerary_file_path')
            .eq('id', planId)
            .single()

        if (planError || !plan) {
            debug.perf.end('travelService.getTravelItinerarySignedUrl')
            debug.error('TravelService.getTravelItinerarySignedUrl', 'Travel plan not found', { planId, error: planError })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan not found') }
        }

        const filePath = (plan as unknown as { itinerary_file_path: string | null }).itinerary_file_path
        if (!filePath) {
            debug.perf.end('travelService.getTravelItinerarySignedUrl')
            debug.error('TravelService.getTravelItinerarySignedUrl', 'No itinerary file found', { planId })
            console.groupEnd()
            return { data: null, error: new Error('No itinerary file found for this travel plan') }
        }

        // Generate signed URL (10 minute expiry)
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
            .createSignedUrl(`travel-itineraries/${filePath}`, 60 * 10)

        if (urlError || !signedUrlData) {
            debug.perf.end('travelService.getTravelItinerarySignedUrl')
            debug.error('TravelService.getTravelItinerarySignedUrl', 'Failed to generate signed URL', { error: urlError, planId })
            console.groupEnd()
            return { data: null, error: new Error(`Failed to generate download URL: ${urlError?.message ?? 'Unknown error'}`) }
        }

        debug.perf.end('travelService.getTravelItinerarySignedUrl')
        debug.data('TravelService.getTravelItinerarySignedUrl', 'Response', { planId, hasUrl: !!signedUrlData.signedUrl })
        console.groupEnd()
        return { data: signedUrlData.signedUrl, error: null }
    } catch (err) {
        debug.perf.end('travelService.getTravelItinerarySignedUrl')
        debug.error('TravelService.getTravelItinerarySignedUrl', 'Exception generating signed URL', { error: err, planId })
        console.groupEnd()
        console.error('getTravelItinerarySignedUrl error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error generating download URL') }
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
    console.groupCollapsed(`%cgetTravelPlans: ${JSON.stringify(params)}`, 'color: #666; font-weight: bold;');
    debug.data('TravelService.getTravelPlans', 'Request', { context: { userId: context.userId, orgId: context.orgId }, params })
    debug.perf.start('travelService.getTravelPlans')

    const isGuardianViewer = context.roles.includes('parent')

    if (USE_FAKE_DATA) {
        // Convert to event-based approach for fake data
        const { data: events, error } = await getTravelEvents(context, {
            teamId: params.teamId,
            upcomingOnly: params.upcomingOnly,
            includeCancelled: params.status === 'cancelled',
        })

        if (error) {
            debug.perf.end('travelService.getTravelPlans')
            debug.error('TravelService.getTravelPlans', 'Failed to get travel events (fake)', { error, params })
            console.groupEnd()
            return { data: [], error }
        }

        // Convert back to FakeTravelPlan format for backward compatibility
        const plans = events.map(e => {
            const plan = convertEventToTravelPlan(e)
            // Enrich with team and season info for fake data if missing
            if (!plan.team && plan.team_id) {
                const team = getTeamById(plan.team_id)
                if (team) {
                    plan.team = { id: team.id, name: team.name }
                }
            }
            if (!plan.season && plan.season_id) {
                const season = getSeasonById(plan.season_id)
                if (season) {
                    plan.season = { id: season.id, name: season.name }
                }
            }
            return plan
        })

        // Guardians/parents should never see unpublished/draft plans
        const visibilityFilteredPlans = isGuardianViewer
            ? plans.filter(p => p.status !== 'draft')
            : plans

        // Filter by status if specified
        if (params.status && params.status !== 'cancelled') {
            const filtered = visibilityFilteredPlans.filter(p => p.status === params.status)
            debug.perf.end('travelService.getTravelPlans')
            debug.data('TravelService.getTravelPlans', 'Response (fake)', { planCount: filtered.length, params })
            console.groupEnd()
            return { data: filtered, error: null }
        }

        debug.perf.end('travelService.getTravelPlans')
        debug.data('TravelService.getTravelPlans', 'Response (fake)', { planCount: visibilityFilteredPlans.length, params })
        console.groupEnd()
        return { data: visibilityFilteredPlans, error: null }
    }

    // Real Supabase implementation - query travel_plans table directly
    try {
        // For guardians/parents, first get their accessible teams
        let accessibleTeamIds: string[] | null = null
        if (isGuardianViewer && !context.roles.includes('org_admin')) {
            if (!context.orgId) {
                debug.perf.end('travelService.getTravelPlans')
                debug.error('TravelService.getTravelPlans', 'Missing organization context', { params })
                console.groupEnd()
                return { data: [], error: new Error('Missing organization context') }
            }

            // Step 1: Get athlete IDs this guardian can access (active only)
            const { data: guardianAthletes, error: guardianAthletesError } = await supabase.rpc(
                'get_guardian_athletes',
                { p_org_id: context.orgId, p_user_id: context.userId }
            )

            if (guardianAthletesError) {
                debug.perf.end('travelService.getTravelPlans')
                debug.error('TravelService.getTravelPlans', 'Failed to fetch guardian athletes', { error: guardianAthletesError, params })
                console.groupEnd()
                console.error('Error fetching guardian athletes:', guardianAthletesError)
                return { data: [], error: new Error(guardianAthletesError.message) }
            }

            const athleteIds = (guardianAthletes || [])
                .filter((a: any) => a?.status === 'active')
                .map((a: any) => a.athlete_id)
                .filter(Boolean)

            if (athleteIds.length === 0) {
                debug.perf.end('travelService.getTravelPlans')
                debug.data('TravelService.getTravelPlans', 'Response (no accessible athletes)', { params })
                console.groupEnd()
                return { data: [], error: null }
            }

            // Step 2: Get team IDs for those athletes
            const { data: memberships, error: membershipError } = await supabase
                .from('team_memberships')
                .select('team_id')
                .in('athlete_id', athleteIds)

            if (membershipError) {
                debug.perf.end('travelService.getTravelPlans')
                debug.error('TravelService.getTravelPlans', 'Failed to fetch team memberships', { error: membershipError, params })
                console.groupEnd()
                console.error('Error fetching team memberships:', membershipError)
                return { data: [], error: new Error(membershipError.message) }
            }

            accessibleTeamIds = [...new Set((memberships || []).map((m: any) => m.team_id).filter(Boolean))]
        }

        let query = supabase
            .from('travel_plans')
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)

        // Filter by team
        if (params.teamId) {
            if (accessibleTeamIds !== null && !accessibleTeamIds.includes(params.teamId)) {
                return { data: [], error: null }
            }
            query = query.eq('team_id', params.teamId)
        } else if (accessibleTeamIds !== null) {
            // Guardian/parent: filter to only their athlete's teams
            if (accessibleTeamIds.length === 0) {
                return { data: [], error: null }
            }
            query = query.in('team_id', accessibleTeamIds)
        }

        // Note: Status filtering is handled by RLS policies in the database
        // If status column exists and params.status is provided, filter by it
        // Otherwise, RLS will handle visibility based on user role
        // We don't filter by status here to avoid errors if the column doesn't exist

        // Filter by upcoming only
        if (params.upcomingOnly) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayStr = today.toISOString().split('T')[0]
            query = query.gte('end_date', todayStr)
        }

        // Apply ordering
        query = query.order('start_date', { ascending: true })

        const { data, error } = await query

        if (error) {
            console.error('Supabase query error:', error)
            throw error
        }

        // Map Supabase rows to FakeTravelPlan format using type-safe function
        const plans: FakeTravelPlan[] = (data || []).map((row: unknown) => {
            // Type guard and map - row should match TravelPlanRow structure from query
            if (typeof row === 'object' && row !== null) {
                return mapSupabaseTravelPlan(row as TravelPlanRow)
            }
            throw new Error('Invalid travel plan data format')
        })

        const visibilityFilteredPlans = isGuardianViewer
            ? plans.filter(p => p.status !== 'draft')
            : plans

        debug.perf.end('travelService.getTravelPlans')
        debug.data('TravelService.getTravelPlans', 'Response', { planCount: visibilityFilteredPlans.length, params })
        console.groupEnd()
        return { data: visibilityFilteredPlans, error: null }
    } catch (err) {
        debug.perf.end('travelService.getTravelPlans')
        debug.error('TravelService.getTravelPlans', 'Failed to get travel plans', { error: err, params })
        console.groupEnd()
        console.error('getTravelPlans error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        const supabaseError = err as any
        if (supabaseError?.code || supabaseError?.details || supabaseError?.hint) {
            console.error('Supabase error details:', {
                code: supabaseError.code,
                message: supabaseError.message,
                details: supabaseError.details,
                hint: supabaseError.hint
            })
        }
        return { data: [], error: err instanceof Error ? err : new Error(errorMessage) }
    }
}

/**
 * Convert a TravelEvent back to FakeTravelPlan format
 */
function convertEventToTravelPlan(event: TravelEvent): FakeTravelPlan {
    return {
        id: event.id,
        org_id: event.team?.org_id || '',
        team_id: event.team_id || event.team?.id || '',
        season_id: event.season_id || event.season?.id || '',
        title: event.title,
        location: event.location || event.event_location?.city || '',
        destination_city: event.event_location?.city || null,
        destination_state: event.event_location?.state || null,
        venue_name: event.event_location?.venue_name || null,
        venue_address: event.event_location?.address_line1 || null,
        venue_place_id: (event.event_location as any)?.place_id || null,
        venue_lat: (event.event_location as any)?.latitude || null,
        venue_lng: (event.event_location as any)?.longitude || null,
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
        team: event.team ? { id: event.team.id, name: event.team.name } : undefined,
        season: event.season ? { id: event.season.id, name: event.season.name } : undefined,
    }
}

/**
 * @deprecated Use getTravelEventDetails instead
 */
export async function getTravelPlanDetails(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    console.groupCollapsed(`%cgetTravelPlanDetails: ${planId}`, 'color: #666; font-weight: bold;');
    debug.data('TravelService.getTravelPlanDetails', 'Request', { planId, orgId: context.orgId })
    debug.perf.start('travelService.getTravelPlanDetails')

    const isGuardianViewer = context.roles.includes('parent')

    if (USE_FAKE_DATA) {
        const { data: event, error } = await getTravelEventDetails(context, planId)

        if (error || !event) {
            debug.perf.end('travelService.getTravelPlanDetails')
            debug.error('TravelService.getTravelPlanDetails', 'Failed to get travel event details (fake)', { planId, error })
            console.groupEnd()
            return { data: null, error }
        }

        const plan = convertEventToTravelPlan(event)
        if (isGuardianViewer && plan.status === 'draft') {
            debug.perf.end('travelService.getTravelPlanDetails')
            debug.error('TravelService.getTravelPlanDetails', 'Draft plan not accessible to guardian (fake)', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan not found') }
        }
        debug.perf.end('travelService.getTravelPlanDetails')
        debug.data('TravelService.getTravelPlanDetails', 'Response (fake)', { planId, hasData: true })
        console.groupEnd()
        return { data: plan, error: null }
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
            venue_place_id: (data as any).venue_place_id || null,
            venue_lat: (data as any).venue_lat || null,
            venue_lng: (data as any).venue_lng || null,
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

        // Guardians can't see draft plans
        if (isGuardianViewer && plan.status === 'draft') {
            debug.perf.end('travelService.getTravelPlanDetails')
            debug.error('TravelService.getTravelPlanDetails', 'Draft plan not accessible to guardian', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan not found') }
        }

        // Guardians can only see plans for teams their athletes are on
        if (isGuardianViewer && !context.roles.includes('org_admin')) {
            if (!context.orgId) {
                debug.perf.end('travelService.getTravelPlanDetails')
                debug.error('TravelService.getTravelPlanDetails', 'Missing org context for guardian', { planId })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan not found') }
            }

            const { data: guardianAthletes, error: guardianAthletesError } = await supabase.rpc(
                'get_guardian_athletes',
                { p_org_id: context.orgId, p_user_id: context.userId }
            )

            if (guardianAthletesError) {
                debug.perf.end('travelService.getTravelPlanDetails')
                debug.error('TravelService.getTravelPlanDetails', 'Failed to fetch guardian athletes', { error: guardianAthletesError, planId })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan not found') }
            }

            const athleteIds = (guardianAthletes || [])
                .filter((a: any) => a?.status === 'active')
                .map((a: any) => a.athlete_id)
                .filter(Boolean)

            if (athleteIds.length === 0) {
                debug.perf.end('travelService.getTravelPlanDetails')
                debug.error('TravelService.getTravelPlanDetails', 'No accessible athletes for guardian', { planId })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan not found') }
            }

            const { data: memberships, error: membershipError } = await supabase
                .from('team_memberships')
                .select('id')
                .eq('team_id', plan.team_id)
                .in('athlete_id', athleteIds)
                .limit(1)

            if (membershipError || !memberships || memberships.length === 0) {
                debug.perf.end('travelService.getTravelPlanDetails')
                debug.error('TravelService.getTravelPlanDetails', 'Guardian has no access to team', { planId, teamId: plan.team_id, error: membershipError })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan not found') }
            }
        }

        debug.perf.end('travelService.getTravelPlanDetails')
        debug.data('TravelService.getTravelPlanDetails', 'Response', { planId, hasData: true })
        console.groupEnd()
        return { data: plan, error: null }
    } catch (err) {
        debug.perf.end('travelService.getTravelPlanDetails')
        debug.error('TravelService.getTravelPlanDetails', 'Failed to get travel plan details', { error: err, planId })
        console.groupEnd()
        console.error('getTravelPlanDetails error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Travel Plan Contacts Management (Raw CRUD)
// ============================================================================

/**
 * Get raw contacts for a travel plan (for editing).
 * Returns the raw rows from travel_plan_contacts, indexed by category.
 */
export async function getTravelPlanContacts(
    _context: UserContext,
    planId: string
): Promise<{ data: Record<TravelContactCategory, TravelPlanContactRow | null>; error: Error | null }> {
    console.groupCollapsed(`%cgetTravelPlanContacts: ${planId}`, 'color: #666; font-weight: bold;');
    debug.data('TravelService.getTravelPlanContacts', 'Request', { planId })
    debug.perf.start('travelService.getTravelPlanContacts')

    if (USE_FAKE_DATA) {
        await simulateDelay()

        if (!isSupportedFakeTravelPlanId(planId)) {
            debug.perf.end('travelService.getTravelPlanContacts')
            debug.error('TravelService.getTravelPlanContacts', 'Invalid plan ID (fake)', { planId })
            console.groupEnd()
            return { data: emptyTravelPlanContactResult(), error: new Error('Invalid plan ID') }
        }

        const result = ensureFakeTravelPlanContacts(planId)
        debug.perf.end('travelService.getTravelPlanContacts')
        debug.data('TravelService.getTravelPlanContacts', 'Response (fake)', { planId })
        console.groupEnd()
        return { data: result, error: null }
    }

    if (!isValidUUID(planId)) {
        debug.perf.end('travelService.getTravelPlanContacts')
        debug.error('TravelService.getTravelPlanContacts', 'Invalid plan ID', { planId })
        console.groupEnd()
        return { data: {} as any, error: new Error('Invalid plan ID') }
    }

    const baseResult = TRAVEL_CONTACT_CATEGORIES.reduce((acc, cat) => {
        acc[cat] = null
        return acc
    }, {} as Record<TravelContactCategory, TravelPlanContactRow | null>)

    try {
        const { data, error } = await supabaseAny
            .from('travel_plan_contacts')
            .select('id, travel_plan_id, category, is_custom, first_name, last_name, email, phone, updated_at')
            .eq('travel_plan_id', planId)

        if (error) throw error

        // Initialize with nulls
        const result = { ...baseResult }

        // Fill with data
        data?.forEach((row: any) => {
            if (TRAVEL_CONTACT_CATEGORIES.includes(row.category)) {
                result[row.category as TravelContactCategory] = row as TravelPlanContactRow
            }
        })

        debug.perf.end('travelService.getTravelPlanContacts')
        debug.data('TravelService.getTravelPlanContacts', 'Response', { planId, contactCount: Object.values(result).filter(Boolean).length })
        console.groupEnd()
        return { data: result, error: null }
    } catch (err: any) {
        if (err?.code === '42703') {
            debug.perf.end('travelService.getTravelPlanContacts')
            debug.error('TravelService.getTravelPlanContacts', 'Column alias mismatch', { error: err, planId })
            console.groupEnd()
            console.warn('getTravelPlanContacts: column alias mismatch (organization_id); returning empty contacts', err)
            return { data: baseResult, error: null }
        }
        debug.perf.end('travelService.getTravelPlanContacts')
        debug.error('TravelService.getTravelPlanContacts', 'Failed to get travel plan contacts', { error: err, planId })
        console.groupEnd()
        console.error('getTravelPlanContacts error:', err)
        return { data: {} as any, error: toError(err, 'Unknown error fetching contacts') }
    }
}

/**
 * Delete all travel plan contacts for a plan (so categories fall back to org default).
 */
export async function deleteTravelPlanContactsForPlan(
    _context: UserContext,
    planId: string
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cdeleteTravelPlanContactsForPlan: ${planId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.deleteTravelPlanContactsForPlan', 'Deleting travel plan contacts', { planId })
    debug.perf.start('travelService.deleteTravelPlanContactsForPlan')

    if (USE_FAKE_DATA) {
        await simulateDelay()

        if (!isSupportedFakeTravelPlanId(planId)) {
            debug.perf.end('travelService.deleteTravelPlanContactsForPlan')
            debug.error('TravelService.deleteTravelPlanContactsForPlan', 'Invalid plan ID (fake)', { planId })
            console.groupEnd()
            return { error: new Error('Invalid plan ID') }
        }

        fakeTravelPlanContactsStore.delete(planId)
        debug.perf.end('travelService.deleteTravelPlanContactsForPlan')
        debug.flow('TravelService.deleteTravelPlanContactsForPlan', 'Contacts deleted (fake)', { planId })
        console.groupEnd()
        return { error: null }
    }

    if (!isValidUUID(planId)) {
        debug.perf.end('travelService.deleteTravelPlanContactsForPlan')
        debug.error('TravelService.deleteTravelPlanContactsForPlan', 'Invalid plan ID', { planId })
        console.groupEnd()
        return { error: new Error('Invalid plan ID') }
    }

    try {
        const { error } = await supabaseAny
            .from('travel_plan_contacts')
            .delete()
            .eq('travel_plan_id', planId)

        if (error) throw error
        debug.perf.end('travelService.deleteTravelPlanContactsForPlan')
        debug.flow('TravelService.deleteTravelPlanContactsForPlan', 'Contacts deleted successfully', { planId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('travelService.deleteTravelPlanContactsForPlan')
        debug.error('TravelService.deleteTravelPlanContactsForPlan', 'Failed to delete contacts', { error: err, planId })
        console.groupEnd()
        console.error('deleteTravelPlanContactsForPlan error:', err)
        return { error: toError(err, 'Unknown error deleting travel plan contacts') }
    }
}

/**
 * Insert travel plan contacts (custom overrides only).
 * Call after deleteTravelPlanContactsForPlan to replace with only custom rows.
 */
export async function insertTravelPlanContacts(
    _context: UserContext,
    planId: string,
    contacts: {
        category: TravelContactCategory;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string | null;
    }[]
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        if (!isSupportedFakeTravelPlanId(planId)) {
            return { error: new Error('Invalid plan ID') }
        }

        const existing = ensureFakeTravelPlanContacts(planId)
        const updated: Record<TravelContactCategory, TravelPlanContactRow | null> = { ...existing }

        contacts.forEach((contact) => {
            updated[contact.category] = createFakeTravelPlanContactRow(planId, contact.category, {
                is_custom: true,
                first_name: contact.first_name,
                last_name: contact.last_name,
                email: contact.email,
                phone: contact.phone ?? null,
            })
        })

        fakeTravelPlanContactsStore.set(planId, updated)
        return { error: null }
    }

    if (!isValidUUID(planId)) {
        return { error: new Error('Invalid plan ID') }
    }

    try {
        if (contacts.length === 0) {
            debug.perf.end('travelService.insertTravelPlanContacts')
            debug.data('TravelService.insertTravelPlanContacts', 'No contacts to insert', { planId })
            console.groupEnd()
            return { error: null }
        }

        const rows = contacts.map(c => ({
            travel_plan_id: planId,
            category: c.category,
            is_custom: true,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone: c.phone ?? null,
        }))

        const { error } = await supabaseAny
            .from('travel_plan_contacts')
            .insert(rows)

        if (error) throw error
        debug.perf.end('travelService.insertTravelPlanContacts')
        debug.flow('TravelService.insertTravelPlanContacts', 'Contacts inserted successfully', { planId, contactCount: contacts.length })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('travelService.insertTravelPlanContacts')
        debug.error('TravelService.insertTravelPlanContacts', 'Failed to insert contacts', { error: err, planId })
        console.groupEnd()
        console.error('insertTravelPlanContacts error:', err)
        return { error: toError(err, 'Unknown error saving travel plan contacts') }
    }
}

/**
 * Upsert travel plan contacts (all categories; keeps rows for is_custom false).
 * Prefer deleteTravelPlanContactsForPlan + insertTravelPlanContacts for replace semantics.
 */
export async function upsertTravelPlanContacts(
    _context: UserContext,
    planId: string,
    contacts: {
        category: TravelContactCategory;
        is_custom: boolean;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        phone?: string | null
    }[]
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cupsertTravelPlanContacts: ${planId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.upsertTravelPlanContacts', 'Upserting travel plan contacts', { planId, contactCount: contacts.length })
    debug.perf.start('travelService.upsertTravelPlanContacts')

    if (USE_FAKE_DATA) {
        await simulateDelay()

        if (!isSupportedFakeTravelPlanId(planId)) {
            debug.perf.end('travelService.upsertTravelPlanContacts')
            debug.error('TravelService.upsertTravelPlanContacts', 'Invalid plan ID (fake)', { planId })
            console.groupEnd()
            return { error: new Error('Invalid plan ID') }
        }

        const existing = ensureFakeTravelPlanContacts(planId)
        const updated: Record<TravelContactCategory, TravelPlanContactRow | null> = { ...existing }
        contacts.forEach((contact) => {
            updated[contact.category] = createFakeTravelPlanContactRow(planId, contact.category, {
                is_custom: contact.is_custom,
                first_name: contact.first_name ?? null,
                last_name: contact.last_name ?? null,
                email: contact.email ?? null,
                phone: contact.phone ?? null,
            })
        })
        fakeTravelPlanContactsStore.set(planId, updated)

        debug.perf.end('travelService.upsertTravelPlanContacts')
        debug.flow('TravelService.upsertTravelPlanContacts', 'Contacts upserted (fake)', { planId })
        console.groupEnd()
        return { error: null }
    }

    if (!isValidUUID(planId)) {
        debug.perf.end('travelService.upsertTravelPlanContacts')
        debug.error('TravelService.upsertTravelPlanContacts', 'Invalid plan ID', { planId })
        console.groupEnd()
        return { error: new Error('Invalid plan ID') }
    }

    try {
        if (contacts.length === 0) {
            debug.perf.end('travelService.upsertTravelPlanContacts')
            debug.data('TravelService.upsertTravelPlanContacts', 'No contacts to upsert', { planId })
            console.groupEnd()
            return { error: null }
        }

        const rows = contacts.map(c => ({
            travel_plan_id: planId,
            category: c.category,
            is_custom: c.is_custom,
            first_name: c.first_name ?? null,
            last_name: c.last_name ?? null,
            email: c.email ?? null,
            phone: c.phone ?? null,
            updated_at: new Date().toISOString(),
        }))

        const { error } = await supabaseAny
            .from('travel_plan_contacts')
            .upsert(rows, {
                onConflict: 'travel_plan_id,category'
            })

        if (error) throw error

        debug.perf.end('travelService.upsertTravelPlanContacts')
        debug.flow('TravelService.upsertTravelPlanContacts', 'Contacts upserted successfully', { planId, contactCount: contacts.length })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('travelService.upsertTravelPlanContacts')
        debug.error('TravelService.upsertTravelPlanContacts', 'Failed to upsert contacts', { error: err, planId })
        console.groupEnd()
        console.error('upsertTravelPlanContacts error:', err)
        return { error: toError(err, 'Unknown error saving contacts') }
    }
}

/**
 * Resolve all travel contacts for a plan.
 */
export async function resolveAllTravelContactsForPlan(
    _context: UserContext,
    planId: string
): Promise<{ data: ResolvedTravelContacts; error: Error | null }> {
    console.groupCollapsed(`%cresolveAllTravelContactsForPlan: ${planId}`, 'color: #666; font-weight: bold;');
    debug.data('TravelService.resolveAllTravelContactsForPlan', 'Request', { planId })
    debug.perf.start('travelService.resolveAllTravelContactsForPlan')

    if (USE_FAKE_DATA) {
        await simulateDelay()

        if (!isSupportedFakeTravelPlanId(planId)) {
            debug.perf.end('travelService.resolveAllTravelContactsForPlan')
            debug.error('TravelService.resolveAllTravelContactsForPlan', 'Invalid plan ID (fake)', { planId })
            console.groupEnd()
            return { data: {} as any, error: new Error('Invalid plan ID') }
        }

        const planContacts = ensureFakeTravelPlanContacts(planId)
        const { data: orgContacts, error: orgContactsError } = await getOrganizationTravelContacts(_context)
        if (orgContactsError) {
            debug.perf.end('travelService.resolveAllTravelContactsForPlan')
            debug.error('TravelService.resolveAllTravelContactsForPlan', 'Failed to load org contacts (fake)', {
                planId,
                error: orgContactsError,
            })
            console.groupEnd()
            return { data: {} as any, error: orgContactsError }
        }

        const defaultOrgContact = orgContacts.default
        const result = TRAVEL_CONTACT_CATEGORIES.reduce((acc, cat) => {
            const planRow = planContacts[cat]
            const categoryOrgContact = orgContacts[cat]
            const resolvedSource =
                planRow?.is_custom && hasContactData(planRow)
                    ? planRow
                    : (categoryOrgContact ?? defaultOrgContact)

            acc[cat] = {
                first_name: resolvedSource?.first_name ?? '',
                last_name: resolvedSource?.last_name ?? '',
                email: resolvedSource?.email ?? '',
                phone: resolvedSource?.phone ?? null,
            }
            return acc
        }, {} as ResolvedTravelContacts)
        debug.perf.end('travelService.resolveAllTravelContactsForPlan')
        debug.data('TravelService.resolveAllTravelContactsForPlan', 'Response (fake)', { planId })
        console.groupEnd()
        return { data: result, error: null }
    }

    if (!isValidUUID(planId)) {
        debug.perf.end('travelService.resolveAllTravelContactsForPlan')
        debug.error('TravelService.resolveAllTravelContactsForPlan', 'Invalid plan ID', { planId })
        console.groupEnd()
        return { data: {} as any, error: new Error('Invalid plan ID') }
    }

    try {
        const { data, error } = await supabaseAny
            .rpc('resolve_travel_contacts_for_plan', {
                p_plan_id: planId
            })

        if (error) throw error

        // Data is JSONB (categories -> { first_name, last_name, email, phone }); RPC does not return source
        const raw = data as Record<string, any> | null
        const result = TRAVEL_CONTACT_CATEGORIES.reduce((acc, cat) => {
            const contact = raw?.[cat]
            acc[cat] = contact ? {
                first_name: contact.first_name || '',
                last_name: contact.last_name || '',
                email: contact.email || '',
                phone: contact.phone ?? null
            } : {
                first_name: '', last_name: '', email: '', phone: null
            }
            return acc
        }, {} as ResolvedTravelContacts)

        debug.perf.end('travelService.resolveAllTravelContactsForPlan')
        debug.data('TravelService.resolveAllTravelContactsForPlan', 'Response', { planId, categoryCount: Object.keys(result).length })
        console.groupEnd()
        return { data: result, error: null }
    } catch (err) {
        debug.perf.end('travelService.resolveAllTravelContactsForPlan')
        debug.error('TravelService.resolveAllTravelContactsForPlan', 'Failed to resolve contacts', { error: err, planId })
        console.groupEnd()
        console.error('resolveAllTravelContactsForPlan error:', err)
        return { data: {} as any, error: toError(err, 'Unknown error resolving contacts') }
    }
}

/**
 * Resolve a single category contact for a plan.
 */
export async function resolveTravelContact(
    context: UserContext,
    planId: string,
    category: TravelContactCategory
): Promise<{ data: ResolvedContact; error: Error | null }> {
    const { data: all, error } = await resolveAllTravelContactsForPlan(context, planId)
    // If we have an error, return empty with error? Or just propagate.
    // Logic: data is ResolvedTravelContacts = Record<Category, ResolvedContact>
    if (error) {
        return {
            data: { first_name: '', last_name: '', email: '', phone: null },
            error
        }
    }

    return { data: all[category], error: null }
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
 * Publish a travel plan (change status from draft to published)
 */
/**
 * Send notification for published travel plan
 */
async function notifyTravelPlanPublished(
    context: UserContext,
    plan: TravelPlanRow
) {
    try {
        // Resolve contacts
        const { data: contacts } = await resolveAllTravelContactsForPlan(context, plan.id)

        // Format contacts for email
        // We'll create a simple HTML list or text block
        let contactDetails = ''
        if (contacts) {
            contactDetails = Object.entries(contacts)
                .filter(([_, c]) => c.email || c.phone)
                .map(([cat, c]) => {
                    const label = TRAVEL_CONTACT_CATEGORY_LABELS[cat] || cat
                    return `<strong>${label}:</strong> ${c.first_name} ${c.last_name} ` +
                        `(${[c.email, c.phone].filter(Boolean).join(', ')})`
                })
                .join('<br/>')
        }
        void contactDetails

        // Email sending uses Node fs/Resend and cannot run in the browser.
        // To notify on publish, invoke an Edge Function or backend job that uses
        // the notification-worker emailService (or similar) with the plan and contactDetails.
    } catch (err) {
        console.error('Failed to send travel plan notification', err)
    }
}

/**
 * Publish a travel plan (change status from draft to published)
 */
export async function publishTravelPlan(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    console.groupCollapsed(`%cpublishTravelPlan: ${planId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.publishTravelPlan', 'Publishing travel plan', { planId })
    debug.perf.start('travelService.publishTravelPlan')

    try {
        // Validate UUID
        if (!isValidUUID(planId)) {
            debug.perf.end('travelService.publishTravelPlan')
            debug.error('TravelService.publishTravelPlan', 'Invalid plan ID format', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Invalid plan ID format') }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()

            const planIndex = fakeTravelPlans.findIndex(p => p.id === planId)
            if (planIndex === -1) {
                debug.perf.end('travelService.publishTravelPlan')
                debug.error('TravelService.publishTravelPlan', 'Travel plan not found (fake)', { planId })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan not found') }
            }

            const plan = fakeTravelPlans[planIndex]

            // Validate status transition
            if (plan.status === 'cancelled') {
                debug.perf.end('travelService.publishTravelPlan')
                debug.error('TravelService.publishTravelPlan', 'Cannot publish cancelled plan (fake)', { planId })
                console.groupEnd()
                return { data: null, error: new Error('Cannot publish a cancelled plan. Please create a new plan.') }
            }

            if (plan.status === 'published') {
                // Already published, return as-is
                debug.perf.end('travelService.publishTravelPlan')
                debug.flow('TravelService.publishTravelPlan', 'Plan already published (fake)', { planId })
                console.groupEnd()
                return { data: plan, error: null }
            }

            // Update to published
            const updatedPlan: FakeTravelPlan = {
                ...plan,
                status: 'published',
                published_at: plan.published_at ?? new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            fakeTravelPlans[planIndex] = updatedPlan
            return { data: updatedPlan, error: null }
        }

        // Real Supabase implementation
        // Fetch current plan
        const { data: existingPlan, error: fetchError } = await supabase
            .from('travel_plans')
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .eq('id', planId)
            .single()

        if (fetchError || !existingPlan) {
            debug.perf.end('travelService.publishTravelPlan')
            debug.error('TravelService.publishTravelPlan', 'Travel plan not found', { planId, error: fetchError })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan not found') }
        }

        // Validate plan belongs to org
        const existingPlanTyped = existingPlan as TravelPlanRow
        if (existingPlanTyped.team?.org_id !== context.orgId) {
            debug.perf.end('travelService.publishTravelPlan')
            debug.error('TravelService.publishTravelPlan', 'Plan does not belong to org', { planId, planOrgId: existingPlanTyped.team?.org_id, contextOrgId: context.orgId })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan does not belong to your organization') }
        }

        // Validate status transition
        if (existingPlanTyped.status === 'cancelled') {
            debug.perf.end('travelService.publishTravelPlan')
            debug.error('TravelService.publishTravelPlan', 'Cannot publish cancelled plan', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Cannot publish a cancelled plan. Please create a new plan.') }
        }

        if (existingPlanTyped.status === 'published') {
            // Already published, return as-is
            debug.perf.end('travelService.publishTravelPlan')
            debug.flow('TravelService.publishTravelPlan', 'Plan already published', { planId })
            console.groupEnd()
            return { data: mapSupabaseTravelPlan(existingPlanTyped), error: null }
        }

        // Update to published
        // Note: Database types may not include status/published_at columns from migration 033
        // Use type assertion to include these fields even if not in generated types
        const updateData = {
            status: 'published',
            published_at: existingPlanTyped.published_at ?? new Date().toISOString(),
        } as Database['public']['Tables']['travel_plans']['Update'] & {
            status?: string
            published_at?: string
            cancelled_at?: string | null
        }

        const { data: updated, error: updateError } = await supabase
            .from('travel_plans')
            .update(updateData)
            .eq('id', planId)
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .single()

        if (updateError) {
            debug.perf.end('travelService.publishTravelPlan')
            debug.error('TravelService.publishTravelPlan', 'Failed to update plan', { error: updateError, planId })
            console.groupEnd()
            return { data: null, error: new Error(`Failed to publish travel plan: ${updateError.message}`) }
        }

        const finalPlan = mapSupabaseTravelPlan(updated as TravelPlanRow)

        // Send notification (fire and forget - but wait for simple errors)
        await notifyTravelPlanPublished(context, updated as TravelPlanRow)

        debug.perf.end('travelService.publishTravelPlan')
        debug.flow('TravelService.publishTravelPlan', 'Plan published successfully', { planId })
        console.groupEnd()
        return { data: finalPlan, error: null }
    } catch (err) {
        debug.perf.end('travelService.publishTravelPlan')
        debug.error('TravelService.publishTravelPlan', 'Exception publishing plan', { error: err, planId })
        console.groupEnd()
        console.error('publishTravelPlan error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error publishing travel plan') }
    }
}

/**
 * Cancel a travel plan (change status to cancelled)
 */
export async function cancelTravelPlan(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    console.groupCollapsed(`%ccancelTravelPlan: ${planId}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelService.cancelTravelPlan', 'Cancelling travel plan', { planId })
    debug.perf.start('travelService.cancelTravelPlan')

    try {
        // Validate UUID
        if (!isValidUUID(planId)) {
            debug.perf.end('travelService.cancelTravelPlan')
            debug.error('TravelService.cancelTravelPlan', 'Invalid plan ID format', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Invalid plan ID format') }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()

            const planIndex = fakeTravelPlans.findIndex(p => p.id === planId)
            if (planIndex === -1) {
                debug.perf.end('travelService.cancelTravelPlan')
                debug.error('TravelService.cancelTravelPlan', 'Travel plan not found (fake)', { planId })
                console.groupEnd()
                return { data: null, error: new Error('Travel plan not found') }
            }

            const plan = fakeTravelPlans[planIndex]

            // Validate status transition
            if (plan.status === 'cancelled') {
                debug.perf.end('travelService.cancelTravelPlan')
                debug.error('TravelService.cancelTravelPlan', 'Plan already cancelled (fake)', { planId })
                console.groupEnd()
                return { data: null, error: new Error('Plan is already cancelled') }
            }

            // Update to cancelled
            const updatedPlan: FakeTravelPlan = {
                ...plan,
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            fakeTravelPlans[planIndex] = updatedPlan
            return { data: updatedPlan, error: null }
        }

        // Real Supabase implementation
        // Fetch current plan
        const { data: existingPlan, error: fetchError } = await supabase
            .from('travel_plans')
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .eq('id', planId)
            .single()

        if (fetchError || !existingPlan) {
            debug.perf.end('travelService.cancelTravelPlan')
            debug.error('TravelService.cancelTravelPlan', 'Travel plan not found', { planId, error: fetchError })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan not found') }
        }

        // Validate plan belongs to org
        const existingPlanTyped = existingPlan as TravelPlanRow
        if (existingPlanTyped.team?.org_id !== context.orgId) {
            debug.perf.end('travelService.cancelTravelPlan')
            debug.error('TravelService.cancelTravelPlan', 'Plan does not belong to org', { planId, planOrgId: existingPlanTyped.team?.org_id, contextOrgId: context.orgId })
            console.groupEnd()
            return { data: null, error: new Error('Travel plan does not belong to your organization') }
        }

        // Validate status transition
        if (existingPlanTyped.status === 'cancelled') {
            debug.perf.end('travelService.cancelTravelPlan')
            debug.error('TravelService.cancelTravelPlan', 'Plan already cancelled', { planId })
            console.groupEnd()
            return { data: null, error: new Error('Plan is already cancelled') }
        }

        // Update to cancelled
        const updateData: Record<string, any> = {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
        }

        const { data: updated, error: updateError } = await supabase
            .from('travel_plans')
            .update(updateData)
            .eq('id', planId)
            .select(`
                *,
                team:teams(id, name, org_id),
                season:seasons(id, name)
            `)
            .single()

        if (updateError) {
            debug.perf.end('travelService.cancelTravelPlan')
            debug.error('TravelService.cancelTravelPlan', 'Failed to update plan', { error: updateError, planId })
            console.groupEnd()
            return { data: null, error: new Error(`Failed to cancel travel plan: ${updateError.message}`) }
        }

        debug.perf.end('travelService.cancelTravelPlan')
        debug.flow('TravelService.cancelTravelPlan', 'Plan cancelled successfully', { planId })
        console.groupEnd()
        return { data: mapSupabaseTravelPlan(updated as TravelPlanRow), error: null }
    } catch (err) {
        debug.perf.end('travelService.cancelTravelPlan')
        debug.error('TravelService.cancelTravelPlan', 'Exception cancelling plan', { error: err, planId })
        console.groupEnd()
        console.error('cancelTravelPlan error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error cancelling travel plan') }
    }
}
