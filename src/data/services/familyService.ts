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
import type { Database } from '../../lib/database.types'
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
    CreateFamilyDTO,
    UpdateFamilyDTO,
    CreateChildDTO,
    UpdateChildDTO,
    CreateAthleteDTO,
    UpdateAthleteDTO
} from '../../types/family'

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
        let query = supabase
            .from('families')
            .select('*', { count: 'exact' })
            .is('deleted_at', null)
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
        const { data: family, error: familyError } = await supabase
            .from('families')
            .select('*')
            .eq('id', familyId)
            .is('deleted_at', null)
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
        const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', familyId)
            .is('deleted_at', null)

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
// Child Service Functions
// ============================================================================

export async function createChild(
    _context: UserContext,
    dto: CreateChildDTO
): Promise<{ data: Child | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: {
                id: `demo-child-${Date.now()}`,
                ...dto,
                family_id: dto.family_id ?? null,
                gender: dto.gender || null,
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
        return { data: null, error: err instanceof Error ? err : new Error('Create child failed') }
    }
}

export async function updateChild(
    _context: UserContext,
    childId: string,
    dto: UpdateChildDTO
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
            .eq('id', childId)
            .select()
            .single()

        if (error) throw error
        return { data: data as unknown as Child, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Update child failed') }
    }
}

export async function deleteChild(
    _context: UserContext,
    childId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: null }
    }

    try {
        const { error } = await supabase
            .from('athletes')
            .delete()
            .eq('id', childId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Delete child failed') }
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
        // Query athletes directly - RLS policies will filter based on guardian relationships
        // The new system uses athlete_guardians, not families
        console.log('[getAthletes] Fetching athletes for org:', context.orgId)
        
        const { data, error } = await supabase
            .from('athletes')
            .select('*')
            .is('deleted_at', null)
            .order('first_name', { ascending: true })

        console.log('[getAthletes] Query result:', { data, error, count: data?.length })

        if (error) {
            console.error('[getAthletes] Query error:', error)
            throw error
        }
        
        // Transform the data to match Athlete type with empty sports array
        // Sports can be fetched separately if needed
        const transformed = (data || []).map((d: any) => ({
            ...d,
            sports: [] // Sports will be fetched separately if needed
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

// ============================================================================
// Athlete Service Functions (New Athlete-Centric Model)
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

        // Return athlete with empty sports array (sports will be fetched separately if needed)
        const athlete = {
            ...data,
            sports: []
        } as Child

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
 * Legacy alias for createAthleteWithGuardians
 * Maintains backward compatibility
 */
export async function createAthlete(
    context: UserContext,
    dto: CreateAthleteDTO
): Promise<{ data: { athlete_id: string; guardians: any[] } | null; error: Error | null }> {
    return createAthleteWithGuardians(context, dto)
}

/**
 * Update athlete (same as updateChild, just renamed for clarity)
 */
export async function updateAthlete(
    context: UserContext,
    athleteId: string,
    dto: UpdateAthleteDTO
): Promise<{ data: Child | null; error: Error | null }> {
    return updateChild(context, athleteId, dto)
}

/**
 * Delete athlete (same as deleteChild, just renamed for clarity)
 */
export async function deleteAthlete(
    context: UserContext,
    athleteId: string
): Promise<{ error: Error | null }> {
    return deleteChild(context, athleteId)
}
