/**
 * Payments Service
 *
 * Provides data access for fees, fee assignments, and payments.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 * Each method includes a TODO comment showing the equivalent Supabase query pattern.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions } from '../fake/userContext'
import {
    fakeFees,
    fakeFeeAssignments,
    getFeeById,
    getFeesForOrg,
    getActiveFeesForOrg,
    getFeeAssignmentsForChild,
    getFeeAssignmentsForFee,
    getUnpaidFeeAssignmentsForChild,
    getPaymentsForAssignment,
    getPaymentsForOrg,
    getTotalPaidForOrg,
    getTotalOutstandingForOrg,
    getFeeAssignmentsWithDetailsForChild,
    formatCurrency,
    type FakeFee,
    type FakeFeeAssignment,
    type FakePayment,
} from '../fake/fakePayments'
import { getChildrenForUserId, getAssignedTeamsForCoach } from '../fake/relationships'

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
export { formatCurrency }

// ============================================================================
// Fee Service Functions
// ============================================================================

/**
 * Get fees for the organization
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('fees')
 *   .select(`
 *     *,
 *     team:teams(id, name),
 *     season:seasons(id, name)
 *   `)
 *   .eq('org_id', context.orgId)
 *   .eq('status', 'active')
 *   .order('due_date', { ascending: true })
 * ```
 */
export async function getFees(
    context: UserContext,
    activeOnly: boolean = true
): Promise<{ data: FakeFee[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const fees = activeOnly ? getActiveFeesForOrg(context.orgId) : getFeesForOrg(context.orgId)
        return { data: fees, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single fee by ID
 */
export async function getFeeDetails(
    context: UserContext,
    feeId: string
): Promise<{ data: FakeFee | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const fee = getFeeById(feeId)
        if (!fee || fee.org_id !== context.orgId) {
            return { data: null, error: null }
        }

        return { data: fee, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Fee Assignment Service Functions
// ============================================================================

/**
 * Get fee assignments for the current user's children
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('fee_assignments')
 *   .select(`
 *     *,
 *     fee:fees(*),
 *     child:children(id, first_name, last_name),
 *     payments:payments(*)
 *   `)
 *   .in('child_id', childIds)
 *   .order('fee(due_date)', { ascending: true })
 * ```
 */
export async function getFeeAssignmentsForUser(
    context: UserContext
): Promise<{ data: Array<FakeFeeAssignment & { fee?: FakeFee; payments?: FakePayment[] }>; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)

        // Admin sees all fee assignments
        if (permissions.canViewAllOrgData) {
            const fees = getFeesForOrg(context.orgId)
            const feeIds = fees.map((f) => f.id)
            const allAssignments = fakeFeeAssignments.filter((fa) => feeIds.includes(fa.fee_id))

            return {
                data: allAssignments.map((fa) => ({
                    ...fa,
                    fee: getFeeById(fa.fee_id),
                    payments: getPaymentsForAssignment(fa.id),
                })),
                error: null,
            }
        }

        // Parents see only their children's assignments
        const childIds = getChildrenForUserId(context.userId)
        const assignments = childIds.flatMap((childId) => getFeeAssignmentsWithDetailsForChild(childId))

        return { data: assignments, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get unpaid fee assignments for user's children
 */
export async function getUnpaidFeeAssignments(
    context: UserContext
): Promise<{ data: Array<FakeFeeAssignment & { fee?: FakeFee }>; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const childIds = getChildrenForUserId(context.userId)
        const unpaid = childIds.flatMap((childId) =>
            getUnpaidFeeAssignmentsForChild(childId).map((fa) => ({
                ...fa,
                fee: getFeeById(fa.fee_id),
            }))
        )

        return { data: unpaid, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get fee assignments for a specific fee (admin view)
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('fee_assignments')
 *   .select(`
 *     *,
 *     child:children(id, first_name, last_name, family:families(id, name))
 *   `)
 *   .eq('fee_id', feeId)
 * ```
 */
export async function getFeeAssignmentsByFee(
    context: UserContext,
    feeId: string
): Promise<{ data: FakeFeeAssignment[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData) {
            return { data: [], error: new Error('Access denied: Admin only') }
        }

        const assignments = getFeeAssignmentsForFee(feeId)
        return { data: assignments, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Payment Service Functions
// ============================================================================

/**
 * Get payments for the organization (admin view)
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('payments')
 *   .select(`
 *     *,
 *     fee_assignment:fee_assignments(
 *       fee:fees(title),
 *       child:children(first_name, last_name)
 *     )
 *   `)
 *   .eq('org_id', context.orgId)
 *   .order('created_at', { ascending: false })
 * ```
 */
export async function getPayments(
    context: UserContext,
    limit?: number
): Promise<{ data: FakePayment[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData) {
            return { data: [], error: new Error('Access denied: Admin only') }
        }

        let payments = getPaymentsForOrg(context.orgId)
        payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        if (limit && limit > 0) {
            payments = payments.slice(0, limit)
        }

        return { data: payments, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get payments for a specific fee assignment
 */
export async function getPaymentsForFeeAssignment(
    _context: UserContext,
    assignmentId: string
): Promise<{ data: FakePayment[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const payments = getPaymentsForAssignment(assignmentId)
        return { data: payments, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Payment Summary Functions
// ============================================================================

export interface PaymentSummary {
    totalPaidCents: number
    totalOutstandingCents: number
    totalPaidFormatted: string
    totalOutstandingFormatted: string
    unpaidCount: number
    paidCount: number
}

/**
 * Get payment summary for organization (admin)
 */
export async function getOrgPaymentSummary(
    context: UserContext
): Promise<{ data: PaymentSummary | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        const totalPaidCents = getTotalPaidForOrg(context.orgId)
        const totalOutstandingCents = getTotalOutstandingForOrg(context.orgId)

        const fees = getFeesForOrg(context.orgId)
        const feeIds = fees.map((f) => f.id)
        const assignments = fakeFeeAssignments.filter((fa) => feeIds.includes(fa.fee_id))
        const unpaidCount = assignments.filter(
            (a) => a.status === 'unpaid' || a.status === 'partial' || a.status === 'overdue'
        ).length
        const paidCount = assignments.filter((a) => a.status === 'paid').length

        return {
            data: {
                totalPaidCents,
                totalOutstandingCents,
                totalPaidFormatted: formatCurrency(totalPaidCents),
                totalOutstandingFormatted: formatCurrency(totalOutstandingCents),
                unpaidCount,
                paidCount,
            },
            error: null,
        }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get payment summary for a parent's children
 */
export async function getParentPaymentSummary(
    context: UserContext
): Promise<{ data: PaymentSummary | null; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: null, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const childIds = getChildrenForUserId(context.userId)
        const assignments = childIds.flatMap((childId) => getFeeAssignmentsForChild(childId))

        const totalPaidCents = assignments.reduce((sum, a) => sum + a.amount_paid_cents, 0)
        const totalOutstandingCents = assignments
            .filter((a) => a.status !== 'paid' && a.status !== 'waived')
            .reduce((sum, a) => sum + (a.amount_due_cents - a.amount_paid_cents), 0)

        const unpaidCount = assignments.filter(
            (a) => a.status === 'unpaid' || a.status === 'partial' || a.status === 'overdue'
        ).length
        const paidCount = assignments.filter((a) => a.status === 'paid').length

        return {
            data: {
                totalPaidCents,
                totalOutstandingCents,
                totalPaidFormatted: formatCurrency(totalPaidCents),
                totalOutstandingFormatted: formatCurrency(totalOutstandingCents),
                unpaidCount,
                paidCount,
            },
            error: null,
        }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
