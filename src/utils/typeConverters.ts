/**
 * Type Converter Utilities
 * 
 * Provides type-safe conversion functions for common type mismatches.
 * Handles string-to-number, string-to-UUID, string-to-date conversions safely.
 * 
 * Technical Bug Prevention #10: Type Coercion Bugs - String vs Number vs UUID
 */

import { isValidUUID } from './uuid'

/**
 * Convert a value to a UUID, validating it
 * 
 * @param value - Value to convert (string, number, etc.)
 * @returns Valid UUID string or null if invalid
 */
export function toUUID(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return isValidUUID(value) ? value : null
}

/**
 * Convert a value to a number safely
 * 
 * @param value - Value to convert (string, number, etc.)
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns Valid number or default
 */
export function toNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value
  }
  
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? defaultValue : num
  }
  
  return defaultValue
}

/**
 * Convert a value to an integer safely
 * 
 * @param value - Value to convert (string, number, etc.)
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns Valid integer or default
 */
export function toInteger(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') {
    return Math.floor(value)
  }
  
  if (typeof value === 'string') {
    const num = parseInt(value, 10)
    return isNaN(num) ? defaultValue : num
  }
  
  return defaultValue
}

/**
 * Convert a value to a Date object safely
 * 
 * @param value - Value to convert (string, Date, number timestamp, etc.)
 * @returns Valid Date object or null if invalid
 */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  
  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  
  if (typeof value === 'number') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  
  return null
}

/**
 * Convert a value to a string safely
 * 
 * @param value - Value to convert (any type)
 * @param defaultValue - Default value if conversion fails (default: '')
 * @returns String representation or default
 */
export function toString(value: unknown, defaultValue = ''): string {
  if (value === null || value === undefined) return defaultValue
  
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  
  try {
    return JSON.stringify(value)
  } catch {
    return defaultValue
  }
}

/**
 * Convert a value to a boolean safely
 * 
 * @param value - Value to convert (any type)
 * @param defaultValue - Default value if conversion fails (default: false)
 * @returns Boolean value or default
 */
export function toBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  return defaultValue
}
