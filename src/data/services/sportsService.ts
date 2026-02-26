/**
 * Sports Service
 *
 * Provides CRUD operations for sports and programs.
 * Supports both fake data (demo mode) and real Supabase queries.
 * 
 * Note: System sports are identified by org_id IS NULL.
 * The deleted_at column does not exist in the schema, so deletes are hard deletes.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import { supabase } from '../../lib/supabase'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { getCoachTeamIds, getGuardianCanonicalUserId } from '../fake/userContext'
import { getChildrenForUserId, getFamiliesForUserId } from '../fake/relationships'
import { logSportEvent } from '../../utils/eventLogger'
import { debug } from '../../lib/debug'
import { getCurrentDemoSessionSnapshot } from './demoSessionService'
import {
    getSportById,
    getSportsForOrg,
    getProgramById,
    getProgramsForOrg,
    getTeamById,
    fakeSports,
    type FakeSport,
    type FakeProgram,
} from '../fake/fakeTeams'
import type {
    Sport,
    Program,
    CreateSportDTO,
    UpdateSportDTO,
    CreateProgramDTO,
    UpdateProgramDTO
} from '../types/organization'

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

/**
 * Check if a sport is a system sport
 * System sports are identified by having org_id = NULL
 * @param sport - Sport object to check
 * @returns true if the sport is a system sport
 */
function isSystemSport(sport: { org_id: string | null } | null | undefined): boolean {
    return sport?.org_id === null || sport?.org_id === undefined
}

// ============================================================================
// Sports CRUD Operations
// ============================================================================

/**
 * Get all system sports (predefined sports available to all organizations)
 * System sports are identified by org_id IS NULL and is_system = true
 */
export async function getSystemSports(): Promise<{ data: Sport[]; error: Error | null }> {
    console.groupCollapsed(`%cgetSystemSports`, 'color: #666; font-weight: bold;');
    debug.data('SportsService.getSystemSports', 'Request')
    debug.perf.start('sportsService.getSystemSports')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            const data: Sport[] = fakeSports.map((s): Sport => ({
                id: s.id,
                org_id: null,
                name: s.name || 'Unknown Sport',
                slug: s.slug ?? null,
                icon: s.icon ?? null,
                color: s.color || 'var(--org-btn-primary-bg, #137fec)',
                created_at: s.created_at || new Date().toISOString(),
                updated_at: s.updated_at || new Date().toISOString(),
                deleted_at: s.deleted_at ?? null,
                is_system: true,
            }))
            debug.perf.end('sportsService.getSystemSports')
            debug.data('SportsService.getSystemSports', 'Response (fake)', { sportCount: data.length })
            console.groupEnd()
            return { data, error: null }
        }

        // System sports are identified by org_id IS NULL and is_system = true
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .is('org_id', null)
            .eq('is_system', true)
            .is('deleted_at', null) // Exclude soft-deleted sports
            .order('name')

        if (error) {
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                return { data: [], error: new Error('Permission denied. You do not have access to view system sports.') }
            }
            throw error
        }

        // Normalize sports to ensure required fields
        const normalizedSports = (data || []).map((sport: any): Sport => ({
            id: sport.id,
            org_id: sport.org_id,
            name: sport.name || 'Unknown Sport',
            slug: sport.slug || null,
            icon: sport.icon || null,
            color: sport.color || 'var(--org-btn-primary-bg, #137fec)',
            created_at: sport.created_at || new Date().toISOString(),
            updated_at: sport.updated_at || new Date().toISOString(),
            deleted_at: sport.deleted_at || null,
            is_system: sport.is_system ?? true,
        }))

        debug.perf.end('sportsService.getSystemSports')
        debug.data('SportsService.getSystemSports', 'Response', { sportCount: normalizedSports.length })
        console.groupEnd()
        return { data: normalizedSports, error: null }
    } catch (err) {
        debug.perf.end('sportsService.getSystemSports')
        debug.error('SportsService.getSystemSports', 'Failed to get system sports', { error: err })
        console.groupEnd()
        console.error('[sportsService] Error getting system sports:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { data: [], error: err }
        }
        return { data: [], error: new Error('An unexpected error occurred while loading system sports. Please try again.') }
    }
}

/**
 * Get all sports for an organization
 * Returns system sports that the organization has enabled via organization_sports
 */
export async function getSports(
    context: UserContext
): Promise<{ data: Sport[] | FakeSport[]; error: Error | null }> {
    console.groupCollapsed(`%cgetSports: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('SportsService.getSports', 'Request', { context: { userId: context.userId, orgId: context.orgId } })
    debug.perf.start('sportsService.getSports')

    try {
        const demoSession = getCurrentDemoSessionSnapshot()
        const isDemoSession = demoSession.is_demo_session && demoSession.demo_org_id !== null
        
        if (USE_FAKE_DATA || isDemoSession) {
            await simulateDelay()
            // When USE_FAKE_DATA is true, use DEMO_ORG_A_ID for filtering static fake data
            // If there's a demo session with generated data, it will also be in the arrays
            // but static fake data is keyed to DEMO_ORG_A_ID
            const fakeOrgId = USE_FAKE_DATA ? DEMO_ORG_A_ID : (isDemoSession && demoSession.demo_org_id ? demoSession.demo_org_id : context.orgId)
            let sports = getSportsForOrg(fakeOrgId)
            
            // Filter sports for coaches - only show sports used by teams they're assigned to
            if (context.roles.includes('coach') && !context.roles.includes('org_admin')) {
                const guardianUserId = getGuardianCanonicalUserId(context)
                const permissions: PermissionSet = {
                    canViewAllOrgData: false,
                    canViewAssignedTeams: true,
                    canViewOwnChildrenData: false,
                    assignedTeamIds: await getCoachTeamIds(context),
                    ownedChildIds: getChildrenForUserId(guardianUserId),
                    ownedFamilyIds: getFamiliesForUserId(guardianUserId),
                }
                
                if (permissions.assignedTeamIds.length > 0) {
                    const sportIds = new Set<string>()
                    for (const teamId of permissions.assignedTeamIds) {
                        const team = getTeamById(teamId)
                        if (team?.sport_id) {
                            sportIds.add(team.sport_id)
                        }
                    }
                    sports = sports.filter(s => sportIds.has(s.id))
                } else {
                    // Coach with no assigned teams sees no sports
                    sports = []
                }
            }
            
            debug.perf.end('sportsService.getSports')
            debug.data('SportsService.getSports', 'Response (fake)', { sportCount: sports.length, fakeOrgId, USE_FAKE_DATA, isDemoSession })
            console.groupEnd()
            return { data: sports, error: null }
        }
        // Validate context
        if (!context.orgId) {
            return { data: [], error: new Error('Organization ID is required') }
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(context.orgId)) {
            return { data: [], error: new Error('Invalid organization ID format') }
        }

        // Get sports linked to this organization via organization_sports junction table
        const { data, error } = await supabase
            .from('organization_sports')
            .select(`
                sport:sports(*)
            `)
            .eq('org_id', context.orgId)

        if (error) {
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                return { data: [], error: new Error('Permission denied. You do not have access to view sports for this organization.') }
            }
            throw error
        }

        // Get organization customizations for these sports
        const sportIds = (data || []).map((row: any) => row.sport?.id).filter(Boolean)
        let customizations: Record<string, { icon_path: string | null; color: string | null }> = {}
        
        if (sportIds.length > 0) {
            const { data: customizationsData, error: customizationsError } = await supabase
                .from('organization_sport_customizations' as any)
                .select('sport_id, icon_path, color')
                .eq('org_id', context.orgId)
                .in('sport_id', sportIds)

            // Silently handle customization errors (table may not exist yet)
            // Only log non-404 errors for debugging
            if (customizationsError) {
                if (customizationsError.code !== 'PGRST116' && !customizationsError.message?.includes('404')) {
                    console.warn('[sportsService] Non-critical error fetching customizations:', customizationsError.message)
                }
            } else if (customizationsData && Array.isArray(customizationsData)) {
                type CustomizationRow = { sport_id: string; icon_path: string | null; color: string | null }
                customizations = (customizationsData as unknown as CustomizationRow[]).reduce((acc, cust) => {
                    acc[cust.sport_id] = { icon_path: cust.icon_path, color: cust.color }
                    return acc
                }, {} as Record<string, { icon_path: string | null; color: string | null }>)
            }
        }

        // Extract sports from the joined data and apply customizations
        const sportsMap = new Map<string, Sport>()
        ;(data || []).forEach((row: any) => {
            const sport = row.sport
            if (sport && sport.id && !sportsMap.has(sport.id)) {
                const customization = customizations[sport.id]
                // Ensure required fields have defaults, apply customizations
                const normalizedSport: Sport = {
                    id: sport.id,
                    org_id: sport.org_id,
                    name: sport.name || 'Unknown Sport',
                    slug: sport.slug || null,
                    icon: customization?.icon_path || sport.icon || null,
                    color: customization?.color || sport.color || 'var(--org-btn-primary-bg, #137fec)',
                    created_at: sport.created_at || new Date().toISOString(),
                    updated_at: sport.updated_at || new Date().toISOString(),
                    deleted_at: sport.deleted_at || null,
                    is_system: sport.is_system ?? (sport.org_id === null),
                }
                sportsMap.set(sport.id, normalizedSport)
            }
        })
        const sports = Array.from(sportsMap.values()).sort((a: Sport, b: Sport) => a.name.localeCompare(b.name))

        debug.perf.end('sportsService.getSports')
        debug.data('SportsService.getSports', 'Response', { sportCount: sports.length })
        console.groupEnd()
        return { data: sports as Sport[], error: null }
    } catch (err) {
        debug.perf.end('sportsService.getSports')
        debug.error('SportsService.getSports', 'Failed to fetch sports', { error: err, context: { userId: context.userId, orgId: context.orgId } })
        console.groupEnd()
        console.error('[sportsService] Error getting sports:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { data: [], error: err }
        }
        return { data: [], error: new Error('An unexpected error occurred while loading sports. Please try again.') }
    }
}

/**
 * Get a single sport by ID
 */
export async function getSport(
    context: UserContext,
    sportId: string
): Promise<{ data: Sport | FakeSport | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const sport = getSportById(sportId)
        return { data: sport || null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .eq('id', sportId)
            .eq('org_id', context.orgId)
            .single()

        if (error) throw error
        
        const normalizedSport: Sport = {
            id: data.id,
            org_id: data.org_id,
            name: data.name || 'Unknown Sport',
            slug: (data as any).slug || null,
            icon: data.icon || null,
            color: data.color || 'var(--org-btn-primary-bg, #137fec)',
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
            deleted_at: data.deleted_at || null,
            is_system: data.is_system ?? (data.org_id === null),
        }
        
        debug.perf.end('sportsService.getSport')
        debug.data('SportsService.getSport', 'Response', { sportId, hasData: !!normalizedSport })
        console.groupEnd()
        return { data: normalizedSport, error: null }
    } catch (err) {
        debug.perf.end('sportsService.getSport')
        debug.error('SportsService.getSport', 'Failed to get sport', { error: err, sportId })
        console.groupEnd()
        console.error('[sportsService] Error getting sport:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single sport by slug
 */
export async function getSportBySlug(
    context: UserContext,
    sportSlug: string
): Promise<{ data: Sport | FakeSport | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const allSports = getSportsForOrg(DEMO_ORG_A_ID)
        const sport = allSports.find(s => s.slug === sportSlug)
        return { data: sport || null, error: null }
    }

    try {
        // Get sport by slug - it should be a system sport (org_id IS NULL) or belong to the org
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .eq('slug', sportSlug)
            .is('deleted_at', null)
            .or(`org_id.is.null,org_id.eq.${context.orgId}`)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                debug.perf.end('sportsService.getSportBySlug')
                debug.data('SportsService.getSportBySlug', 'Response (not found)', { sportSlug })
                console.groupEnd()
                return { data: null, error: null }
            }
            throw error
        }
        
        // Verify the sport is accessible to this org (either system sport or org sport)
        if (data.org_id && data.org_id !== context.orgId) {
            debug.perf.end('sportsService.getSportBySlug')
            debug.error('SportsService.getSportBySlug', 'Sport not accessible to org', { sportSlug, orgId: context.orgId, sportOrgId: data.org_id })
            console.groupEnd()
            return { data: null, error: new Error('Sport not found') }
        }
        
        const normalizedSport: Sport = {
            id: data.id,
            org_id: data.org_id,
            name: data.name || 'Unknown Sport',
            slug: (data as any).slug || null,
            icon: data.icon || null,
            color: data.color || 'var(--org-btn-primary-bg, #137fec)',
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
            deleted_at: data.deleted_at || null,
            is_system: data.is_system ?? (data.org_id === null),
        }
        
        debug.perf.end('sportsService.getSportBySlug')
        debug.data('SportsService.getSportBySlug', 'Response', { sportSlug, hasData: !!normalizedSport })
        console.groupEnd()
        return { data: normalizedSport, error: null }
    } catch (err) {
        debug.perf.end('sportsService.getSportBySlug')
        debug.error('SportsService.getSportBySlug', 'Failed to get sport by slug', { error: err, sportSlug })
        console.groupEnd()
        console.error('[sportsService] Error getting sport by slug:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Link a system sport to an organization
 * Organizations can only link to predefined system sports
 */
export async function createSport(
    dto: CreateSportDTO
): Promise<{ data: Sport | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateSport: ${dto.name}`, 'color: #666; font-weight: bold;');
    debug.flow('SportsService.createSport', 'Creating sport', { orgId: dto.org_id, name: dto.name })
    debug.perf.start('sportsService.createSport')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('sportsService.createSport')
        debug.error('SportsService.createSport', 'Not available in demo mode', { name: dto.name })
        console.groupEnd()
        return {
            data: null,
            error: new Error('Create operations are not available in demo mode. Please sign in to add sports to your organization.')
        }
    }

    try {
        // Validate input
        if (!dto.org_id || !dto.org_id.trim()) {
            debug.perf.end('sportsService.createSport')
            debug.error('SportsService.createSport', 'Organization ID is required', { name: dto.name })
            console.groupEnd()
            return { data: null, error: new Error('Organization ID is required') }
        }

        // Validate UUID format for org_id
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(dto.org_id)) {
            debug.perf.end('sportsService.createSport')
            debug.error('SportsService.createSport', 'Invalid organization ID format', { orgId: dto.org_id, name: dto.name })
            console.groupEnd()
            return { data: null, error: new Error('Invalid organization ID format') }
        }

        // Find the system sport by name (case-insensitive)
        const normalizedName = dto.name.trim()
        if (!normalizedName || normalizedName.length > 100) {
            debug.perf.end('sportsService.createSport')
            debug.error('SportsService.createSport', 'Invalid sport name', { name: dto.name })
            console.groupEnd()
            return { data: null, error: new Error('Invalid sport name: must be between 1 and 100 characters') }
        }

        // Find the system sport (org_id IS NULL and is_system = true)
        const { data: systemSports, error: findError } = await supabase
            .from('sports')
            .select('*')
            .is('org_id', null)
            .eq('is_system', true)
            .ilike('name', normalizedName)
            .limit(1)
            .maybeSingle()

        if (findError) {
            // Check for network errors
            if (findError.message?.includes('network') || findError.message?.includes('fetch') || findError.message?.includes('timeout')) {
                debug.perf.end('sportsService.createSport')
                debug.error('SportsService.createSport', 'Network error finding system sport', { error: findError, name: dto.name })
                console.groupEnd()
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (findError.message?.includes('row-level security') || findError.message?.includes('RLS') || findError.code === '42501') {
                debug.perf.end('sportsService.createSport')
                debug.error('SportsService.createSport', 'Permission denied', { error: findError, name: dto.name })
                console.groupEnd()
                return { data: null, error: new Error('Permission denied. You do not have access to view system sports.') }
            }
            debug.perf.end('sportsService.createSport')
            debug.error('SportsService.createSport', 'Failed to find system sport', { error: findError, name: dto.name })
            console.groupEnd()
            console.error('[sportsService] Error finding system sport:', findError)
            return { data: null, error: new Error(`Failed to find sport: ${findError.message || 'Unknown error'}`) }
        }

        if (!systemSports) {
            debug.perf.end('sportsService.createSport')
            debug.error('SportsService.createSport', 'Sport not found', { name: dto.name })
            console.groupEnd()
            return { data: null, error: new Error('Sport not found. Please select from the available system sports.') }
        }

        // Check if already linked
        const { data: existingLink, error: checkError } = await supabase
            .from('organization_sports')
            .select('*')
            .eq('org_id', dto.org_id)
            .eq('sport_id', systemSports.id)
            .maybeSingle()

        if (checkError) {
            // Check for network errors
            if (checkError.message?.includes('network') || checkError.message?.includes('fetch') || checkError.message?.includes('timeout')) {
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            console.error('[sportsService] Error checking existing link:', checkError)
            // Continue - this might be a permission issue, but we'll try to insert anyway
        }

        if (existingLink) {
            // Already linked - return success with the sport data
            return { data: systemSports as Sport, error: null }
        }

        // Link the system sport to the organization
        const { data: linkData, error: linkError } = await supabase
            .from('organization_sports')
            .insert({
                org_id: dto.org_id,
                sport_id: systemSports.id,
            })
            .select()
            .single()

        if (linkError) {
            // Check for network errors
            if (linkError.message?.includes('network') || linkError.message?.includes('fetch') || linkError.message?.includes('timeout')) {
                debug.perf.end('sportsService.createSport')
                debug.error('SportsService.createSport', 'Network error linking sport', { error: linkError, name: dto.name })
                console.groupEnd()
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (linkError.message?.includes('row-level security') || linkError.message?.includes('RLS') || linkError.code === '42501') {
                debug.perf.end('sportsService.createSport')
                debug.error('SportsService.createSport', 'Permission denied linking sport', { error: linkError, name: dto.name })
                console.groupEnd()
                return { data: null, error: new Error('Permission denied. You do not have permission to add sports to this organization.') }
            }
            // Check for constraint violations (duplicate key)
            if (linkError.code === '23505' || linkError.message?.includes('duplicate key') || linkError.message?.includes('unique constraint')) {
                // This shouldn't happen since we checked above, but handle gracefully
                debug.perf.end('sportsService.createSport')
                debug.flow('SportsService.createSport', 'Sport already linked (constraint)', { orgId: dto.org_id, sportId: systemSports.id, name: dto.name })
                console.groupEnd()
                return { data: systemSports as Sport, error: null }
            }
            // Check for foreign key violations
            if (linkError.code === '23503' || linkError.message?.includes('foreign key')) {
                debug.perf.end('sportsService.createSport')
                debug.error('SportsService.createSport', 'Foreign key violation', { error: linkError, name: dto.name })
                console.groupEnd()
                return { data: null, error: new Error('Invalid organization or sport. Please refresh the page and try again.') }
            }
            debug.perf.end('sportsService.createSport')
            debug.error('SportsService.createSport', 'Failed to link sport', { error: linkError, name: dto.name })
            console.groupEnd()
            console.error('[sportsService] Error linking sport:', linkError)
            return { data: null, error: new Error(`Failed to add sport: ${linkError.message || 'Unknown error'}`) }
        }

        if (!linkData) {
            debug.perf.end('sportsService.createSport')
            debug.error('SportsService.createSport', 'No link data returned', { name: dto.name })
            console.groupEnd()
            return { data: null, error: new Error('Failed to create sport link. Please try again.') }
        }

        // Log audit event (best effort - don't fail if logging fails)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await logSportEvent(
                'SPORT_LINKED',
                dto.org_id,
                systemSports.id,
                user?.id,
                'org_admin',
                {
                    sport_name: systemSports.name,
                    sport_id: systemSports.id,
                }
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log SPORT_LINKED event:', logError)
            // Continue - audit logging failure shouldn't break the operation
        }

        debug.perf.end('sportsService.createSport')
        debug.flow('SportsService.createSport', 'Sport linked successfully', { orgId: dto.org_id, sportId: systemSports.id, name: dto.name })
        console.groupEnd()
        return { data: systemSports as Sport, error: null }
    } catch (err) {
        debug.perf.end('sportsService.createSport')
        debug.error('SportsService.createSport', 'Exception linking sport', { error: err, name: dto.name })
        console.groupEnd()
        console.error('[sportsService] Error linking sport:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { data: null, error: err }
        }
        return { data: null, error: new Error('An unexpected error occurred. Please try again.') }
    }
}

/**
 * Update a sport
 * Note: System sports cannot be updated. Only organization-specific customizations can be updated.
 */
export async function updateSport(
    context: UserContext,
    sportId: string,
    dto: UpdateSportDTO
): Promise<{ data: Sport | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: null,
            error: new Error('Update operations are not available in demo mode')
        }
    }

    try {
        // Check if this is a system sport (org_id IS NULL)
        const { data: sport, error: fetchError } = await supabase
            .from('sports')
            .select('org_id')
            .eq('id', sportId)
            .single()

        if (fetchError) throw fetchError

        // System sports cannot be updated (system sports have org_id = NULL)
        if (isSystemSport(sport)) {
            debug.perf.end('sportsService.updateSport')
            debug.error('SportsService.updateSport', 'Cannot update system sport', { sportId })
            console.groupEnd()
            return { data: null, error: new Error('System sports cannot be modified. They are predefined for consistency.') }
        }

        // For legacy org-specific sports, allow updates
        const updateData: any = {}
        if (dto.name !== undefined) {
            const normalizedName = dto.name.trim()
            if (!normalizedName || normalizedName.length > 100) {
                return { data: null, error: new Error('Invalid sport name: must be between 1 and 100 characters') }
            }
            updateData.name = normalizedName
        }
        if (dto.icon !== undefined) updateData.icon = dto.icon
        if (dto.color !== undefined) updateData.color = dto.color

        const { data, error } = await supabase
            .from('sports')
            .update(updateData)
            .eq('id', sportId)
            .eq('org_id', context.orgId)
            .select()
            .single()

        if (error) throw error
        debug.perf.end('sportsService.updateSport')
        debug.flow('SportsService.updateSport', 'Sport updated successfully', { sportId })
        console.groupEnd()
        return { data: data as Sport, error: null }
    } catch (err) {
        debug.perf.end('sportsService.updateSport')
        debug.error('SportsService.updateSport', 'Failed to update sport', { error: err, sportId })
        console.groupEnd()
        console.error('[sportsService] Error updating sport:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Unlink a sport from an organization
 * For system sports (org_id IS NULL), this removes the link.
 * For org-specific sports, this performs a hard delete.
 */
export async function deleteSport(
    context: UserContext,
    sportId: string
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cdeleteSport: ${sportId}`, 'color: #666; font-weight: bold;');
    debug.flow('SportsService.deleteSport', 'Deleting sport', { sportId, orgId: context.orgId })
    debug.perf.start('sportsService.deleteSport')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('sportsService.deleteSport')
        debug.error('SportsService.deleteSport', 'Not available in demo mode', { sportId })
        console.groupEnd()
        return { error: new Error('Delete operations are not available in demo mode. Please sign in to remove sports from your organization.') }
    }

    try {
        // Validate input
        if (!sportId || !sportId.trim()) {
            debug.perf.end('sportsService.deleteSport')
            debug.error('SportsService.deleteSport', 'Sport ID is required', { orgId: context.orgId })
            console.groupEnd()
            return { error: new Error('Sport ID is required') }
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(sportId)) {
            debug.perf.end('sportsService.deleteSport')
            debug.error('SportsService.deleteSport', 'Invalid sport ID format', { sportId, orgId: context.orgId })
            console.groupEnd()
            return { error: new Error('Invalid sport ID format') }
        }

        if (!context.orgId) {
            debug.perf.end('sportsService.deleteSport')
            debug.error('SportsService.deleteSport', 'Organization ID is required', { sportId })
            console.groupEnd()
            return { error: new Error('Organization ID is required') }
        }

        // Check if this is a system sport (org_id IS NULL)
        const { data: sport, error: fetchError } = await supabase
            .from('sports')
            .select('org_id, is_system')
            .eq('id', sportId)
            .maybeSingle()

        if (fetchError) {
            // Check for network errors
            if (fetchError.message?.includes('network') || fetchError.message?.includes('fetch') || fetchError.message?.includes('timeout')) {
                debug.perf.end('sportsService.deleteSport')
                debug.error('SportsService.deleteSport', 'Network error fetching sport', { error: fetchError, sportId })
                console.groupEnd()
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (fetchError.message?.includes('row-level security') || fetchError.message?.includes('RLS') || fetchError.code === '42501') {
                debug.perf.end('sportsService.deleteSport')
                debug.error('SportsService.deleteSport', 'Permission denied fetching sport', { error: fetchError, sportId })
                console.groupEnd()
                return { error: new Error('Permission denied. You do not have access to view this sport.') }
            }
            if (fetchError.code === 'PGRST116') {
                debug.perf.end('sportsService.deleteSport')
                debug.error('SportsService.deleteSport', 'Sport not found', { sportId })
                console.groupEnd()
                return { error: new Error('Sport not found.') }
            }
            debug.perf.end('sportsService.deleteSport')
            debug.error('SportsService.deleteSport', 'Failed to fetch sport', { error: fetchError, sportId })
            console.groupEnd()
            console.error('[sportsService] Error fetching sport:', fetchError)
            return { error: new Error(`Failed to find sport: ${fetchError.message || 'Unknown error'}`) }
        }

        if (!sport) {
            debug.perf.end('sportsService.deleteSport')
            debug.error('SportsService.deleteSport', 'Sport not found', { sportId })
            console.groupEnd()
            return { error: new Error('Sport not found.') }
        }

        // For system sports, remove the organization link
        if (isSystemSport(sport)) {
            const { error: unlinkError } = await supabase
                .from('organization_sports')
                .delete()
                .eq('sport_id', sportId)
                .eq('org_id', context.orgId)

            if (unlinkError) {
                // Check for network errors
                if (unlinkError.message?.includes('network') || unlinkError.message?.includes('fetch') || unlinkError.message?.includes('timeout')) {
                    return { error: new Error('Network error. Please check your internet connection and try again.') }
                }
                // Check for RLS/permission errors
                if (unlinkError.message?.includes('row-level security') || unlinkError.message?.includes('RLS') || unlinkError.code === '42501') {
                    return { error: new Error('Permission denied. You do not have permission to remove sports from this organization.') }
                }
                // Check for foreign key violations (sport might be in use)
                if (unlinkError.code === '23503' || unlinkError.message?.includes('foreign key')) {
                    return { error: new Error('Cannot remove sport: It is currently in use by programs, teams, or other entities.') }
                }
                console.error('[sportsService] Error unlinking sport:', unlinkError)
                return { error: new Error(`Failed to remove sport: ${unlinkError.message || 'Unknown error'}`) }
            }

            // Log audit event (best effort - don't fail if logging fails)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                await logSportEvent(
                    'SPORT_UNLINKED',
                    context.orgId,
                    sportId,
                    user?.id,
                    'org_admin',
                    {
                        sport_id: sportId,
                    }
                )
            } catch (logError) {
                console.error('[sportsService] Failed to log SPORT_UNLINKED event:', logError)
                // Continue - audit logging failure shouldn't break the operation
            }

            return { error: null }
        }

        // For org-specific sports, hard delete (deleted_at column doesn't exist)
        const { error } = await supabase
            .from('sports')
            .delete()
            .eq('id', sportId)
            .eq('org_id', context.orgId)

        if (error) {
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                debug.perf.end('sportsService.deleteSport')
                debug.error('SportsService.deleteSport', 'Network error deleting sport', { error, sportId })
                console.groupEnd()
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                debug.perf.end('sportsService.deleteSport')
                debug.error('SportsService.deleteSport', 'Permission denied deleting sport', { error, sportId })
                console.groupEnd()
                return { error: new Error('Permission denied. You do not have permission to delete this sport.') }
            }
            // Check for trigger errors (deletion blocked due to children)
            if (error.code === 'P0001' || error.message?.includes('Cannot delete sport')) {
                // Database trigger error - sport has programs
                debug.perf.end('sportsService.deleteSport')
                debug.error('SportsService.deleteSport', 'Cannot delete sport (has children)', { error, sportId })
                console.groupEnd()
                return { error: new Error(error.message || 'Cannot delete sport: It contains programs and cannot be removed.') }
            }
            // Check for foreign key violations
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                debug.perf.end('sportsService.deleteSport')
                debug.error('SportsService.deleteSport', 'Foreign key violation', { error, sportId })
                console.groupEnd()
                return { error: new Error('Cannot delete sport: It is currently in use by programs, teams, or other entities.') }
            }
            debug.perf.end('sportsService.deleteSport')
            debug.error('SportsService.deleteSport', 'Failed to delete sport', { error, sportId })
            console.groupEnd()
            console.error('[sportsService] Error deleting sport:', error)
            return { error: new Error(`Failed to delete sport: ${error.message || 'Unknown error'}`) }
        }
        debug.perf.end('sportsService.deleteSport')
        debug.flow('SportsService.deleteSport', 'Sport deleted successfully', { sportId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('sportsService.deleteSport')
        debug.error('SportsService.deleteSport', 'Exception deleting sport', { error: err, sportId })
        console.groupEnd()
        console.error('[sportsService] Error deleting sport:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { error: err }
        }
        return { error: new Error('An unexpected error occurred. Please try again.') }
    }
}

// ============================================================================
// Sport Icon Upload and Customization
// ============================================================================

/**
 * Upload sport icon to storage
 * Path: sports/{org_id}/{sport_id}/icon.{ext}
 */
export async function uploadSportIcon(
    context: UserContext,
    sportId: string,
    file: File
): Promise<{ path: string | null; error: Error | null }> {
    console.groupCollapsed(`%cuploadSportIcon: ${sportId}`, 'color: #666; font-weight: bold;');
    debug.flow('SportsService.uploadSportIcon', 'Uploading sport icon', { sportId, orgId: context.orgId, fileName: file.name, fileSize: file.size })
    debug.perf.start('sportsService.uploadSportIcon')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('sportsService.uploadSportIcon')
        debug.error('SportsService.uploadSportIcon', 'Not available in demo mode', { sportId })
        console.groupEnd()
        return {
            path: null,
            error: new Error('Icon upload is not available in demo mode')
        }
    }

    try {
        if (!context.orgId) {
            debug.perf.end('sportsService.uploadSportIcon')
            debug.error('SportsService.uploadSportIcon', 'Organization ID is required', { sportId })
            console.groupEnd()
            return { path: null, error: new Error('Organization ID is required') }
        }

        if (!sportId) {
            debug.perf.end('sportsService.uploadSportIcon')
            debug.error('SportsService.uploadSportIcon', 'Sport ID is required', { orgId: context.orgId })
            console.groupEnd()
            return { path: null, error: new Error('Sport ID is required') }
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) {
            debug.perf.end('sportsService.uploadSportIcon')
            debug.error('SportsService.uploadSportIcon', 'Invalid file type', { sportId, fileType: file.type })
            console.groupEnd()
            return { path: null, error: new Error('Invalid file type. Please upload a PNG, JPEG, WebP, or SVG image.') }
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            debug.perf.end('sportsService.uploadSportIcon')
            debug.error('SportsService.uploadSportIcon', 'File size exceeds limit', { sportId, fileSize: file.size })
            console.groupEnd()
            return { path: null, error: new Error('File size exceeds 5MB limit. Please upload a smaller image.') }
        }

        const fileExt = file.name.split('.').pop() || 'png'
        const filePath = `sports/${context.orgId}/${sportId}/icon.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
            .upload(`sports/${filePath}`, file, { upsert: true })

        if (uploadError) {
            // Check for network errors
            if (uploadError.message?.includes('network') || uploadError.message?.includes('fetch') || uploadError.message?.includes('timeout')) {
                return { path: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS') || uploadError.message?.includes('permission')) {
                return { path: null, error: new Error('Permission denied. You do not have permission to upload sport icons.') }
            }
            throw uploadError
        }

        // Update or create customization record
        const { error: updateError } = await supabase
            .from('organization_sport_customizations' as any)
            .upsert({
                org_id: context.orgId,
                sport_id: sportId,
                icon_path: filePath,
            }, {
                onConflict: 'org_id,sport_id'
            })

        if (updateError) {
            console.error('[sportsService] Error updating customization:', updateError)
            // Don't fail - the file was uploaded, we can update the customization later
        }

        // Log audit event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await logSportEvent(
                'SPORT_ICON_UPLOADED',
                context.orgId,
                sportId,
                user?.id,
                'org_admin',
                {
                    icon_path: filePath,
                    file_size: file.size,
                    file_type: file.type,
                }
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log SPORT_ICON_UPLOADED event:', logError)
        }

        debug.perf.end('sportsService.uploadSportIcon')
        debug.flow('SportsService.uploadSportIcon', 'Icon uploaded successfully', { sportId, filePath })
        console.groupEnd()
        return { path: filePath, error: null }
    } catch (err) {
        debug.perf.end('sportsService.uploadSportIcon')
        debug.error('SportsService.uploadSportIcon', 'Exception uploading icon', { error: err, sportId })
        console.groupEnd()
        console.error('[sportsService] Error uploading sport icon:', err)
        return { path: null, error: err instanceof Error ? err : new Error('Unknown error uploading icon') }
    }
}

/**
 * Get public URL for sport icon
 */
export function getSportIconUrl(iconPath: string | null): string | null {
    if (!iconPath) return null

    // If the value is already a usable URL (e.g. a hosted asset or data URI), return as-is.
    // Some legacy/system sports may store a full URL in `sports.icon`.
    if (/^(https?:\/\/|data:)/i.test(iconPath)) return iconPath
    
    // If it's a Material Icon name (no slashes, no file extension), return null
    // The component should render a Material Icon instead
    if (!iconPath.includes('/') && !iconPath.includes('.')) return null
    
    const { data } = supabase.storage
        .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
        .getPublicUrl(`sports/${iconPath}`)
    
    return data.publicUrl
}

/**
 * Delete sport icon
 */
export async function deleteSportIcon(
    context: UserContext,
    sportId: string
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cdeleteSportIcon: ${sportId}`, 'color: #666; font-weight: bold;');
    debug.flow('SportsService.deleteSportIcon', 'Deleting sport icon', { sportId, orgId: context.orgId })
    debug.perf.start('sportsService.deleteSportIcon')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('sportsService.deleteSportIcon')
        debug.error('SportsService.deleteSportIcon', 'Not available in demo mode', { sportId })
        console.groupEnd()
        return { error: new Error('Icon deletion is not available in demo mode') }
    }

    try {
        if (!context.orgId) {
            return { error: new Error('Organization ID is required') }
        }

        // Get customization to find icon path
        const { data: customization, error: fetchError } = await supabase
            .from('organization_sport_customizations' as any)
            .select('icon_path')
            .eq('org_id', context.orgId)
            .eq('sport_id', sportId)
            .maybeSingle()

        if (fetchError) {
            console.error('[sportsService] Error fetching customization:', fetchError)
        }

        // Delete file from storage if it exists
        type CustomizationRow = { icon_path: string | null }
        const customizationRow = customization && !('error' in customization) 
            ? (customization as unknown as CustomizationRow)
            : null
        if (customizationRow?.icon_path) {
            const { error: deleteError } = await supabase.storage
                .from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET)
                .remove([`sports/${customizationRow.icon_path}`])

            if (deleteError) {
                console.error('[sportsService] Error deleting icon file:', deleteError)
                // Continue - try to update customization anyway
            }
        }

        // Remove icon_path from customization (keep color if exists)
        const { error: updateError } = await supabase
            .from('organization_sport_customizations' as any)
            .update({ icon_path: null } as any)
            .eq('org_id', context.orgId)
            .eq('sport_id', sportId)

        if (updateError) {
            // If no customization exists, that's fine - nothing to delete
            if (updateError.code !== 'PGRST116') {
                throw updateError
            }
        }

        // Log audit event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await logSportEvent(
                'SPORT_ICON_DELETED',
                context.orgId,
                sportId,
                user?.id,
                'org_admin',
                {}
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log SPORT_ICON_DELETED event:', logError)
        }

        debug.perf.end('sportsService.deleteSportIcon')
        debug.flow('SportsService.deleteSportIcon', 'Icon deleted successfully', { sportId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('sportsService.deleteSportIcon')
        debug.error('SportsService.deleteSportIcon', 'Exception deleting icon', { error: err, sportId })
        console.groupEnd()
        console.error('[sportsService] Error deleting sport icon:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error deleting icon') }
    }
}

/**
 * Update sport customization (icon and/or color)
 */
export async function updateSportCustomization(
    context: UserContext,
    sportId: string,
    updates: { icon_path?: string | null; color?: string | null }
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: new Error('Customization updates are not available in demo mode') }
    }

    try {
        if (!context.orgId) {
            debug.perf.end('sportsService.updateSportCustomization')
            debug.error('SportsService.updateSportCustomization', 'Organization ID is required', { sportId })
            console.groupEnd()
            return { error: new Error('Organization ID is required') }
        }

        // Validate color format if provided
        if (updates.color && !/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
            debug.perf.end('sportsService.updateSportCustomization')
            debug.error('SportsService.updateSportCustomization', 'Invalid color format', { sportId, color: updates.color })
            console.groupEnd()
            return { error: new Error('Invalid color format. Please use hex format (e.g., var(--org-btn-primary-bg, #137fec))') }
        }

        const updateData: any = {}
        if (updates.icon_path !== undefined) updateData.icon_path = updates.icon_path
        if (updates.color !== undefined) updateData.color = updates.color

        // Upsert customization
        const { error: upsertError } = await supabase
            .from('organization_sport_customizations' as any)
            .upsert({
                org_id: context.orgId,
                sport_id: sportId,
                ...updateData,
            }, {
                onConflict: 'org_id,sport_id'
            })

        if (upsertError) {
            // Check for network errors
            if (upsertError.message?.includes('network') || upsertError.message?.includes('fetch') || upsertError.message?.includes('timeout')) {
                debug.perf.end('sportsService.updateSportCustomization')
                debug.error('SportsService.updateSportCustomization', 'Network error', { error: upsertError, sportId })
                console.groupEnd()
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (upsertError.message?.includes('row-level security') || upsertError.message?.includes('RLS') || upsertError.code === '42501') {
                debug.perf.end('sportsService.updateSportCustomization')
                debug.error('SportsService.updateSportCustomization', 'Permission denied', { error: upsertError, sportId })
                console.groupEnd()
                return { error: new Error('Permission denied. You do not have permission to customize sports.') }
            }
            throw upsertError
        }

        // Log audit event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const eventType = updates.icon_path !== undefined && updates.color !== undefined
                ? 'SPORT_CUSTOMIZED'
                : updates.icon_path !== undefined
                ? 'SPORT_ICON_UPLOADED'
                : 'SPORT_CUSTOMIZATION_UPDATED'
            
            await logSportEvent(
                eventType,
                context.orgId,
                sportId,
                user?.id,
                'org_admin',
                {
                    icon_path: updates.icon_path,
                    color: updates.color,
                }
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log customization event:', logError)
        }

        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error updating sport customization:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error updating customization') }
    }
}

// ============================================================================
// Programs CRUD Operations
// ============================================================================

/**
 * Get all programs for an organization
 */
export async function getPrograms(
    context: UserContext,
    sportId?: string
): Promise<{ data: Program[] | FakeProgram[]; error: Error | null }> {
    console.groupCollapsed(`%cgetPrograms: ${sportId || 'all'}`, 'color: #666; font-weight: bold;');
    debug.data('SportsService.getPrograms', 'Request', { orgId: context.orgId, sportId })
    debug.perf.start('sportsService.getPrograms')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        let programs = getProgramsForOrg(DEMO_ORG_A_ID)
        
        // Filter programs for coaches - only show programs used by teams they're assigned to
        if (context.roles.includes('coach') && !context.roles.includes('org_admin')) {
            const guardianUserId = getGuardianCanonicalUserId(context)
            const permissions: PermissionSet = {
                canViewAllOrgData: false,
                canViewAssignedTeams: true,
                canViewOwnChildrenData: false,
                assignedTeamIds: await getCoachTeamIds(context),
                ownedChildIds: getChildrenForUserId(guardianUserId),
                ownedFamilyIds: getFamiliesForUserId(guardianUserId),
            }
            
            if (permissions.assignedTeamIds.length > 0) {
                const programIds = new Set<string>()
                for (const teamId of permissions.assignedTeamIds) {
                    const team = getTeamById(teamId)
                    if (team?.program_id) {
                        programIds.add(team.program_id)
                    }
                }
                programs = programs.filter(p => programIds.has(p.id))
            } else {
                // Coach with no assigned teams sees no programs
                programs = []
            }
        }
        
        if (sportId) {
            programs = programs.filter(p => p.sport_id === sportId)
        }
        debug.perf.end('sportsService.getPrograms')
        debug.data('SportsService.getPrograms', 'Response (fake)', { programCount: programs.length, sportId })
        console.groupEnd()
        return { data: programs, error: null }
    }

    try {
        let query = supabase
            .from('programs')
            .select('*')
            .eq('org_id', context.orgId)
            .order('name')

        if (sportId) {
            query = query.eq('sport_id', sportId)
        }

        const { data, error } = await query

        if (error) throw error
        return { data: data as unknown as Program[], error: null }
    } catch (err) {
        console.error('[sportsService] Error getting programs:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single program by ID
 */
export async function getProgram(
    context: UserContext,
    programId: string
): Promise<{ data: Program | FakeProgram | null; error: Error | null }> {
    console.groupCollapsed(`%cgetProgram: ${programId}`, 'color: #666; font-weight: bold;');
    debug.data('SportsService.getProgram', 'Request', { programId, orgId: context.orgId })
    debug.perf.start('sportsService.getProgram')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        const program = getProgramById(programId)
        debug.perf.end('sportsService.getProgram')
        debug.data('SportsService.getProgram', 'Response (fake)', { programId, hasData: !!program })
        console.groupEnd()
        return { data: program || null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('programs')
            .select('*')
            .eq('id', programId)
            .eq('org_id', context.orgId)
            .single()

        if (error) throw error
        debug.perf.end('sportsService.getProgram')
        debug.data('SportsService.getProgram', 'Response', { programId, hasData: !!data })
        console.groupEnd()
        return { data: data as unknown as Program, error: null }
    } catch (err) {
        debug.perf.end('sportsService.getProgram')
        debug.error('SportsService.getProgram', 'Failed to get program', { error: err, programId })
        console.groupEnd()
        console.error('[sportsService] Error getting program:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Create a new program
 */
export async function createProgram(
    _context: UserContext,
    dto: CreateProgramDTO
): Promise<{ data: Program | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateProgram: ${dto.name}`, 'color: #666; font-weight: bold;');
    debug.flow('SportsService.createProgram', 'Creating program', { orgId: dto.org_id, sportId: dto.sport_id, name: dto.name })
    debug.perf.start('sportsService.createProgram')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('sportsService.createProgram')
        debug.error('SportsService.createProgram', 'Not available in demo mode', { name: dto.name })
        console.groupEnd()
        return {
            data: null,
            error: new Error('Create operations are not available in demo mode')
        }
    }

    try {
        // Validate program code uniqueness if provided
        if (dto.program_code && dto.program_code.trim()) {
            const { data: existing } = await supabase
                .from('programs')
                .select('id')
                .eq('org_id', dto.org_id)
                .eq('program_code', dto.program_code.trim())
                .maybeSingle()
            
            if (existing) {
                debug.perf.end('sportsService.createProgram')
                debug.error('SportsService.createProgram', 'Program code already exists', { program_code: dto.program_code })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Program code already exists. Please choose a different code.') 
                }
            }
        }

        // Validate date ranges
        if (dto.activity_start_date && dto.activity_end_date) {
            const start = new Date(dto.activity_start_date)
            const end = new Date(dto.activity_end_date)
            if (end < start) {
                debug.perf.end('sportsService.createProgram')
                debug.error('SportsService.createProgram', 'Activity end date before start date', { activity_start_date: dto.activity_start_date, activity_end_date: dto.activity_end_date })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Activity end date must be after start date.') 
                }
            }
        }

        if (dto.registration_start_date && dto.registration_end_date) {
            const regStart = new Date(dto.registration_start_date)
            const regEnd = new Date(dto.registration_end_date)
            if (regEnd < regStart) {
                debug.perf.end('sportsService.createProgram')
                debug.error('SportsService.createProgram', 'Registration end date before start date', { registration_start_date: dto.registration_start_date, registration_end_date: dto.registration_end_date })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Registration end date must be after start date.') 
                }
            }
        }

        // Validate registration dates fall within activity dates (when both set)
        if (dto.activity_start_date && dto.activity_end_date && 
            dto.registration_start_date && dto.registration_end_date) {
            const activityStart = new Date(dto.activity_start_date)
            const activityEnd = new Date(dto.activity_end_date)
            const regStart = new Date(dto.registration_start_date)
            const regEnd = new Date(dto.registration_end_date)
            
            if (regStart < activityStart || regEnd > activityEnd) {
                debug.perf.end('sportsService.createProgram')
                debug.error('SportsService.createProgram', 'Registration dates outside activity dates', { 
                    activity_start_date: dto.activity_start_date, 
                    activity_end_date: dto.activity_end_date,
                    registration_start_date: dto.registration_start_date,
                    registration_end_date: dto.registration_end_date
                })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Registration dates must fall within activity dates.') 
                }
            }
        }

        // Validate default_location_id belongs to org if provided
        if (dto.default_location_id) {
            const { data: venue, error: venueError } = await supabase
                .from('venues')
                .select('id')
                .eq('id', dto.default_location_id)
                .eq('org_id', dto.org_id)
                .maybeSingle()
            
            if (venueError || !venue) {
                debug.perf.end('sportsService.createProgram')
                debug.error('SportsService.createProgram', 'Invalid venue', { default_location_id: dto.default_location_id, error: venueError })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Selected location is not available for this organization.') 
                }
            }
        }

        const insertData: any = {
            org_id: dto.org_id,
            sport_id: dto.sport_id,
            name: dto.name,
            gender_category: dto.gender_category,
            description: dto.description || null,
            age_min: dto.age_min || null,
            age_max: dto.age_max || null,
            is_public: dto.is_public ?? false,
            activity_start_date: dto.activity_start_date || null,
            activity_end_date: dto.activity_end_date || null,
            registration_start_date: dto.registration_start_date || null,
            registration_end_date: dto.registration_end_date || null,
            program_code: dto.program_code?.trim() || null,
            sponsor: dto.sponsor?.trim() || null,
            default_location_id: dto.default_location_id || null,
            registration_mode: dto.registration_mode || 'both',
        }
        const { data, error } = await supabase
            .from('programs')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            // Handle uniqueness constraint violation
            if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
                debug.perf.end('sportsService.createProgram')
                debug.error('SportsService.createProgram', 'Program code uniqueness violation', { error, program_code: dto.program_code })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Program code already exists. Please choose a different code.') 
                }
            }
            throw error
        }
        debug.perf.end('sportsService.createProgram')
        debug.flow('SportsService.createProgram', 'Program created successfully', { programId: data?.id, name: dto.name })
        console.groupEnd()
        return { data: data as unknown as Program, error: null }
    } catch (err) {
        debug.perf.end('sportsService.createProgram')
        debug.error('SportsService.createProgram', 'Failed to create program', { error: err, name: dto.name })
        console.groupEnd()
        console.error('[sportsService] Error creating program:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Update a program
 */
export async function updateProgram(
    context: UserContext,
    programId: string,
    dto: UpdateProgramDTO
): Promise<{ data: Program | null; error: Error | null }> {
    console.groupCollapsed(`%cupdateProgram: ${programId}`, 'color: #666; font-weight: bold;');
    debug.flow('SportsService.updateProgram', 'Updating program', { programId, orgId: context.orgId, updates: Object.keys(dto) })
    debug.perf.start('sportsService.updateProgram')

    if (USE_FAKE_DATA) {
        await simulateDelay()
        debug.perf.end('sportsService.updateProgram')
        debug.error('SportsService.updateProgram', 'Not available in demo mode', { programId })
        console.groupEnd()
        return {
            data: null,
            error: new Error('Update operations are not available in demo mode')
        }
    }

    try {
        // Validate program code uniqueness if provided and changed
        if (dto.program_code !== undefined && dto.program_code.trim()) {
            const { data: existing } = await supabase
                .from('programs')
                .select('id')
                .eq('org_id', context.orgId)
                .eq('program_code', dto.program_code.trim())
                .neq('id', programId)
                .maybeSingle()
            
            if (existing) {
                debug.perf.end('sportsService.updateProgram')
                debug.error('SportsService.updateProgram', 'Program code already exists', { program_code: dto.program_code })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Program code already exists. Please choose a different code.') 
                }
            }
        }

        // Get current program data for date validation
        const { data: currentProgram } = await (supabase as any)
            .from('programs')
            .select('activity_start_date, activity_end_date, registration_start_date, registration_end_date')
            .eq('id', programId)
            .eq('org_id', context.orgId)
            .single()

        const activityStart = dto.activity_start_date || currentProgram?.activity_start_date
        const activityEnd = dto.activity_end_date || currentProgram?.activity_end_date

        // Validate date ranges
        if (activityStart && activityEnd) {
            const start = new Date(activityStart)
            const end = new Date(activityEnd)
            if (end < start) {
                debug.perf.end('sportsService.updateProgram')
                debug.error('SportsService.updateProgram', 'Activity end date before start date', { activity_start_date: activityStart, activity_end_date: activityEnd })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Activity end date must be after start date.') 
                }
            }
        }

        const regStart = dto.registration_start_date || currentProgram?.registration_start_date
        const regEnd = dto.registration_end_date || currentProgram?.registration_end_date

        if (regStart && regEnd) {
            const start = new Date(regStart)
            const end = new Date(regEnd)
            if (end < start) {
                debug.perf.end('sportsService.updateProgram')
                debug.error('SportsService.updateProgram', 'Registration end date before start date', { registration_start_date: regStart, registration_end_date: regEnd })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Registration end date must be after start date.') 
                }
            }
        }

        // Validate registration dates fall within activity dates (when both set)
        if (activityStart && activityEnd && regStart && regEnd) {
            const actStart = new Date(activityStart)
            const actEnd = new Date(activityEnd)
            const regStartDate = new Date(regStart)
            const regEndDate = new Date(regEnd)
            
            if (regStartDate < actStart || regEndDate > actEnd) {
                debug.perf.end('sportsService.updateProgram')
                debug.error('SportsService.updateProgram', 'Registration dates outside activity dates', { 
                    activity_start_date: activityStart, 
                    activity_end_date: activityEnd,
                    registration_start_date: regStart,
                    registration_end_date: regEnd
                })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Registration dates must fall within activity dates.') 
                }
            }
        }

        // Validate default_location_id belongs to org if provided
        if (dto.default_location_id !== undefined && dto.default_location_id) {
            const { data: venue, error: venueError } = await supabase
                .from('venues')
                .select('id')
                .eq('id', dto.default_location_id)
                .eq('org_id', context.orgId)
                .maybeSingle()
            
            if (venueError || !venue) {
                debug.perf.end('sportsService.updateProgram')
                debug.error('SportsService.updateProgram', 'Invalid venue', { default_location_id: dto.default_location_id, error: venueError })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Selected location is not available for this organization.') 
                }
            }
        }

        const updateData: any = {}
        if (dto.name !== undefined) updateData.name = dto.name
        if (dto.gender_category !== undefined) updateData.gender_category = dto.gender_category
        if (dto.description !== undefined) updateData.description = dto.description
        if (dto.age_min !== undefined) updateData.age_min = dto.age_min
        if (dto.age_max !== undefined) updateData.age_max = dto.age_max
        if (dto.is_public !== undefined) updateData.is_public = dto.is_public
        if (dto.activity_start_date !== undefined) updateData.activity_start_date = dto.activity_start_date || null
        if (dto.activity_end_date !== undefined) updateData.activity_end_date = dto.activity_end_date || null
        if (dto.registration_start_date !== undefined) updateData.registration_start_date = dto.registration_start_date || null
        if (dto.registration_end_date !== undefined) updateData.registration_end_date = dto.registration_end_date || null
        if (dto.program_code !== undefined) updateData.program_code = dto.program_code?.trim() || null
        if (dto.sponsor !== undefined) updateData.sponsor = dto.sponsor?.trim() || null
        if (dto.default_location_id !== undefined) updateData.default_location_id = dto.default_location_id || null
        if (dto.registration_mode !== undefined) updateData.registration_mode = dto.registration_mode

        const { data, error} = await supabase
            .from('programs')
            .update(updateData)
            .eq('id', programId)
            .eq('org_id', context.orgId)
            .select()
            .single()

        if (error) {
            // Handle uniqueness constraint violation
            if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
                debug.perf.end('sportsService.updateProgram')
                debug.error('SportsService.updateProgram', 'Program code uniqueness violation', { error, program_code: dto.program_code })
                console.groupEnd()
                return { 
                    data: null, 
                    error: new Error('Program code already exists. Please choose a different code.') 
                }
            }
            throw error
        }
        debug.perf.end('sportsService.updateProgram')
        debug.flow('SportsService.updateProgram', 'Program updated successfully', { programId })
        console.groupEnd()
        return { data: data as unknown as Program, error: null }
    } catch (err) {
        debug.perf.end('sportsService.updateProgram')
        debug.error('SportsService.updateProgram', 'Failed to update program', { error: err, programId })
        console.groupEnd()
        console.error('[sportsService] Error updating program:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Delete a program
 * Note: deleted_at column doesn't exist, so this performs a hard delete
 * Will fail if program has levels (enforced by database trigger)
 */
export async function deleteProgram(
    context: UserContext,
    programId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: new Error('Delete operations are not available in demo mode') }
    }

    try {
        const { error } = await supabase
            .from('programs')
            .delete()
            .eq('id', programId)
            .eq('org_id', context.orgId)

        if (error) {
            // Check for trigger errors (deletion blocked due to children)
            if (error.code === 'P0001' || error.message?.includes('Cannot delete program')) {
                // Database trigger error - program has levels
                debug.perf.end('sportsService.deleteProgram')
                debug.error('SportsService.deleteProgram', 'Cannot delete program (has children)', { error, programId })
                console.groupEnd()
                return { error: new Error(error.message || 'Cannot delete program: It contains levels and cannot be removed.') }
            }
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                debug.perf.end('sportsService.deleteProgram')
                debug.error('SportsService.deleteProgram', 'Network error', { error, programId })
                console.groupEnd()
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                debug.perf.end('sportsService.deleteProgram')
                debug.error('SportsService.deleteProgram', 'Permission denied', { error, programId })
                console.groupEnd()
                return { error: new Error('Permission denied. You do not have permission to delete this program.') }
            }
            // Check for foreign key violations
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                debug.perf.end('sportsService.deleteProgram')
                debug.error('SportsService.deleteProgram', 'Foreign key violation', { error, programId })
                console.groupEnd()
                return { error: new Error('Cannot delete program: It is currently in use.') }
            }
            throw error
        }
        debug.perf.end('sportsService.deleteProgram')
        debug.flow('SportsService.deleteProgram', 'Program deleted successfully', { programId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('sportsService.deleteProgram')
        debug.error('SportsService.deleteProgram', 'Exception deleting program', { error: err, programId })
        console.groupEnd()
        console.error('[sportsService] Error deleting program:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
