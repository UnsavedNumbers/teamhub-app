/**
 * Login Redirect Utilities
 * 
 * Determines where to redirect users after login based on their roles.
 * Uses centralized route manager for consistent path generation.
 */

import type { Organization } from '../contexts/OrganizationContext'
import { getLink, RouteKeys } from './routes'

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
    if (org.roles && org.roles.length > 1) {
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
  return organizations.some(org => org.roles?.includes('org_admin'))
}

/**
 * Check if user has coach role in any organization
 */
export function hasCoachRole(organizations: Organization[]): boolean {
  return organizations.some(org => org.roles?.includes('coach'))
}

/**
 * Determine redirect destination after login
 * 
 * Rules:
 * 1. Platform admins -> /platform-admin
 * 2. Users with multiple roles -> /portal/role-selection
 * 3. Users with admin role -> /admin
 * 4. Users with coach role -> /admin
 * 5. Fans (explicitly identified via signup_mode or fan_org_follows) -> /fan
 * 6. Otherwise -> /portal/dashboard (parents/guardians)
 * 
 * Note: A user is a fan if:
 * - They signed up with signup_mode='fan' in their auth metadata, OR
 * - They have entries in the fan_org_follows table
 * 
 * A guardian with no org memberships is NOT a fan - they're a parent waiting
 * to be linked to athletes.
 */
export function getLoginRedirect(
  isPlatformAdmin: boolean,
  organizations: Organization[],
  isFan: boolean = false
): string {
  // Priority 1: Platform admins
  if (isPlatformAdmin) {
    return getLink(RouteKeys.PLATFORM_DASHBOARD)
  }

  // Priority 2: Multiple roles -> role selection
  if (hasMultipleRoles(organizations)) {
    return getLink(RouteKeys.PORTAL_ROLE_SELECTION)
  }

  // Priority 3: Admin role -> admin section
  if (hasAdminRole(organizations)) {
    return getLink(RouteKeys.ADMIN_DASHBOARD)
  }

  // Priority 4: Coach role -> admin section
  if (hasCoachRole(organizations)) {
    return getLink(RouteKeys.ADMIN_DASHBOARD)
  }

  // Priority 5: Explicitly identified fans -> fan home
  // This is determined by signup_mode='fan' or having fan_org_follows entries
  if (isFan) {
    return getLink(RouteKeys.FAN_HOME)
  }

  // Default: Parent/guardian dashboard
  // Note: Guardians with no org memberships go here, NOT to fan home
  return getLink(RouteKeys.PORTAL_DASHBOARD)
}
