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
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
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

function isOrgAdmin(context: UserContext): boolean {
    return context.roles.includes('org_admin')
}

async function getFamilyIdForUser(userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', userId)
        .single()

    if (error) return null
    return data?.family_id ?? null
}

async function getChildIdsForFamily(familyId: string | null): Promise<string[]> {
    if (!familyId) return []
    const { data, error } = await supabase
        .from('athletes')
        .select('id')
        .eq('family_id', familyId)

    if (error) return []
    return (data ?? []).map((row) => row.id)
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
    _context: UserContext,
    dto: CreateTeamDTO
): Promise<{ data: Team | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const now = new Date().toISOString()
        const created: Team = {
            id: `demo-team-${Date.now()}`,
            org_id: dto.org_id,
            name: dto.name,
            level_id: dto.level_id ?? null,
            sport_id: dto.sport_id ?? null,
            program_id: dto.program_id ?? null,
            max_roster_size: dto.max_roster_size ?? null,
            is_active: dto.is_active ?? true,
            created_at: now,
            updated_at: now,
            deleted_at: null,
        }
        return { data: created, error: null }
    }

    try {
        type TeamInsert = Database['public']['Tables']['teams']['Insert']
        const insertData = {
            org_id: dto.org_id,
            name: dto.name,
            level_id: dto.level_id,
            sport_id: dto.sport_id ?? null,
            program_id: dto.program_id ?? null,
            max_roster_size: dto.max_roster_size ?? null,
            is_active: dto.is_active ?? true,
        } satisfies TeamInsert
        const { data, error } = await supabase
            .from('teams')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            console.error('[teamsService] Supabase error creating team:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                insertData,
            })
            throw error
        }

        if (dto.season_id) {
            type TeamSeasonInsert = Database['public']['Tables']['team_seasons']['Insert']
            type CreatedTeam = { id: string }
            const insertData2 = {
                team_id: (data as CreatedTeam).id,
                season_id: dto.season_id,
                is_active: true,
            } satisfies TeamSeasonInsert
            const { error: linkError } = await supabase
                .from('team_seasons')
                .insert(insertData2)

            if (linkError) throw linkError
        }

        return { data: data as unknown as Team, error: null }
    } catch (err) {
        console.error('[teamsService] Error creating team:', err)
        // Preserve the actual error message if available
        if (err instanceof Error) {
            return { data: null, error: err }
        }
        // Try to extract error message from Supabase error
        if (err && typeof err === 'object' && 'message' in err) {
            return { data: null, error: new Error(String(err.message)) }
        }
        return { data: null, error: new Error('Create team failed') }
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
        type TeamUpdate = Database['public']['Tables']['teams']['Update']
        const updateData = {
            name: dto.name,
            level_id: dto.level_id,
            sport_id: dto.sport_id ?? null,
            program_id: dto.program_id ?? null,
            max_roster_size: dto.max_roster_size ?? null,
            is_active: dto.is_active ?? true,
            updated_at: new Date().toISOString(),
        } satisfies TeamUpdate
        const { data, error } = await supabase
            .from('teams')
            .update(updateData)
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

        if (error) {
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                return { error: new Error('Permission denied. You do not have permission to delete this team.') }
            }
            // Check for foreign key violations
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                return { error: new Error('Cannot delete team: It is currently in use.') }
            }
            throw error
        }
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
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const team = getTeamWithDetails(teamId)
            if (!team) {
                return { data: null, error: null }
            }

            if (team.org_id !== context.orgId) {
                return { data: null, error: new Error('Access denied') }
            }

            return { data: team, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        const { data, error } = await supabase
            .from('teams')
            .select(
                `*,
                sport:sports(*),
                program:programs(*),
                level:levels(*),
                active_season:team_seasons(is_active, season:seasons(*))`
            )
            .eq('id', teamId)
            .eq('org_id', context.orgId)
            .single()

        if (error) throw error
        return { data: data as unknown as ReturnType<typeof getTeamWithDetails>, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch team details') }
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
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const season = getActiveSeasonForTeam(teamId)
            return { data: season ?? null, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        const { data, error } = await supabase
            .from('team_seasons')
            .select('is_active, season:seasons(*)')
            .eq('team_id', teamId)
            .eq('is_active', true)
            .single()

        if (error) throw error
        const season = (data as any)?.season as FakeSeason | undefined
        return { data: season ?? null, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch active season') }
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
 *     athlete:athletes(
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
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const permissions = buildPermissions(context)

            if (
                permissions.canViewAllOrgData ||
                (permissions.canViewAssignedTeams && permissions.assignedTeamIds.includes(teamId))
            ) {
                const members = getTeamMembersForSeason(teamId, seasonId)
                return { data: members, error: null }
            }

            const members = getTeamMembersForSeason(teamId, seasonId)
            const childIds = getChildrenForUserId(context.userId)
            const filtered = members.filter((m) => childIds.includes(m.child_id))

            return { data: filtered, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        const { data, error } = await supabase
            .from('team_memberships')
            .select('*, athlete:athletes(id, first_name, last_name, family:families(id, name))')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('status', 'active')

        if (error) throw error

        const familyId = await getFamilyIdForUser(context.userId)
        const childIds = await getChildIdsForFamily(familyId)
        const isAdmin = isOrgAdmin(context)

        const mapped = (data ?? []).map((row: any) => ({
            ...(row as FakeTeamMember),
            child_id: row.athlete_id ?? row.athlete?.id,
        }))

        const visible = isAdmin ? mapped : mapped.filter((m) => childIds.includes((m as any).child_id))
        return { data: visible, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch roster') }
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
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const coaches = getCoachAssignmentsForTeam(teamId, seasonId)
            return { data: coaches, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        // Schema does not expose a dedicated coach assignment table; fall back to org coaches.
        const { data, error } = await supabase
            .from('organization_members')
            .select('user:users(id, email, display_name, phone), role')
            .eq('role', 'coach')
            .eq('org_id', _context.orgId)

        if (error) throw error

        const mapped: FakeCoachAssignment[] = (data ?? []).map((row: any) => ({
            id: row.user?.id ?? '',
            team_id: teamId,
            season_id: seasonId,
            user_id: row.user?.id ?? '',
            role: 'head_coach' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }))

        return { data: mapped, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch coaches') }
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
    if (USE_FAKE_DATA) {
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

    try {
        const familyId = await getFamilyIdForUser(context.userId)
        const childIds = await getChildIdsForFamily(familyId)
        if (childIds.length === 0) return { data: [], error: null }

        const { data: memberships, error: memErr } = await supabase
            .from('team_memberships')
            .select('team_id')
            .in('athlete_id', childIds)
            .eq('status', 'active')

        if (memErr) throw memErr
        const teamIds = Array.from(new Set((memberships ?? []).map((m) => m.team_id)))
        if (teamIds.length === 0) return { data: [], error: null }

        const { data: teams, error: teamErr } = await supabase
            .from('teams')
            .select('*')
            .in('id', teamIds)
            .eq('org_id', context.orgId)

        if (teamErr) throw teamErr
        return { data: (teams as unknown) as FakeTeam[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch parent teams') }
    }
}

/**
 * Get teams that a coach is assigned to
 */
export async function getTeamsForCoach(
    context: UserContext
): Promise<{ data: FakeTeam[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
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

    try {
        // Without a dedicated coach assignment table, return all org teams for now.
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('org_id', context.orgId)
            .order('name')

        if (error) throw error
        return { data: (data as unknown) as FakeTeam[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch coach teams') }
    }
}
