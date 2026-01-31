/**
 * Safe Accessor Utilities
 * 
 * Provides consistent, type-safe access to potentially null/undefined values
 * with sensible defaults. Prevents runtime errors from null access.
 * 
 * Technical Bug Prevention #3: Null/Undefined Handling - Optional Chaining Everywhere
 */

/**
 * Safely access a string value, returning default if null/undefined
 * 
 * @param value - String value (may be null/undefined)
 * @param defaultValue - Default value to return (default: '—')
 * @returns String value or default
 */
export function safeString(
  value: string | null | undefined,
  defaultValue = '—'
): string {
  return value ?? defaultValue
}

/**
 * Safely format a date value, returning default if null/undefined/invalid
 * 
 * @param value - Date string or Date object (may be null/undefined)
 * @param defaultValue - Default value to return (default: '—')
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string or default
 */
export function safeDate(
  value: string | Date | null | undefined,
  defaultValue = '—',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return defaultValue

  try {
    const date = typeof value === 'string' ? new Date(value) : value
    if (isNaN(date.getTime())) return defaultValue
    
    return date.toLocaleString(undefined, options)
  } catch {
    return defaultValue
  }
}

/**
 * Safely access a number value, returning default if null/undefined/NaN
 * 
 * @param value - Number value (may be null/undefined/NaN)
 * @param defaultValue - Default value to return (default: 0)
 * @returns Number value or default
 */
export function safeNumber(
  value: number | null | undefined,
  defaultValue = 0
): number {
  if (value === null || value === undefined || isNaN(value)) {
    return defaultValue
  }
  return value
}

/**
 * Safely access an array value, returning default if null/undefined/not an array
 * 
 * @param value - Array value (may be null/undefined/not an array)
 * @param defaultValue - Default value to return (default: [])
 * @returns Array value or default
 */
export function safeArray<T>(
  value: T[] | null | undefined,
  defaultValue: T[] = []
): T[] {
  return Array.isArray(value) ? value : defaultValue
}

/**
 * Safely access a boolean value, returning default if null/undefined
 * 
 * @param value - Boolean value (may be null/undefined)
 * @param defaultValue - Default value to return (default: false)
 * @returns Boolean value or default
 */
export function safeBoolean(
  value: boolean | null | undefined,
  defaultValue = false
): boolean {
  return value ?? defaultValue
}

/**
 * Safely access an object value, returning default if null/undefined
 * 
 * @param value - Object value (may be null/undefined)
 * @param defaultValue - Default value to return
 * @returns Object value or default
 */
export function safeObject<T extends Record<string, unknown>>(
  value: T | null | undefined,
  defaultValue: T
): T {
  return value ?? defaultValue
}
