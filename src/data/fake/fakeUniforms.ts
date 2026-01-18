/**
 * Fake Uniforms Data Module
 *
 * Provides fake data for uniform kits, items, and size submissions.
 * All uniforms are linked to Organization A.
 */

import { DEMO_ORG_A_ID } from '../config'
import {
    TEAM_U10_BASKETBALL_ID,
} from './fakeTeams'
import {
    CHILD_EMMA_JOHNSON_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_SOPHIA_CHEN_ID,
    CHILD_OLIVIA_SMITH_ID,
    CHILD_MASON_RODRIGUEZ_ID,
} from './fakeUsers'

// ============================================================================
// Types
// ============================================================================

export type UniformKitStatus = 'active' | 'ordering' | 'delivered' | 'archived'
export type UniformItemType = 'jersey' | 'shorts' | 'socks' | 'jacket' | 'bag' | 'other'
export type SubmissionStatus = 'pending' | 'locked' | 'ordered' | 'delivered'

export interface FakeUniformKit {
    id: string
    org_id: string
    team_id: string | null
    name: string
    description: string | null
    status: UniformKitStatus
    deadline: string | null
    vendor_name: string | null
    ordering_deadline: string | null
    estimated_delivery: string | null
    created_at: string
    updated_at: string
}

export interface FakeUniformItem {
    id: string
    kit_id: string
    name: string
    type: UniformItemType
    is_required: boolean
    sizes_available: string[]
    price_cents: number | null
    image_url: string | null
    created_at: string
}

export interface FakeUniformSubmission {
    id: string
    kit_id: string
    child_id: string
    status: SubmissionStatus
    submitted_at: string | null
    submitted_by_user_id: string | null
    created_at: string
    updated_at: string
}

export interface FakeUniformSizeSelection {
    id: string
    submission_id: string
    item_id: string
    size: string
    quantity: number
}

// ============================================================================
// Kit IDs
// ============================================================================

export const KIT_SOCCER_SPRING_ID = 'kit-soccer-spring-001'
export const KIT_BASKETBALL_SPRING_ID = 'kit-basketball-spring-002'
export const KIT_SOCCER_JACKET_ID = 'kit-soccer-jacket-003'

// ============================================================================
// Helper for dates
// ============================================================================

const now = new Date()

function addDays(days: number): string {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

// ============================================================================
// Fake Uniform Kits Data
// ============================================================================

export const fakeUniformKits: FakeUniformKit[] = [
    {
        id: KIT_SOCCER_SPRING_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null, // All soccer teams
        name: 'Spring 2024 Soccer Kit',
        description: 'Complete uniform package including home and away jerseys, shorts, and socks.',
        status: 'active',
        deadline: addDays(14),
        vendor_name: 'TeamWear Pro',
        ordering_deadline: addDays(14),
        estimated_delivery: addDays(45),
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },
    {
        id: KIT_BASKETBALL_SPRING_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_BASKETBALL_ID,
        name: 'Hawks Basketball Uniform',
        description: 'Reversible jersey and shorts combo.',
        status: 'ordering',
        deadline: null, // Already passed
        vendor_name: 'TeamWear Pro',
        ordering_deadline: '2024-02-28',
        estimated_delivery: addDays(21),
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
    },
    {
        id: KIT_SOCCER_JACKET_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        name: 'Optional Team Jacket',
        description: 'Lightweight warm-up jacket with team logo. Optional purchase.',
        status: 'active',
        deadline: addDays(30),
        vendor_name: 'TeamWear Pro',
        ordering_deadline: addDays(30),
        estimated_delivery: addDays(60),
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Uniform Items Data
// ============================================================================

export const fakeUniformItems: FakeUniformItem[] = [
    // Soccer Spring Kit Items
    {
        id: 'item-soccer-home-jersey',
        kit_id: KIT_SOCCER_SPRING_ID,
        name: 'Home Jersey (Blue)',
        type: 'jersey',
        is_required: true,
        sizes_available: ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL'],
        price_cents: null, // Included in registration
        image_url: null,
        created_at: '2024-01-15T00:00:00Z',
    },
    {
        id: 'item-soccer-away-jersey',
        kit_id: KIT_SOCCER_SPRING_ID,
        name: 'Away Jersey (White)',
        type: 'jersey',
        is_required: true,
        sizes_available: ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL'],
        price_cents: null,
        image_url: null,
        created_at: '2024-01-15T00:00:00Z',
    },
    {
        id: 'item-soccer-shorts',
        kit_id: KIT_SOCCER_SPRING_ID,
        name: 'Team Shorts',
        type: 'shorts',
        is_required: true,
        sizes_available: ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL'],
        price_cents: null,
        image_url: null,
        created_at: '2024-01-15T00:00:00Z',
    },
    {
        id: 'item-soccer-socks',
        kit_id: KIT_SOCCER_SPRING_ID,
        name: 'Team Socks (2 pairs)',
        type: 'socks',
        is_required: true,
        sizes_available: ['YS (1-4)', 'YM (4-8)', 'YL (8-12)', 'A (12+)'],
        price_cents: null,
        image_url: null,
        created_at: '2024-01-15T00:00:00Z',
    },
    // Basketball Kit Items
    {
        id: 'item-bb-reversible-jersey',
        kit_id: KIT_BASKETBALL_SPRING_ID,
        name: 'Reversible Jersey',
        type: 'jersey',
        is_required: true,
        sizes_available: ['YS', 'YM', 'YL', 'AS', 'AM'],
        price_cents: null,
        image_url: null,
        created_at: '2024-01-20T00:00:00Z',
    },
    {
        id: 'item-bb-shorts',
        kit_id: KIT_BASKETBALL_SPRING_ID,
        name: 'Basketball Shorts',
        type: 'shorts',
        is_required: true,
        sizes_available: ['YS', 'YM', 'YL', 'AS', 'AM'],
        price_cents: null,
        image_url: null,
        created_at: '2024-01-20T00:00:00Z',
    },
    // Optional Jacket
    {
        id: 'item-jacket',
        kit_id: KIT_SOCCER_JACKET_ID,
        name: 'Warm-up Jacket',
        type: 'jacket',
        is_required: false,
        sizes_available: ['YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL'],
        price_cents: 4500,
        image_url: null,
        created_at: '2024-02-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Uniform Submissions Data
// ============================================================================

export const fakeUniformSubmissions: FakeUniformSubmission[] = [
    // Soccer Kit - Submitted
    {
        id: 'sub-001',
        kit_id: KIT_SOCCER_SPRING_ID,
        child_id: CHILD_EMMA_JOHNSON_ID,
        status: 'locked',
        submitted_at: '2024-02-10T00:00:00Z',
        submitted_by_user_id: null,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-02-10T00:00:00Z',
    },
    {
        id: 'sub-002',
        kit_id: KIT_SOCCER_SPRING_ID,
        child_id: CHILD_SOPHIA_CHEN_ID,
        status: 'locked',
        submitted_at: '2024-02-08T00:00:00Z',
        submitted_by_user_id: null,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-02-08T00:00:00Z',
    },
    {
        id: 'sub-003',
        kit_id: KIT_SOCCER_SPRING_ID,
        child_id: CHILD_OLIVIA_SMITH_ID,
        status: 'pending', // Not yet submitted
        submitted_at: null,
        submitted_by_user_id: null,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
    },
    {
        id: 'sub-004',
        kit_id: KIT_SOCCER_SPRING_ID,
        child_id: CHILD_MASON_RODRIGUEZ_ID,
        status: 'locked',
        submitted_at: '2024-02-12T00:00:00Z',
        submitted_by_user_id: null,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-02-12T00:00:00Z',
    },
    // Basketball Kit - Already ordered
    {
        id: 'sub-005',
        kit_id: KIT_BASKETBALL_SPRING_ID,
        child_id: CHILD_LIAM_JOHNSON_ID,
        status: 'ordered',
        submitted_at: '2024-02-20T00:00:00Z',
        submitted_by_user_id: null,
        created_at: '2024-01-25T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Size Selections Data
// ============================================================================

export const fakeUniformSizeSelections: FakeUniformSizeSelection[] = [
    // Emma Johnson - Soccer
    { id: 'size-001', submission_id: 'sub-001', item_id: 'item-soccer-home-jersey', size: 'YM', quantity: 1 },
    { id: 'size-002', submission_id: 'sub-001', item_id: 'item-soccer-away-jersey', size: 'YM', quantity: 1 },
    { id: 'size-003', submission_id: 'sub-001', item_id: 'item-soccer-shorts', size: 'YM', quantity: 1 },
    { id: 'size-004', submission_id: 'sub-001', item_id: 'item-soccer-socks', size: 'YM (4-8)', quantity: 1 },
    // Sophia Chen - Soccer
    { id: 'size-005', submission_id: 'sub-002', item_id: 'item-soccer-home-jersey', size: 'YS', quantity: 1 },
    { id: 'size-006', submission_id: 'sub-002', item_id: 'item-soccer-away-jersey', size: 'YS', quantity: 1 },
    { id: 'size-007', submission_id: 'sub-002', item_id: 'item-soccer-shorts', size: 'YS', quantity: 1 },
    { id: 'size-008', submission_id: 'sub-002', item_id: 'item-soccer-socks', size: 'YS (1-4)', quantity: 1 },
    // Mason Rodriguez - Soccer
    { id: 'size-009', submission_id: 'sub-004', item_id: 'item-soccer-home-jersey', size: 'YL', quantity: 1 },
    { id: 'size-010', submission_id: 'sub-004', item_id: 'item-soccer-away-jersey', size: 'YL', quantity: 1 },
    { id: 'size-011', submission_id: 'sub-004', item_id: 'item-soccer-shorts', size: 'YL', quantity: 1 },
    { id: 'size-012', submission_id: 'sub-004', item_id: 'item-soccer-socks', size: 'YL (8-12)', quantity: 1 },
    // Liam Johnson - Basketball
    { id: 'size-013', submission_id: 'sub-005', item_id: 'item-bb-reversible-jersey', size: 'YS', quantity: 1 },
    { id: 'size-014', submission_id: 'sub-005', item_id: 'item-bb-shorts', size: 'YS', quantity: 1 },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getUniformKitById(kitId: string): FakeUniformKit | undefined {
    return fakeUniformKits.find((k) => k.id === kitId)
}

export function getUniformKitsForOrg(orgId: string): FakeUniformKit[] {
    return fakeUniformKits.filter((k) => k.org_id === orgId)
}

export function getActiveUniformKitsForOrg(orgId: string): FakeUniformKit[] {
    return fakeUniformKits.filter((k) => k.org_id === orgId && k.status === 'active')
}

export function getUniformKitsForTeam(teamId: string, orgId: string): FakeUniformKit[] {
    return fakeUniformKits.filter((k) => k.org_id === orgId && (k.team_id === teamId || k.team_id === null))
}

export function getUniformItemsForKit(kitId: string): FakeUniformItem[] {
    return fakeUniformItems.filter((i) => i.kit_id === kitId)
}

export function getRequiredItemsForKit(kitId: string): FakeUniformItem[] {
    return fakeUniformItems.filter((i) => i.kit_id === kitId && i.is_required)
}

export function getSubmissionById(submissionId: string): FakeUniformSubmission | undefined {
    return fakeUniformSubmissions.find((s) => s.id === submissionId)
}

export function getSubmissionsForKit(kitId: string): FakeUniformSubmission[] {
    return fakeUniformSubmissions.filter((s) => s.kit_id === kitId)
}

export function getSubmissionsForChild(childId: string): FakeUniformSubmission[] {
    return fakeUniformSubmissions.filter((s) => s.child_id === childId)
}

export function getSizeSelectionsForSubmission(submissionId: string): FakeUniformSizeSelection[] {
    return fakeUniformSizeSelections.filter((ss) => ss.submission_id === submissionId)
}

export function getPendingSubmissionsCount(kitId: string): number {
    return fakeUniformSubmissions.filter((s) => s.kit_id === kitId && s.status === 'pending').length
}

export function getLockedSubmissionsCount(kitId: string): number {
    return fakeUniformSubmissions.filter((s) => s.kit_id === kitId && s.status === 'locked').length
}

/**
 * Get submission with full details
 */
export function getSubmissionWithDetails(
    submissionId: string
): (FakeUniformSubmission & { kit?: FakeUniformKit; sizes?: FakeUniformSizeSelection[] }) | undefined {
    const submission = getSubmissionById(submissionId)
    if (!submission) return undefined

    return {
        ...submission,
        kit: getUniformKitById(submission.kit_id),
        sizes: getSizeSelectionsForSubmission(submissionId),
    }
}
