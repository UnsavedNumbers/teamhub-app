/**
 * User Data Helpers
 * 
 * Helper functions for normalizing and parsing user data from the database.
 * These functions handle type coercion, JSONB parsing, and null safety.
 */

import type { AdminUser, AdminUserOrganization } from '../types/platformAdmin.types'

/**
 * Parse organizations JSONB array safely
 * Handles JSONB from database which might be string, object, or array
 */
export function parseOrganizationsArray(data: unknown): AdminUserOrganization[] {
  if (!data) return []
  
  // If already an array, validate and return
  if (Array.isArray(data)) {
    return data.filter((item): item is AdminUserOrganization => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as any).org_id === 'string' &&
        typeof (item as any).org_name === 'string' &&
        typeof (item as any).role === 'string'
      )
    })
  }
  
  // If string, try to parse as JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        return parseOrganizationsArray(parsed)
      }
    } catch {
      return []
    }
  }
  
  // If object (single org), wrap in array
  if (typeof data === 'object' && data !== null) {
    const item = data as any
    if (item.org_id && item.org_name && item.role) {
      return [item as AdminUserOrganization]
    }
  }
  
  return []
}

/**
 * Parse roles array safely
 * Handles array from database which might be null or malformed
 */
export function parseRolesArray(data: unknown): string[] {
  if (!data) return []
  if (Array.isArray(data)) {
    return data.filter((r): r is string => typeof r === 'string')
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        return parseRolesArray(parsed)
      }
    } catch {
      return []
    }
  }
  return []
}

/**
 * Normalize AdminUser data from database
 * Ensures consistent types and handles null values
 */
export function normalizeAdminUser(data: any): AdminUser {
  return {
    id: data.id ? String(data.id) : null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    display_name: data.display_name ?? null,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
    email_confirmed: data.email_confirmed ?? false,
    is_platform_admin: data.is_platform_admin ?? false,
    is_disabled: data.is_disabled ?? false,
    last_sign_in_at: data.last_sign_in_at ?? null,
    organizations: parseOrganizationsArray(data.organizations),
    roles: parseRolesArray(data.roles),
    family_id: data.family_id ?? null,
  }
}

/**
 * Get safe organizations array from user
 * Returns empty array if null or invalid
 */
export function getUserOrganizations(user: AdminUser | null): AdminUserOrganization[] {
  if (!user) return []
  return user.organizations ?? []
}

/**
 * Format date for display
 * Returns formatted string or '—' if null
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString()
  } catch {
    return '—'
  }
}

/**
 * Format datetime for display
 * Returns formatted string or '—' if null
 */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleString()
  } catch {
    return '—'
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * Returns formatted string or '—' if null
 */
export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    
    // Fall back to formatted date for longer periods
    return formatDate(date)
  } catch {
    return '—'
  }
}
