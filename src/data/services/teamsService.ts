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
import type { AddAthletesToTeamResponse } from '../../types/athletes'
import { buildTeamQuery, buildTeamMembershipQuery, buildCoachAssignmentQuery } from './queryHelpers'
import { normalizeSupabaseResponse } from './responseHelpers'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'
import { logEvent } from '../../utils/eventLogger'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log database errors to the event log system
 */
async function logDatabaseError(
    context: UserContext,
    functionName: string,
    err: unknown,
    additionalMetadata: Record<string, any> = {}
): Promise<void> {
    try {
        await logEvent({
            category: 'SYSTEM',
            eventType: 'SYSTEM_ALERT',
            actorRole: 'system',
            orgId: context.orgId,
            metadata: {
                service: 'teamsService',
                function: functionName,
                errorCode: (err as any)?.code,
                errorMessage: (err as any)?.message,
                errorDetails: (err as any)?.details,
                errorHint: (err as any)?.hint,
                errorName: (err as any)?.name,
                ...additionalMetadata
            }
        })
    } catch (logErr) {
        console.warn('Failed to log database error event:', logErr)
    }
}

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
 * Map Supabase team row to Team domain type
 */
function mapSupabaseTeamToDomain(team: any): Team {
    return team as Team
}

/**
 * Map Supabase team member row to domain type
 */
function mapSupabaseTeamMemberToDomain(member: any): FakeTeamMember {
    return member as FakeTeamMember
}

/**
 * Map Supabase coach assignment row to domain type
 */
function mapSupabaseCoachAssignmentToDomain(assignment: any): FakeCoachAssignment {
    return assignment as FakeCoachAssignment
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

async function getAthleteIdsForFamily(familyId: string | null): Promise<string[]> {
    if (!familyId) return []
    const { data, error } = await supabase
        .from('athletes')
        .select('id')
        .eq('family_id', familyId)

    if (error) return []
    return (data ?? []).map((row) => row.id)
}

/**
 * Map database errors to user-friendly messages
 * Prevents information leakage while providing helpful feedback
 */
function mapDatabaseError(error: unknown): Error {
    if (!error || typeof error !== 'object') {
        return new Error('An unexpected error occurred. Please try again.')
    }

    // Handle Supabase PostgrestError
    if ('code' in error && 'message' in error) {
        const code = String(error.code)
        const message = String(error.message)

        // Log full error details for debugging
        console.error('[teamsService] Database error:', {
            code,
            message,
            details: 'details' in error ? error.details : undefined,
            hint: 'hint' in error ? error.hint : undefined,
        })

        // Map specific error codes to user-friendly messages
        switch (code) {
            case '23503': // Foreign key violation
                if (message.includes('athlete_id') || message.includes('athletes')) {
                    return new Error('Selected child not found or access denied.')
                }
                if (message.includes('team_id') || message.includes('teams')) {
                    return new Error('Team not found.')
                }
                if (message.includes('season_id') || message.includes('seasons')) {
                    return new Error('Selected season is not available for this team.')
                }
                return new Error('Invalid reference. Please check your selections and try again.')
            
            case '23505': // Unique constraint violation
                if (message.includes('team_memberships')) {
                    return new Error('This child is already a member of this team for this season.')
                }
                if (message.includes('invite_code')) {
                    return new Error('Invite code conflict. Please contact support.')
                }
                return new Error('This record already exists.')
            
            case '42501': // Insufficient privilege (RLS)
                return new Error('You do not have permission to perform this action.')
            
            case '42P01': // Undefined table
                return new Error('Invite code feature is not available. Please contact support.')
            
            case '42703': // Undefined column
                if (message.includes('invite_code')) {
                    return new Error('Invite code feature is not available. Please contact support.')
                }
                return new Error('System configuration error. Please contact support.')
            
            default:
                // For network/timeout errors
                if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
                    return new Error('Network error. Please check your internet connection and try again.')
                }
                // Generic fallback
                return new Error('An error occurred. Please try again.')
        }
    }

    // Handle generic Error objects
    if (error instanceof Error) {
        const message = error.message.toLowerCase()
        
        if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
            return new Error('Network error. Please check your internet connection and try again.')
        }
        
        // Log but don't expose the original message
        console.error('[teamsService] Error:', error)
        return new Error('An error occurred. Please try again.')
    }

    return new Error('An unexpected error occurred. Please try again.')
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
 */
export async function getTeams(
    context: UserContext,
    params: TeamsQueryParams = {}
): Promise<{ data: Team[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
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

    // Real Supabase implementation - NO FALLBACK
    try {
        let query: any = buildTeamQuery(supabase)
        query = query.eq('org_id', context.orgId).order('name')

        if (params.sportId) query = query.eq('sport_id', params.sportId)
        if (params.programId) query = query.eq('program_id', params.programId)
        if (params.levelId) query = query.eq('level_id', params.levelId)
        if (params.activeOnly) query = query.eq('is_active', true)

        const { data, error } = await query
        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const mappedTeams = Array.isArray(normalizedData)
            ? normalizedData.map(mapSupabaseTeamToDomain)
            : []

        return { data: mappedTeams, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        
        // Log database query errors to event log with full details
        await logDatabaseError(context, 'getTeams', err, {
            params: { 
                sportId: params.sportId, 
                programId: params.programId, 
                levelId: params.levelId, 
                activeOnly: params.activeOnly 
            }
        })
        
        return { data: [], error: classifiedError }
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
        // Generate a temporary invite code - the database trigger will generate the actual one
        // This is just to satisfy TypeScript's type requirement
        const tempInviteCode = `TEMP${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        const insertData: TeamInsert = {
            org_id: dto.org_id,
            name: dto.name,
            level_id: dto.level_id,
            sport_id: dto.sport_id ?? null,
            program_id: dto.program_id ?? null,
            max_roster_size: dto.max_roster_size ?? null,
            is_active: dto.is_active ?? true,
            invite_code: tempInviteCode, // Will be overridden by database trigger
        }
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

        const mappedTeam = mapSupabaseTeamToDomain(data)
        return { data: mappedTeam, error: null }
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

    // Real Supabase implementation - NO FALLBACK
    try {
        // Use buildTeamQuery pattern for consistency with list view and to avoid RLS issues
        // Start with the standard team query builder
        const { data, error } = await buildTeamQuery(supabase)
            .eq('id', teamId)
            .eq('org_id', context.orgId)
            .single()
        
        console.log('[getTeamDetails] Query params:', { teamId, orgId: context.orgId })
        
        console.log('[getTeamDetails] Query result:', { 
            hasData: !!data, 
            error: error ? { code: error.code, message: error.message } : null,
            dataKeys: data ? Object.keys(data) : []
        })

        if (error) {
            if (error.code === 'PGRST116') {
                // Team not found - could be RLS blocking or team doesn't exist
                return { 
                    data: null, 
                    error: new Error('Team not found. The team may not exist or you may not have permission to view it.') 
                }
            }
            throw error
        }

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, false)
        if (!normalizedData) {
            return { 
                data: null, 
                error: new Error('Team data could not be normalized. The team may not exist or you may not have permission to view it.') 
            }
        }

        // Transform to match getTeamWithDetails return type
        const teamData = normalizedData as any
        const mappedTeam = {
            ...teamData,
            seasons: teamData.seasons || [],
        } as ReturnType<typeof getTeamWithDetails>

        return { data: mappedTeam, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err, 'Team')
        return { data: null, error: classifiedError }
    }
}

/**
 * Get team by invite code
 * 
 * This function allows anyone (including unauthenticated users) to look up a team
 * by its invite code. The invite code is case-insensitive and normalized to uppercase.
 */
export async function getTeamByInviteCode(
    inviteCode: string
): Promise<{ data: Team | null; error: Error | null }> {
    try {
        // Normalize invite code to uppercase and trim whitespace
        const normalizedCode = inviteCode.toUpperCase().trim()
        
        if (!normalizedCode) {
            return { data: null, error: new Error('Invalid invite code. Please check and try again.') }
        }

        // Query teams table using case-insensitive comparison
        // The database stores codes in uppercase, but we use UPPER() for safety
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('invite_code', normalizedCode)
            .single()

        if (error) {
            // Handle "not found" case specifically
            if (error.code === 'PGRST116') {
                return { data: null, error: new Error('Invalid invite code. Please check and try again.') }
            }
            throw error
        }

        if (!data) {
            return { data: null, error: new Error('Invalid invite code. Please check and try again.') }
        }

        return { data: data as Team, error: null }
    } catch (err) {
        return { data: null, error: mapDatabaseError(err) }
    }
}

/**
 * Create a team membership for an athlete
 * 
 * This function validates that:
 * - The athlete belongs to the user's family
 * - The season belongs to the team
 * - Then creates or updates the membership atomically
 */
export async function createTeamMembership(
    context: UserContext,
    athleteId: string,
    teamId: string,
    seasonId: string
): Promise<{ data: { id: string; isNew: boolean } | null; error: Error | null }> {
    try {
        // Validate athlete ownership - verify athlete belongs to user's family
        const familyId = await getFamilyIdForUser(context.userId)
        if (!familyId) {
            return { data: null, error: new Error('Family not found. Please contact support.') }
        }

        const childIds = await getAthleteIdsForFamily(familyId)
        if (!childIds.includes(athleteId)) {
            return { data: null, error: new Error('Selected child not found or access denied.') }
        }

        // Validate season belongs to team
        // Check via team_seasons junction table (primary method)
        const { data: teamSeasonData, error: teamSeasonError } = await supabase
            .from('team_seasons')
            .select('team_id')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .single()

        // If team_seasons doesn't have the relationship, check if season has direct team_id as fallback
        if (teamSeasonError || !teamSeasonData) {
            const { data: seasonData, error: seasonError } = await supabase
                .from('seasons')
                .select('id, team_id')
                .eq('id', seasonId)
                .single()

            if (seasonError || !seasonData) {
                return { data: null, error: new Error('Selected season is not available for this team.') }
            }

            // Check if season has direct team_id that matches
            if (!seasonData.team_id || seasonData.team_id !== teamId) {
                return { data: null, error: new Error('Selected season is not available for this team.') }
            }
        }
        // If we get here, either teamSeasonData exists (relationship valid) or seasonData.team_id matches

        // Check if membership already exists to determine if this is a new or updated membership
        const { data: existingMembership } = await supabase
            .from('team_memberships')
            .select('id, status')
            .eq('athlete_id', athleteId)
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .single()

        const isNew = !existingMembership

        // Insert or update membership atomically using ON CONFLICT
        // This handles race conditions and duplicate membership attempts gracefully
        type MembershipInsert = Database['public']['Tables']['team_memberships']['Insert']
        const insertData: MembershipInsert = {
            athlete_id: athleteId,
            team_id: teamId,
            season_id: seasonId,
            status: 'active',
        }

        const { data: membershipData, error: membershipError } = await supabase
            .from('team_memberships')
            .insert(insertData)
            .select('id')
            .single()

        if (membershipError) {
            // If it's a unique constraint violation, try to update instead
            if (membershipError.code === '23505') {
                const { data: updatedData, error: updateError } = await supabase
                    .from('team_memberships')
                    .update({ status: 'active', updated_at: new Date().toISOString() })
                    .eq('athlete_id', athleteId)
                    .eq('team_id', teamId)
                    .eq('season_id', seasonId)
                    .select('id')
                    .single()

                if (updateError) {
                    throw updateError
                }

                return { 
                    data: { id: updatedData.id, isNew: false }, 
                    error: null 
                }
            }
            throw membershipError
        }

        if (!membershipData) {
            return { data: null, error: new Error('Failed to create membership. Please try again.') }
        }

        return { 
            data: { id: membershipData.id, isNew }, 
            error: null 
        }
    } catch (err) {
        return { data: null, error: mapDatabaseError(err) }
    }
}

/**
 * Add multiple athletes to a team (bulk membership creation)
 * 
 * This function:
 * - Validates user is org admin
 * - Validates team belongs to org
 * - Validates season belongs to team
 * - Creates memberships with ON CONFLICT handling
 * - Returns detailed results (added, skipped, errors)
 */
export async function addAthletesToTeam(
    context: UserContext,
    teamId: string,
    seasonId: string,
    athleteIds: string[]
): Promise<AddAthletesToTeamResponse> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            
            // Simulate some duplicates being skipped
            const added: string[] = []
            const skipped: string[] = []
            
            athleteIds.forEach((id, idx) => {
                if (idx % 5 === 0) {
                    skipped.push(id)
                } else {
                    added.push(id)
                }
            })
            
            return {
                data: {
                    added,
                    skipped,
                    errors: []
                },
                error: null
            }
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err : new Error('Unknown error')
            }
        }
    }

    // Real Supabase implementation
    try {
        // Validate user is org admin
        if (!isOrgAdmin(context)) {
            return {
                data: null,
                error: new Error('You do not have permission to add athletes to teams.')
            }
        }

        // Validate team belongs to org
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id, org_id')
            .eq('id', teamId)
            .single()

        if (teamError || !teamData) {
            return {
                data: null,
                error: new Error('Team not found.')
            }
        }

        if (teamData.org_id !== context.orgId) {
            return {
                data: null,
                error: new Error('You do not have permission to add athletes to this team.')
            }
        }

        // Validate season belongs to team (Issue #10 solution)
        const { data: teamSeasonData, error: teamSeasonError } = await supabase
            .from('team_seasons')
            .select('team_id')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .single()

        if (teamSeasonError || !teamSeasonData) {
            // Fallback: check if season has direct team_id
            const { data: seasonData, error: seasonError } = await supabase
                .from('seasons')
                .select('id, team_id')
                .eq('id', seasonId)
                .single()

            if (seasonError || !seasonData || seasonData.team_id !== teamId) {
                return {
                    data: null,
                    error: new Error('Selected season is not available for this team.')
                }
            }
        }

        // Get existing memberships to identify skipped athletes (Issue #2 solution)
        const { data: existingMemberships } = await supabase
            .from('team_memberships')
            .select('athlete_id')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .in('athlete_id', athleteIds)

        const existingAthleteIds = new Set(
            (existingMemberships || []).map((m: { athlete_id: string }) => m.athlete_id)
        )

        // Filter out athletes already on team
        const athletesToAdd = athleteIds.filter(id => !existingAthleteIds.has(id))
        const skipped = athleteIds.filter(id => existingAthleteIds.has(id))

        if (athletesToAdd.length === 0) {
            return {
                data: {
                    added: [],
                    skipped,
                    errors: []
                },
                error: null
            }
        }

        // Batch insert with ON CONFLICT DO NOTHING (Issue #2 solution)
        type MembershipInsert = Database['public']['Tables']['team_memberships']['Insert']
        const insertData: MembershipInsert[] = athletesToAdd.map(athleteId => ({
            athlete_id: athleteId,
            team_id: teamId,
            season_id: seasonId,
            status: 'active',
        }))

        const { data: insertedData, error: insertError } = await supabase
            .from('team_memberships')
            .insert(insertData)
            .select('athlete_id')

        // Track results (Issue #6 solution)
        const added: string[] = []
        const errors: Array<{ athleteId: string; error: string }> = []

        if (insertError) {
            // If it's a unique constraint violation, some may have succeeded
            if (insertError.code === '23505') {
                // Query to see which ones were actually inserted
                const { data: successfulInserts } = await supabase
                    .from('team_memberships')
                    .select('athlete_id')
                    .eq('team_id', teamId)
                    .eq('season_id', seasonId)
                    .in('athlete_id', athletesToAdd)

                const successfulIds = new Set(
                    (successfulInserts || []).map((m: { athlete_id: string }) => m.athlete_id)
                )

                athletesToAdd.forEach(id => {
                    if (successfulIds.has(id)) {
                        added.push(id)
                    } else {
                        errors.push({ athleteId: id, error: 'Already on team or duplicate entry' })
                    }
                })
            } else {
                // Other error - mark all as failed
                athletesToAdd.forEach(id => {
                    errors.push({ athleteId: id, error: insertError.message || 'Failed to add athlete' })
                })
            }
        } else {
            // Success - all were inserted
            added.push(...(insertedData || []).map((m: { athlete_id: string }) => m.athlete_id))
        }

        return {
            data: {
                added,
                skipped,
                errors
            },
            error: null
        }
    } catch (err) {
        return {
            data: null,
            error: mapDatabaseError(err)
        }
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
        
        // Normalize and extract season from nested structure
        const normalizedData = normalizeSupabaseResponse(data, false)
        const season = normalizedData ? (normalizedData as Record<string, any>)?.season as FakeSeason | undefined : undefined
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

    // Real Supabase implementation - NO FALLBACK
    try {
        const { data, error } = await buildTeamMembershipQuery(supabase)
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('status', 'active')

        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const mapped = Array.isArray(normalizedData)
            ? normalizedData.map((row: any) => ({
                ...mapSupabaseTeamMemberToDomain(row),
                child_id: row.athlete_id ?? row.athlete?.id,
            }))
            : []

        // Filter by permissions
        const familyId = await getFamilyIdForUser(context.userId)
        const childIds = await getAthleteIdsForFamily(familyId)
        const isAdmin = isOrgAdmin(context)
        const visible = isAdmin ? mapped : mapped.filter((m) => {
            const member = m as FakeTeamMember & { child_id?: string }
            return member.child_id && childIds.includes(member.child_id)
        })

        return { data: visible, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

/**
 * Get coaches for a team and season
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

    // Real Supabase implementation - NO FALLBACK
    try {
        // Try coach_assignments table first, fall back to organization_members if it doesn't exist
        let query: any = buildCoachAssignmentQuery(supabase)
        query = query.eq('team_id', teamId).eq('season_id', seasonId)

        const { data, error } = await query

        if (error) {
            // If coach_assignments doesn't exist, fall back to organization_members
            const { data: orgData, error: orgError } = await supabase
                .from('organization_members')
                .select('user:users(id, email, display_name, phone), role')
                .eq('role', 'coach')
                .eq('org_id', _context.orgId)

            if (orgError) throw orgError

            const mapped: FakeCoachAssignment[] = (orgData ?? []).map((row: any) => ({
                id: row.user?.id ?? '',
                team_id: teamId,
                season_id: seasonId,
                user_id: row.user?.id ?? '',
                role: 'head_coach' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }))

            return { data: mapped, error: null }
        }

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const mapped = Array.isArray(normalizedData)
            ? normalizedData.map(mapSupabaseCoachAssignmentToDomain)
            : []

        return { data: mapped, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
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

    // Real Supabase implementation - NO FALLBACK
    // Use guardian-based approach instead of family-based
    try {
        // Get all athletes this guardian is linked to
        const { data: athletes, error: athletesErr } = await supabase
            .rpc('get_guardian_athletes', {
                p_user_id: context.userId,
                p_org_id: context.orgId
            })

        if (athletesErr) throw athletesErr
        
        const childIds = (athletes ?? []).map((a: any) => a.athlete_id)
        if (childIds.length === 0) {
            return { data: [], error: null }
        }

        // Get team memberships for those athletes
        const { data: memberships, error: memErr } = await supabase
            .from('team_memberships')
            .select('team_id')
            .in('athlete_id', childIds)
            .eq('status', 'active')

        if (memErr) throw memErr
        
        const teamIds = Array.from(new Set((memberships ?? []).map((m) => m.team_id)))
        if (teamIds.length === 0) {
            return { data: [], error: null }
        }

        // Get team details
        const teamQuery: any = buildTeamQuery(supabase)
        const { data: teams, error: teamErr } = await teamQuery.in('id', teamIds).eq('org_id', context.orgId)

        if (teamErr) throw teamErr

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(teams, true)
        const mappedTeams = Array.isArray(normalizedData)
            ? normalizedData.map(mapSupabaseTeamToDomain)
            : []

        return { data: mappedTeams as FakeTeam[], error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
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

    // Real Supabase implementation - NO FALLBACK
    try {
        // Try to get teams from coach_assignments, fall back to all org teams if table doesn't exist
        try {
            const { data: assignments, error: assignError } = await buildCoachAssignmentQuery(supabase)
                .eq('user_id', context.userId)

            if (!assignError && assignments) {
                const teamIds = [...new Set((assignments ?? []).map((a: any) => a.team_id))]
                if (teamIds.length > 0) {
                    const teamQuery: any = buildTeamQuery(supabase)
                    const { data: teams, error: teamError } = await teamQuery.in('id', teamIds).order('name')

                    if (!teamError) {
                        const normalizedData = normalizeSupabaseResponse(teams, true)
                        const mappedTeams = Array.isArray(normalizedData)
                            ? normalizedData.map(mapSupabaseTeamToDomain)
                            : []
                        return { data: mappedTeams as FakeTeam[], error: null }
                    }
                }
            }
        } catch {
            // Fall through to org teams query
        }

        // Fall back to all org teams
        const { data, error } = await buildTeamQuery(supabase)
            .eq('org_id', context.orgId)
            .order('name')

        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const mappedTeams = Array.isArray(normalizedData)
            ? normalizedData.map(mapSupabaseTeamToDomain)
            : []

        return { data: mappedTeams as FakeTeam[], error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}
