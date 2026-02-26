/**
 * User Context for Fake Data System
 *
 * Provides user identity resolution, role-based filtering,
 * and permission calculation for the fake data system.
 *
 * This module does NOT subscribe to auth context directly to avoid memory leaks.
 * Instead, it provides utility functions that accept context as parameters.
 */

import { DEMO_USER_IDS, DEMO_ORG_A_ID, USER_CONTEXT_TIMEOUT_MS, USE_FAKE_DATA } from '../config'
import type { OrgMemberRole } from '../../contexts/OrganizationContext'
import { getUserByEmail, getUserOrganizations } from './fakeUsers'
import { getAssignedTeamsForCoach, getChildrenForUserId, getTeamsForStaff, ATHLETE_USER_SELF_MAP } from './relationships'
import { supabase } from '../../lib/supabase'

// ============================================================================
// Types
// ============================================================================

export interface UserContext {
    userId: string
    email: string | null
    orgId: string
    organizationName?: string | null
    roles: OrgMemberRole[]
    isPlatformAdmin: boolean
}

export interface PermissionSet {
    canViewAllOrgData: boolean
    canViewAssignedTeams: boolean
    canViewOwnChildrenData: boolean
    assignedTeamIds: string[]
    ownedChildIds: string[]
    ownedFamilyIds: string[]
}

// ============================================================================
// Demo User Resolution
// ============================================================================

/**
 * Resolve demo user ID from email address
 * Falls back to config mapping if not found
 *
 * @param email - User email address
 * @returns Demo user ID or null if not a demo user
 */
export function resolveDemoUserId(email: string | null | undefined): string | null {
    if (!email) return null

    const normalizedEmail = email.toLowerCase().trim()
    return DEMO_USER_IDS[normalizedEmail] ?? null
}

/**
 * Check if email belongs to a known demo user
 */
export function isDemoUser(email: string | null | undefined): boolean {
    return resolveDemoUserId(email) !== null
}

/**
 * Get demo user email patterns for matching
 */
export function getDemoUserEmails(): string[] {
    return Object.keys(DEMO_USER_IDS)
}

// ============================================================================
// Role Helpers
// ============================================================================

/**
 * Get user roles for a specific organization from memberships
 */
export function getUserRoles(
    memberships: Array<{ id: string; roles: OrgMemberRole[] }>,
    orgId: string
): OrgMemberRole[] {
    const membership = memberships.find((m) => m.id === orgId)
    return membership?.roles ?? []
}

/**
 * Check if user has a specific role in an organization
 */
export function hasRole(roles: OrgMemberRole[], role: OrgMemberRole): boolean {
    return roles.includes(role)
}

/**
 * Check if user is an admin in current context
 */
export function isAdmin(roles: OrgMemberRole[], isPlatformAdmin: boolean): boolean {
    return isPlatformAdmin || roles.includes('org_admin')
}

/**
 * Check if user is a coach in current context
 */
export function isCoach(roles: OrgMemberRole[]): boolean {
    return roles.includes('coach')
}

/**
 * Check if user is a parent in current context
 */
export function isParent(roles: OrgMemberRole[]): boolean {
    return roles.includes('parent')
}

// ============================================================================
// Permission Calculation
// ============================================================================

/**
 * Calculate user permissions based on roles
 * Returns union of all role permissions for multi-role users
 */
export function calculatePermissions(
    context: UserContext,
    assignedTeamIds: string[] = [],
    ownedChildIds: string[] = [],
    ownedFamilyIds: string[] = []
): PermissionSet {
    const { roles, isPlatformAdmin } = context

    return {
        // Admins can see all org data
        canViewAllOrgData: isPlatformAdmin || roles.includes('org_admin'),

        // Coaches can see their assigned teams
        canViewAssignedTeams: roles.includes('coach'),

        // Parents can see their own children's data
        canViewOwnChildrenData: roles.includes('parent'),

        // Team assignments (populated from fake data relationships)
        assignedTeamIds,

        // Child ownership (populated from fake data relationships)
        ownedChildIds,

        // Family ownership
        ownedFamilyIds,
    }
}

/**
 * Get coach team IDs from database (or fake data)
 * This replaces the synchronous getAssignedTeamsForCoach() for real database queries
 */
export async function getCoachTeamIds(context: UserContext): Promise<string[]> {
    if (USE_FAKE_DATA) {
        // Try by the userId directly first (matches when USE_FAKE_DATA userId === DEMO_USER_IDS value)
        const byId = getAssignedTeamsForCoach(context.userId)
        if (byId.length > 0) return byId

        // Fallback: resolve the canonical demo userId from email, then look up teams.
        // This handles the case where the real Supabase auth userId differs from
        // DEMO_USER_IDS (e.g. when entering via a demo code with a live org ID).
        if (context.email) {
            const canonicalId = DEMO_USER_IDS[context.email.toLowerCase().trim()]
            if (canonicalId) {
                const byEmail = getAssignedTeamsForCoach(canonicalId)
                if (byEmail.length > 0) return byEmail
            }
        }

        // Last resort: any user with the 'coach' role gets the default demo coach teams
        if (context.roles.includes('coach')) {
            const defaultCoachId = DEMO_USER_IDS['coach-only@example.com']
            if (defaultCoachId) return getAssignedTeamsForCoach(defaultCoachId)
        }

        return []
    }

    try {
        const { data, error } = await (supabase as any)
            .rpc('coach_team_ids', { check_user_id: context.userId })
        
        if (error) {
            console.warn('Failed to get coach team IDs:', error)
            return []
        }
        
        return (Array.isArray(data) ? data : []) as string[]
    } catch (err) {
        console.warn('Error getting coach team IDs:', err)
        return []
    }
}

/**
 * Resolve the canonical demo user ID for guardian/parent child lookups.
 * When USE_FAKE_DATA is true and the session userId differs from DEMO_USER_IDS
 * (e.g. real Supabase auth), resolves by email or role so guardians see their demo children.
 */
export function getGuardianCanonicalUserId(context: UserContext): string {
    if (!USE_FAKE_DATA) return context.userId

    if (getChildrenForUserId(context.userId).length > 0) return context.userId
    if (context.email) {
        const canonicalId = DEMO_USER_IDS[context.email.toLowerCase().trim()]
        if (canonicalId && getChildrenForUserId(canonicalId).length > 0) return canonicalId
    }
    const isGuardian = context.roles.includes('parent') || context.roles.includes('guardian')
    if (isGuardian) {
        const defaultParentId = DEMO_USER_IDS['parent-only@example.com']
        if (defaultParentId) return defaultParentId
    }
    return context.userId
}

/**
 * Resolve the athlete record ID for an athlete-role user.
 * In demo mode, maps the athlete user's session ID to their own child record.
 */
export function getAthleteCanonicalChildId(context: UserContext): string | null {
    if (!USE_FAKE_DATA) return null

    // Direct mapping
    if (ATHLETE_USER_SELF_MAP[context.userId]) return ATHLETE_USER_SELF_MAP[context.userId]

    // Email-based fallback
    if (context.email) {
        const canonicalId = DEMO_USER_IDS[context.email.toLowerCase().trim()]
        if (canonicalId && ATHLETE_USER_SELF_MAP[canonicalId]) return ATHLETE_USER_SELF_MAP[canonicalId]
    }

    // Role-based fallback: any athlete user gets Emma Johnson's record
    if (context.roles.includes('athlete')) {
        const defaultAthleteId = DEMO_USER_IDS['athlete-only@example.com']
        if (defaultAthleteId && ATHLETE_USER_SELF_MAP[defaultAthleteId]) {
            return ATHLETE_USER_SELF_MAP[defaultAthleteId]
        }
    }

    return null
}

/**
 * Get staff team IDs for a staff-role user in demo mode.
 */
export function getStaffTeamIds(context: UserContext): string[] {
    if (!USE_FAKE_DATA) return []

    const byId = getTeamsForStaff(context.userId)
    if (byId.length > 0) return byId

    if (context.email) {
        const canonicalId = DEMO_USER_IDS[context.email.toLowerCase().trim()]
        if (canonicalId) {
            const byEmail = getTeamsForStaff(canonicalId)
            if (byEmail.length > 0) return byEmail
        }
    }

    // Any staff role user gets default staff teams
    if (context.roles.includes('staff')) {
        const defaultStaffId = DEMO_USER_IDS['staff-only@example.com']
        if (defaultStaffId) return getTeamsForStaff(defaultStaffId)
    }

    return []
}

// ============================================================================
// Filter Functions (Reusable across services)
// ============================================================================

/**
 * Generic filter function that applies role-based filtering
 * Uses permission set to determine visibility
 */
export function filterByPermissions<T>(
    data: T[],
    permissions: PermissionSet,
    getOrgId: (item: T) => string | undefined,
    getTeamId: (item: T) => string | undefined,
    getChildId: (item: T) => string | undefined,
    currentOrgId: string
): T[] {
    // Admin sees all data in current org
    if (permissions.canViewAllOrgData) {
        return data.filter((item) => {
            const itemOrgId = getOrgId(item)
            return !itemOrgId || itemOrgId === currentOrgId
        })
    }

    return data.filter((item) => {
        const itemOrgId = getOrgId(item)
        const itemTeamId = getTeamId(item)
        const itemChildId = getChildId(item)

        // Must be in current org
        if (itemOrgId && itemOrgId !== currentOrgId) {
            return false
        }

        // Coach can see assigned team data
        if (permissions.canViewAssignedTeams && itemTeamId) {
            if (permissions.assignedTeamIds.includes(itemTeamId)) {
                return true
            }
        }

        // Parent can see own children's data
        if (permissions.canViewOwnChildrenData && itemChildId) {
            if (permissions.ownedChildIds.includes(itemChildId)) {
                return true
            }
        }

        // No team or child context - item is visible if user is coach/parent
        if (!itemTeamId && !itemChildId) {
            return permissions.canViewAssignedTeams || permissions.canViewOwnChildrenData
        }

        return false
    })
}

/**
 * Filter events by user permissions
 */
export function filterEventsByRole<T extends { team_id?: string | null; team?: { id?: string | null; org_id?: string | null } }>(
    events: T[],
    permissions: PermissionSet,
    childTeamMemberships: Array<{ childId: string; teamId: string }>,
    currentOrgId: string
): T[] {
    if (permissions.canViewAllOrgData) {
        return events.filter((e) => {
            const orgId = e.team?.org_id
            // Allow events without a team (org-wide events) or events in the current org
            return !orgId || orgId === currentOrgId
        })
    }

    // Get team IDs that parent's children are members of
    const parentChildTeamIds = childTeamMemberships
        .filter((m) => permissions.ownedChildIds.includes(m.childId))
        .map((m) => m.teamId)

    return events.filter((event) => {
        const teamId = event.team_id ?? event.team?.id

        // Coach sees assigned teams
        if (permissions.canViewAssignedTeams && teamId && permissions.assignedTeamIds.includes(teamId)) {
            return true
        }

        // Parent sees their children's teams
        if (permissions.canViewOwnChildrenData && teamId && parentChildTeamIds.includes(teamId)) {
            return true
        }

        return false
    })
}

/**
 * Filter payments by user permissions
 * Parents see only their children's payments
 * Admins see all payments in org
 */
export function filterPaymentsByRole<T extends { child_id?: string; org_id?: string }>(
    payments: T[],
    permissions: PermissionSet,
    currentOrgId: string
): T[] {
    if (permissions.canViewAllOrgData) {
        return payments.filter((p) => !p.org_id || p.org_id === currentOrgId)
    }

    return payments.filter((payment) => {
        if (payment.org_id && payment.org_id !== currentOrgId) {
            return false
        }

        // Parent sees own children's payments
        const paymentChildId = (payment as { athlete_id?: string; child_id?: string }).athlete_id ?? payment.child_id
        if (permissions.canViewOwnChildrenData && paymentChildId) {
            return permissions.ownedChildIds.includes(paymentChildId)
        }

        return false
    })
}

/**
 * Filter families by user permissions
 * Parents see only their own families
 */
export function filterFamiliesByRole<T extends { id: string }>(
    families: T[],
    permissions: PermissionSet
): T[] {
    if (permissions.canViewAllOrgData) {
        return families
    }

    return families.filter((family) => permissions.ownedFamilyIds.includes(family.id))
}

/**
 * Filter children by user permissions
 * Parents see only their own children
 */
export function filterChildrenByRole<T extends { id: string }>(
    children: T[],
    permissions: PermissionSet
): T[] {
    if (permissions.canViewAllOrgData) {
        return children
    }

    return children.filter((child) => permissions.ownedChildIds.includes(child.id))
}

// ============================================================================
// Type Guards (Runtime Validation)
// ============================================================================

const VALID_EVENT_TYPES = [
    'practice',
    'game',
    'tournament',
    'meeting',
    'tryout',
    'travel',
    'pickup_dropoff',
    'social',
    'blackout',
] as const

const VALID_RSVP_STATUSES = ['going', 'late', 'not_going', 'unknown'] as const

const VALID_ORG_MEMBER_ROLES = ['parent', 'guardian', 'coach', 'org_admin', 'staff', 'athlete', 'fan'] as const

const VALID_ORG_TYPES = ['school', 'club', 'league', 'academy', 'aau'] as const

const VALID_ORG_STATUSES = ['trial', 'active', 'suspended', 'expired'] as const

export function isValidEventType(value: string): value is (typeof VALID_EVENT_TYPES)[number] {
    return VALID_EVENT_TYPES.includes(value as (typeof VALID_EVENT_TYPES)[number])
}

export function isValidRSVPStatus(value: string): value is (typeof VALID_RSVP_STATUSES)[number] {
    return VALID_RSVP_STATUSES.includes(value as (typeof VALID_RSVP_STATUSES)[number])
}

export function isValidOrgMemberRole(value: string): value is OrgMemberRole {
    return VALID_ORG_MEMBER_ROLES.includes(value as OrgMemberRole)
}

export function isValidOrgType(value: string): value is (typeof VALID_ORG_TYPES)[number] {
    return VALID_ORG_TYPES.includes(value as (typeof VALID_ORG_TYPES)[number])
}

export function isValidOrgStatus(value: string): value is (typeof VALID_ORG_STATUSES)[number] {
    return VALID_ORG_STATUSES.includes(value as (typeof VALID_ORG_STATUSES)[number])
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate demo user IDs are properly configured
 * Throws if placeholder values detected in production
 */
export function validateDemoUserIds(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []
    const placeholderPattern = /^demo-/

    for (const [email, id] of Object.entries(DEMO_USER_IDS)) {
        if (placeholderPattern.test(id)) {
            warnings.push(`Placeholder ID for ${email}: ${id}`)
        }
    }

    return {
        valid: warnings.length === 0,
        warnings,
    }
}

/**
 * Validate Organization A ID is properly configured
 */
export function validateOrganizationAId(): { valid: boolean; warning: string | null } {
    const placeholderPattern = /^org-[a-z]-demo-id$/

    if (placeholderPattern.test(DEMO_ORG_A_ID)) {
        return {
            valid: false,
            warning: `Placeholder Organization A ID: ${DEMO_ORG_A_ID}`,
        }
    }

    return { valid: true, warning: null }
}

// ============================================================================
// Context Waiting (for async initialization)
// ============================================================================

/**
 * Wait for user context to become available
 * Used when services need to wait for auth to load
 *
 * @param getUserContext - Function that returns current context or null
 * @param timeout - Maximum time to wait in milliseconds
 * @returns UserContext when available, or null on timeout
 */
export async function waitForUserContext(
    getUserContext: () => UserContext | null,
    timeout: number = USER_CONTEXT_TIMEOUT_MS
): Promise<UserContext | null> {
    const startTime = Date.now()
    const pollInterval = 100 // Check every 100ms

    while (Date.now() - startTime < timeout) {
        const context = getUserContext()
        if (context) {
            return context
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    console.warn(`[FakeData] User context not available after ${timeout}ms timeout`)
    return null
}

// ============================================================================
// Demo Data Helpers
// ============================================================================

/**
 * Get demo user context for testing
 * Returns fully populated context for specified demo user email
 */
export function getDemoUserContext(email: string): UserContext | null {
    const normalizedEmail = email.toLowerCase().trim()
    const userId = resolveDemoUserId(normalizedEmail)

    if (userId) {
        let roles: OrgMemberRole[] = []
        if (normalizedEmail.includes('parent-only')) {
            roles = ['parent']
        } else if (normalizedEmail.includes('coach-only')) {
            roles = ['coach']
        } else if (normalizedEmail.includes('admin-only')) {
            roles = ['org_admin']
        } else if (normalizedEmail.includes('parent-admin')) {
            roles = ['parent', 'org_admin']
        } else if (normalizedEmail.includes('parent-coach')) {
            roles = ['parent', 'coach']
        } else if (normalizedEmail.includes('athlete')) {
            roles = ['athlete']
        }

        return {
            userId,
            email: normalizedEmail,
            orgId: DEMO_ORG_A_ID,
            roles,
            isPlatformAdmin: false,
        }
    }

    const fakeUser = getUserByEmail(normalizedEmail)
    if (!fakeUser) return null

    const memberships = getUserOrganizations(fakeUser.id)
    const primaryMembership = memberships[0]

    return {
        userId: fakeUser.id,
        email: normalizedEmail,
        orgId: primaryMembership?.org_id ?? DEMO_ORG_A_ID,
        roles: primaryMembership?.roles ?? ['parent'],
        isPlatformAdmin: false,
    }
}
