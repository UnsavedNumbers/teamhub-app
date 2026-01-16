/**
 * Family Service
 *
 * Provides data access for families and children.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions, filterFamiliesByRole, filterChildrenByRole } from '../fake/userContext'
import {
    fakeUsers,
    fakeFamilies,
    fakeChildren,
    fakeFamilyMembers,
    getUserById,
    getUserByEmail,
    getFamiliesForUser,
    getChildrenForUser,
    getChildById,
    getFamilyById,
    getFamilyMembersForFamily,
    getChildWithDetails,
    type FakeUser,
    type FakeFamily,
    type FakeChild,
    type FakeFamilyMember,
} from '../fake/fakeUsers'
import { getChildrenForUserId, getFamiliesForUserId } from '../fake/relationships'

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

// ============================================================================
// User Profile Service Functions
// ============================================================================

/**
 * Get current user profile
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*')
 *   .eq('id', context.userId)
 *   .single()
 * ```
 */
export async function getCurrentUserProfile(
    context: UserContext
): Promise<{ data: FakeUser | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const user = getUserById(context.userId)
        return { data: user ?? null, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Family Service Functions
// ============================================================================

/**
 * Get families for the current user
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('family_members')
 *   .select(`
 *     family:families(
 *       *,
 *       children:children(*)
 *     )
 *   `)
 *   .eq('user_id', context.userId)
 * ```
 */
export async function getFamilies(
    context: UserContext
): Promise<{ data: FakeFamily[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)

        // Admin sees all families in org
        if (permissions.canViewAllOrgData) {
            const orgFamilies = fakeFamilies.filter((f) => f.org_id === context.orgId)
            return { data: orgFamilies, error: null }
        }

        // Regular users see only their own families
        const families = getFamiliesForUser(context.userId)
        return { data: families, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single family by ID
 */
export async function getFamilyDetails(
    context: UserContext,
    familyId: string
): Promise<{ data: (FakeFamily & { members?: FakeFamilyMember[]; children?: FakeChild[] }) | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const family = getFamilyById(familyId)
        if (!family) {
            return { data: null, error: null }
        }

        // Check access
        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData && !permissions.ownedFamilyIds.includes(familyId)) {
            return { data: null, error: new Error('Access denied') }
        }

        const members = getFamilyMembersForFamily(familyId)
        const children = fakeChildren.filter((c) => c.family_id === familyId)

        return {
            data: { ...family, members, children },
            error: null,
        }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Children Service Functions
// ============================================================================

/**
 * Get children for the current user
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('children')
 *   .select(`
 *     *,
 *     family:families(id, name),
 *     team_memberships:team_members(
 *       team:teams(id, name)
 *     )
 *   `)
 *   .in('family_id', familyIds)
 * ```
 */
export async function getChildren(
    context: UserContext
): Promise<{ data: FakeChild[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)

        // Admin sees all children in org
        if (permissions.canViewAllOrgData) {
            const orgFamilyIds = fakeFamilies.filter((f) => f.org_id === context.orgId).map((f) => f.id)
            const orgChildren = fakeChildren.filter((c) => orgFamilyIds.includes(c.family_id))
            return { data: orgChildren, error: null }
        }

        // Regular users see only their own children
        const children = getChildrenForUser(context.userId)
        return { data: children, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single child by ID
 */
export async function getChildDetails(
    context: UserContext,
    childId: string
): Promise<{ data: ReturnType<typeof getChildWithDetails> | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const child = getChildWithDetails(childId)
        if (!child) {
            return { data: null, error: null }
        }

        // Check access
        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData && !permissions.ownedChildIds.includes(childId)) {
            return { data: null, error: new Error('Access denied') }
        }

        return { data: child, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get children for a specific family
 */
export async function getChildrenForFamily(
    context: UserContext,
    familyId: string
): Promise<{ data: FakeChild[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        // Check access
        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData && !permissions.ownedFamilyIds.includes(familyId)) {
            return { data: [], error: new Error('Access denied') }
        }

        const children = fakeChildren.filter((c) => c.family_id === familyId)
        return { data: children, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Family Member Service Functions
// ============================================================================

/**
 * Get guardians (family members) for a family
 */
export async function getFamilyGuardians(
    context: UserContext,
    familyId: string
): Promise<{ data: Array<FakeFamilyMember & { user?: FakeUser }>; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        // Check access
        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData && !permissions.ownedFamilyIds.includes(familyId)) {
            return { data: [], error: new Error('Access denied') }
        }

        const members = getFamilyMembersForFamily(familyId)
        const membersWithUsers = members.map((m) => ({
            ...m,
            user: getUserById(m.user_id),
        }))

        return { data: membersWithUsers, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
