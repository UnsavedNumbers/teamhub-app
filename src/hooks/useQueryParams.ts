/**
 * useQueryParams Hook
 * 
 * Provides type-safe, validated access to URL query parameters.
 * Validates UUIDs, numbers, and sanitizes strings to prevent XSS.
 * 
 * Technical Bug Prevention #6: URL Query Param Parsing - Invalid/Malformed Params
 */

import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isValidUUID } from '../utils/uuid'

/**
 * Validated query parameter accessors
 */
export interface QueryParamsAccessors {
  /**
   * Get a UUID query parameter, validated
   * @param key - Query parameter key
   * @returns Valid UUID string or null if invalid/missing
   */
  getUUID: (key: string) => string | null

  /**
   * Get a string query parameter
   * @param key - Query parameter key
   * @param defaultValue - Default value if not found
   * @returns Query parameter value or default
   */
  getString: (key: string, defaultValue?: string | null) => string | null

  /**
   * Get a number query parameter, validated
   * @param key - Query parameter key
   * @param defaultValue - Default value if not found or invalid
   * @returns Valid number or default
   */
  getNumber: (key: string, defaultValue?: number | null) => number | null

  /**
   * Get a boolean query parameter
   * @param key - Query parameter key
   * @param defaultValue - Default value if not found
   * @returns Boolean value or default
   */
  getBoolean: (key: string, defaultValue?: boolean | null) => boolean | null

  /**
   * Raw searchParams object for advanced usage
   */
  searchParams: URLSearchParams
}

/**
 * Hook that provides validated, type-safe access to URL query parameters
 * 
 * @returns Object with validated getter functions
 * 
 * @example
 * ```tsx
 * const { getUUID, getNumber } = useQueryParams()
 * const orgId = getUUID('org_id') // Returns validated UUID or null
 * const page = getNumber('page', 0) // Returns number or 0
 * ```
 */
export function useQueryParams(): QueryParamsAccessors {
  const [searchParams] = useSearchParams()

  const getUUID = useCallback((key: string): string | null => {
    const value = searchParams.get(key)
    if (!value) return null
    return isValidUUID(value) ? value : null
  }, [searchParams])

  const getString = useCallback((
    key: string,
    defaultValue: string | null = null
  ): string | null => {
    const value = searchParams.get(key)
    if (value === null) return defaultValue
    
    // Sanitize to prevent XSS (basic - remove script tags and dangerous characters)
    const sanitized = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
    
    return sanitized || defaultValue
  }, [searchParams])

  const getNumber = useCallback((
    key: string,
    defaultValue: number | null = null
  ): number | null => {
    const value = searchParams.get(key)
    if (!value) return defaultValue
    
    const num = parseInt(value, 10)
    return isNaN(num) ? defaultValue : num
  }, [searchParams])

  const getBoolean = useCallback((
    key: string,
    defaultValue: boolean | null = null
  ): boolean | null => {
    const value = searchParams.get(key)
    if (value === null) return defaultValue
    
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
    
    return defaultValue
  }, [searchParams])

  return {
    getUUID,
    getString,
    getNumber,
    getBoolean,
    searchParams,
  }
}
