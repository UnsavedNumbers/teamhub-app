/**
 * Profile Validation Utility
 * 
 * Checks if user profile is complete with required fields
 */

import type { User } from '../types/domain/User'

/**
 * Checks if a user profile has all required fields completed
 * 
 * Required fields:
 * - firstName (non-empty after trim)
 * - lastName (non-empty after trim)
 * - phone (non-empty after trim)
 * 
 * @param user - User object to validate
 * @returns true if profile is complete, false otherwise
 */
export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) {
    return false
  }

  const firstName = user.firstName?.trim() ?? ''
  const lastName = user.lastName?.trim() ?? ''
  const phone = user.phone?.trim() ?? ''

  return firstName.length > 0 && lastName.length > 0 && phone.length > 0
}

/**
 * Gets list of missing required profile fields
 * 
 * @param user - User object to check
 * @returns Array of missing field names
 */
export function getMissingProfileFields(user: User | null | undefined): string[] {
  const missing: string[] = []

  if (!user) {
    return ['firstName', 'lastName', 'phone']
  }

  const firstName = user.firstName?.trim() ?? ''
  const lastName = user.lastName?.trim() ?? ''
  const phone = user.phone?.trim() ?? ''

  if (firstName.length === 0) {
    missing.push('firstName')
  }

  if (lastName.length === 0) {
    missing.push('lastName')
  }

  if (phone.length === 0) {
    missing.push('phone')
  }

  return missing
}
