/**
 * Staff Validation and Type Guards
 * 
 * Type guards and validation utilities for staff-related types.
 */

import type { StaffMember, StaffPermissions } from '../types/staffAndFan'

/**
 * Type guard to check if an object is a StaffMember
 */
export function isStaffMember(obj: unknown): obj is StaffMember {
  if (!obj || typeof obj !== 'object') return false
  
  const member = obj as Record<string, unknown>
  
  return (
    typeof member.id === 'string' &&
    typeof member.user_id === 'string' &&
    typeof member.org_id === 'string' &&
    member.role === 'staff' &&
    typeof member.is_active === 'boolean' &&
    typeof member.created_at === 'string' &&
    typeof member.updated_at === 'string'
  )
}

/**
 * Type guard to check if an object is StaffPermissions
 */
export function isStaffPermissions(obj: unknown): obj is StaffPermissions {
  if (!obj || typeof obj !== 'object') return false
  
  const perms = obj as Record<string, unknown>
  
  // Check that all values are boolean or undefined
  const validKeys = [
    'can_scan_tickets',
    'can_view_attendees',
    'can_manage_events',
    'can_view_financials',
    'can_manage_roster',
    'can_send_notifications',
    'can_manage_staff',
  ]
  
  for (const key of Object.keys(perms)) {
    if (!validKeys.includes(key)) return false
    if (perms[key] !== undefined && typeof perms[key] !== 'boolean') return false
  }
  
  return true
}

/**
 * Validate StaffMemberInput
 */
export function validateStaffMemberInput(input: unknown): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input: must be an object' }
  }
  
  const data = input as Record<string, unknown>
  
  if (typeof data.user_id !== 'string' || !data.user_id.trim()) {
    return { valid: false, error: 'user_id is required and must be a non-empty string' }
  }
  
  if (typeof data.org_id !== 'string' || !data.org_id.trim()) {
    return { valid: false, error: 'org_id is required and must be a non-empty string' }
  }
  
  if (data.permissions !== undefined && !isStaffPermissions(data.permissions)) {
    return { valid: false, error: 'permissions must be a valid StaffPermissions object' }
  }
  
  return { valid: true }
}

/**
 * Validate that a staff member is active
 */
export function isActiveStaffMember(member: StaffMember | null | undefined): member is StaffMember {
  return member !== null && member !== undefined && member.is_active === true
}

/**
 * Validate UUID format (basic check)
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Validate staff member IDs
 */
export function validateStaffMemberIds(userId: string, orgId: string): { valid: boolean; error?: string } {
  if (!isValidUUID(userId)) {
    return { valid: false, error: 'Invalid user_id format' }
  }
  
  if (!isValidUUID(orgId)) {
    return { valid: false, error: 'Invalid org_id format' }
  }
  
  return { valid: true }
}
