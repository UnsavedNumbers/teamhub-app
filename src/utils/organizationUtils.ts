/**
 * Organization Utilities
 * 
 * Helper functions for organization-related operations and formatting.
 */

import type { OrganizationStatus } from '../types/platformAdmin.types'
import { safeString, safeDate, safeNumber } from './safeAccessors'

/**
 * Get status badge variant for organization status
 * 
 * @param status - Organization status
 * @returns Badge variant name
 */
export function getStatusVariant(
  status: OrganizationStatus
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success'
    case 'trial':
      return 'info'
    case 'suspended':
      return 'danger'
    case 'expired':
      return 'warning'
    default:
      return 'neutral'
  }
}

/**
 * Format organization type for display
 * 
 * @param orgType - Organization type (may be null)
 * @returns Formatted type or '—'
 */
export function formatOrgType(orgType: string | null | undefined): string {
  return safeString(orgType)
}

/**
 * Format date for display
 * 
 * @param dateString - Date string (may be null)
 * @returns Formatted date or '—'
 */
export function formatDate(dateString: string | null | undefined): string {
  return safeDate(dateString)
}

/**
 * Format count for display
 * 
 * @param count - Count number (may be null)
 * @returns Formatted count or '0'
 */
export function formatCount(count: number | null | undefined): string {
  return String(safeNumber(count, 0))
}

/**
 * Check if organization is in trial period
 * 
 * @param trialEndsAt - Trial end date string
 * @returns true if still in trial
 */
export function isInTrial(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false
  
  try {
    const endDate = new Date(trialEndsAt)
    return endDate > new Date()
  } catch {
    return false
  }
}

/**
 * Check if organization is in grace period (after trial expires but before suspension)
 * 
 * @param trialEndsAt - Trial end date string
 * @param gracePeriodDays - Number of days in grace period (default: 7)
 * @returns true if in grace period
 */
export function isInGracePeriod(
  trialEndsAt: string | null | undefined,
  gracePeriodDays = 7
): boolean {
  if (!trialEndsAt) return false
  
  try {
    const endDate = new Date(trialEndsAt)
    const now = new Date()
    const graceEnd = new Date(endDate)
    graceEnd.setDate(graceEnd.getDate() + gracePeriodDays)
    
    return now > endDate && now <= graceEnd
  } catch {
    return false
  }
}

/**
 * Get days until trial expires (negative if expired)
 * 
 * @param trialEndsAt - Trial end date string
 * @returns Number of days until expiration
 */
export function getDaysUntilTrialExpires(
  trialEndsAt: string | null | undefined
): number | null {
  if (!trialEndsAt) return null
  
  try {
    const endDate = new Date(trialEndsAt)
    const now = new Date()
    const diffMs = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  } catch {
    return null
  }
}
