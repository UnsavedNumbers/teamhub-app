/**
 * Type-safe role helper functions for multi-role support
 * These are UX-only helpers - actual authorization is enforced by RLS
 */

import type { Organization, OrgMemberRole } from '@/contexts/OrganizationContext'

/**
 * Check if an organization has a specific role
 * @param org - Organization object (can be null)
 * @param role - Role to check for
 * @returns true if the organization has the role
 */
export function hasRole(
  org: Organization | null | undefined,
  role: OrgMemberRole
): boolean {
  return org?.roles?.includes(role) ?? false
}

/**
 * Check if an organization has ANY of the specified roles
 * @param org - Organization object (can be null)
 * @param roles - Array of roles to check for
 * @returns true if the organization has at least one of the roles
 */
export function hasAnyRole(
  org: Organization | null | undefined,
  roles: OrgMemberRole[]
): boolean {
  return org?.roles.some(r => roles.includes(r)) ?? false
}

/**
 * Check if an organization has ALL of the specified roles
 * @param org - Organization object (can be null)
 * @param roles - Array of roles to check for
 * @returns true if the organization has all of the roles
 */
export function hasAllRoles(
  org: Organization | null | undefined,
  roles: OrgMemberRole[]
): boolean {
  if (!org || !org.roles) return false
  return roles.every(role => org.roles.includes(role))
}

/**
 * Get the highest priority role from an organization
 * Priority: org_admin > coach > parent
 * @param org - Organization object (can be null)
 * @returns The highest priority role, or null if no roles
 */
export function getPrimaryRole(
  org: Organization | null | undefined
): OrgMemberRole | null {
  if (!org || !org.roles || org.roles.length === 0) return null

  if (org.roles.includes('org_admin')) return 'org_admin'
  if (org.roles.includes('coach')) return 'coach'
  if (org.roles.includes('parent')) return 'parent'

  return org.roles[0]
}



/**
 * Check if user has a role in any organization
 * @param organizations - Array of organizations
 * @param role - Role to check for
 * @returns true if user has the role in at least one organization
 */
export function hasRoleInAnyOrg(
  organizations: Organization[],
  role: OrgMemberRole
): boolean {
  return organizations.some(org => org.roles?.includes(role))
}

/**
 * Format role name for display
 * @param role - Role to format
 * @returns Display name for the role
 */
export function formatRoleName(role: OrgMemberRole): string {
  switch (role) {
    case 'org_admin':
      return 'Admin'
    case 'parent':
      return 'Parent'
    case 'coach':
      return 'Coach'
    default:
      return role.charAt(0).toUpperCase() + role.slice(1)
  }
}
