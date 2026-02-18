/**
 * Help Center Link Utilities
 * 
 * Provides role-aware link generation for help center pages.
 */

import { getLink } from '../routes'
import { PUBLIC_URL_BASE } from '../../constants/routes'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

/**
 * Get the marketing site URL (YouthSports.team)
 */
export function getMarketingSiteUrl(): string {
  return PUBLIC_URL_BASE
}

/**
 * Get the home link based on user role
 * - Guardian/Athlete -> Portal Dashboard
 * - Org Admin -> Admin Dashboard
 * - Platform Admin -> Platform Dashboard
 */
export function getHomeLink(userRole: UserRole | null): string {
  if (!userRole) {
    return getLink('portal.dashboard')
  }

  switch (userRole) {
    case 'org_admin':
      return getLink('admin.dashboard')
    case 'platform_admin':
      return getLink('platform.dashboard')
    case 'parent':
    case 'athlete':
    case 'coach':
    default:
      return getLink('portal.dashboard')
  }
}

/**
 * Get the portal link (for Guardian/Athlete)
 */
export function getPortalLink(): string {
  return getLink('portal.dashboard')
}

/**
 * Get the admin portal link (for Org Admin)
 */
export function getAdminPortalLink(): string {
  return getLink('admin.dashboard')
}
