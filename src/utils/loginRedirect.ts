/**
 * Login Redirect Utilities
 * 
 * Determines where to redirect users after login based on their roles
 */

import type { Organization, OrgMemberRole } from '../contexts/OrganizationContext'

/**
 * Check if user has multiple roles (across all organizations or within a single org)
 * 
 * A user has multiple roles if:
 * - They have multiple roles within a single organization, OR
 * - They have roles in multiple organizations
 */
export function hasMultipleRoles(organizations: Organization[]): boolean {
  if (organizations.length === 0) return false
  
  // Check if user has multiple roles within any single organization
  for (const org of organizations) {
    if (org.roles.length > 1) {
      return true
    }
  }
  
  // Check if user has roles in multiple organizations
  if (organizations.length > 1) {
    return true
  }
  
  return false
}

/**
 * Check if user has admin role in any organization
 */
export function hasAdminRole(organizations: Organization[]): boolean {
  return organizations.some(org => org.roles.includes('org_admin'))
}

/**
 * Check if user has coach role in any organization
 */
export function hasCoachRole(organizations: Organization[]): boolean {
  return organizations.some(org => org.roles.includes('coach'))
}

/**
 * Determine redirect destination after login
 * 
 * Rules:
 * 1. Platform admins -> /platform-admin
 * 2. Users with multiple roles -> /portal/role-selection
 * 3. Users with admin role -> /admin/dashboard
 * 4. Users with coach role -> /admin/dashboard
 * 5. Otherwise -> /portal/dashboard
 */
export function getLoginRedirect(
  isPlatformAdmin: boolean,
  organizations: Organization[]
): string {
  // Priority 1: Platform admins
  if (isPlatformAdmin) {
    return '/platform-admin'
  }
  
  // Priority 2: Multiple roles -> role selection
  if (hasMultipleRoles(organizations)) {
    return '/portal/role-selection'
  }
  
  // Priority 3: Admin role -> admin section
  if (hasAdminRole(organizations)) {
    return '/admin/dashboard'
  }
  
  // Priority 4: Coach role -> admin section
  if (hasCoachRole(organizations)) {
    return '/admin/dashboard'
  }
  
  // Default: Parent dashboard
  return '/portal/dashboard'
}
