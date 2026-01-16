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
    getSportsForOrg,
    getProgramsForOrg,
    getActiveSeasonForTeam,
    getTeamMembersForSeason,
    getCoachAssignmentsForTeam,
    getTeamWithDetails,
    type FakeTeam,
    type FakeSeason,
    type FakeSport,
    type FakeProgram,
    type FakeTeamMember,
    type FakeCoachAssignment,
} from '../fake/fakeTeams'
import {
    getChildrenForUserId,
    getAssignedTeamsForCoach,
    getTeamsForUserChildren,
} from '../fake/relationships'

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
): Promise<{ data: FakeTeam[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
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

        return { data: teams, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
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
 *     seasons:seasons(*)
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
 *   .from('seasons')
 *   .select('*')
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
