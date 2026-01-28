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
    getFeeAssignmentWithDetails,
    getFeeAssignmentsWithDetailsForChild,
    formatCurrency,
    type FakeFee,
    type FakeFeeAssignment,
    type FakePayment,
} from '../fake/fakePayments'
import { getChildrenForUserId, getAssignedTeamsForCoach } from '../fake/relationships'
import { supabase } from '../../lib/supabase'
import { buildFeeAssignmentQuery } from './queryHelpers'
import { normalizeSupabaseResponse } from './responseHelpers'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'

const supabaseAny = supabase as any

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

// ============================================================================
// Type Mappers
// ============================================================================

/**
 * Map Supabase fee row to FakeFee domain type
 */
function mapSupabaseFeeToDomain(fee: any): FakeFee {
    return fee as unknown as FakeFee
}

/**
 * Map Supabase fee assignment row to domain type with nested fee, athlete, and payments
 */
function mapSupabaseFeeAssignmentToDomain(row: any): FakeFeeAssignment & { fee?: FakeFee; payments?: FakePayment[]; athlete?: any } {
    const baseAssignment = row as FakeFeeAssignment
    const fee = row.fee ? {
        ...mapSupabaseFeeToDomain(row.fee),
        season: row.fee.season || null,
    } : undefined
    const payments = ((row.payments as any[]) ?? [])
        .map((p) => p.payment)
        .filter(Boolean) as FakePayment[]

    return {
        ...baseAssignment,
        fee,
        athlete: row.athlete || null,
        payments,
    }
}

async function getAthleteIdsForUser(userId: string, orgId: string): Promise<string[]> {
    // Query athlete_guardians to find athletes linked to this user as guardian
    const { data: guardianLinks, error: guardianError } = await supabase
        .from('athlete_guardians')
        .select('athlete_id')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('status', 'active')

    if (guardianError) return []
    return (guardianLinks ?? []).map((g) => g.athlete_id)
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
 */
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

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const fees = Array.isArray(normalizedData) ? normalizedData.map(mapSupabaseFeeToDomain) : []
        return { data: fees, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
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

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, false)
        const fee = normalizedData ? mapSupabaseFeeToDomain(normalizedData) : null
        return { data: fee, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err, 'Fee')
        return { data: null, error: classifiedError }
    }
}

// ============================================================================
// Fee Assignment Service Functions
// ============================================================================

/**
 * Get fee assignments for the current user's children
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

    // Real Supabase implementation - NO FALLBACK
    try {
        const isAdmin = isOrgAdmin(context)
        const childIds = isAdmin ? [] : await getAthleteIdsForUser(context.userId, context.orgId)

        let query = buildFeeAssignmentQuery(supabase)
            .eq('org_id', context.orgId)

        if (!isAdmin) {
            if (childIds.length === 0) {
                return { data: [], error: null }
            }
            query = query.in('athlete_id', childIds)
        }

        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) throw error

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const mappedAssignments = Array.isArray(normalizedData)
            ? normalizedData.map(mapSupabaseFeeAssignmentToDomain)
            : []

        return { data: mappedAssignments, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

/**
 * Get a single fee assignment by ID with full details
 */
export async function getFeeAssignmentById(
    context: UserContext,
    assignmentId: string
): Promise<{ data: (FakeFeeAssignment & { fee?: FakeFee; payments?: FakePayment[]; athlete?: any; parent?: any }) | null; error: Error | null }> {
    console.log('[paymentsService] getFeeAssignmentById called:', { 
        assignmentId, 
        userId: context.userId, 
        orgId: context.orgId,
        roles: context.roles,
        useFakeData: USE_FAKE_DATA 
    })

    if (USE_FAKE_DATA) {
        try {
            console.log('[paymentsService] Using fake data')
            await simulateDelay()
            const assignment = getFeeAssignmentWithDetails(assignmentId)
            console.log('[paymentsService] Fake data assignment:', assignment)
            if (!assignment) {
                console.log('[paymentsService] No fake assignment found')
                return { data: null, error: null }
            }
            // Check permissions - user must be parent of the athlete or admin
            const permissions = buildPermissions(context)
            console.log('[paymentsService] Permissions:', permissions)
            if (!permissions.canViewAllOrgData) {
                const childIds = getChildrenForUserId(context.userId)
                console.log('[paymentsService] Non-admin, childIds:', childIds)
                if (!childIds.includes((assignment as any).child_id)) {
                    console.log('[paymentsService] Access denied - not child\'s parent')
                    return { data: null, error: new Error('Access denied') }
                }
            }
            console.log('[paymentsService] Returning fake assignment')
            return { data: assignment, error: null }
        } catch (err) {
            console.error('[paymentsService] Fake data error:', err)
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation
    try {
        console.log('[paymentsService] Using real Supabase data')
        const isAdmin = isOrgAdmin(context)
        console.log('[paymentsService] isAdmin:', isAdmin)
        
        const childIds = isAdmin ? [] : await getAthleteIdsForUser(context.userId, context.orgId)
        console.log('[paymentsService] childIds:', childIds)

        let query = buildFeeAssignmentQuery(supabase)
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)

        if (!isAdmin) {
            if (childIds.length === 0) {
                console.log('[paymentsService] Non-admin with no children, returning null')
                return { data: null, error: null }
            }
            query = query.in('athlete_id', childIds)
        }

        console.log('[paymentsService] Executing Supabase query')
        const { data, error } = await query.single()
        console.log('[paymentsService] Supabase query result:', { hasData: !!data, error })
        
        if (error) {
            console.error('[paymentsService] Supabase error:', error)
            throw error
        }

        // Normalize and map response
        console.log('[paymentsService] Normalizing response')
        const normalizedData = normalizeSupabaseResponse(data, false)
        if (!normalizedData) {
            console.log('[paymentsService] No normalized data')
            return { data: null, error: null }
        }

        console.log('[paymentsService] Mapping to domain model')
        const mappedAssignment = mapSupabaseFeeAssignmentToDomain(normalizedData)
        
        // Fetch parent info
        const parentId = (normalizedData as any).parent_id
        if (parentId) {
            console.log('[paymentsService] Fetching parent info for:', parentId)
            const { data: parentData } = await supabase
                .from('users')
                .select('id, email, display_name')
                .eq('id', parentId)
                .single()
            console.log('[paymentsService] Parent data:', parentData)
            if (parentData) {
                (mappedAssignment as any).parent = parentData
            }
        }

        console.log('[paymentsService] Successfully mapped assignment:', mappedAssignment)
        return { data: mappedAssignment, error: null }
    } catch (err) {
        console.error('[paymentsService] Caught error:', err)
        const classifiedError = classifySupabaseError(err)
        console.error('[paymentsService] Classified error:', classifiedError)
        return { data: null, error: classifiedError }
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
        const childIds = await getAthleteIdsForUser(context.userId, context.orgId)
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
 * Get fee assignments for a specific team (team-scoped)
 * Filters by team's season(s) and athletes on the team
 */
export async function getFeeAssignmentsForTeam(
    context: UserContext,
    teamId: string,
    seasonId: string | null
): Promise<{ data: Array<FakeFeeAssignment & { fee?: FakeFee; payments?: FakePayment[] }>; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData) {
                return { data: [], error: new Error('Access denied: Admin only') }
            }
            
            // Filter fake assignments by team (simplified - would need team membership data)
            const allAssignments = fakeFeeAssignments
                .filter(fa => {
                    const fee = getFeeById(fa.fee_id)
                    // In fake data, we'd need to check if fee.season_id matches team's season
                    return fee && fee.org_id === context.orgId
                })
                .map(fa => ({
                    ...fa,
                    fee: getFeeById(fa.fee_id),
                    payments: getPaymentsForAssignment(fa.id),
                }))
            
            return { data: allAssignments, error: null }
        } catch (err) {
            return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    // Real Supabase implementation
    try {
        // Step 1: Get athletes on this team for this season
        const { data: memberships } = await supabase
            .from('team_memberships')
            .select('athlete_id')
            .eq('team_id', teamId)
            .eq('status', 'active')
        
        if (seasonId) {
            // Further filter by season if provided
            const { data: seasonMemberships } = await supabase
                .from('team_memberships')
                .select('athlete_id')
                .eq('team_id', teamId)
                .eq('season_id', seasonId)
                .eq('status', 'active')
            
            const athleteIds = (seasonMemberships || []).map((m: { athlete_id: string }) => m.athlete_id)
            
            if (athleteIds.length === 0) {
                return { data: [], error: null }
            }

            // Step 2: Get fees for this season
            const { data: fees } = await supabase
                .from('fees')
                .select('id')
                .eq('org_id', context.orgId)
                .eq('season_id', seasonId)
            
            const feeIds = (fees || []).map((f: { id: string }) => f.id)
            
            if (feeIds.length === 0) {
                return { data: [], error: null }
            }

            // Step 3: Get fee assignments for these fees and athletes
            let query = buildFeeAssignmentQuery(supabase)
                .eq('org_id', context.orgId)
                .in('fee_id', feeIds)
                .in('athlete_id', athleteIds)

            const { data, error } = await query.order('created_at', { ascending: false })
            if (error) throw error

            const normalizedData = normalizeSupabaseResponse(data, true)
            const mappedAssignments = Array.isArray(normalizedData)
                ? normalizedData.map(mapSupabaseFeeAssignmentToDomain)
                : []

            return { data: mappedAssignments, error: null }
        } else {
            // No season filter - get all fees for team's seasons
            const athleteIds = (memberships || []).map((m: { athlete_id: string }) => m.athlete_id)
            
            if (athleteIds.length === 0) {
                return { data: [], error: null }
            }

            // Get seasons for this team
            const { data: teamSeasons } = await supabase
                .from('team_seasons')
                .select('season_id')
                .eq('team_id', teamId)
            
            const seasonIds = (teamSeasons || []).map((ts: { season_id: string }) => ts.season_id)
            
            if (seasonIds.length === 0) {
                return { data: [], error: null }
            }

            // Get fees for these seasons
            const { data: fees } = await supabase
                .from('fees')
                .select('id')
                .eq('org_id', context.orgId)
                .in('season_id', seasonIds)
            
            const feeIds = (fees || []).map((f: { id: string }) => f.id)
            
            if (feeIds.length === 0) {
                return { data: [], error: null }
            }

            // Get fee assignments
            let query = buildFeeAssignmentQuery(supabase)
                .eq('org_id', context.orgId)
                .in('fee_id', feeIds)
                .in('athlete_id', athleteIds)

            const { data, error } = await query.order('created_at', { ascending: false })
            if (error) throw error

            const normalizedData = normalizeSupabaseResponse(data, true)
            const mappedAssignments = Array.isArray(normalizedData)
                ? normalizedData.map(mapSupabaseFeeAssignmentToDomain)
                : []

            return { data: mappedAssignments, error: null }
        }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

/**
 * Get fee assignments for a specific fee (admin view)
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

    // Real Supabase implementation - NO FALLBACK
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

        // Normalize and map response
        const normalizedData = normalizeSupabaseResponse(data, true)
        const assignments = Array.isArray(normalizedData) 
            ? normalizedData.map((row: any) => row as FakeFeeAssignment)
            : []
        return { data: assignments, error: null }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: [], error: classifiedError }
    }
}

// ============================================================================
// Payment Service Functions
// ============================================================================

/**
 * Get payments for the organization (admin view)
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

        const payments = Array.isArray(data) 
            ? data.map((row: any) => row.payment).filter(Boolean) as FakePayment[]
            : [] as FakePayment[]

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
 * Validate a discount code for the current user's organization
 */
export async function validateDiscountCode(
    context: UserContext,
    code: string,
    feeAssignmentIds: string[]
): Promise<{ data: { valid: boolean; discountAmountCents?: number; errorMessage?: string } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            // In fake mode, accept any code that starts with "DISCOUNT"
            const normalizedCode = code.trim().toUpperCase()
            if (normalizedCode.startsWith('DISCOUNT')) {
                return {
                    data: {
                        valid: true,
                        discountAmountCents: 1000, // $10 fake discount
                    },
                    error: null,
                }
            }
            return {
                data: {
                    valid: false,
                    errorMessage: 'Invalid discount code',
                },
                error: null,
            }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
        }
    }

    try {
        const normalizedCode = code.trim().toUpperCase()
        if (!normalizedCode) {
            return {
                data: {
                    valid: false,
                    errorMessage: 'Discount code cannot be empty',
                },
                error: null,
            }
        }

        // Fetch discount code
        const { data: discountRow, error: discountError } = await supabase
            .from('discount_codes')
            .select('id, discount_type, percent_off, amount_off_cents, status, redeem_by, max_redemptions, applies_to_fee_id, org_id')
            .eq('code', normalizedCode)
            .eq('org_id', context.orgId)
            .maybeSingle()

        if (discountError || !discountRow) {
            return {
                data: {
                    valid: false,
                    errorMessage: 'Invalid discount code',
                },
                error: null,
            }
        }

        if (discountRow.status !== 'active') {
            return {
                data: {
                    valid: false,
                    errorMessage: 'Discount code is not active',
                },
                error: null,
            }
        }

        if (discountRow.redeem_by && new Date(discountRow.redeem_by) < new Date()) {
            return {
                data: {
                    valid: false,
                    errorMessage: 'Discount code has expired',
                },
                error: null,
            }
        }

        // Check max redemptions
        if (discountRow.max_redemptions) {
            const { count } = await supabase
                .from('discount_redemptions')
                .select('id', { count: 'exact', head: true })
                .eq('discount_code_id', discountRow.id)
            if (typeof count === 'number' && count >= discountRow.max_redemptions) {
                return {
                    data: {
                        valid: false,
                        errorMessage: 'Discount code usage limit reached',
                    },
                    error: null,
                }
            }
        }

        // Check if code applies to selected fees
        if (discountRow.applies_to_fee_id) {
            // Get fee IDs for the assignments
            const { data: assignments } = await supabase
                .from('fee_assignments')
                .select('fee_id')
                .in('id', feeAssignmentIds)
                .eq('org_id', context.orgId)

            const assignmentFeeIds = (assignments ?? []).map((a: any) => a.fee_id)
            if (!assignmentFeeIds.includes(discountRow.applies_to_fee_id)) {
                return {
                    data: {
                        valid: false,
                        errorMessage: 'Discount code does not apply to selected fees',
                    },
                    error: null,
                }
            }
        }

        // Calculate discount amount (simplified - actual calculation happens in checkout)
        let discountAmountCents = 0
        if (discountRow.discount_type === 'percent' && discountRow.percent_off) {
            // We'd need assignment totals to calculate, but for validation we just confirm it's valid
            discountAmountCents = 0 // Will be calculated in checkout
        } else if (discountRow.discount_type === 'fixed' && discountRow.amount_off_cents) {
            discountAmountCents = discountRow.amount_off_cents
        }

        return {
            data: {
                valid: true,
                discountAmountCents,
            },
            error: null,
        }
    } catch (err) {
        const classifiedError = classifySupabaseError(err)
        return { data: null, error: classifiedError }
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
        const childIds = await getAthleteIdsForUser(context.userId, context.orgId)
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

// ============================================================================
// Admin Actions on Fee Assignments
// ============================================================================

/**
 * Mark a fee assignment as paid offline (admin action)
 * Updates status to 'paid', sets balance to 0, and updates paid_cents_total
 */
export async function markFeeAssignmentAsPaidOffline(
    context: UserContext,
    assignmentId: string
): Promise<{ data: { id: string; status: string } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData) {
                return { data: null, error: new Error('Access denied: Admin only') }
            }

            // Find and update fake assignment
            const assignment = fakeFeeAssignments.find(fa => fa.id === assignmentId)
            if (!assignment) {
                return { data: null, error: new Error('Fee assignment not found') }
            }

            // Update fake data
            assignment.status = 'paid' as any
            assignment.amount_paid_cents = assignment.amount_due_cents

            return { data: { id: assignmentId, status: 'paid' }, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Failed to mark as paid') }
        }
    }

    try {
        if (!isOrgAdmin(context)) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        // Verify assignment exists and belongs to org
        const { data: existing, error: checkError } = await supabase
            .from('fee_assignments')
            .select('id, org_id, amount_cents, balance_cents, paid_cents_total')
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .single()

        if (checkError || !existing) {
            return { data: null, error: new Error('Fee assignment not found') }
        }

        // Update assignment to paid
        const { data, error } = await supabase
            .from('fee_assignments')
            .update({
                status: 'paid',
                balance_cents: 0,
                paid_cents_total: existing.amount_cents,
                updated_at: new Date().toISOString(),
            })
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .select('id, status')
            .single()

        if (error) throw error

        return { data: { id: data.id, status: data.status }, error: null }
    } catch (err) {
        const classified = classifySupabaseError(err)
        return { data: null, error: classified }
    }
}

/**
 * Issue a refund for a paid fee assignment
 * Creates a refund record and updates the assignment status/balance
 */
export async function issueRefundForFeeAssignment(
    context: UserContext,
    assignmentId: string,
    refundAmountCents: number,
    reason: string
): Promise<{ data: { id: string; refundId: string } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData) {
                return { data: null, error: new Error('Access denied: Admin only') }
            }

            const assignment = fakeFeeAssignments.find(fa => fa.id === assignmentId)
            if (!assignment || assignment.status !== 'paid') {
                return { data: null, error: new Error('Fee assignment not found or not paid') }
            }

            // Simulate refund
            const refundId = `refund_${Date.now()}`
            assignment.amount_paid_cents = Math.max(0, assignment.amount_paid_cents - refundAmountCents)
            assignment.status = refundAmountCents >= assignment.amount_due_cents ? 'unpaid' : 'partial'

            return { data: { id: assignmentId, refundId }, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Failed to issue refund') }
        }
    }

    try {
        if (!isOrgAdmin(context)) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        // Verify assignment exists, is paid, and belongs to org
        const { data: existing, error: checkError } = await supabase
            .from('fee_assignments')
            .select('id, org_id, status, paid_cents_total, amount_cents')
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .single()

        if (checkError || !existing) {
            return { data: null, error: new Error('Fee assignment not found') }
        }

        if (existing.status !== 'paid') {
            return { data: null, error: new Error('Can only refund paid assignments') }
        }

        if (refundAmountCents > existing.paid_cents_total) {
            return { data: null, error: new Error('Refund amount exceeds paid amount') }
        }

        // Create refund record (if refunds table exists)
        // For now, we'll update the assignment directly
        const newPaidTotal = existing.paid_cents_total - refundAmountCents
        const newBalance = refundAmountCents
        const newStatus = newPaidTotal === 0 ? 'unpaid' : 'partial'

        const { data, error } = await supabase
            .from('fee_assignments')
            .update({
                status: newStatus,
                balance_cents: newBalance,
                paid_cents_total: newPaidTotal,
                notes_internal: reason ? `Refund issued: ${reason}` : 'Refund issued',
                updated_at: new Date().toISOString(),
            })
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .select('id')
            .single()

        if (error) throw error

        return { data: { id: data.id, refundId: `refund_${assignmentId}_${Date.now()}` }, error: null }
    } catch (err) {
        const classified = classifySupabaseError(err)
        return { data: null, error: classified }
    }
}

/**
 * Void a fee assignment (admin action)
 * Sets status to a voided state and clears balance
 */
export async function voidFeeAssignment(
    context: UserContext,
    assignmentId: string,
    reason: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData) {
                return { data: null, error: new Error('Access denied: Admin only') }
            }

            const assignment = fakeFeeAssignments.find(fa => fa.id === assignmentId)
            if (!assignment) {
                return { data: null, error: new Error('Fee assignment not found') }
            }

            // Mark as voided (using waived status as proxy)
            assignment.status = 'waived' as any
            assignment.amount_paid_cents = 0

            return { data: { id: assignmentId }, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Failed to void payment') }
        }
    }

    try {
        if (!isOrgAdmin(context)) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        // Verify assignment exists and belongs to org
        const { data: existing, error: checkError } = await supabase
            .from('fee_assignments')
            .select('id, org_id, status')
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .single()

        if (checkError || !existing) {
            return { data: null, error: new Error('Fee assignment not found') }
        }

        if (existing.status === 'paid') {
            return { data: null, error: new Error('Cannot void paid assignments. Use refund instead.') }
        }

        // Update to waived status (voided)
        const { data, error } = await supabase
            .from('fee_assignments')
            .update({
                status: 'waived',
                balance_cents: 0,
                notes_internal: reason ? `Voided: ${reason}` : 'Voided by admin',
                updated_at: new Date().toISOString(),
            })
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .select('id')
            .single()

        if (error) throw error

        return { data: { id: data.id }, error: null }
    } catch (err) {
        const classified = classifySupabaseError(err)
        return { data: null, error: classified }
    }
}

/**
 * Send payment reminder email to parent
 */
export async function sendPaymentReminder(
    context: UserContext,
    assignmentId: string
): Promise<{ data: { sent: boolean } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const permissions = buildPermissions(context)
            if (!permissions.canViewAllOrgData) {
                return { data: null, error: new Error('Access denied: Admin only') }
            }

            const assignment = fakeFeeAssignments.find(fa => fa.id === assignmentId)
            if (!assignment) {
                return { data: null, error: new Error('Fee assignment not found') }
            }

            // Simulate sending reminder
            return { data: { sent: true }, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Failed to send reminder') }
        }
    }

    try {
        if (!isOrgAdmin(context)) {
            return { data: null, error: new Error('Access denied: Admin only') }
        }

        // Verify assignment exists and belongs to org
        const { data: existing, error: checkError } = await supabase
            .from('fee_assignments')
            .select('id, org_id, parent_id')
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .single()

        if (checkError || !existing) {
            return { data: null, error: new Error('Fee assignment not found') }
        }

        // Get parent user email and fee details
        const { data: assignmentDetails, error: detailsError } = await supabase
            .from('fee_assignments')
            .select(`
                id,
                fee:fees(title, amount_cents, due_date),
                parent:users!fee_assignments_parent_id_fkey(email, display_name),
                athlete:athletes(first_name, last_name)
            `)
            .eq('id', assignmentId)
            .single()

        if (detailsError || !assignmentDetails) {
            return { data: null, error: new Error('Failed to fetch fee assignment details') }
        }

        const parentEmail = (assignmentDetails.parent as any)?.email
        if (!parentEmail) {
            return { data: null, error: new Error('Parent email not found') }
        }

        // Create notification job for email reminder
        const { error: jobError } = await supabaseAny
            .from('notification_jobs')
            .insert({
                org_id: context.orgId,
                user_id: (assignmentDetails.parent as any)?.id || null,
                email: parentEmail,
                type: 'payment_reminder',
                payload: {
                    fee_title: (assignmentDetails.fee as any)?.title || 'Fee',
                    amount: ((assignmentDetails.fee as any)?.amount_cents || 0) / 100,
                    due_date: (assignmentDetails.fee as any)?.due_date || null,
                    athlete_name: `${(assignmentDetails.athlete as any)?.first_name || ''} ${(assignmentDetails.athlete as any)?.last_name || ''}`.trim(),
                    assignment_id: assignmentId,
                },
                status: 'queued',
            })

        if (jobError) {
            console.error('[sendPaymentReminder] Error creating notification job:', jobError)
            return { data: null, error: new Error('Failed to queue reminder email') }
        }

        // Trigger notification worker (optional - it will process queued jobs automatically)
        // For immediate processing, we could call the edge function, but queued is fine for reminders

        return { data: { sent: true }, error: null }
    } catch (err) {
        const classified = classifySupabaseError(err)
        return { data: null, error: classified }
    }
}

/**
 * Generate or download receipt PDF for a paid fee assignment
 * Returns a signed URL for the receipt PDF
 */
export async function generateReceiptPDF(
    context: UserContext,
    assignmentId: string
): Promise<{ data: { url: string } | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()
            const assignment = fakeFeeAssignments.find(fa => fa.id === assignmentId)
            if (!assignment || assignment.status !== 'paid') {
                return { data: null, error: new Error('Fee assignment not found or not paid') }
            }
            const permissions = buildPermissions(context)
            const canView = permissions.canViewAllOrgData || permissions.ownedChildIds.includes((assignment as { child_id?: string }).child_id ?? '')
            if (!canView) {
                return { data: null, error: new Error('Access denied') }
            }
            return { data: { url: `https://example.com/receipts/${assignmentId}.pdf` }, error: null }
        } catch (err) {
            return { data: null, error: err instanceof Error ? err : new Error('Failed to generate receipt') }
        }
    }

    try {
        const { data: existing, error: checkError } = await supabase
            .from('fee_assignments')
            .select('id, org_id, status, parent_id, athlete_id')
            .eq('id', assignmentId)
            .eq('org_id', context.orgId)
            .single()

        if (checkError || !existing) {
            return { data: null, error: new Error('Fee assignment not found') }
        }

        const existingRow = existing as { status: string; parent_id: string; athlete_id: string }
        if (existingRow.status !== 'paid') {
            return { data: null, error: new Error('Receipts can only be generated for paid assignments') }
        }

        const isAdmin = isOrgAdmin(context)
        const isParent = existingRow.parent_id === context.userId
        const childIds = isAdmin || isParent ? [] : await getAthleteIdsForUser(context.userId, context.orgId)
        const isGuardian = childIds.includes(existingRow.athlete_id)
        if (!isAdmin && !isParent && !isGuardian) {
            return { data: null, error: new Error('Access denied') }
        }

        // Stripe hosted receipt only (Edge Function returns receipt_url from Stripe Charge).
        // No PDF is generated or stored in our storage.
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
            'stripe-receipt-url',
            { body: { assignment_id: assignmentId } }
        )
        const stripeUrl = stripeData?.url
        if (!stripeError && typeof stripeUrl === 'string' && stripeUrl.length > 0) {
            return { data: { url: stripeUrl }, error: null }
        }
        const status = (stripeError as { context?: { status?: number } } | null)?.context?.status
        if (status === 401 || status === 403) {
            return { data: null, error: new Error('Access denied') }
        }
        if (status === 404) {
            return {
                data: null,
                error: new Error(
                    'No receipt available for this payment. Receipts are only available for payments made online (Stripe).'
                ),
            }
        }
        if (stripeError) {
            return { data: null, error: new Error('Receipt unavailable. Please try again later.') }
        }
        return {
            data: null,
            error: new Error('No receipt available for this payment.'),
        }
    } catch (err) {
        const classified = classifySupabaseError(err)
        return { data: null, error: classified }
    }
}
