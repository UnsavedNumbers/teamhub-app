/**
 * UUID Validation Utilities
 * 
 * Helper functions for validating UUIDs and handling UUID-related errors.
 */

/**
 * UUID v4 regex pattern
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Check if a string is a valid UUID v4
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false
  return UUID_V4_REGEX.test(value)
}

/**
 * Validate UUID and throw if invalid
 */
export function validateUUID(value: string | null | undefined, fieldName = 'ID'): asserts value is string {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`)
  }
}

/**
 * Check if a value is a valid UUID, returning a type guard
 */
export function isUUID(value: unknown): value is string {
  return typeof value === 'string' && isValidUUID(value)
}
