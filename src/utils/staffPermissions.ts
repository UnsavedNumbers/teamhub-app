/**
 * Staff Permission Utilities
 * 
 * Utilities for checking staff member permissions.
 * These are UX-only helpers - actual authorization is enforced by RLS.
 */

import type { StaffMember, StaffPermissions } from '../types/staffAndFan'

/**
 * Check if a staff member has a specific permission
 * 
 * @param staffMember - Staff member object (can be null/undefined)
 * @param permission - Permission key to check
 * @returns true if the staff member has the permission
 */
export function hasStaffPermission(
  staffMember: StaffMember | null | undefined,
  permission: keyof StaffPermissions
): boolean {
  if (!staffMember || !staffMember.is_active) return false
  return staffMember.permissions?.[permission] === true
}

/**
 * Check if a staff member has ANY of the specified permissions
 * 
 * @param staffMember - Staff member object (can be null/undefined)
 * @param permissions - Array of permission keys to check
 * @returns true if the staff member has at least one of the permissions
 */
export function hasAnyStaffPermission(
  staffMember: StaffMember | null | undefined,
  permissions: Array<keyof StaffPermissions>
): boolean {
  if (!staffMember || !staffMember.is_active) return false
  return permissions.some(permission => staffMember.permissions?.[permission] === true)
}

/**
 * Check if a staff member has ALL of the specified permissions
 * 
 * @param staffMember - Staff member object (can be null/undefined)
 * @param permissions - Array of permission keys to check
 * @returns true if the staff member has all of the permissions
 */
export function hasAllStaffPermissions(
  staffMember: StaffMember | null | undefined,
  permissions: Array<keyof StaffPermissions>
): boolean {
  if (!staffMember || !staffMember.is_active) return false
  return permissions.every(permission => staffMember.permissions?.[permission] === true)
}

/**
 * Get all active permissions for a staff member
 * 
 * @param staffMember - Staff member object (can be null/undefined)
 * @returns Array of permission keys that are active
 */
export function getActiveStaffPermissions(
  staffMember: StaffMember | null | undefined
): Array<keyof StaffPermissions> {
  if (!staffMember || !staffMember.is_active || !staffMember.permissions) return []
  
  return Object.entries(staffMember.permissions)
    .filter(([_, value]) => value === true)
    .map(([key]) => key as keyof StaffPermissions)
}

/**
 * Check if a staff member can scan tickets
 */
export function canScanTickets(staffMember: StaffMember | null | undefined): boolean {
  return hasStaffPermission(staffMember, 'can_scan_tickets')
}

/**
 * Check if a staff member can view attendees
 */
export function canViewAttendees(staffMember: StaffMember | null | undefined): boolean {
  return hasStaffPermission(staffMember, 'can_view_attendees')
}

/**
 * Check if a staff member can manage events
 */
export function canManageEvents(staffMember: StaffMember | null | undefined): boolean {
  return hasStaffPermission(staffMember, 'can_manage_events')
}

/**
 * Check if a staff member can view financials
 */
export function canViewFinancials(staffMember: StaffMember | null | undefined): boolean {
  return hasStaffPermission(staffMember, 'can_view_financials')
}

/**
 * Check if a staff member can manage roster
 */
export function canManageRoster(staffMember: StaffMember | null | undefined): boolean {
  return hasStaffPermission(staffMember, 'can_manage_roster')
}

/**
 * Check if a staff member can send notifications
 */
export function canSendNotifications(staffMember: StaffMember | null | undefined): boolean {
  return hasStaffPermission(staffMember, 'can_send_notifications')
}

/**
 * Check if a staff member can manage staff
 */
export function canManageStaff(staffMember: StaffMember | null | undefined): boolean {
  return hasStaffPermission(staffMember, 'can_manage_staff')
}
