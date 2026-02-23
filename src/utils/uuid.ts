/**
 * UUID Validation Utilities
 * 
 * Provides type-safe UUID validation functions.
 */

/**
 * Validates if a string is a valid UUID v4 format
 * @param value - String to validate
 * @returns True if value is a valid UUID
 */
export function isUuid(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is 8, 9, a, or b
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Validates UUID and throws if invalid
 * @param value - String to validate
 * @param fieldName - Name of field for error message
 * @throws Error if value is not a valid UUID
 */
export function requireUuid(value: string | null | undefined, fieldName: string = 'id'): asserts value is string {
  if (!isUuid(value)) {
    throw new Error(`Invalid ${fieldName}: expected UUID format, got ${value}`)
  }
}

/**
 * Type guard for UUID strings
 */
export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && isUuid(value)
}
