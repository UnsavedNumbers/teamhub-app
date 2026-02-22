/**
 * Query Helpers
 *
 * Provides standardized query builders for common Supabase join patterns.
 * Ensures consistency and reduces duplication across service functions.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseExtended } from '../../lib/supabase.extended.types'

/**
 * Build a standardized event query with all common joins
 * Includes: team, season, event_location, rsvps, general_rsvps, recurring_pattern
 *
 * @param supabase - Supabase client instance
 * @param baseTable - Base table name (default: 'events')
 * @returns Query builder with all event-related joins
 *
 * @example
 * ```typescript
 * const query = buildEventQuery(supabase)
 * const { data, error } = await query.eq('id', eventId).single()
 * ```
 */
export function buildEventQuery(
    supabase: SupabaseClient<SupabaseExtended>,
    baseTable: string = 'events'
) {
    return supabase.from(baseTable as 'events').select(`
        *,
        team:teams(id, name, org_id),
        season:seasons(id, name),
        event_location:event_locations(*),
        facility:facilities(*),
        facility_resource:facility_resources(*),
        rsvps:event_rsvps(*, athlete:athletes(id, first_name, last_name)),
        general_rsvps:event_general_rsvps(*),
        recurring_pattern:recurring_event_patterns(*),
        ticketed_event:ticketed_events(
            *,
            ticket_types(*)
        )
    `)
}

/**
 * Build a LIGHTWEIGHT event query optimized for calendar list views
 * Only includes essential fields and minimal joins for fast loading
 * Use this for calendar grids, event lists, and quick previews
 * 
 * For full event details (with RSVPs, tickets, etc.), use buildEventQuery instead
 *
 * @param supabase - Supabase client instance
 * @returns Query builder with minimal event joins for fast calendar loading
 *
 * @example
 * ```typescript
 * const query = buildCalendarEventQuery(supabase)
 * const { data, error } = await query.gte('start_time', startDate).lte('start_time', endDate)
 * ```
 */
export function buildCalendarEventQuery(
    supabase: SupabaseClient<SupabaseExtended>
) {
    // Lightweight query: only team/season names, no RSVPs or ticket details
    return supabase.from('events').select(`
        id,
        team_id,
        season_id,
        title,
        type,
        start_time,
        end_time,
        location,
        arrival_time,
        timezone,
        is_cancelled,
        requires_travel,
        rsvp_enabled,
        rsvp_type,
        visibility,
        team:teams(id, name, org_id),
        season:seasons(id, name)
    `)
}

/**
 * Build a standardized fee assignment query with all common joins
 * Includes: fee (with season and team), athlete, payments
 *
 * @param supabase - Supabase client instance
 * @returns Query builder with all fee assignment-related joins
 *
 * @example
 * ```typescript
 * const query = buildFeeAssignmentQuery(supabase)
 * const { data, error } = await query.eq('org_id', orgId).order('created_at', { ascending: false })
 * ```
 */
export function buildFeeAssignmentQuery(
    supabase: SupabaseClient<SupabaseExtended>
) {
    // Note: Removed nested team:teams join from season due to ambiguous relationship
    // (seasons.team_id FK and team_seasons junction table both exist)
    // Teams can be fetched separately via team_seasons if needed
    return supabase.from('fee_assignments').select(`
        *,
        fee:fees(
            *,
            season:seasons(
                id,
                name
            )
        ),
        athlete:athletes(id, first_name, last_name),
        payments:payment_allocations(payment:payments(*))
    `)
}

/**
 * Build a standardized team query with all common joins
 * Includes: sport, program, level, active_season
 *
 * @param supabase - Supabase client instance
 * @returns Query builder with all team-related joins
 *
 * @example
 * ```typescript
 * const query = buildTeamQuery(supabase)
 * const { data, error } = await query.eq('org_id', orgId).order('name')
 * ```
 */
export function buildTeamQuery(
    supabase: SupabaseClient<SupabaseExtended>
) {
    // Use explicit junction table relationship to avoid ambiguity
    // between seasons.team_id FK and team_seasons junction table
    return supabase.from('teams').select(`
        *,
        sport:sports(id, name, icon, color),
        program:programs(id, name),
        level:levels(id, name),
        team_seasons(
            is_active,
            season:seasons(id, name, start_date, end_date)
        )
    `)
}

/**
 * Build a query for team memberships with athlete joins
 *
 * @param supabase - Supabase client instance
 * @returns Query builder with team membership and athlete joins
 *
 * @example
 * ```typescript
 * const query = buildTeamMembershipQuery(supabase)
 * const { data, error } = await query.eq('team_id', teamId).eq('season_id', seasonId)
 * ```
 */
export function buildTeamMembershipQuery(
    supabase: SupabaseClient<SupabaseExtended>
) {
    return supabase.from('team_memberships').select(`
        *,
        athlete:athletes(id, first_name, last_name, birthdate, jersey_number)
    `)
}

/**
 * Build a query for coach assignments with user/profile joins
 *
 * @param supabase - Supabase client instance
 * @returns Query builder with coach assignment and user joins
 *
 * @example
 * ```typescript
 * const query = buildCoachAssignmentQuery(supabase)
 * const { data, error } = await query.eq('team_id', teamId)
 * ```
 */
export function buildCoachAssignmentQuery(
    supabase: SupabaseClient<SupabaseExtended>
) {
    return supabase.from('coach_assignments' as any).select(`
        *,
        user:users(id, email, display_name),
        team:teams(id, name, org_id)
    `)
}
