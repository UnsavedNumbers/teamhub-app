/**
 * Travel Service
 *
 * Provides data access for travel plans and itineraries.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions } from '../fake/userContext'
import {
    getTravelPlanById,
    getTravelPlansForOrg,
    getPublishedTravelPlansForOrg,
    getTravelPlansForTeam,
    getPublishedTravelPlansForTeam,
    getUpcomingTravelPlans,
    getDraftTravelPlans,
    formatDateRange,
    type FakeTravelPlan,
} from '../fake/fakeTravel'
import { getChildrenForUserId, getAssignedTeamsForCoach, getTeamsForUserChildren } from '../fake/relationships'

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

// Re-export for convenience
export { formatDateRange }

// ============================================================================
// Travel Plan Service Functions
// ============================================================================

export interface TravelPlansQueryParams {
    teamId?: string
    status?: 'draft' | 'published' | 'cancelled'
    upcomingOnly?: boolean
}

/**
 * Get travel plans based on user permissions
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('travel_plans')
 *   .select(`
 *     *,
 *     team:teams(id, name)
 *   `)
 *   .eq('org_id', context.orgId)
 *   .eq('status', 'published')
 *   .gte('start_date', today)
 *   .order('start_date', { ascending: true })
 * ```
 */
export async function getTravelPlans(
    context: UserContext,
    params: TravelPlansQueryParams = {}
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        let plans: FakeTravelPlan[] = []

        // Start with appropriate base set
        if (params.upcomingOnly) {
            plans = getUpcomingTravelPlans(context.orgId)
        } else if (params.status === 'draft') {
            // Only admins can see drafts
            if (!permissions.canViewAllOrgData) {
                return { data: [], error: null }
            }
            plans = getDraftTravelPlans(context.orgId)
        } else {
            plans = permissions.canViewAllOrgData
                ? getTravelPlansForOrg(context.orgId)
                : getPublishedTravelPlansForOrg(context.orgId)
        }

        // Filter by team if provided
        if (params.teamId) {
            plans = plans.filter((p) => p.team_id === params.teamId)
        }

        // Filter by status if provided (and not already filtered)
        if (params.status && !params.upcomingOnly) {
            plans = plans.filter((p) => p.status === params.status)
        }

        // Non-admin users can only see travel plans for their teams
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

            plans = plans.filter((p) => accessibleTeamIds.has(p.team_id))
        }

        // Sort by start date
        plans.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

        return { data: plans, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single travel plan by ID
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('travel_plans')
 *   .select(`
 *     *,
 *     team:teams(id, name, org_id)
 *   `)
 *   .eq('id', planId)
 *   .single()
 * ```
 */
export async function getTravelPlanDetails(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const plan = getTravelPlanById(planId)
        if (!plan) {
            return { data: null, error: null }
        }

        // Verify org access
        if (plan.org_id !== context.orgId) {
            return { data: null, error: new Error('Access denied') }
        }

        const permissions = buildPermissions(context)

        // Check team access for non-admins
        if (!permissions.canViewAllOrgData) {
            const accessibleTeamIds = new Set<string>([
                ...permissions.assignedTeamIds,
                ...getTeamsForUserChildren(context.userId),
            ])

            if (!accessibleTeamIds.has(plan.team_id)) {
                return { data: null, error: new Error('Access denied') }
            }

            // Non-admins cannot see draft plans
            if (plan.status === 'draft') {
                return { data: null, error: new Error('Access denied: Plan not published') }
            }
        }

        return { data: plan, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get upcoming travel plans for parent portal
 */
export async function getUpcomingTravelPlansForUser(
    context: UserContext
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    return getTravelPlans(context, { upcomingOnly: true })
}

/**
 * Get travel plans for a specific team
 */
export async function getTravelPlansForTeamId(
    context: UserContext,
    teamId: string
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    return getTravelPlans(context, { teamId })
}

// ============================================================================
// Admin Travel Plan Functions
// ============================================================================

/**
 * Get all travel plans for admin management
 */
export async function getAllTravelPlansAdmin(
    context: UserContext
): Promise<{ data: FakeTravelPlan[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData) {
            return { data: [], error: new Error('Access denied: Admin only') }
        }

        const plans = getTravelPlansForOrg(context.orgId)
        plans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        return { data: plans, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Publish a draft travel plan
 *
 * TODO: Replace with Supabase update:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('travel_plans')
 *   .update({ status: 'published', published_at: new Date().toISOString() })
 *   .eq('id', planId)
 *   .select()
 *   .single()
 * ```
 */
export async function publishTravelPlan(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        const plan = getTravelPlanById(planId)
        if (!plan) {
            return { data: null, error: new Error('Travel plan not found') }
        }

        if (plan.status !== 'draft') {
            return { data: null, error: new Error('Only draft plans can be published') }
        }

        // In real implementation, update the database
        // For fake data, return updated version
        const updatedPlan: FakeTravelPlan = {
            ...plan,
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }

        return { data: updatedPlan, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Cancel a travel plan
 *
 * TODO: Replace with Supabase update:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('travel_plans')
 *   .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
 *   .eq('id', planId)
 *   .select()
 *   .single()
 * ```
 */
export async function cancelTravelPlan(
    context: UserContext,
    planId: string
): Promise<{ data: FakeTravelPlan | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        const plan = getTravelPlanById(planId)
        if (!plan) {
            return { data: null, error: new Error('Travel plan not found') }
        }

        if (plan.status === 'cancelled') {
            return { data: null, error: new Error('Plan is already cancelled') }
        }

        const updatedPlan: FakeTravelPlan = {
            ...plan,
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }

        return { data: updatedPlan, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
