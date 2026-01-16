/**
 * Data Relationships Module
 *
 * Maintains consistency between fake data entities.
 * Provides validation functions and relationship lookup utilities.
 */

import { DEMO_USER_IDS, DEMO_ORG_A_ID } from '../config'
import {
    FAMILY_JOHNSON_ID,
    FAMILY_CHEN_ID,
    FAMILY_RODRIGUEZ_ID,
    CHILD_EMMA_JOHNSON_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_SOPHIA_CHEN_ID,
    CHILD_MASON_RODRIGUEZ_ID,
    CHILD_ISABELLA_RODRIGUEZ_ID,
    getChildIdsForUser,
    getFamilyIdsForUser,
} from './fakeUsers'
import {
    TEAM_U10_SOCCER_ID,
    TEAM_U12_SOCCER_ID,
    TEAM_U10_BASKETBALL_ID,
    TEAM_U12_BASKETBALL_ID,
    getTeamIdsForCoach,
    getChildTeamMemberships,
} from './fakeTeams'

// ============================================================================
// Demo User ID Mapping
// ============================================================================

const PARENT_ONLY_ID = DEMO_USER_IDS['parent-only@example.com']
const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']
const ADMIN_ONLY_ID = DEMO_USER_IDS['admin-only@example.com']
const PARENT_ADMIN_ID = DEMO_USER_IDS['parent-admin@example.com']
const PARENT_COACH_ID = DEMO_USER_IDS['parent-coach@example.com']

// ============================================================================
// User → Family Relationships
// ============================================================================

/**
 * Maps demo user IDs to their family IDs
 * Used for filtering family data by user
 */
export const USER_FAMILY_MAP: Record<string, string[]> = {
    [PARENT_ONLY_ID]: [FAMILY_JOHNSON_ID],
    [PARENT_ADMIN_ID]: [FAMILY_CHEN_ID],
    [PARENT_COACH_ID]: [FAMILY_RODRIGUEZ_ID],
    [COACH_ONLY_ID]: [], // Coaches don't have families in demo
    [ADMIN_ONLY_ID]: [], // Admins don't have families in demo
}

// ============================================================================
// User → Children Relationships
// ============================================================================

/**
 * Maps demo user IDs to their children IDs
 * Used for filtering child-specific data by user
 */
export const USER_CHILDREN_MAP: Record<string, string[]> = {
    [PARENT_ONLY_ID]: [CHILD_EMMA_JOHNSON_ID, CHILD_LIAM_JOHNSON_ID],
    [PARENT_ADMIN_ID]: [CHILD_SOPHIA_CHEN_ID],
    [PARENT_COACH_ID]: [CHILD_MASON_RODRIGUEZ_ID, CHILD_ISABELLA_RODRIGUEZ_ID],
    [COACH_ONLY_ID]: [],
    [ADMIN_ONLY_ID]: [],
}

// ============================================================================
// User → Team Relationships (for Coaches)
// ============================================================================

/**
 * Maps coach user IDs to their assigned team IDs
 * Used for filtering team data by coach
 */
export const COACH_TEAM_MAP: Record<string, string[]> = {
    [COACH_ONLY_ID]: [TEAM_U10_SOCCER_ID, TEAM_U12_SOCCER_ID],
    [PARENT_COACH_ID]: [TEAM_U10_BASKETBALL_ID],
}

// ============================================================================
// Child → Team Relationships
// ============================================================================

/**
 * Maps child IDs to their team IDs
 * Used for filtering team data by child membership
 */
export const CHILD_TEAM_MAP: Record<string, string[]> = {
    [CHILD_EMMA_JOHNSON_ID]: [TEAM_U10_SOCCER_ID],
    [CHILD_LIAM_JOHNSON_ID]: [TEAM_U10_BASKETBALL_ID],
    [CHILD_SOPHIA_CHEN_ID]: [TEAM_U10_SOCCER_ID],
    [CHILD_MASON_RODRIGUEZ_ID]: [TEAM_U12_SOCCER_ID],
    [CHILD_ISABELLA_RODRIGUEZ_ID]: [TEAM_U12_BASKETBALL_ID],
}

// ============================================================================
// Relationship Lookup Functions
// ============================================================================

/**
 * Get family IDs for a user
 */
export function getFamiliesForUserId(userId: string): string[] {
    return USER_FAMILY_MAP[userId] ?? getFamilyIdsForUser(userId)
}

/**
 * Get child IDs for a user
 */
export function getChildrenForUserId(userId: string): string[] {
    return USER_CHILDREN_MAP[userId] ?? getChildIdsForUser(userId)
}

/**
 * Get assigned team IDs for a coach user
 */
export function getAssignedTeamsForCoach(userId: string): string[] {
    return COACH_TEAM_MAP[userId] ?? getTeamIdsForCoach(userId)
}

/**
 * Get team IDs that a user's children are on
 */
export function getTeamsForUserChildren(userId: string): string[] {
    const childIds = getChildrenForUserId(userId)
    const teamIds = new Set<string>()

    for (const childId of childIds) {
        const teams = CHILD_TEAM_MAP[childId] ?? []
        teams.forEach((t) => teamIds.add(t))
    }

    return Array.from(teamIds)
}

/**
 * Get all team IDs a user has access to (via coaching or children)
 */
export function getAccessibleTeamsForUser(userId: string, isCoach: boolean): string[] {
    const teamIds = new Set<string>()

    // Add teams from children
    getTeamsForUserChildren(userId).forEach((t) => teamIds.add(t))

    // Add coached teams
    if (isCoach) {
        getAssignedTeamsForCoach(userId).forEach((t) => teamIds.add(t))
    }

    return Array.from(teamIds)
}

// ============================================================================
// Validation Functions
// ============================================================================

interface ValidationResult {
    valid: boolean
    errors: string[]
}

/**
 * Validate that all child → family relationships are consistent
 */
export function validateChildFamilyRelationships(): ValidationResult {
    const errors: string[] = []

    // Check that each child in USER_CHILDREN_MAP belongs to a family in USER_FAMILY_MAP
    for (const [userId, childIds] of Object.entries(USER_CHILDREN_MAP)) {
        const familyIds = USER_FAMILY_MAP[userId] ?? []
        if (childIds.length > 0 && familyIds.length === 0) {
            errors.push(`User ${userId} has children but no families`)
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Validate that all coach → team assignments are consistent
 */
export function validateCoachTeamRelationships(): ValidationResult {
    const errors: string[] = []

    // Validate teams exist (would need team import for full validation)
    for (const [coachId, teamIds] of Object.entries(COACH_TEAM_MAP)) {
        if (teamIds.length === 0) {
            errors.push(`Coach ${coachId} has no assigned teams`)
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Validate all data relationships
 */
export function validateAllRelationships(): ValidationResult {
    const allErrors: string[] = []

    const childFamilyResult = validateChildFamilyRelationships()
    allErrors.push(...childFamilyResult.errors)

    const coachTeamResult = validateCoachTeamRelationships()
    allErrors.push(...coachTeamResult.errors)

    return {
        valid: allErrors.length === 0,
        errors: allErrors,
    }
}

// ============================================================================
// Permission Check Functions
// ============================================================================

/**
 * Check if a user can access data for a specific child
 */
export function canUserAccessChild(userId: string, childId: string, isAdmin: boolean): boolean {
    if (isAdmin) return true
    return getChildrenForUserId(userId).includes(childId)
}

/**
 * Check if a user can access data for a specific team
 */
export function canUserAccessTeam(
    userId: string,
    teamId: string,
    isAdmin: boolean,
    isCoach: boolean
): boolean {
    if (isAdmin) return true

    // Check if user coaches this team
    if (isCoach && getAssignedTeamsForCoach(userId).includes(teamId)) {
        return true
    }

    // Check if user's children are on this team
    return getTeamsForUserChildren(userId).includes(teamId)
}

/**
 * Check if a user can access data for a specific family
 */
export function canUserAccessFamily(userId: string, familyId: string, isAdmin: boolean): boolean {
    if (isAdmin) return true
    return getFamiliesForUserId(userId).includes(familyId)
}

// ============================================================================
// Data Ownership Summary (for debugging)
// ============================================================================

export interface UserDataOwnership {
    userId: string
    email: string
    families: string[]
    children: string[]
    coachedTeams: string[]
    childTeams: string[]
}

/**
 * Get complete data ownership summary for a demo user
 */
export function getUserDataOwnership(email: string): UserDataOwnership | null {
    const userId = DEMO_USER_IDS[email]
    if (!userId) return null

    const isCoach = email.includes('coach')

    return {
        userId,
        email,
        families: getFamiliesForUserId(userId),
        children: getChildrenForUserId(userId),
        coachedTeams: isCoach ? getAssignedTeamsForCoach(userId) : [],
        childTeams: getTeamsForUserChildren(userId),
    }
}

/**
 * Get all demo user data ownership for debugging
 */
export function getAllDemoUserOwnership(): UserDataOwnership[] {
    return Object.keys(DEMO_USER_IDS)
        .map(getUserDataOwnership)
        .filter((o): o is UserDataOwnership => o !== null)
}

// Run validation on module load (development only)
if (import.meta.env?.DEV) {
    const result = validateAllRelationships()
    if (!result.valid) {
        console.warn('[FakeData Relationships] Validation errors:', result.errors)
    }
}
