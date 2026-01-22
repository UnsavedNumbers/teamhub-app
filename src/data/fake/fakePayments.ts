/**
 * Fake Payments Data Module
 *
 * Provides fake data for fees, fee assignments, and payments.
 * All payments are linked to Organization A.
 */

import { DEMO_ORG_A_ID } from '../config'
import {
    TEAM_U12_SOCCER_ID,
    SEASON_SPRING_CURRENT_ID,
} from './fakeTeams'

// Dynamic year helpers
const getCurrentYear = () => new Date().getFullYear()
const getSpringSeasonName = () => `Spring ${getCurrentYear()}`

// Helper functions for date generation relative to current year
const getDateInCurrentYear = (month: number, day: number, hour: number = 0, minute: number = 0): string => {
    const year = getCurrentYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`
}

const getDateString = (month: number, day: number): string => {
    const year = getCurrentYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
import {
    CHILD_EMMA_JOHNSON_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_OLIVIA_SMITH_ID,
    CHILD_NOAH_SMITH_ID,
    CHILD_SOPHIA_CHEN_ID,
    CHILD_MASON_RODRIGUEZ_ID,
    CHILD_AVA_WILLIAMS_ID,
    CHILD_AIDEN_PATEL_ID,
    CHILD_ISABELLA_RODRIGUEZ_ID,
    CHILD_ETHAN_WILLIAMS_ID,
} from './fakeUsers'

// ============================================================================
// Types
// ============================================================================

export type FeeStatus = 'active' | 'archived'
export type FeeAssignmentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface FakeFee {
    id: string
    org_id: string
    team_id: string | null
    season_id: string | null
    title: string
    description: string | null
    amount_cents: number
    currency: string
    due_date: string | null
    fee_type?: string | null
    status: FeeStatus
    allow_partial: boolean
    created_at: string
    updated_at: string
}

export interface FakeFeeAssignment {
    id: string
    fee_id: string
    child_id: string
    status: FeeAssignmentStatus
    amount_due_cents: number
    amount_paid_cents: number
    discount_cents: number
    discount_reason: string | null
    waived_at: string | null
    waived_reason: string | null
    due_date?: string | null
    created_at: string
    updated_at: string
}

export interface FakePayment {
    id: string
    org_id: string
    fee_assignment_id: string
    amount_cents: number
    currency: string
    status: PaymentStatus
    stripe_payment_intent_id: string | null
    payment_method: 'card' | 'cash' | 'check' | 'other'
    paid_at: string | null
    refunded_at: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

// ============================================================================
// Fee IDs
// ============================================================================

export const FEE_SPRING_SOCCER_REG_ID = 'fee-spring-soccer-reg-001'
export const FEE_SPRING_BB_REG_ID = 'fee-spring-bb-reg-002'
export const FEE_TOURNAMENT_U12_ID = 'fee-tournament-u12-003'
export const FEE_UNIFORM_SOCCER_ID = 'fee-uniform-soccer-004'
export const FEE_EQUIPMENT_BB_ID = 'fee-equipment-bb-005'

// ============================================================================
// Fake Fees Data
// ============================================================================

export const fakeFees: FakeFee[] = [
    {
        id: FEE_SPRING_SOCCER_REG_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null, // All soccer teams
        season_id: null,
        title: `${getSpringSeasonName()} Soccer Registration`,
        description: 'Season registration fee covers league fees, referee costs, and field maintenance.',
        amount_cents: 15000, // $150.00
        currency: 'usd',
        due_date: `${getCurrentYear()}-02-28`,
        status: 'active',
        allow_partial: true,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: FEE_SPRING_BB_REG_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null, // All basketball teams
        season_id: null,
        title: 'Spring 2024 Basketball Registration',
        description: 'Season registration including gym rental and referee fees.',
        amount_cents: 12500, // $125.00
        currency: 'usd',
        due_date: getDateString(2, 28),
        status: 'active',
        allow_partial: true,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: FEE_TOURNAMENT_U12_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Spring Cup Tournament Fee',
        description: 'Tournament entry fee. Covers 3 guaranteed games.',
        amount_cents: 4500, // $45.00
        currency: 'usd',
        due_date: `${getCurrentYear()}-03-15`,
        status: 'active',
        allow_partial: false,
        created_at: getDateInCurrentYear(2, 15),
        updated_at: getDateInCurrentYear(2, 15),
    },
    {
        id: FEE_UNIFORM_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        season_id: null,
        title: 'Soccer Uniform Package',
        description: 'Home and away jerseys, shorts, and socks.',
        amount_cents: 7500, // $75.00
        currency: 'usd',
        due_date: getDateString(3, 1),
        status: 'active',
        allow_partial: false,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
    },
    {
        id: FEE_EQUIPMENT_BB_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        season_id: null,
        title: 'Basketball Equipment Fee',
        description: 'Practice basketball and team equipment.',
        amount_cents: 2500, // $25.00
        currency: 'usd',
        due_date: `${getCurrentYear()}-02-15`,
        status: 'active',
        allow_partial: false,
        created_at: getDateInCurrentYear(1, 25),
        updated_at: getDateInCurrentYear(1, 25),
    },
]

// ============================================================================
// Fake Fee Assignments Data
// ============================================================================

export const fakeFeeAssignments: FakeFeeAssignment[] = [
    // Spring Soccer Registration - Various statuses
    { id: 'fa-001', fee_id: FEE_SPRING_SOCCER_REG_ID, child_id: CHILD_EMMA_JOHNSON_ID, status: 'paid', amount_due_cents: 15000, amount_paid_cents: 15000, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-01-20T00:00:00Z', updated_at: getDateInCurrentYear(2, 10) },
    { id: 'fa-002', fee_id: FEE_SPRING_SOCCER_REG_ID, child_id: CHILD_SOPHIA_CHEN_ID, status: 'paid', amount_due_cents: 15000, amount_paid_cents: 15000, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-02-05T00:00:00Z' },
    { id: 'fa-003', fee_id: FEE_SPRING_SOCCER_REG_ID, child_id: CHILD_AIDEN_PATEL_ID, status: 'partial', amount_due_cents: 15000, amount_paid_cents: 7500, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-02-20T00:00:00Z' },
    { id: 'fa-004', fee_id: FEE_SPRING_SOCCER_REG_ID, child_id: CHILD_OLIVIA_SMITH_ID, status: 'paid', amount_due_cents: 15000, amount_paid_cents: 15000, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-02-12T00:00:00Z' },
    { id: 'fa-005', fee_id: FEE_SPRING_SOCCER_REG_ID, child_id: CHILD_MASON_RODRIGUEZ_ID, status: 'paid', amount_due_cents: 12000, amount_paid_cents: 12000, discount_cents: 3000, discount_reason: 'Multi-child discount', waived_at: null, waived_reason: null, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-02-08T00:00:00Z' },
    { id: 'fa-006', fee_id: FEE_SPRING_SOCCER_REG_ID, child_id: CHILD_AVA_WILLIAMS_ID, status: 'overdue', amount_due_cents: 15000, amount_paid_cents: 0, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-20T00:00:00Z' },

    // Spring Basketball Registration
    { id: 'fa-007', fee_id: FEE_SPRING_BB_REG_ID, child_id: CHILD_LIAM_JOHNSON_ID, status: 'paid', amount_due_cents: 12500, amount_paid_cents: 12500, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: getDateInCurrentYear(1, 25), updated_at: getDateInCurrentYear(2, 15) },
    { id: 'fa-008', fee_id: FEE_SPRING_BB_REG_ID, child_id: CHILD_NOAH_SMITH_ID, status: 'paid', amount_due_cents: 12500, amount_paid_cents: 12500, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: getDateInCurrentYear(1, 25), updated_at: getDateInCurrentYear(2, 18) },
    { id: 'fa-009', fee_id: FEE_SPRING_BB_REG_ID, child_id: CHILD_ETHAN_WILLIAMS_ID, status: 'unpaid', amount_due_cents: 12500, amount_paid_cents: 0, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: getDateInCurrentYear(1, 25), updated_at: getDateInCurrentYear(1, 25) },
    { id: 'fa-010', fee_id: FEE_SPRING_BB_REG_ID, child_id: CHILD_ISABELLA_RODRIGUEZ_ID, status: 'waived', amount_due_cents: 12500, amount_paid_cents: 0, discount_cents: 0, discount_reason: null, waived_at: getDateInCurrentYear(2, 1), waived_reason: 'Financial assistance program', created_at: getDateInCurrentYear(1, 25), updated_at: getDateInCurrentYear(2, 1) },

    // Tournament Fee - U12 Soccer
    { id: 'fa-011', fee_id: FEE_TOURNAMENT_U12_ID, child_id: CHILD_OLIVIA_SMITH_ID, status: 'unpaid', amount_due_cents: 4500, amount_paid_cents: 0, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-02-20T00:00:00Z', updated_at: '2024-02-20T00:00:00Z' },
    { id: 'fa-012', fee_id: FEE_TOURNAMENT_U12_ID, child_id: CHILD_MASON_RODRIGUEZ_ID, status: 'paid', amount_due_cents: 4500, amount_paid_cents: 4500, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-02-20T00:00:00Z', updated_at: '2024-02-25T00:00:00Z' },
    { id: 'fa-013', fee_id: FEE_TOURNAMENT_U12_ID, child_id: CHILD_AVA_WILLIAMS_ID, status: 'unpaid', amount_due_cents: 4500, amount_paid_cents: 0, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-02-20T00:00:00Z', updated_at: '2024-02-20T00:00:00Z' },

    // Uniform Fee - Soccer
    { id: 'fa-014', fee_id: FEE_UNIFORM_SOCCER_ID, child_id: CHILD_EMMA_JOHNSON_ID, status: 'paid', amount_due_cents: 7500, amount_paid_cents: 7500, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: getDateInCurrentYear(1, 25), updated_at: getDateInCurrentYear(2, 10) },
    { id: 'fa-015', fee_id: FEE_UNIFORM_SOCCER_ID, child_id: CHILD_SOPHIA_CHEN_ID, status: 'paid', amount_due_cents: 7500, amount_paid_cents: 7500, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: getDateInCurrentYear(1, 25), updated_at: '2024-02-08T00:00:00Z' },

    // Equipment Fee - Basketball
    { id: 'fa-016', fee_id: FEE_EQUIPMENT_BB_ID, child_id: CHILD_LIAM_JOHNSON_ID, status: 'paid', amount_due_cents: 2500, amount_paid_cents: 2500, discount_cents: 0, discount_reason: null, waived_at: null, waived_reason: null, created_at: '2024-01-28T00:00:00Z', updated_at: getDateInCurrentYear(2, 15) },
]

// ============================================================================
// Fake Payments Data
// ============================================================================

export const fakePayments: FakePayment[] = [
    // Payments for Emma Johnson
    { id: 'pay-001', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-001', amount_cents: 15000, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_001', payment_method: 'card', paid_at: '2024-02-10T14:30:00Z', refunded_at: null, notes: null, created_at: '2024-02-10T14:30:00Z', updated_at: '2024-02-10T14:30:00Z' },
    { id: 'pay-002', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-014', amount_cents: 7500, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_002', payment_method: 'card', paid_at: getDateInCurrentYear(2, 10, 14, 31), refunded_at: null, notes: null, created_at: getDateInCurrentYear(2, 10, 14, 31), updated_at: getDateInCurrentYear(2, 10, 14, 31) },

    // Payments for Sophia Chen
    { id: 'pay-003', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-002', amount_cents: 15000, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_003', payment_method: 'card', paid_at: '2024-02-05T10:00:00Z', refunded_at: null, notes: null, created_at: '2024-02-05T10:00:00Z', updated_at: '2024-02-05T10:00:00Z' },
    { id: 'pay-004', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-015', amount_cents: 7500, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_004', payment_method: 'card', paid_at: getDateInCurrentYear(2, 8, 11), refunded_at: null, notes: null, created_at: getDateInCurrentYear(2, 8, 11), updated_at: getDateInCurrentYear(2, 8, 11) },

    // Partial payment for Aiden Patel
    { id: 'pay-005', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-003', amount_cents: 7500, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_005', payment_method: 'card', paid_at: getDateInCurrentYear(2, 20, 9), refunded_at: null, notes: 'First installment', created_at: getDateInCurrentYear(2, 20, 9), updated_at: getDateInCurrentYear(2, 20, 9) },

    // Payments for Olivia Smith
    { id: 'pay-006', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-004', amount_cents: 15000, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_006', payment_method: 'card', paid_at: '2024-02-12T16:00:00Z', refunded_at: null, notes: null, created_at: '2024-02-12T16:00:00Z', updated_at: '2024-02-12T16:00:00Z' },

    // Payments for Mason Rodriguez (with discount)
    { id: 'pay-007', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-005', amount_cents: 12000, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_007', payment_method: 'card', paid_at: '2024-02-08T13:00:00Z', refunded_at: null, notes: null, created_at: '2024-02-08T13:00:00Z', updated_at: '2024-02-08T13:00:00Z' },
    { id: 'pay-008', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-012', amount_cents: 4500, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_008', payment_method: 'card', paid_at: '2024-02-25T10:00:00Z', refunded_at: null, notes: null, created_at: '2024-02-25T10:00:00Z', updated_at: '2024-02-25T10:00:00Z' },

    // Payments for Liam Johnson (basketball)
    { id: 'pay-009', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-007', amount_cents: 12500, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_009', payment_method: 'card', paid_at: getDateInCurrentYear(2, 15, 11), refunded_at: null, notes: null, created_at: getDateInCurrentYear(2, 15, 11), updated_at: getDateInCurrentYear(2, 15, 11) },
    { id: 'pay-010', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-016', amount_cents: 2500, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_010', payment_method: 'card', paid_at: '2024-02-15T11:01:00Z', refunded_at: null, notes: null, created_at: '2024-02-15T11:01:00Z', updated_at: '2024-02-15T11:01:00Z' },

    // Payments for Noah Smith
    { id: 'pay-011', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-008', amount_cents: 12500, currency: 'usd', status: 'succeeded', stripe_payment_intent_id: 'pi_demo_011', payment_method: 'check', paid_at: getDateInCurrentYear(2, 18), refunded_at: null, notes: 'Check #1234', created_at: getDateInCurrentYear(2, 18), updated_at: getDateInCurrentYear(2, 18) },

    // Failed payment example
    { id: 'pay-012', org_id: DEMO_ORG_A_ID, fee_assignment_id: 'fa-009', amount_cents: 12500, currency: 'usd', status: 'failed', stripe_payment_intent_id: 'pi_demo_012_failed', payment_method: 'card', paid_at: null, refunded_at: null, notes: 'Card declined - insufficient funds', created_at: getDateInCurrentYear(2, 28, 9), updated_at: getDateInCurrentYear(2, 28, 9) },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getFeeById(feeId: string): FakeFee | undefined {
    return fakeFees.find((f) => f.id === feeId)
}

export function getFeesForOrg(orgId: string): FakeFee[] {
    return fakeFees.filter((f) => f.org_id === orgId)
}

export function getActiveFeesForOrg(orgId: string): FakeFee[] {
    return fakeFees.filter((f) => f.org_id === orgId && f.status === 'active')
}

export function getFeesForTeam(teamId: string): FakeFee[] {
    return fakeFees.filter((f) => f.team_id === teamId || f.team_id === null)
}

export function getFeeAssignmentById(assignmentId: string): FakeFeeAssignment | undefined {
    return fakeFeeAssignments.find((fa) => fa.id === assignmentId)
}

export function getFeeAssignmentsForChild(childId: string): FakeFeeAssignment[] {
    return fakeFeeAssignments.filter((fa) => fa.child_id === childId)
}

export function getFeeAssignmentsForFee(feeId: string): FakeFeeAssignment[] {
    return fakeFeeAssignments.filter((fa) => fa.fee_id === feeId)
}

export function getUnpaidFeeAssignmentsForChild(childId: string): FakeFeeAssignment[] {
    return fakeFeeAssignments.filter(
        (fa) => fa.child_id === childId && (fa.status === 'unpaid' || fa.status === 'partial' || fa.status === 'overdue')
    )
}

export function getPaidFeeAssignmentsForChild(childId: string): FakeFeeAssignment[] {
    return fakeFeeAssignments.filter((fa) => fa.child_id === childId && fa.status === 'paid')
}

export function getPaymentsForAssignment(assignmentId: string): FakePayment[] {
    return fakePayments.filter((p) => p.fee_assignment_id === assignmentId)
}

export function getPaymentsForOrg(orgId: string): FakePayment[] {
    return fakePayments.filter((p) => p.org_id === orgId)
}

export function getSuccessfulPaymentsForOrg(orgId: string): FakePayment[] {
    return fakePayments.filter((p) => p.org_id === orgId && p.status === 'succeeded')
}

export function getTotalPaidForOrg(orgId: string): number {
    return getSuccessfulPaymentsForOrg(orgId).reduce((sum, p) => sum + p.amount_cents, 0)
}

export function getTotalOutstandingForOrg(orgId: string): number {
    const fees = getFeesForOrg(orgId)
    const feeIds = fees.map((f) => f.id)
    return fakeFeeAssignments
        .filter((fa) => feeIds.includes(fa.fee_id) && fa.status !== 'paid' && fa.status !== 'waived')
        .reduce((sum, fa) => sum + (fa.amount_due_cents - fa.amount_paid_cents), 0)
}

/**
 * Get fee assignment with fee details
 */
export function getFeeAssignmentWithDetails(
    assignmentId: string
): (FakeFeeAssignment & { fee?: FakeFee; payments?: FakePayment[] }) | undefined {
    const assignment = getFeeAssignmentById(assignmentId)
    if (!assignment) return undefined

    return {
        ...assignment,
        fee: getFeeById(assignment.fee_id),
        payments: getPaymentsForAssignment(assignmentId),
    }
}

/**
 * Get all fee assignments for a child with fee details
 */
export function getFeeAssignmentsWithDetailsForChild(
    childId: string
): Array<FakeFeeAssignment & { fee?: FakeFee; payments?: FakePayment[] }> {
    return getFeeAssignmentsForChild(childId).map((fa) => ({
        ...fa,
        fee: getFeeById(fa.fee_id),
        payments: getPaymentsForAssignment(fa.id),
    }))
}

export function formatCurrency(cents: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(cents / 100)
}
