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
import { supabase } from '../../lib/supabase'

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

async function getChildIdsForUser(userId: string): Promise<string[]> {
    const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', userId)
        .single()

    if (userError || !userRow?.family_id) return []

    const { data: athletes, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('family_id', userRow.family_id)

    if (athleteError) return []
    return (athletes ?? []).map((a) => a.id)
}

function isOrgAdmin(context: UserContext): boolean {
    return context.roles.includes('org_admin')
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
// ----------------------------------------------------------------------------
// Real Supabase Implementation
// ----------------------------------------------------------------------------
export async function getFees(
    context: UserContext,
    activeOnly: boolean = true
): Promise<{ data: FakeFee[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const fees = activeOnly ? getActiveFeesForOrg(context.orgId) : getFeesForOrg(context.orgId)
            return { data: fees, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        let query = supabase
            .from('fees')
            .select('*')
            .eq('org_id', context.orgId)
            .order('due_date', { ascending: true })

        if (activeOnly) {
            query = query.neq('status', 'archived')
        }

        const { data, error } = await query

        if (error) throw error

        // Transform if necessary to match FakeFee interface (assuming DB type is compatible or similar)
        // FakeFee might differ slightly from DB types.
        // Let's assume for now they are close enough or cast.
        return { data: (data as unknown) as FakeFee[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch fees') }
    }
}

/**
 * Get a single fee by ID
 */
export async function getFeeDetails(
    context: UserContext,
    feeId: string
): Promise<{ data: FakeFee | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
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

    try {
        const { data, error } = await supabase
            .from('fees')
            .select(`
                *,
                season:seasons(id, name)
            `)
            .eq('id', feeId)
            .eq('org_id', context.orgId)
            .single()

        if (error) throw error
        return { data: (data as unknown) as FakeFee, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch fee details') }
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
 *     athlete:athletes(id, first_name, last_name),
 *     payments:payments(*)
 *   `)
 *   .in('child_id', childIds)
 *   .order('fee(due_date)', { ascending: true })
 * ```
 */
export async function getFeeAssignmentsForUser(
    context: UserContext
): Promise<{ data: Array<FakeFeeAssignment & { fee?: FakeFee; payments?: FakePayment[] }>; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const permissions = buildPermissions(context)

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

            const childIds = getChildrenForUserId(context.userId)
            const assignments = childIds.flatMap((childId) => getFeeAssignmentsWithDetailsForChild(childId))

            return { data: assignments, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        const isAdmin = isOrgAdmin(context)
        const childIds = isAdmin ? [] : await getChildIdsForUser(context.userId)

        let query = supabase
            .from('fee_assignments')
            .select(
                `*,
                fee:fees(
                    *,
                    season:seasons(
                        id,
                        name,
                        team:teams(id, name)
                    )
                ),
                athlete:athletes(id, first_name, last_name),
                payments:payment_allocations(payment:payments(*))`
            )
            .eq('org_id', context.orgId)

        if (!isAdmin) {
            if (childIds.length === 0) return { data: [], error: null }
            query = query.in('athlete_id', childIds)
        }

        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) throw error

        const assignments = (data ?? []).map((row: any) => ({
            ...(row as FakeFeeAssignment),
            fee: row.fee ? {
                ...(row.fee as FakeFee),
                season: row.fee.season || null,
            } : undefined,
            athlete: row.athlete || null,
            payments: ((row.payments as any[]) ?? [])
                .map((p) => p.payment)
                .filter(Boolean) as FakePayment[],
        }))

        return { data: assignments, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch fee assignments') }
    }
}

/**
 * Get unpaid fee assignments for user's children
 */
export async function getUnpaidFeeAssignments(
    context: UserContext
): Promise<{ data: Array<FakeFeeAssignment & { fee?: FakeFee }>; error: Error | null }> {
    if (USE_FAKE_DATA) {
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

    try {
        const childIds = await getChildIdsForUser(context.userId)
        if (childIds.length === 0) return { data: [], error: null }

        const { data, error } = await supabase
            .from('fee_assignments')
            .select('*, fee:fees(*)')
            .eq('org_id', context.orgId)
            .in('athlete_id', childIds)
            .in('status', ['unpaid', 'partial'])
            .order('created_at', { ascending: false })

        if (error) throw error

        const unpaid = (data ?? []).map((row: any) => ({
            ...(row as FakeFeeAssignment),
            fee: row.fee as FakeFee,
        }))

        return { data: unpaid, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch unpaid assignments') }
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
 *     athlete:athletes(id, first_name, last_name, family:families(id, name))
 *   `)
 *   .eq('fee_id', feeId)
 * ```
 */
export async function getFeeAssignmentsByFee(
    context: UserContext,
    feeId: string
): Promise<{ data: FakeFeeAssignment[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
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

    try {
        // Verify permissions effectively? RLS should handle it.
        // We fetching full details including athlete and parent
        const { data, error } = await supabase
            .from('fee_assignments')
            .select(`
                *,
                athlete:athletes(id, first_name, last_name, family:families(id, name)),
                parent:users!parent_id(id, email, display_name) 
            `) // Note: 'users' might need explicit ON clause or proper relationship name if ambiguous
            // database.types shows fee_assignments.parent_id -> users
            // If ambiguous, use parent:users!fee_assignments_parent_id_fkey

            .eq('fee_id', feeId)
            .eq('org_id', context.orgId)

        if (error) throw error
        return { data: (data as unknown) as FakeFeeAssignment[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch assignments') }
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
 *       athlete:athletes(first_name, last_name)
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
    if (USE_FAKE_DATA) {
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

    try {
        if (!isOrgAdmin(context)) {
            return { data: [], error: new Error('Access denied: Admin only') }
        }

        let query = supabase
            .from('payments')
            .select('*, allocations:payment_allocations(fee_assignment_id, amount_cents)')
            .eq('org_id', context.orgId)
            .order('created_at', { ascending: false })

        if (limit && limit > 0) query = query.limit(limit)

        const { data, error } = await query
        if (error) throw error

        return { data: (data as unknown) as FakePayment[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch payments') }
    }
}

/**
 * Get payments for a specific fee assignment
 */
export async function getPaymentsForFeeAssignment(
    _context: UserContext,
    assignmentId: string
): Promise<{ data: FakePayment[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

            const payments = getPaymentsForAssignment(assignmentId)
            return { data: payments, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        const { data, error } = await supabase
            .from('payment_allocations')
            .select('payment:payments(*)')
            .eq('fee_assignment_id', assignmentId)

        if (error) throw error

        const payments = ((data as any[]) ?? [])
            .map((row) => row.payment)
            .filter(Boolean) as FakePayment[]

        return { data: payments, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch payments') }
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
    if (USE_FAKE_DATA) {
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

    try {
        if (!isOrgAdmin(context)) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        const { data: totals, error: feeError } = await supabase
            .from('fee_assignments')
            .select('status, amount_cents, paid_cents_total, balance_cents')
            .eq('org_id', context.orgId)

        if (feeError) throw feeError

        const totalPaidCents = (totals ?? []).reduce((sum, row: any) => sum + (row.paid_cents_total ?? 0), 0)
        const totalOutstandingCents = (totals ?? [])
            .filter((r: any) => r.status !== 'paid' && r.status !== 'waived')
            .reduce((sum, row: any) => sum + (row.balance_cents ?? 0), 0)

        const unpaidCount = (totals ?? []).filter(
            (a: any) => a.status === 'unpaid' || a.status === 'partial'
        ).length
        const paidCount = (totals ?? []).filter((a) => a.status === 'paid').length

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
        return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch summary') }
    }
}

/**
 * Get payment summary for a parent's children
 */
export async function getParentPaymentSummary(
    context: UserContext
): Promise<{ data: PaymentSummary | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
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

    try {
        const childIds = await getChildIdsForUser(context.userId)
        if (childIds.length === 0) return { data: null, error: null }

        const { data, error } = await supabase
            .from('fee_assignments')
            .select('status, amount_cents, paid_cents_total, balance_cents')
            .eq('org_id', context.orgId)
            .in('athlete_id', childIds)

        if (error) throw error

        const assignments = data ?? []
        const totalPaidCents = assignments.reduce((sum, a: any) => sum + (a.paid_cents_total ?? 0), 0)
        const totalOutstandingCents = assignments
            .filter((a: any) => a.status !== 'paid' && a.status !== 'waived')
            .reduce((sum, a: any) => sum + (a.balance_cents ?? 0), 0)

        const unpaidCount = assignments.filter(
            (a: any) => a.status === 'unpaid' || a.status === 'partial'
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
        return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch parent summary') }
    }
}
