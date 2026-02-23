/**
 * Response Helpers
 *
 * Provides standardized response types and utilities for service functions.
 * Ensures consistent error handling and response shapes across all services.
 */

/**
 * Standard service response type
 * Used by all service functions to ensure consistent return shapes
 */
export interface ServiceResponse<T> {
    data: T | null
    error: Error | null
    isEmpty: boolean
}

/**
 * Create a standardized service response
 *
 * @param data - The data to return (null for errors or not found, empty array for arrays)
 * @param error - The error object (null for success)
 * @returns ServiceResponse with isEmpty flag computed
 *
 * @example
 * ```typescript
 * return createServiceResponse(events, null) // Success with data
 * return createServiceResponse(null, new Error('Not found')) // Error
 * return createServiceResponse([], null) // Success with empty array
 * ```
 */
export function createServiceResponse<T>(
    data: T | null,
    error: Error | null
): ServiceResponse<T> {
    const normalizedData = data
    const isEmpty = normalizedData === null || (Array.isArray(normalizedData) && normalizedData.length === 0)

    return {
        data: normalizedData,
        error,
        isEmpty,
    }
}

/**
 * Normalize Supabase response data
 * Converts null/undefined to appropriate defaults (empty array for arrays, null for single items)
 *
 * @param data - Data from Supabase query (may be null or undefined)
 * @param isArray - Whether the data should be an array
 * @returns Normalized data (empty array if isArray and data is null/undefined, null otherwise)
 *
 * @example
 * ```typescript
 * const { data } = await supabase.from('events').select('*')
 * const normalized = normalizeSupabaseResponse(data, true) // [] if null, data otherwise
 * ```
 */
export function normalizeSupabaseResponse<T>(
    data: T | null | undefined,
    isArray: boolean
): T {
    if (data === null || data === undefined) {
        if (isArray) {
            return [] as unknown as T
        }
        return null as unknown as T
    }

    return data
}
