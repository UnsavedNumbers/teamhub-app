/**
 * Teams Service
 *
 * Provides data access for teams, sports, programs, seasons, and rosters.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 * Each method includes a TODO comment showing the equivalent Supabase query pattern.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions } from '../fake/userContext'
import {
    getTeamById,
    getTeamsForOrg,
    getActiveTeamsForOrg,
    getActiveSeasonForTeam,
    getTeamMembersForSeason,
    getCoachAssignmentsForTeam,
    getTeamWithDetails,
    type FakeTeam,
    type FakeSeason,
    type FakeTeamMember,
    type FakeCoachAssignment,
} from '../fake/fakeTeams'
import {
    getChildrenForUserId,
    getAssignedTeamsForCoach,
    getTeamsForUserChildren,
} from '../fake/relationships'
import { supabase } from '../../lib/supabase'
import type { Team, CreateTeamDTO, UpdateTeamDTO } from '../types/organization'

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
// Team Service Functions
// ============================================================================

export interface TeamsQueryParams {
    sportId?: string
    programId?: string
    levelId?: string
    activeOnly?: boolean
}

/**
 * Get teams for the current organization
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('teams')
 *   .select(`
 *     *,
 *     sport:sports(id, name, icon, color),
 *     program:programs(id, name),
 *     active_season:seasons(id, name, start_date, end_date)
 *   `)
 *   .eq('org_id', context.orgId)
 *   .eq('is_active', true)
 *   .order('name')
 * ```
 */
export async function getTeams(
    context: UserContext,
    params: TeamsQueryParams = {}
): Promise<{ data: Team[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        try {
            let query = supabase
                .from('teams')
                .select('*')
                .eq('org_id', context.orgId)
                .order('name')

            if (params.sportId) query = query.eq('sport_id', params.sportId)
            if (params.programId) query = query.eq('program_id', params.programId)
            if (params.levelId) query = query.eq('level_id', params.levelId)
            if (params.activeOnly) query = query.eq('is_active', true)

            const { data, error } = await query
            if (error) throw error
            return { data: (data as Team[]) || [], error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        let teams = params.activeOnly
            ? getActiveTeamsForOrg(context.orgId)
            : getTeamsForOrg(context.orgId)

        // Filter by sport if provided
        if (params.sportId) {
            teams = teams.filter((t) => t.sport_id === params.sportId)
        }

        // Filter by program if provided
        if (params.programId) {
            teams = teams.filter((t) => t.program_id === params.programId)
        }

        // Filter by level if provided
        if (params.levelId) {
            teams = teams.filter((t) => t.level_id === params.levelId)
        }

        // Non-admin users only see teams they have access to
        if (!permissions.canViewAllOrgData) {
            const accessibleTeamIds = new Set<string>()

            // Add coached teams
            if (permissions.canViewAssignedTeams) {
                permissions.assignedTeamIds.forEach((id) => accessibleTeamIds.add(id))
            }

            // Add children's teams
            if (permissions.canViewOwnChildrenData) {
                getTeamsForUserChildren(context.userId).forEach((id) => accessibleTeamIds.add(id))
            }

            teams = teams.filter((t) => accessibleTeamIds.has(t.id))
        }

        return { data: teams as Team[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function createTeam(
    context: UserContext,
    dto: CreateTeamDTO
): Promise<{ data: Team | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const now = new Date().toISOString()
        const created: Team = {
            id: `demo-team-${Date.now()}`,
            org_id: dto.org_id,
            name: dto.name,
            level_id: dto.level_id,
            sport_id: dto.sport_id ?? null,
            program_id: dto.program_id ?? null,
            max_roster_size: dto.max_roster_size ?? null,
            is_active: dto.is_active ?? true,
            created_at: now,
            updated_at: now,
        }
        return { data: created, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('teams')
            .insert({
                org_id: dto.org_id,
                name: dto.name,
                level_id: dto.level_id,
                sport_id: dto.sport_id ?? null,
                program_id: dto.program_id ?? null,
                max_roster_size: dto.max_roster_size ?? null,
                is_active: dto.is_active ?? true,
            })
            .select()
            .single()

        if (error) throw error

        if (dto.season_id) {
            const { error: linkError } = await supabase
                .from('team_seasons')
                .insert({
                    team_id: (data as Team).id,
                    season_id: dto.season_id,
                    is_active: true,
                })

            if (linkError) throw linkError
        }

        return { data: data as Team, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Create team failed') }
    }
}

export async function updateTeam(
    context: UserContext,
    teamId: string,
    dto: UpdateTeamDTO
): Promise<{ data: Team | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('teams')
            .update({
                name: dto.name,
                level_id: dto.level_id,
                sport_id: dto.sport_id ?? null,
                program_id: dto.program_id ?? null,
                max_roster_size: dto.max_roster_size ?? null,
                is_active: dto.is_active ?? undefined,
                updated_at: new Date().toISOString(),
            })
            .eq('id', teamId)
            .eq('org_id', context.orgId)
            .select()
            .single()

        if (error) throw error
        return { data: data as Team, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Update team failed') }
    }
}

export async function deleteTeam(
    context: UserContext,
    teamId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: null }
    }

    try {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId)
            .eq('org_id', context.orgId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Delete team failed') }
    }
}

/**
 * Get a single team with full details
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('teams')
 *   .select(`
 *     *,
 *     sport:sports(*),
 *     program:programs(*),
 *     level:levels(*),
 *     active_season:team_seasons(
 *       season:seasons(*)
 *     )
 *   `)
 *   .eq('id', teamId)
 *   .single()
 * ```
 */
export async function getTeamDetails(
    context: UserContext,
    teamId: string
): Promise<{ data: ReturnType<typeof getTeamWithDetails> | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const team = getTeamWithDetails(teamId)
        if (!team) {
            return { data: null, error: null }
        }

        // Verify org access
        if (team.org_id !== context.orgId) {
            return { data: null, error: new Error('Access denied') }
        }

        return { data: team, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Sports Service Functions
// ============================================================================

// Re-export from sportsService for backwards compatibility
export { getSports, getPrograms } from './sportsService'



// ============================================================================
// Season Service Functions
// ============================================================================

/**
 * Get active season for a team
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('team_seasons')
 *   .select(`
 *     season:seasons(*)
 *   `)
 *   .eq('team_id', teamId)
 *   .eq('is_active', true)
 *   .single()
 * ```
 */
export async function getActiveSeason(
    _context: UserContext,
    teamId: string
): Promise<{ data: FakeSeason | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const season = getActiveSeasonForTeam(teamId)
        return { data: season ?? null, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Roster Service Functions
// ============================================================================

/**
 * Get roster (team members) for a team and season
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('team_members')
 *   .select(`
 *     *,
 *     child:children(
 *       id, first_name, last_name, date_of_birth, jersey_number,
 *       family:families(id, name)
 *     )
 *   `)
 *   .eq('team_id', teamId)
 *   .eq('season_id', seasonId)
 *   .eq('status', 'active')
 *   .order('child(last_name)')
 * ```
 */
export async function getTeamRoster(
    context: UserContext,
    teamId: string,
    seasonId: string
): Promise<{ data: FakeTeamMember[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)

        // Coaches and admins can see full roster
        if (
            permissions.canViewAllOrgData ||
            (permissions.canViewAssignedTeams && permissions.assignedTeamIds.includes(teamId))
        ) {
            const members = getTeamMembersForSeason(teamId, seasonId)
            return { data: members, error: null }
        }

        // Parents can only see their own children on the roster
        const members = getTeamMembersForSeason(teamId, seasonId)
        const childIds = getChildrenForUserId(context.userId)
        const filtered = members.filter((m) => childIds.includes(m.child_id))

        return { data: filtered, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get coaches for a team and season
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('coach_assignments')
 *   .select(`
 *     *,
 *     user:users(id, display_name, email, phone)
 *   `)
 *   .eq('team_id', teamId)
 *   .eq('season_id', seasonId)
 * ```
 */
export async function getTeamCoaches(
    _context: UserContext,
    teamId: string,
    seasonId: string
): Promise<{ data: FakeCoachAssignment[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const coaches = getCoachAssignmentsForTeam(teamId, seasonId)
        return { data: coaches, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Teams for Parent (convenience function)
// ============================================================================

/**
 * Get teams that a parent's children are on
 */
export async function getTeamsForParent(
    context: UserContext
): Promise<{ data: FakeTeam[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const teamIds = getTeamsForUserChildren(context.userId)
        const teams = teamIds
            .map((id) => getTeamById(id))
            .filter((t): t is FakeTeam => t !== undefined)

        return { data: teams, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get teams that a coach is assigned to
 */
export async function getTeamsForCoach(
    context: UserContext
): Promise<{ data: FakeTeam[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const teamIds = getAssignedTeamsForCoach(context.userId)
        const teams = teamIds
            .map((id) => getTeamById(id))
            .filter((t): t is FakeTeam => t !== undefined)

        return { data: teams, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
