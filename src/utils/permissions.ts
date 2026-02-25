/**
 * Comprehensive Permissions Utility
 * 
 * Single source of truth for role-based access control across the frontend.
 * Supports multi-role users and org-scoped permissions.
 */

import type { Organization } from '@/contexts/OrganizationContext'
import { hasAnyRole } from './roleHelpers'

export type ResourceType = 
  | 'organization'
  | 'sport'
  | 'program'
  | 'level'
  | 'team'
  | 'season'
  | 'athlete'
  | 'guardian'
  | 'event'
  | 'payment'
  | 'facility'
  | 'announcement'
  | 'travel'
  | 'uniform'
  | 'ticketing'
  | 'report'
  | 'billing'
  | 'user'
  | 'medical'
  | 'pii'

export type Action = 
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage'
  | 'export'
  | 'invite'
  | 'refund'
  | 'scan'
  | 'assign'

export interface PermissionContext {
  org: Organization | null | undefined
  userId?: string | null
  teamId?: string | null
  athleteId?: string | null
  resourceOrgId?: string | null
  resourceTeamId?: string | null
}

/**
 * Check if user can perform an action on a resource type
 */
export function canAccess(
  context: PermissionContext,
  resourceType: ResourceType,
  action: Action
): boolean {
  const { org } = context
  
  if (!org) return false

  const roles = org.roles || []
  const isOrgAdmin = roles.includes('org_admin')
  const isCoach = roles.includes('coach')
  const isStaff = roles.includes('staff')
  const isParent = roles.includes('parent')
  const isAthlete = roles.includes('athlete')

  // Platform admins have full access (handled separately)
  // Org admins have full access within their org
  if (isOrgAdmin) {
    return true
  }

  // Coaches: team-scoped access only
  if (isCoach) {
    return canCoachAccess(context, resourceType, action)
  }

  // Staff: permission-flag controlled access
  if (isStaff) {
    return canStaffAccess(context, resourceType, action)
  }

  // Parents/Guardians: linked-athlete scoped access
  if (isParent) {
    return canParentAccess(context, resourceType, action)
  }

  // Athletes: self-scoped access only
  if (isAthlete) {
    return canAthleteAccess(context, resourceType, action)
  }

  return false
}

/**
 * Coach permissions: team-scoped only
 */
function canCoachAccess(
  context: PermissionContext,
  resourceType: ResourceType,
  action: Action
): boolean {
  const { teamId, resourceTeamId } = context

  // Coaches can only access resources for their assigned teams
  // If teamId is provided, verify it matches resourceTeamId
  if (resourceTeamId && teamId && resourceTeamId !== teamId) {
    return false
  }

  // Coaches cannot access org-wide admin features
  const restrictedResources: ResourceType[] = [
    'organization',
    'sport',
    'program',
    'level',
    'season',
    'payment',
    'billing',
    'user',
    'report',
    'guardian',
  ]

  if (restrictedResources.includes(resourceType)) {
    return false
  }

  // Coaches can read/manage team-scoped resources
  const teamScopedResources: ResourceType[] = [
    'team',
    'athlete',
    'event',
    'announcement',
    'travel',
    'uniform',
    'ticketing',
  ]

  if (teamScopedResources.includes(resourceType)) {
    // Coaches can read and create, but not delete org-level resources
    if (action === 'delete' && !teamId) {
      return false
    }
    return action === 'read' || action === 'create' || action === 'update'
  }

  // Coaches cannot access medical info or PII
  if (resourceType === 'medical' || resourceType === 'pii') {
    return false
  }

  return false
}

/**
 * Staff permissions: permission-flag controlled
 */
function canStaffAccess(
  _context: PermissionContext,
  resourceType: ResourceType,
  action: Action
): boolean {
  // Staff permissions are controlled by permission flags in organization_members.permissions
  // For now, staff have read-only access to most resources
  // TODO: Implement permission flag checking from org.permissions JSONB field
  
  const readOnlyResources: ResourceType[] = [
    'event',
    'facility',
    'announcement',
    'travel',
    'uniform',
    'ticketing',
  ]

  if (readOnlyResources.includes(resourceType)) {
    return action === 'read' || action === 'scan' // Staff can scan tickets
  }

  // Staff cannot access sensitive resources
  const restrictedResources: ResourceType[] = [
    'organization',
    'sport',
    'program',
    'level',
    'team',
    'season',
    'payment',
    'billing',
    'user',
    'report',
    'guardian',
    'medical',
    'pii',
  ]

  return !restrictedResources.includes(resourceType)
}

/**
 * Parent/Guardian permissions: linked-athlete scoped
 */
function canParentAccess(
  _context: PermissionContext,
  resourceType: ResourceType,
  action: Action
): boolean {
  // Parents can only access resources for their linked athletes
  // Note: resourceAthleteId check would be done at the service/component level

  // Parents can read athlete info, payments, events, etc. for their athletes
  const allowedResources: ResourceType[] = [
    'athlete',
    'event',
    'payment',
    'travel',
    'uniform',
    'ticketing',
    'announcement',
  ]

  if (allowedResources.includes(resourceType)) {
    return action === 'read' || action === 'create' // Parents can create registrations, etc.
  }

  // Parents cannot access org admin features
  const restrictedResources: ResourceType[] = [
    'organization',
    'sport',
    'program',
    'level',
    'team',
    'season',
    'billing',
    'user',
    'report',
    'guardian',
    'facility',
  ]

  return !restrictedResources.includes(resourceType)
}

/**
 * Athlete permissions: self-scoped only
 */
function canAthleteAccess(
  _context: PermissionContext,
  resourceType: ResourceType,
  action: Action
): boolean {
  // Athletes can only access their own resources
  // Note: resourceAthleteId check would be done at the service/component level

  // Athletes can read their own info
  const allowedResources: ResourceType[] = [
    'athlete',
    'event',
    'travel',
    'uniform',
    'ticketing',
    'announcement',
  ]

  if (allowedResources.includes(resourceType)) {
    return action === 'read'
  }

  // Athletes cannot access any admin features
  return false
}

/**
 * Check if user can view sensitive financial data (payment amounts)
 */
export function canViewPaymentAmounts(context: PermissionContext): boolean {
  const { org } = context
  if (!org) return false

  // Only org admins can view payment amounts
  return hasAnyRole(org, ['org_admin'])
}

/**
 * Check if user can view medical information
 */
export function canViewMedicalInfo(
  context: PermissionContext,
  _athleteId: string
): boolean {
  const { org, userId } = context
  if (!org) return false

  const roles = org.roles || []
  const isOrgAdmin = roles.includes('org_admin')
  const isParent = roles.includes('parent')
  const isAthlete = roles.includes('athlete')

  // Org admins can view all medical info
  if (isOrgAdmin) {
    return true
  }

  // Parents can view medical info for their linked athletes
  if (isParent) {
    // TODO: Check if athleteId is linked to this parent via athlete_guardians
    return true // Simplified for now - should check guardian linkage
  }

  // Athletes can view their own medical info
  if (isAthlete && userId) {
    // TODO: Check if athleteId matches user's athlete record
    return true // Simplified for now
  }

  // Coaches and staff cannot view medical info
  return false
}

/**
 * Check if user can view PII (personally identifiable information)
 */
export function canViewPII(
  context: PermissionContext,
  targetUserId?: string
): boolean {
  const { org, userId } = context
  if (!org) return false

  const roles = org.roles || []
  const isOrgAdmin = roles.includes('org_admin')
  const isParent = roles.includes('parent')

  // Org admins can view all PII
  if (isOrgAdmin) {
    return true
  }

  // Parents can view PII for their linked athletes/guardians
  if (isParent) {
    // TODO: Check if targetUserId is linked to this parent
    return true // Simplified for now
  }

  // Users can always view their own PII
  if (targetUserId && userId === targetUserId) {
    return true
  }

  // Coaches, staff, and athletes cannot view others' PII
  return false
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  context: PermissionContext,
  routeKey: string
): boolean {
  const { org } = context
  if (!org) return false

  // Admin routes
  if (routeKey.startsWith('admin.')) {
    return hasAnyRole(org, ['org_admin', 'coach', 'staff'])
  }

  // Portal routes
  if (routeKey.startsWith('portal.')) {
    return hasAnyRole(org, ['parent', 'athlete'])
  }

  // Platform admin routes
  if (routeKey.startsWith('platformAdmin.')) {
    // Platform admin check is handled separately via profile.isPlatformAdmin
    return false
  }

  return false
}

/**
 * Get list of allowed menu items for a role
 */
export function getAllowedMenuItems(
  context: PermissionContext
): string[] {
  const { org } = context
  if (!org) return []

  const roles = org.roles || []
  const isOrgAdmin = roles.includes('org_admin')
  const isCoach = roles.includes('coach')
  const isStaff = roles.includes('staff')
  const isParent = roles.includes('parent')
  const isAthlete = roles.includes('athlete')

  const allowed: string[] = []

  if (isOrgAdmin) {
    // Org admins can see everything
    return ['*'] // All items
  }

  if (isCoach) {
    // Coaches can see team-scoped items
    allowed.push(
      'admin.dashboard',
      'admin.events.list',
      'admin.announcements.list',
      'admin.travel.list',
      'admin.uniforms.list',
      'admin.attendance',
      'admin.notifications',
      'admin.teams.list', // Can view teams they're assigned to
      'admin.athletes.list', // Can view athletes on their teams
    )
  }

  if (isStaff) {
    // Staff can see operational items based on permissions
    allowed.push(
      'admin.dashboard',
      'admin.events.list',
      'admin.facilities.list',
      'admin.ticketingScanner', // Gate scanning
      'admin.attendance',
    )
  }

  if (isParent || isAthlete) {
    // Portal items
    allowed.push(
      'portal.dashboard',
      'portal.athletes',
      'portal.calendar',
      'portal.payments',
      'portal.uniforms',
      'portal.travel',
      'portal.tryouts',
      'portal.messages',
      'portal.photos',
      'portal.videos',
      'portal.tickets',
      'portal.notifications',
      'portal.settings',
    )
  }

  return allowed
}
