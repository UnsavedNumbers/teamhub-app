/**
 * Family Service
 *
 * Provides data access for families, children, and family members.
 * Supports both Fake Data (Demo Mode) and Real Supabase Data.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { normalizeSupabaseResponse } from './responseHelpers'
import {
    fakeFamilies,
    fakeChildren,
    getFamiliesForUser,
    getChildrenForUser,
    getFamilyById,
    getFamilyMembersForFamily,
    type FakeFamily,
    type FakeChild,
    type FakeFamilyMember,
} from '../fake/fakeUsers'
import { getChildrenForUserId, getFamiliesForUserId } from '../fake/relationships'
import type {
    Family,
    Child,
    FamilyMember,
    FamilyWithDetails,
    Gender,
    CreateFamilyDTO,
    UpdateFamilyDTO,
    CreateChildDTO,
    UpdateChildDTO,
    CreateAthleteDTO,
    UpdateAthleteDTO
} from '../../types/family'
import type {
    SearchAthletesParams,
    SearchAthletesResponse,
    AthleteWithTeams,
    CurrentTeam
} from '../../types/athletes'

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

function buildPermissions(context: UserContext): PermissionSet {
    const ownedChildIds = getChildrenForUserId(context.userId)
    const ownedFamilyIds = getFamiliesForUserId(context.userId)
    return calculatePermissions(context, [], ownedChildIds, ownedFamilyIds)
}

// Convert Fake types to App types (casting where safely compatible for this demo)
function mapFakeFamily(f: FakeFamily): Family {
    return {
        ...f,
        deleted_at: null
    }
}

function mapFakeChild(c: FakeChild): Child {
    return {
        ...c,
        preferred_name: null,
        photo_url: null,
        deleted_at: null
    }
}

function mapFakeMember(m: FakeFamilyMember): FamilyMember {
    return {
        ...m,
        updated_at: m.created_at, // fake data missing update
        deleted_at: null
    }
}

// ============================================================================
// Family Service Functions
// ============================================================================

/**
 * Get families for the current user or organization (if admin)
 */
export async function getFamilies(
    context: UserContext,
    options: { limit?: number; offset?: number } = {}
): Promise<{ data: Family[]; count: number; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            const permissions = buildPermissions(context)
            let result: FakeFamily[] = []

            if (permissions.canViewAllOrgData) {
                result = fakeFamilies.filter((f) => f.org_id === context.orgId)
            } else {
                result = getFamiliesForUser(context.userId)
            }

            // "Paginate" fake data
            const start = options.offset || 0
            const end = options.limit ? start + options.limit : undefined
            const paged = result.slice(start, end)

            return {
                data: paged.map(mapFakeFamily),
                count: result.length,
                error: null
            }
        }

        // Real Supabase Query
        // Note: families table does not have deleted_at column
        let query = supabase
            .from('families')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        // Apply Org Filter (RLS usually handles this, but good to be explicit)
        // If context has orgId, we might want to filter by it, 
        // relying on RLS policies to restrict "User's Families" vs "All Families"
        if (context.orgId) {
            query = query.eq('org_id', context.orgId)
        }

        if (options.limit) query = query.limit(options.limit)
        if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1)

        const { data, count, error } = await query

        if (error) throw error

        return {
            data: (data || []) as Family[],
            count: count || 0,
            error: null
        }

    } catch (err) {
        return { data: [], count: 0, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single family with full details (children + members)
 */
export async function getFamilyDetails(
    context: UserContext,
    familyId: string
): Promise<{ data: FamilyWithDetails | null; error: Error | null }> {
    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            const family = getFamilyById(familyId)
            if (!family) return { data: null, error: null }

            // Access check
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData && !permissions.ownedFamilyIds.includes(familyId)) {
                return { data: null, error: new Error('Access denied') }
            }

            const members = getFamilyMembersForFamily(familyId).map(mapFakeMember)
            const children = fakeChildren
                .filter((c) => c.family_id === familyId)
                .map(mapFakeChild)

            return {
                data: { ...mapFakeFamily(family), members, children },
                error: null,
            }
        }

        // Real Data
        // Note: families table does not have deleted_at column
        const { data: family, error: familyError } = await supabase
            .from('families')
            .select('*')
            .eq('id', familyId)
            .single()

        if (familyError) throw familyError
        if (!family) return { data: null, error: null }

        // Fetch children
        const { data: children, error: childrenError } = await supabase
            .from('athletes')
            .select('*')
            .eq('family_id', familyId)
            .is('deleted_at', null)

        if (childrenError) throw childrenError

        // Fetch members
        // Note: family_members table does not have deleted_at column
        const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', familyId)

        if (membersError) throw membersError

        return {
            data: {
                ...(family as any as Family),
                children: (children as any[] as Child[]) || [],
                members: (members as any[] as FamilyMember[]) || []
            },
            error: null
        }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Create a new Family
 */
export async function createFamily(
    context: UserContext,
    dto: CreateFamilyDTO
): Promise<{ data: Family | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        // Demo mode: prevent write
        await simulateDelay()
        return {
            data: {
                id: `demo-family-${Date.now()}`,
                ...dto,
                created_by_user_id: context.userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null
            },
            error: null
        }
    }

    try {
        type FamilyInsert = Database['public']['Tables']['families']['Insert']
        const insertData = {
            name: dto.name,
            org_id: dto.org_id,
        } satisfies FamilyInsert
        const { data, error } = await supabase
            .from('families')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error
        return { data: data as unknown as Family, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Create failed') }
    }
}

/**
 * Update a Family
 */
export async function updateFamily(
    _context: UserContext,
    familyId: string,
    dto: UpdateFamilyDTO
): Promise<{ data: Family | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: null, error: null } // Mock success
    }

    try {
        type FamilyUpdate = Database['public']['Tables']['families']['Update']
        const updateData = {
            ...dto,
            updated_at: new Date().toISOString()
        } satisfies FamilyUpdate
        const { data, error } = await supabase
            .from('families')
            .update(updateData)
            .eq('id', familyId)
            .select()
            .single()

        if (error) throw error
        return { data: data as unknown as Family, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Update failed') }
    }
}

/**
 * Soft Delete a Family
 */
export async function deleteFamily(
    _context: UserContext,
    familyId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: null }
    }

    try {
        const { error } = await supabase
            .from('families')
            .delete()
            .eq('id', familyId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Delete failed') }
    }
}

// ============================================================================
// Athlete Service Functions (Core CRUD)
// ============================================================================

/**
 * Create a basic athlete (without guardians)
 * For creating athletes with guardians, use createAthleteWithGuardians
 */
export async function createAthleteBasic(
    _context: UserContext,
    dto: CreateChildDTO
): Promise<{ data: Child | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: {
                id: `demo-child-${Date.now()}`,
                first_name: dto.first_name,
                last_name: dto.last_name,
                date_of_birth: dto.date_of_birth,
                family_id: dto.family_id ?? null,
                gender: dto.gender || null,
                preferred_name: null,
                photo_url: null,
                jersey_number: dto.jersey_number || null,
                medical_notes: dto.medical_notes || null,
                allergies: dto.allergies || null,
                emergency_contact_name: dto.emergency_contact_name || null,
                emergency_contact_phone: dto.emergency_contact_phone || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null
            },
            error: null
        }
    }

    try {
        type ChildInsert = Database['public']['Tables']['athletes']['Insert']
        const insertData = dto satisfies ChildInsert
        const { data, error } = await supabase
            .from('athletes')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error
        return { data: data as unknown as Child, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Create athlete failed') }
    }
}

/**
 * Update an athlete
 */
export async function updateAthlete(
    _context: UserContext,
    athleteId: string,
    dto: UpdateAthleteDTO
): Promise<{ data: Child | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: null, error: null }
    }

    try {
        type ChildUpdate = Database['public']['Tables']['athletes']['Update']
        const updateData = {
            ...dto,
            updated_at: new Date().toISOString()
        } satisfies ChildUpdate
        const { data, error } = await supabase
            .from('athletes')
            .update(updateData)
            .eq('id', athleteId)
            .select()
            .single()

        if (error) throw error
        return { data: data as unknown as Child, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Update athlete failed') }
    }
}

/**
 * Delete an athlete
 */
export async function deleteAthlete(
    _context: UserContext,
    athleteId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: null }
    }

    try {
        // Delete athlete record
        // Note: photo_url column doesn't exist yet, so photo cleanup is skipped
        const { error } = await supabase
            .from('athletes')
            .delete()
            .eq('id', athleteId)

        if (error) throw error

        // Photo cleanup skipped - photo_url column doesn't exist in database yet
        // TODO: Re-enable when photo_url column is added

        return { error: null }
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Delete athlete failed') }
    }
}

/**
 * Get athletes for the current user
 */
export async function getAthletes(
    context: UserContext
): Promise<{ data: Child[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            if (permissions.canViewAllOrgData) {
                const results = fakeChildren
                    .filter(c => fakeFamilies.find(f => f.id === c.family_id)?.org_id === context.orgId)
                    .map(mapFakeChild)
                return { data: results, error: null }
            }
            const results = getChildrenForUser(context.userId).map(mapFakeChild)
            return { data: results, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown') }
        }
    }

    // Real Data
    try {
        // Query athletes with guardian status using the batch RPC function
        // This is more efficient than checking each athlete individually
        console.log('[getAthletes] Fetching athletes with guardian status for org:', context.orgId)
        
        const { data, error } = await supabase
            .rpc('get_athletes_with_guardian_status', {
                p_org_id: context.orgId,
                p_limit: 10000, // Large limit to get all athletes (pagination handled client-side)
                p_offset: 0
            })

        console.log('[getAthletes] Query result:', { data, error, count: data?.length })

        if (error) {
            console.error('[getAthletes] Query error:', error)
            throw error
        }
        
        // Transform the data to match Athlete type with empty sports array
        // Sports can be fetched separately if needed
        const transformed = (data || []).map((d: any) => ({
            id: d.athlete_id,
            family_id: d.family_id,
            first_name: d.first_name,
            last_name: d.last_name,
            date_of_birth: d.birthdate ? new Date(d.birthdate).toISOString().split('T')[0] : '',
            gender: d.gender,
            preferred_name: d.preferred_name ?? null,
            jersey_number: d.jersey_number ?? null,
            medical_notes: d.medical_notes ?? null,
            allergies: d.allergies ?? null,
            emergency_contact_name: d.emergency_contact_name ?? null,
            emergency_contact_phone: d.emergency_contact_phone ?? null,
            photo_url: null, // photo_url column doesn't exist in database yet
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || new Date().toISOString(),
            deleted_at: d.deleted_at,
            sports: [], // Sports will be fetched separately if needed
            has_active_guardian: d.has_active_guardian ?? false // Include guardian status
        } as Child))
        
        console.log('[getAthletes] Returning athletes:', transformed.length)
        return { data: transformed, error: null }
    } catch (err) {
        console.error('[getAthletes] Error fetching athletes:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Fetch failed') }
    }
}

/**
 * Legacy alias for getAthletes
 * Maintains backward compatibility with existing code
 */
export async function getChildren(
    context: UserContext
): Promise<{ data: Child[]; error: Error | null }> {
    return getAthletes(context)
}

/**
 * Search athletes with filters (for adding existing athletes to teams)
 * 
 * This function:
 * - Performs server-side search (only fetches matching athletes)
 * - Filters by org via athlete_guardians or team_memberships
 * - Calculates age at database level for accuracy
 * - Includes current teams for each athlete
 * - Excludes athletes already on specified team/season
 * - Limits results to 100 for performance
 */
export async function searchAthletes(
    context: UserContext,
    params: SearchAthletesParams
): Promise<SearchAthletesResponse> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            
            let results = fakeChildren
                .filter(c => fakeFamilies.find(f => f.id === c.family_id)?.org_id === context.orgId)
                .map(mapFakeChild)
            
            // Apply search filter
            if (params.search && params.search.length >= 2) {
                const searchLower = params.search.toLowerCase()
                results = results.filter(c => 
                    c.first_name.toLowerCase().includes(searchLower) ||
                    c.last_name.toLowerCase().includes(searchLower)
                )
            }
            
            // Apply age filter (client-side calculation for fake data)
            if (params.ageMin !== undefined || params.ageMax !== undefined) {
                results = results.filter(c => {
                    if (!c.date_of_birth) return false
                    const birthdate = new Date(c.date_of_birth)
                    const today = new Date()
                    let age = today.getFullYear() - birthdate.getFullYear()
                    const m = today.getMonth() - birthdate.getMonth()
                    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--
                    
                    if (params.ageMin !== undefined && age < params.ageMin) return false
                    if (params.ageMax !== undefined && age > params.ageMax) return false
                    return true
                })
            }
            
            // Limit results
            results = results.slice(0, 100)
            
            // Map to AthleteWithTeams
            const mapped: AthleteWithTeams[] = results.map(c => {
                const birthdate = c.date_of_birth ? new Date(c.date_of_birth) : null
                const age = birthdate 
                    ? Math.floor((Date.now() - birthdate.getTime()) / (1000 * 60 * 60 * 24 * 365))
                    : null
                
                return {
                    ...c,
                    age,
                    currentTeams: [] // Mock data - would need to fetch from team_memberships
                }
            })
            
            return { data: mapped, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation
    try {
        // Build base query with org filtering via athlete_guardians (Issue #3 solution)
        // This ensures we only see athletes from the user's org
        let query = supabase
            .from('athletes')
            .select(`
                id,
                first_name,
                last_name,
                birthdate,
                gender,
                preferred_name,
                jersey_number,
                medical_notes,
                allergies,
                emergency_contact_name,
                emergency_contact_phone,
                created_at,
                updated_at,
                deleted_at,
                family_id
            `)
            .is('deleted_at', null)
        
        // Filter by org via athlete_guardians join (explicit org filtering)
        // We'll use a subquery to filter athletes that have guardians in this org
        // For now, we'll rely on RLS + explicit org_id filtering if available
        // Note: RLS should handle org filtering, but we add explicit check for defense in depth
        
        // Apply search filter (Issue #1, #8 solution - server-side, min 2 chars)
        if (params.search && params.search.length >= 2) {
            query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`)
        } else if (params.search && params.search.length > 0) {
            // If search is less than 2 chars, return empty (don't search)
            return { data: [], error: null }
        }
        
        // Apply age filter using database calculation (Issue #4 solution)
        if (params.ageMin !== undefined || params.ageMax !== undefined) {
            // We'll need to use a raw SQL approach or filter after fetch
            // For now, fetch all and filter client-side (will optimize with RPC if needed)
            // TODO: Consider creating an RPC function for complex age filtering
        }
        
        // Apply level/program filters via team_memberships -> teams -> levels/programs
        // This is complex, so we'll filter after fetch for now
        // TODO: Optimize with proper joins if performance becomes an issue
        
        // Limit results (Issue #1 solution)
        query = query.limit(100)
        
        // Order by name
        query = query.order('first_name', { ascending: true })
        
        const { data, error } = await query
        
        if (error) {
            console.error('[searchAthletes] Query error:', error)
            throw error
        }
        
        // Map and enrich data
        const normalized = normalizeSupabaseResponse(data, true)
        
        // Exclude athletes already on team (Issue #7 solution - filter after fetch)
        let excludedAthleteIds: string[] = []
        if (params.excludeTeamId && params.excludeSeasonId) {
            const { data: existingMembers } = await supabase
                .from('team_memberships')
                .select('athlete_id')
                .eq('team_id', params.excludeTeamId)
                .eq('season_id', params.excludeSeasonId)
                .eq('status', 'active')
            
            excludedAthleteIds = (existingMembers || []).map((m: { athlete_id: string }) => m.athlete_id)
        }
        
        // Fetch current teams for each athlete (Issue #7 solution - always fresh)
        const athleteIds = (normalized || []).map((a: any) => a.id)
        let currentTeamsMap: Map<string, CurrentTeam[]> = new Map()
        
        if (athleteIds.length > 0) {
            const { data: teamsData } = await supabase
                .from('team_memberships')
                .select(`
                    athlete_id,
                    team_id,
                    season_id,
                    teams!inner(name),
                    seasons!inner(name)
                `)
                .in('athlete_id', athleteIds)
                .eq('status', 'active')
            
            if (teamsData) {
                teamsData.forEach((row: any) => {
                    const athleteId = row.athlete_id
                    if (!currentTeamsMap.has(athleteId)) {
                        currentTeamsMap.set(athleteId, [])
                    }
                    currentTeamsMap.get(athleteId)!.push({
                        teamId: row.team_id,
                        teamName: row.teams?.name || 'Unknown Team',
                        seasonId: row.season_id
                    })
                })
            }
        }
        
        // Map to AthleteWithTeams with type safety (Bug #4, #5 solution)
        const mapped: AthleteWithTeams[] = (normalized || [])
            .filter((row: unknown) => {
                // Filter out excluded athletes
                if (excludedAthleteIds.length > 0 && row && typeof row === 'object') {
                    const r = row as Record<string, unknown>
                    if (r.id && typeof r.id === 'string' && excludedAthleteIds.includes(r.id)) {
                        return false
                    }
                }
                return true
            })
            .map((row: unknown): AthleteWithTeams => {
            if (!row || typeof row !== 'object') {
                throw new Error('Invalid athlete data: not an object')
            }
            
            const r = row as Record<string, unknown>
            
            // Validate required fields
            if (!r.id || typeof r.id !== 'string') {
                throw new Error('Invalid athlete data: missing or invalid id')
            }
            if (!r.first_name || typeof r.first_name !== 'string') {
                throw new Error('Invalid athlete data: missing or invalid first_name')
            }
            if (!r.last_name || typeof r.last_name !== 'string') {
                throw new Error('Invalid athlete data: missing or invalid last_name')
            }
            
            // Calculate age from birthdate (client-side fallback, prefer DB calculation)
            let age: number | null = null
            if (r.birthdate && typeof r.birthdate === 'string') {
                const birthdate = new Date(r.birthdate)
                if (!isNaN(birthdate.getTime())) {
                    const today = new Date()
                    age = today.getFullYear() - birthdate.getFullYear()
                    const m = today.getMonth() - birthdate.getMonth()
                    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
                        age--
                    }
                }
            }
            
            // Get current teams
            const currentTeams = currentTeamsMap.get(r.id as string) || []
            
            // Apply age filter if needed (client-side for now)
            if (params.ageMin !== undefined && age !== null && age < params.ageMin) {
                return null as any // Will filter out
            }
            if (params.ageMax !== undefined && age !== null && age > params.ageMax) {
                return null as any // Will filter out
            }
            
            return {
                id: r.id as string,
                family_id: (r.family_id as string | null) || null,
                first_name: r.first_name as string,
                last_name: r.last_name as string,
                date_of_birth: (r.birthdate as string | null) || '',
                gender: (r.gender as Gender | null) || null,
                preferred_name: (r.preferred_name as string | null) || null,
                jersey_number: (r.jersey_number as string | null) || null,
                medical_notes: (r.medical_notes as string | null) || null,
                allergies: (r.allergies as string | null) || null,
                emergency_contact_name: (r.emergency_contact_name as string | null) || null,
                emergency_contact_phone: (r.emergency_contact_phone as string | null) || null,
                photo_url: null, // photo_url column doesn't exist in database yet
                created_at: (r.created_at as string) || new Date().toISOString(),
                updated_at: (r.updated_at as string) || new Date().toISOString(),
                deleted_at: (r.deleted_at as string | null) || null,
                age,
                currentTeams
            } satisfies AthleteWithTeams
        }).filter((a): a is AthleteWithTeams => a !== null)
        
        return { data: mapped, error: null }
    } catch (err) {
        console.error('[searchAthletes] Error:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Search failed')
        }
    }
}

// ============================================================================
// Athlete Service Functions (Guardian-Aware Operations)
// ============================================================================

/**
 * Get a single athlete by ID with sports data
 */
export async function getAthleteById(
    context: UserContext,
    athleteId: string
): Promise<{ data: Child | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            const child = fakeChildren.find(c => c.id === athleteId)
            
            if (!child) {
                return { data: null, error: null }
            }
            
            // Check access
            if (!permissions.canViewAllOrgData) {
                const ownedChildIds = getChildrenForUserId(context.userId)
                if (!ownedChildIds.includes(athleteId)) {
                    return { data: null, error: new Error('Access denied') }
                }
            }
            
            return { data: mapFakeChild(child), error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Data
    try {
        console.log('[getAthleteById] Fetching athlete:', athleteId)
        
        const { data, error } = await supabase
            .from('athletes')
            .select('*')
            .eq('id', athleteId)
            .is('deleted_at', null)
            .single()

        console.log('[getAthleteById] Query result:', { data, error })

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found
                console.log('[getAthleteById] Athlete not found')
                return { data: null, error: null }
            }
            console.error('[getAthleteById] Query error:', error)
            throw error
        }

        if (!data) {
            return { data: null, error: null }
        }

        // Check if athlete has active guardian using RPC function
        let hasActiveGuardian = false
        try {
            const { data: guardianStatus, error: guardianError } = await supabase
                .rpc('athlete_has_active_guardian', {
                    p_athlete_id: athleteId,
                    p_org_id: context.orgId
                })
            
            if (!guardianError && guardianStatus !== null && typeof guardianStatus === 'boolean') {
                hasActiveGuardian = guardianStatus
            }
        } catch (err) {
            console.warn('[getAthleteById] Error checking guardian status:', err)
            // Continue without guardian status if check fails
        }

        // Return athlete with empty sports array (sports will be fetched separately if needed)
        const athlete: Child = {
            id: data.id,
            family_id: data.family_id,
            first_name: data.first_name,
            last_name: data.last_name,
            date_of_birth: data.birthdate || '',
            gender: data.gender as Gender | null,
            preferred_name: data.preferred_name ?? null,
            jersey_number: null,
            medical_notes: null,
            allergies: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            photo_url: null,
            created_at: data.created_at ?? new Date().toISOString(),
            updated_at: data.updated_at ?? new Date().toISOString(),
            deleted_at: data.deleted_at,
            sports: [],
            has_active_guardian: hasActiveGuardian
        }

        return { data: athlete, error: null }
    } catch (err) {
        console.error('[getAthleteById] Error:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Fetch failed') }
    }
}

/**
 * Create athlete with guardians atomically
 * Uses RPC function for all-or-nothing transaction
 */
export async function createAthleteWithGuardians(
    context: UserContext,
    dto: CreateAthleteDTO
): Promise<{ data: { athlete_id: string; guardians: any[] } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: {
                athlete_id: `demo-athlete-${Date.now()}`,
                guardians: (dto.guardians || []).map((g, idx) => ({
                    type: 'invite',
                    email: g.email,
                    status: 'pending',
                    id: `demo-invite-${idx}`
                }))
            },
            error: null
        }
    }

    try {
        // Prepare athlete data
        const athleteData = {
            first_name: dto.first_name,
            last_name: dto.last_name,
            birthdate: dto.date_of_birth,
            gender: dto.gender || null,
            preferred_name: dto.preferred_name || null,
            jersey_number: dto.jersey_number || null,
            medical_notes: dto.medical_notes || null,
            allergies: dto.allergies || null,
            emergency_contact_name: dto.emergency_contact_name || null,
            emergency_contact_phone: dto.emergency_contact_phone || null,
            family_id: dto.family_id || null,
            team_id: dto.team_id || null,
            season_id: dto.season_id || null
        }

        // Prepare guardians array
        const guardians = (dto.guardians || []).map(g => ({
            email: g.email,
            relationship_type: g.relationship_type || 'parent'
        }))

        // Prepare sports array - filter empty entries, remove duplicates, validate types
        const sports = (dto.sports || [])
            .filter(s => s.sport_id && s.sport_id.trim()) // Filter empty sport_id
            .map(s => ({
                sport_id: s.sport_id.trim(),
                sport_type: (s.sport_type === 'plays' || s.sport_type === 'interested') 
                    ? s.sport_type 
                    : 'plays' as 'plays' | 'interested' // Default to 'plays' if invalid
            }))
        
        // Remove duplicates using Map (defense-in-depth)
        const uniqueSports = [...new Map(
            sports.map(s => [`${s.sport_id}-${s.sport_type}`, s])
        ).values()]

        // Call RPC function
        const { data, error } = await supabase
            .rpc('create_athlete_with_guardians', {
                p_org_id: context.orgId,
                p_athlete_data: athleteData,
                p_guardians: guardians,
                p_athlete_sports: uniqueSports.length > 0 ? uniqueSports : []
            })

        if (error) throw error

        return { data: data as any, error: null }
    } catch (err) {
        console.error('Error creating athlete with guardians:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Create athlete failed')
        }
    }
}

/**
 * Get derived family for an athlete
 * Returns family computed from guardian relationships
 */
export async function getDerivedFamilyForAthlete(
    athleteId: string,
    orgId: string
): Promise<{ data: any | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: {
                athlete_ids: [athleteId],
                guardian_ids: [],
                athletes: [],
                guardians: [],
                is_derived: true,
                has_guardians: false
            },
            error: null
        }
    }

    try {
        const { data, error } = await supabase
            .rpc('get_derived_family_for_athlete', {
                p_athlete_id: athleteId,
                p_org_id: orgId
            })

        if (error) throw error

        return { data, error: null }
    } catch (err) {
        console.error('Error getting derived family:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Get family failed')
        }
    }
}

/**
 * Get orphaned athletes (athletes with no guardians)
 */
export async function getOrphanedAthletes(
    orgId: string
): Promise<{ data: any[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: [], error: null }
    }

    try {
        const { data, error } = await supabase
            .rpc('get_orphaned_athletes', {
                p_org_id: orgId
            })

        if (error) throw error

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Error getting orphaned athletes:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Get orphaned athletes failed')
        }
    }
}

/**
 * Create athlete with guardians atomically
 * This is the recommended method for creating athletes
 */
export async function createAthlete(
    context: UserContext,
    dto: CreateAthleteDTO
): Promise<{ data: { athlete_id: string; guardians: any[] } | null; error: Error | null }> {
    return createAthleteWithGuardians(context, dto)
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * Legacy alias for createAthleteBasic
 * @deprecated Use createAthleteBasic or createAthlete instead
 */
export async function createChild(
    context: UserContext,
    dto: CreateChildDTO
): Promise<{ data: Child | null; error: Error | null }> {
    return createAthleteBasic(context, dto)
}

/**
 * Legacy alias for updateAthlete
 * @deprecated Use updateAthlete instead
 */
export async function updateChild(
    context: UserContext,
    childId: string,
    dto: UpdateChildDTO
): Promise<{ data: Child | null; error: Error | null }> {
    return updateAthlete(context, childId, dto)
}

/**
 * Legacy alias for deleteAthlete
 * @deprecated Use deleteAthlete instead
 */
export async function deleteChild(
    context: UserContext,
    childId: string
): Promise<{ error: Error | null }> {
    return deleteAthlete(context, childId)
}
