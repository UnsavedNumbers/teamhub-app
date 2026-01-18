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
    UpdateChildDTO
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
            data: (data as any[]).map(d => d as Family),
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
            .from('children')
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
        const { data, error } = await supabase
            .from('families')
            .insert({
                name: dto.name,
                org_id: dto.org_id,
                created_by_user_id: context.userId
            })
            .select()
            .single()

        if (error) throw error
        return { data: data as any as Family, error: null }
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
        const { data, error } = await supabase
            .from('families')
            .update({
                ...dto,
                updated_at: new Date().toISOString()
            })
            .eq('id', familyId)
            .select()
            .single()

        if (error) throw error
        return { data: data as any as Family, error: null }
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
            .update({ deleted_at: new Date().toISOString() })
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
        const { data, error } = await supabase
            .from('children')
            .insert(dto)
            .select()
            .single()

        if (error) throw error
        return { data: data as any as Child, error: null }
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
        const { data, error } = await supabase
            .from('children')
            .update({
                ...dto,
                updated_at: new Date().toISOString()
            })
            .eq('id', childId)
            .select()
            .single()

        if (error) throw error
        return { data: data as any as Child, error: null }
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
            .from('children')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', childId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Delete child failed') }
    }
}

/**
 * Get children for the current user
 * Maintains backward compatibility with dashboard
 */
export async function getChildren(
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
        // Warning: This query logic needs correct RLS on Supabase side
        // Typically: users can see children they are linked to via family_members
        // Admins can see all in org.
        // For now, this query relies on RLS to filter.
        const { data, error } = await supabase
            .from('children')
            .select(`
                *,
                family:families!inner(org_id)
            `)
            .eq('family.org_id', context.orgId || '')
            .is('deleted_at', null)

        if (error) throw error
        return { data: (data || []).map(d => ({ ...d, family: undefined }) as any as Child), error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Fetch failed') }
    }
}
