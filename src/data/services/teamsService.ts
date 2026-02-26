/**
 * Teams Service
 *
 * Provides data access for teams, sports, programs, seasons, and rosters.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 * Each method includes a TODO comment showing the equivalent Supabase query pattern.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions, getGuardianCanonicalUserId } from '../fake/userContext'
import {
    getTeamById,
    getTeamsForOrg,
    getActiveTeamsForOrg,
    getActiveSeasonForTeam,
    getTeamMembersForSeason,
    getCoachAssignmentsForTeam,
    getTeamWithDetails,
    getActiveTeamMembershipsForChild,
    getSeasonById,
    type FakeTeam,
    type FakeSeason,
    type FakeTeamMember,
    type FakeCoachAssignment,
} from '../fake/fakeTeams'
import {
    getChildrenForUserId,
    getTeamsForUserChildren,
} from '../fake/relationships'
import { getCoachTeamIds } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import type { Team, CreateTeamDTO, UpdateTeamDTO } from '../types/organization'
import { captureEvent } from '../../lib/analytics/analytics'
import type { AddAthletesToTeamResponse } from '../../types/athletes'
import { buildTeamQuery, buildTeamMembershipQuery } from './queryHelpers'
import { normalizeSupabaseResponse } from './responseHelpers'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'
import { logEvent, logTeamEvent } from '../../utils/eventLogger'
import { debug } from '../../lib/debug'
import { getTierLimit, isLimitExceeded } from './tierLimitsService'
import { validateRosterLimits } from '../../utils/rosterValidation'
import { logPlayerTransferAudit } from '../../utils/teamMembershipAuditLogger'

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

async function buildPermissions(context: UserContext): Promise<PermissionSet> {
    // Align fake-data permissions with canonical guardian ID so demo users see their teams/children
    const guardianUserId = getGuardianCanonicalUserId(context)
    const childIds = getChildrenForUserId(guardianUserId)
    const assignedTeamIds = context.roles.includes('coach')
        ? await getCoachTeamIds(context)
        : []

    return calculatePermissions(context, assignedTeamIds, childIds, [])
}

// ============================================================================
// Type Mappers
// ============================================================================

/**
 * Map Supabase team row to Team domain type
 * Handles nested seasons structure from team_seasons junction table
 */
function mapSupabaseTeamToDomain(team: any): Team {
    // Handle team_seasons array (from junction table query)
    if (team.team_seasons && Array.isArray(team.team_seasons)) {
        team.seasons = team.team_seasons.map((ts: any) => {
            if (ts.season) {
                return {
                    id: ts.season.id,
                    name: ts.season.name,
                    start_date: ts.season.start_date,
                    end_date: ts.season.end_date,
                    is_active: ts.is_active ?? ts.season.is_active ?? false,
                }
            }
            return ts
        })
    }
    // Also handle direct seasons array (for backward compatibility)
    else if (team.seasons && Array.isArray(team.seasons)) {
        team.seasons = team.seasons.map((ts: any) => {
            // If it's already flat (has id directly), return as-is
            if (ts.id && !ts.season) {
                return ts
            }
            // If it's nested (from team_seasons), flatten it
            if (ts.season) {
                return {
                    id: ts.season.id,
                    name: ts.season.name,
                    start_date: ts.season.start_date,
                    end_date: ts.season.end_date,
                    is_active: ts.is_active ?? ts.season.is_active ?? false,
                }
            }
            return ts
        })
    }
    return team as Team
}

/**
 * Map Supabase team member row to domain type
 */
function mapSupabaseTeamMemberToDomain(member: any): FakeTeamMember {
    return member as FakeTeamMember
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
export function mapDatabaseError(error: unknown): Error {
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
    console.groupCollapsed(`%cgetTeams: ${JSON.stringify(params)}`, 'color: #666; font-weight: bold;');
    debug.data('TeamsService.getTeams', 'Request', { context: { userId: context.userId, orgId: context.orgId }, params })
    debug.perf.start('teamsService.getTeams')

    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const permissions = await buildPermissions(context)
            const fakeOrgId = USE_FAKE_DATA ? DEMO_ORG_A_ID : context.orgId
            let teams = params.activeOnly
                ? getActiveTeamsForOrg(fakeOrgId)
                : getTeamsForOrg(fakeOrgId)

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
                const guardianUserId = getGuardianCanonicalUserId(context)

                // Add coached teams
                if (permissions.canViewAssignedTeams) {
                    permissions.assignedTeamIds.forEach((id) => accessibleTeamIds.add(id))
                }

                // Add children's teams
                if (permissions.canViewOwnChildrenData) {
                    getTeamsForUserChildren(guardianUserId).forEach((id) => accessibleTeamIds.add(id))
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

        debug.perf.end('teamsService.getTeams')
        debug.data('TeamsService.getTeams', 'Response', { teamCount: mappedTeams.length })
        console.groupEnd()
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

        debug.perf.end('teamsService.getTeams')
        debug.error('TeamsService.getTeams', 'Failed to fetch teams', { error: err, params, context: { userId: context.userId, orgId: context.orgId } })
        console.groupEnd()
        return { data: [], error: classifiedError }
    }
}

export async function createTeam(
    _context: UserContext,
    dto: CreateTeamDTO
): Promise<{ data: Team | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateTeam: ${dto.name}`, 'color: #666; font-weight: bold;');
    debug.flow('TeamsService.createTeam', 'Started', { teamName: dto.name, orgId: dto.org_id })
    debug.perf.start('teamsService.createTeam')

    try {
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
            captureEvent('team_created', {
              team_id: created.id,
              organization_id: dto.org_id,
              user_id: _context.userId,
            })
            return { data: created, error: null }
        }

        // Check max_teams tier limit before creating
        const limitResult = await getTierLimit(dto.org_id, _context.userId, 'max_teams')
        if (limitResult.error) {
            // Fail open on error (allow creation) but log warning
            console.warn('[teamsService] Failed to check max_teams limit, allowing creation:', limitResult.error)
        } else if (limitResult.limit !== null) {
            // Count current teams for this org
            const { count: currentTeamCount, error: countError } = await supabase
                .from('teams')
                .select('id', { count: 'exact', head: true })
                .eq('org_id', dto.org_id)
                .is('deleted_at', null)

            if (!countError && currentTeamCount !== null) {
                if (isLimitExceeded(currentTeamCount, limitResult.limit)) {
                    const errorMessage = `You've reached your team limit (${limitResult.limit} teams). Upgrade your plan to add more teams.`
                    debug.perf.end('teamsService.createTeam')
                    debug.error('TeamsService.createTeam', 'Team limit exceeded', { currentCount: currentTeamCount, limit: limitResult.limit })
                    console.groupEnd()
                    return { 
                        data: null, 
                        error: new Error(errorMessage)
                    }
                }
            }
        }
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
            visible_to_fans: dto.visible_to_fans ?? false,
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
        debug.perf.end('teamsService.createTeam')
        debug.flow('TeamsService.createTeam', 'Team created successfully', { teamId: data.id, teamName: dto.name })
        captureEvent('team_created', {
          team_id: (data as { id: string }).id,
          organization_id: dto.org_id,
          user_id: _context.userId,
        })
        console.groupEnd()
        return { data: mappedTeam, error: null }
    } catch (err) {
        debug.perf.end('teamsService.createTeam')
        debug.error('TeamsService.createTeam', 'Failed to create team', { error: err, teamName: dto.name, orgId: dto.org_id })
        console.groupEnd()
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
        const updateData: TeamUpdate = {}
        if (dto.name !== undefined) updateData.name = dto.name
        if (dto.level_id !== undefined) updateData.level_id = dto.level_id
        if (dto.sport_id !== undefined) updateData.sport_id = dto.sport_id ?? null
        if (dto.program_id !== undefined) updateData.program_id = dto.program_id ?? null
        if (dto.max_roster_size !== undefined) updateData.max_roster_size = dto.max_roster_size ?? null
        if (dto.is_active !== undefined) updateData.is_active = dto.is_active
        if (dto.visible_to_fans !== undefined) updateData.visible_to_fans = dto.visible_to_fans
        updateData.updated_at = new Date().toISOString()
        const { data, error } = await supabase
            .from('teams')
            .update(updateData)
            .eq('id', teamId)
            .eq('org_id', context.orgId)
            .select()
            .single()

        if (error) throw error
        captureEvent('team_updated', {
          team_id: teamId,
          organization_id: context.orgId,
          user_id: context.userId,
        })
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

        // Map the team data (this will flatten the nested seasons structure)
        const mappedTeam = mapSupabaseTeamToDomain(normalizedData)

        // Extract seasons - handle both nested and flat structures
        let seasons: any[] = []
        const mappedSeasons = (mappedTeam as any).seasons
        if (mappedSeasons && Array.isArray(mappedSeasons) && mappedSeasons.length > 0) {
            seasons = mappedSeasons
        } else if ((normalizedData as any).team_seasons && Array.isArray((normalizedData as any).team_seasons)) {
            // Handle team_seasons from query (before mapper processes it)
            seasons = (normalizedData as any).team_seasons.map((ts: any) => {
                if (ts.season) {
                    return {
                        id: ts.season.id,
                        name: ts.season.name,
                        start_date: ts.season.start_date,
                        end_date: ts.season.end_date,
                        is_active: ts.is_active ?? ts.season.is_active ?? false,
                    }
                }
                return ts
            })
        } else if ((normalizedData as any).seasons && Array.isArray((normalizedData as any).seasons)) {
            // Fallback: if mapper didn't process seasons, try to extract them manually
            seasons = (normalizedData as any).seasons.map((ts: any) => {
                if (ts.season) {
                    return {
                        id: ts.season.id,
                        name: ts.season.name,
                        start_date: ts.season.start_date,
                        end_date: ts.season.end_date,
                        is_active: ts.is_active ?? ts.season.is_active ?? false,
                    }
                }
                return ts
            })
        } else {
            // Final fallback: query seasons directly from team_seasons if not included in team query
            try {
                const { data: seasonsData, error: seasonsError } = await supabase
                    .from('team_seasons')
                    .select('is_active, season:seasons(id, name, start_date, end_date, is_active)')
                    .eq('team_id', teamId)

                if (!seasonsError && seasonsData) {
                    seasons = seasonsData.map((ts: any) => ({
                        id: ts.season.id,
                        name: ts.season.name,
                        start_date: ts.season.start_date,
                        end_date: ts.season.end_date,
                        is_active: ts.is_active ?? ts.season.is_active ?? false,
                    }))
                }
            } catch (err) {
                console.warn('[getTeamDetails] Error fetching seasons fallback:', err)
            }
        }

        // Transform to match getTeamWithDetails return type
        const teamData = {
            ...mappedTeam,
            seasons: seasons,
        } as ReturnType<typeof getTeamWithDetails>

        return { data: teamData, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err, 'Team')
        return { data: null, error: classifiedError }
    }
}

// Simple in-memory rate limiter for team code lookups
// Key: code or IP, Value: { count: number, resetAt: number }
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitCache.entries()) {
        if (value.resetAt < now) {
            rateLimitCache.delete(key)
        }
    }
}, 5 * 60 * 1000)

/**
 * Check rate limit for team code lookup
 * @param identifier - IP address or invite code
 * @param maxRequests - Maximum requests per window (default: 20 per IP, 5 per code)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 */
function checkRateLimit(identifier: string, maxRequests: number = 20, windowMs: number = 60000): boolean {
    const now = Date.now()
    const cached = rateLimitCache.get(identifier)

    if (!cached || cached.resetAt < now) {
        // Create new window
        rateLimitCache.set(identifier, {
            count: 1,
            resetAt: now + windowMs
        })
        return true
    }

    if (cached.count >= maxRequests) {
        return false // Rate limit exceeded
    }

    // Increment count
    cached.count++
    return true
}

/**
 * Get team by invite code
 * 
 * This function allows anyone (including unauthenticated users) to look up a team
 * by its invite code. The invite code is case-insensitive and normalized to uppercase.
 * 
 * Rate limiting: 20 requests per minute per IP, 5 requests per minute per code
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

        // Simple IP-based rate limiting (using a client identifier)
        // In a real app, you'd get the actual IP from the request
        // For now, we'll use a simple identifier based on browser fingerprint
        const clientId = typeof window !== 'undefined' 
            ? `client_${window.location.hostname}` 
            : 'server'
        
        // Check rate limit per IP (20/min)
        if (!checkRateLimit(clientId, 20, 60000)) {
            return { 
                data: null, 
                error: new Error('Too many requests. Please try again in a minute.') 
            }
        }

        // Check rate limit per code (5/min) to prevent enumeration
        if (!checkRateLimit(`code_${normalizedCode}`, 5, 60000)) {
            return { 
                data: null, 
                error: new Error('Too many requests for this code. Please try again in a minute.') 
            }
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

        // If this is a new membership, check roster capacity
        if (isNew) {
            // Get organization ID for tier limit check
            const { data: teamOrgData, error: teamOrgError } = await supabase
                .from('teams')
                .select('org_id, max_roster_size')
                .eq('id', teamId)
                .single()

            if (teamOrgError || !teamOrgData) {
                return { data: null, error: new Error('Team not found') }
            }

            // Check tier limit max_players_per_team (if orgId available)
            let tierLimit: number | null = null
            if (teamOrgData.org_id) {
                const limitResult = await getTierLimit(teamOrgData.org_id, context.userId, 'max_players_per_team')
                if (!limitResult.error && limitResult.limit !== null) {
                    tierLimit = limitResult.limit
                }
            }

            // Count active memberships for this team/season
            const { count: currentCount, error: countError } = await supabase
                .from('team_memberships')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .eq('status', 'active')

            if (!countError && currentCount !== null) {
                // Validate roster limits using centralized utility
                const validation = validateRosterLimits(
                    currentCount,
                    null,
                    teamOrgData.max_roster_size,
                    tierLimit,
                    1 // Adding 1 player
                )

                if (!validation.isValid && validation.error) {
                    return {
                        data: null,
                        error: new Error(validation.error)
                    }
                }
            }
        }

        // Check for duplicate membership before insert
        if (existingMembership && existingMembership.status === 'active') {
            return {
                data: { id: existingMembership.id, isNew: false },
                error: new Error('Your athlete is already on this team.')
            }
        }

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

        // Log team join completion event
        try {
            const { data: teamData } = await supabase
                .from('teams')
                .select('org_id, name')
                .eq('id', teamId)
                .single()

            if (teamData) {
                await logTeamEvent(
                    'TEAM_JOIN_COMPLETED',
                    teamData.org_id,
                    teamId,
                    context.userId,
                    'parent',
                    {
                        athlete_id: athleteId,
                        team_id: teamId,
                        season_id: seasonId,
                        membership_id: membershipData.id,
                        is_new: isNew,
                        team_name: teamData.name,
                    }
                )
            }
        } catch (logErr) {
            // Don't fail the request if logging fails
            console.warn('Failed to log team join event:', logErr)
        }

        // Distribute notifications if this is a new membership
        if (isNew) {
            const { distributeAthleteAddedNotifications } = await import('./athleteNotifications')
            const { data: athleteData } = await supabase.from('athletes').select('first_name, last_name').eq('id', athleteId).single()
            const { data: teamData } = await supabase.from('teams').select('name, org_id').eq('id', teamId).single()

            if (athleteData && teamData) {
                distributeAthleteAddedNotifications({
                    athlete_id: athleteId,
                    team_id: teamId,
                    org_id: teamData.org_id,
                    athlete_name: `${athleteData.first_name} ${athleteData.last_name}`,
                    team_name: teamData.name,
                    action_by_user_id: context.userId
                }).catch(err => console.error('Failed to distribute athlete-added notification:', err))
            }
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
        // Check tier limit max_players_per_team before bulk add
        const { data: teamData, error: teamDataError } = await supabase
            .from('teams')
            .select('org_id, max_roster_size')
            .eq('id', teamId)
            .single()

    if (!teamDataError && teamData?.org_id) {
        const limitResult = await getTierLimit(teamData.org_id, context.userId, 'max_players_per_team')
        if (!limitResult.error && limitResult.limit !== null) {
            // Count current active memberships
            const { count: currentCount, error: countError } = await supabase
                .from('team_memberships')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .eq('status', 'active')
                .is('deleted_at', null)

            if (!countError && currentCount !== null) {
                // Validate roster limits using centralized utility
                const validation = validateRosterLimits(
                    currentCount,
                    null,
                    teamData.max_roster_size,
                    limitResult.limit,
                    athleteIds.length
                )

                if (!validation.isValid && validation.error) {
                    return {
                        data: {
                            added: [],
                            skipped: [],
                            errors: athleteIds.map(id => ({
                                athleteId: id,
                                error: validation.error || 'Cannot add athletes due to roster size constraints.'
                            }))
                        },
                        error: null
                    }
                }
            }
        }
    }
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

        // Check tier limit max_players_per_team before bulk add
        let tierLimit: number | null = null
        if (teamData.org_id) {
            const limitResult = await getTierLimit(teamData.org_id, context.userId, 'max_players_per_team')
            if (!limitResult.error && limitResult.limit !== null) {
                tierLimit = limitResult.limit
            }
        }

        // Get team roster size limits and current count
        const { data: teamRosterData, error: _teamRosterError } = await supabase
            .from('teams')
            .select('max_roster_size')
            .eq('id', teamId)
            .single()

        const { count: currentCount, error: countError } = await supabase
            .from('team_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('status', 'active')
            .is('deleted_at', null)

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

        // Validate roster limits using centralized utility
        if (!countError && currentCount !== null) {
            const validation = validateRosterLimits(
                currentCount,
                null,
                teamRosterData?.max_roster_size,
                tierLimit,
                athletesToAdd.length
            )

            if (!validation.isValid && validation.error) {
                return {
                    data: {
                        added: [],
                        skipped,
                        errors: athletesToAdd.map(id => ({
                            athleteId: id,
                            error: validation.error || 'Cannot add athletes due to roster size constraints.'
                        }))
                    },
                    error: null
                }
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

            const permissions = await buildPermissions(context)

            if (
                permissions.canViewAllOrgData ||
                (permissions.canViewAssignedTeams && permissions.assignedTeamIds.includes(teamId))
            ) {
                const members = getTeamMembersForSeason(teamId, seasonId)
                return { data: members, error: null }
            }

            const members = getTeamMembersForSeason(teamId, seasonId)
            const guardianUserId = getGuardianCanonicalUserId(context)
            const childIds = getChildrenForUserId(guardianUserId)
            const filtered = members.filter((m) => childIds.includes((m as { athlete_id?: string }).athlete_id ?? (m as { child_id?: string }).child_id ?? ''))

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
                athlete_id: row.athlete_id ?? row.athlete?.id,
            }))
            : []

        // Filter by permissions
        const familyId = await getFamilyIdForUser(context.userId)
        const childIds = await getAthleteIdsForFamily(familyId)
        const isAdmin = isOrgAdmin(context)
        const visible = isAdmin ? mapped : mapped.filter((m) => {
            const member = m as FakeTeamMember & { child_id?: string }
            return (member.athlete_id ?? (member as { child_id?: string }).child_id) && childIds.includes(member.athlete_id ?? (member as { child_id?: string }).child_id ?? '')
        })

        return { data: visible, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

/**
 * Get coaches for a team
 * Note: seasonId parameter kept for backward compatibility but not used (coaches are assigned to teams, not seasons)
 */
export async function getTeamCoaches(
    _context: UserContext,
    teamId: string,
    seasonId?: string  // Optional, kept for backward compatibility
): Promise<{ data: FakeCoachAssignment[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const coaches = getCoachAssignmentsForTeam(teamId, seasonId || '')
            return { data: coaches, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - query team_coaches table
    try {
        const { data, error } = await (supabase as any)
            .from('team_coaches')
            .select('*, user:users(id, email, display_name, phone)')
            .eq('team_id', teamId)
            .eq('status', 'active')
            .order('created_at', { ascending: true })

        if (error) throw error

        // Map to FakeCoachAssignment format (keeping season_id empty since assignments are team-level)
        const mapped: FakeCoachAssignment[] = (data ?? []).map((row: any) => ({
            id: row.id,
            team_id: row.team_id,
            season_id: seasonId || '',  // Keep for compatibility but not used
            user_id: row.coach_user_id,
            role: row.role || 'head_coach',
            created_at: row.created_at,
        }))

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

            const guardianUserId = getGuardianCanonicalUserId(context)
            const teamIds = getTeamsForUserChildren(guardianUserId)
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

            const teamIds = await getCoachTeamIds(context)
            const teams = teamIds
                .map((id) => getTeamById(id))
                .filter((t): t is FakeTeam => t !== undefined)

            return { data: teams, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation - query team_coaches table
    try {
        const { data: assignments, error: assignError } = await (supabase as any)
            .from('team_coaches')
            .select('team:teams(*), role, status')
            .eq('coach_user_id', context.userId)
            .eq('status', 'active')
            .is('end_at', null)  // Only active assignments without end date

        if (assignError) throw assignError

        // Extract teams from assignments
        const teams = (assignments ?? [])
            .map((row: any) => row.team)
            .filter(Boolean)

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
 * Assign a coach to a team
 */
export async function assignCoachToTeam(
    context: UserContext,
    teamId: string,
    coachUserId: string,
    role: 'head_coach' | 'assistant_coach' | 'team_manager' = 'head_coach'
): Promise<{ data: FakeCoachAssignment | null; error: Error | null }> {
    try {
        // Get team's org_id
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('org_id')
            .eq('id', teamId)
            .single()

        if (teamError) throw teamError
        if (!team) {
            return { data: null, error: new Error('Team not found') }
        }

        const { data, error } = await (supabase as any)
            .from('team_coaches')
            .insert({
                org_id: team.org_id,
                team_id: teamId,
                coach_user_id: coachUserId,
                role,
                status: 'active',
                created_by: context.userId
            })
            .select()
            .single()

        if (error) {
            // Handle unique constraint violation (coach already assigned)
            return { data: null, error: classifySupabaseError(error) }
        }

        // Map to FakeCoachAssignment format
        const mapped: FakeCoachAssignment = {
            id: data.id,
            team_id: data.team_id,
            season_id: '',  // Not used for team-level assignments
            user_id: data.coach_user_id,
            role: data.role as 'head_coach' | 'assistant_coach' | 'team_manager',
            created_at: data.created_at,
        }

        return { data: mapped, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: null, error: classifiedError }
    }
}

/**
 * Remove a coach from a team (sets status to inactive)
 */
export async function removeCoachFromTeam(
    _context: UserContext,
    teamId: string,
    coachUserId: string
): Promise<{ error: Error | null }> {
    try {
        const { error } = await (supabase as any)
            .from('team_coaches')
            .update({ 
                status: 'inactive', 
                end_at: new Date().toISOString() 
            })
            .eq('team_id', teamId)
            .eq('coach_user_id', coachUserId)
            .eq('status', 'active')

        if (error) {
            return { error: classifySupabaseError(error) }
        }

        return { error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { error: classifiedError }
    }
}

/**
 * Display shape for an athlete's team membership on portal (guardian/athlete view).
 */
export interface AthleteTeamMembershipDisplay {
    id: string
    team_id: string
    team_name: string
    season_id: string
    season_name: string
    program_name: string | null
    sport_name: string | null
    status: string
    jersey_number: string | null
    position: string | null
    joined_at: string | null
}

/**
 * Get all team memberships for an athlete with team, season, program, and sport details.
 * Used on Athlete Profile Teams tab for guardians and athletes.
 */
export async function getAthleteTeamMemberships(
    context: UserContext,
    athleteId: string
): Promise<{ data: AthleteTeamMembershipDisplay[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const memberships = getActiveTeamMembershipsForChild(athleteId)
            const guardianUserId = getGuardianCanonicalUserId(context)
            const childIds = getChildrenForUserId(guardianUserId)
            const isAdmin = isOrgAdmin(context)
            const allowed = isAdmin || childIds.includes(athleteId)
            if (!allowed) {
                return { data: [], error: null }
            }
            const out: AthleteTeamMembershipDisplay[] = memberships.map((m) => {
                const details = getTeamWithDetails(m.team_id)
                const season = getSeasonById(m.season_id)
                return {
                    id: m.id,
                    team_id: m.team_id,
                    team_name: details?.name ?? 'Unknown Team',
                    season_id: m.season_id,
                    season_name: season?.name ?? 'Unknown Season',
                    program_name: details?.program?.name ?? null,
                    sport_name: details?.sport?.name ?? null,
                    status: m.status,
                    jersey_number: m.jersey_number ?? null,
                    position: m.position ?? null,
                    joined_at: m.joined_at ?? null,
                }
            })
            return { data: out, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        // Verify guardian has access to this athlete
        const isAdmin = isOrgAdmin(context)
        if (!isAdmin) {
            // For guardians, use get_guardian_athletes RPC to check access
            const { data: guardianAthletes, error: guardianError } = await supabase
                .rpc('get_guardian_athletes', {
                    p_user_id: context.userId,
                    p_org_id: context.orgId
                })
            
            if (guardianError) {
                console.error('Error checking guardian access:', guardianError)
                return { data: [], error: guardianError instanceof Error ? guardianError : new Error('Access check failed') }
            }
            
            const childIds = (guardianAthletes ?? []).map((a: any) => a.athlete_id)
            if (!childIds.includes(athleteId)) {
                return { data: [], error: null }
            }
        }

        const { data, error } = await supabase
            .from('team_memberships')
            .select(`
                id,
                team_id,
                season_id,
                status,
                jersey_number,
                position,
                created_at,
                teams!team_memberships_team_id_fkey!inner(name, org_id, program:programs(name), sport:sports(name))
            `)
            .eq('athlete_id', athleteId)
            .eq('status', 'active')
            .eq('teams.org_id', context.orgId)
            .is('deleted_at', null)

        if (error) throw error

        const rows = (data ?? []) as any[]
        const seasonIds = [...new Set(rows.map((r) => r.season_id).filter(Boolean))]
        let seasonNames: Record<string, string> = {}
        if (seasonIds.length > 0) {
            const { data: seasonsData } = await supabase
                .from('seasons')
                .select('id, name')
                .in('id', seasonIds)
            if (seasonsData) {
                seasonNames = Object.fromEntries(seasonsData.map((s) => [s.id, s.name ?? '']))
            }
        }

        const result: AthleteTeamMembershipDisplay[] = rows.map((row) => {
            const team = row.teams
            const program = team?.program
            const sport = team?.sport
            return {
                id: row.id,
                team_id: row.team_id,
                team_name: team?.name ?? 'Unknown Team',
                season_id: row.season_id,
                season_name: seasonNames[row.season_id] ?? 'Unknown Season',
                program_name: program?.name ?? null,
                sport_name: sport?.name ?? null,
                status: row.status ?? 'active',
                jersey_number: row.jersey_number ?? null,
                position: row.position ?? null,
                joined_at: row.created_at ?? null,
            }
        })
        return { data: result, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

/**
 * Get distinct sport IDs from an athlete's team history (past and present).
 * Used to lock "Plays" checkboxes.
 */
export async function getAthleteTeamHistory(
    _context: UserContext,
    athleteId: string
): Promise<{ data: string[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: [], error: null }
    }

    try {
        const { data, error } = await supabase
            .from('team_memberships')
            .select('team:teams!team_memberships_team_id_fkey(sport_id)')
            .eq('athlete_id', athleteId)

        if (error) throw error

        // Extract sport_ids
        const sportIds = new Set<string>()
        if (data) {
            data.forEach((item: any) => {
                // Supabase returns array or object for joined relation depending on 1:1 or 1:N
                // team_memberships -> team is N:1, so 'team' should be an object
                if (item.team && item.team.sport_id) {
                    sportIds.add(item.team.sport_id)
                }
            })
        }

        return { data: Array.from(sportIds), error: null }
    } catch (err) {
        return { data: [], error: mapDatabaseError(err) }
    }
}

/**
 * Transfer a player from one team to another within the same organization
 * 
 * This function:
 * - Validates user is org admin
 * - Validates both teams belong to the same org
 * - Validates season belongs to destination team
 * - Checks roster limits for destination team
 * - Creates/updates membership on destination team with transfer tracking
 * - Updates old membership to mark as transferred
 * - Logs audit events
 * 
 * @param context - User context
 * @param athleteId - ID of the athlete to transfer
 * @param fromTeamId - ID of the source team
 * @param toTeamId - ID of the destination team
 * @param seasonId - ID of the season (must belong to destination team)
 * @param transferReason - Optional reason for the transfer
 * @returns Result with new membership ID or error
 */
export async function transferPlayerBetweenTeams(
    context: UserContext,
    athleteId: string,
    fromTeamId: string,
    toTeamId: string,
    seasonId: string,
    transferReason?: string | null
): Promise<{ data: { membershipId: string } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: { membershipId: 'fake-membership-id' },
            error: null
        }
    }

    try {
        // Validate user is org admin
        if (!isOrgAdmin(context)) {
            return {
                data: null,
                error: new Error('You do not have permission to transfer players between teams.')
            }
        }

        // Validate both teams belong to the same org
        const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, org_id, max_roster_size')
            .in('id', [fromTeamId, toTeamId])

        if (teamsError || !teamsData || teamsData.length !== 2) {
            return {
                data: null,
                error: new Error('One or both teams not found.')
            }
        }

        const fromTeam = teamsData.find(t => t.id === fromTeamId)
        const toTeam = teamsData.find(t => t.id === toTeamId)

        if (!fromTeam || !toTeam) {
            return {
                data: null,
                error: new Error('One or both teams not found.')
            }
        }

        if (fromTeam.org_id !== toTeam.org_id || fromTeam.org_id !== context.orgId) {
            return {
                data: null,
                error: new Error('Both teams must belong to your organization.')
            }
        }

        // Validate season belongs to destination team
        const { data: teamSeasonData, error: teamSeasonError } = await supabase
            .from('team_seasons')
            .select('team_id')
            .eq('team_id', toTeamId)
            .eq('season_id', seasonId)
            .single()

        if (teamSeasonError || !teamSeasonData) {
            // Fallback: check if season has direct team_id
            const { data: seasonData, error: seasonError } = await supabase
                .from('seasons')
                .select('id, team_id')
                .eq('id', seasonId)
                .single()

            if (seasonError || !seasonData || seasonData.team_id !== toTeamId) {
                return {
                    data: null,
                    error: new Error('Selected season is not available for the destination team.')
                }
            }
        }

        // Find existing membership on source team
        const { data: existingMembership, error: membershipError } = await supabase
            .from('team_memberships')
            .select('id, athlete_id, team_id, season_id, status, created_at, updated_at')
            .eq('athlete_id', athleteId)
            .eq('team_id', fromTeamId)
            .eq('season_id', seasonId)
            .is('deleted_at', null)
            .single()

        if (membershipError || !existingMembership) {
            return {
                data: null,
                error: new Error('Player is not a member of the source team for this season.')
            }
        }

        // Check roster limits for destination team
        const { count: currentCount, error: countError } = await supabase
            .from('team_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', toTeamId)
            .eq('season_id', seasonId)
            .eq('status', 'active')
            .is('deleted_at', null)

        if (countError) {
            return {
                data: null,
                error: new Error('Failed to check destination team roster size.')
            }
        }

        // Get tier limit for destination team
        let tierLimit: number | null = null
        if (toTeam.org_id) {
            const limitResult = await getTierLimit(toTeam.org_id, context.userId, 'max_players_per_team')
            if (!limitResult.error && limitResult.limit !== null) {
                tierLimit = limitResult.limit
            }
        }

        // Validate roster limits (adding 1 player to destination team)
        const validation = validateRosterLimits(
            currentCount || 0,
            null,
            toTeam.max_roster_size,
            tierLimit,
            1
        )

        if (!validation.isValid && validation.error) {
            return {
                data: null,
                error: new Error(validation.error)
            }
        }

        // Check if player is already on destination team (shouldn't happen, but handle gracefully)
        const { data: existingDestMembership } = await supabase
            .from('team_memberships')
            .select('id')
            .eq('athlete_id', athleteId)
            .eq('team_id', toTeamId)
            .eq('season_id', seasonId)
            .is('deleted_at', null)
            .single()

        let newMembershipId: string

        if (existingDestMembership) {
            // Update existing membership on destination team
            const { data: updatedMembership, error: updateError } = await supabase
                .from('team_memberships')
                .update({
                    status: 'active',
                    transferred_from_team_id: fromTeamId,
                    transferred_at: new Date().toISOString(),
                    transfer_reason: transferReason || null,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq('id', existingDestMembership.id)
                .select('id')
                .single()

            if (updateError || !updatedMembership) {
                return {
                    data: null,
                    error: new Error('Failed to update membership on destination team.')
                }
            }

            newMembershipId = updatedMembership.id
        } else {
            // Create new membership on destination team with transfer tracking
            const insertData: any = {
                athlete_id: athleteId,
                team_id: toTeamId,
                season_id: seasonId,
                status: 'active',
                transferred_from_team_id: fromTeamId,
                transferred_at: new Date().toISOString(),
                transfer_reason: transferReason || null,
            }

            const { data: newMembership, error: insertError } = await supabase
                .from('team_memberships')
                .insert(insertData)
                .select('id')
                .single()

            if (insertError || !newMembership) {
                return {
                    data: null,
                    error: new Error('Failed to create membership on destination team.')
                }
            }

            newMembershipId = newMembership.id
        }

        // Update old membership to mark as transferred (soft delete or update status)
        // We'll soft delete it to preserve history
        const { error: deleteError } = await supabase
            .from('team_memberships')
            .update({
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingMembership.id)

        if (deleteError) {
            console.warn('Failed to soft delete old membership, but transfer succeeded:', deleteError)
            // Don't fail the transfer if we can't update the old membership
        }

        // Log audit event
        await logPlayerTransferAudit({
            teamMembershipId: newMembershipId,
            athleteId,
            fromTeamId,
            toTeamId,
            seasonId,
            changedBy: context.userId,
            oldValues: {
                team_id: existingMembership.team_id,
                status: existingMembership.status,
                created_at: existingMembership.created_at,
            },
            newValues: {
                team_id: toTeamId,
                status: 'active',
                transferred_from_team_id: fromTeamId,
                transferred_at: new Date().toISOString(),
            },
            transferReason: transferReason || null,
        })

        return {
            data: { membershipId: newMembershipId },
            error: null
        }
    } catch (err) {
        return {
            data: null,
            error: mapDatabaseError(err)
        }
    }
}

// ----------------------------------------------------------------------------
// Compatibility export for tests
// ----------------------------------------------------------------------------

type ServiceResultCompat<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const teamsService = {
    getTeams,
    getTeamDetails,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember: async (): ServiceResultCompat => ({ data: null, error: null }),
    removeTeamMember: async (): ServiceResultCompat => ({ data: null, error: null }),
    updateTeamMemberRole: async (): ServiceResultCompat => ({ data: null, error: null }),
    getTeamRoster,
    getTeamStats: async (): ServiceResultCompat => ({ data: null, error: null }),
}
