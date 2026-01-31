/**
 * Supabase Error Handler
 *
 * Classifies Supabase errors into specific types for better error handling.
 * Provides user-friendly error messages without exposing internal details.
 */

/**
 * Base error class for classified Supabase errors
 */
export class ClassifiedSupabaseError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly retryable: boolean,
        public readonly originalError?: unknown
    ) {
        super(message)
        this.name = 'ClassifiedSupabaseError'
    }
}

/**
 * RLS (Row Level Security) policy error
 * Indicates the user doesn't have permission to access the resource
 */
export class RLSError extends ClassifiedSupabaseError {
    constructor(originalError?: unknown) {
        super(
            'Access denied. You do not have permission to access this resource.',
            'RLS_ERROR',
            false,
            originalError
        )
        this.name = 'RLSError'
    }
}

/**
 * Not found error
 * Indicates the requested resource doesn't exist
 */
export class NotFoundError extends ClassifiedSupabaseError {
    constructor(resource?: string, originalError?: unknown) {
        const message = resource
            ? `${resource} not found.`
            : 'The requested resource was not found.'
        super(message, 'NOT_FOUND', false, originalError)
        this.name = 'NotFoundError'
    }
}

/**
 * Network error
 * Indicates a network/connection issue
 */
export class NetworkError extends ClassifiedSupabaseError {
    constructor(originalError?: unknown) {
        super(
            'Network error. Please check your connection and try again.',
            'NETWORK_ERROR',
            true,
            originalError
        )
        this.name = 'NetworkError'
    }
}

/**
 * Validation error
 * Indicates invalid input data
 */
export class ValidationError extends ClassifiedSupabaseError {
    constructor(message: string, originalError?: unknown) {
        super(message, 'VALIDATION_ERROR', false, originalError)
        this.name = 'ValidationError'
    }
}

/**
 * Unknown error type
 * Fallback for unclassified errors
 */
export class UnknownSupabaseError extends ClassifiedSupabaseError {
    constructor(message: string, originalError?: unknown) {
        super(message, 'UNKNOWN_ERROR', true, originalError)
        this.name = 'UnknownSupabaseError'
    }
}

/**
 * Union type of all classified error types
 */
export type ClassifiedError = RLSError | NotFoundError | NetworkError | ValidationError | UnknownSupabaseError

/**
 * Classify a Supabase error into a specific error type
 *
 * @param error - Error from Supabase query (can be various types)
 * @param resourceName - Optional name of the resource (for NotFoundError)
 * @returns Classified error instance
 *
 * @example
 * ```typescript
 * const { data, error } = await supabase.from('events').select('*')
 * if (error) {
 *   const classified = classifySupabaseError(error)
 *   return { data: null, error: classified }
 * }
 * ```
 */
export function classifySupabaseError(
    error: unknown,
    resourceName?: string
): ClassifiedError {
    // Handle Supabase PostgREST errors
    if (error && typeof error === 'object' && 'message' in error) {
        const errorObj = error as { message: string; code?: string; details?: string; hint?: string }

        const message = errorObj.message || ''
        const code = errorObj.code || ''

        // Check for RLS errors
        if (
            message.includes('row-level security') ||
            message.includes('RLS') ||
            message.includes('permission denied') ||
            message.includes('new row violates row-level security') ||
            code === '42501' // PostgreSQL permission denied error code
        ) {
            return new RLSError(error)
        }

        // Check for not found errors
        if (
            message.includes('not found') ||
            message.includes('No rows returned') ||
            code === 'PGRST116' // PostgREST "not found" code
        ) {
            return new NotFoundError(resourceName, error)
        }

        // Check for network errors
        if (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('fetch') ||
            message.includes('Failed to fetch') ||
            code === 'ECONNREFUSED' ||
            code === 'ETIMEDOUT'
        ) {
            return new NetworkError(error)
        }

        // Check for validation errors
        if (
            message.includes('violates foreign key') ||
            message.includes('constraint') ||
            message.includes('invalid input') ||
            code === '23503' || // Foreign key violation
            code === '23505' || // Unique constraint violation
            code === '23514'    // Check constraint violation
        ) {
            return new ValidationError(
                errorObj.details || message || 'Invalid data provided.',
                error
            )
        }

        // Return unknown error with original message
        let errorMessage = 'An unexpected error occurred.'
        if (typeof errorObj.details === 'string' && errorObj.details) {
            errorMessage = errorObj.details
        } else if (typeof message === 'string' && message) {
            errorMessage = message
        } else if (errorObj.details && typeof errorObj.details === 'object') {
            // If details is an object, try to extract a meaningful message
            errorMessage = JSON.stringify(errorObj.details)
        }
        return new UnknownSupabaseError(errorMessage, error)
    }

    // Handle Error objects
    if (error instanceof Error) {
        const message = error.message.toLowerCase()

        if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
            return new NetworkError(error)
        }

        if (message.includes('not found')) {
            return new NotFoundError(resourceName, error)
        }

        if (message.includes('permission') || message.includes('access denied')) {
            return new RLSError(error)
        }

        return new UnknownSupabaseError(error.message, error)
    }

    // Handle string errors
    if (typeof error === 'string') {
        const lowerMessage = error.toLowerCase()

        if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
            return new NetworkError(error)
        }

        if (lowerMessage.includes('not found')) {
            return new NotFoundError(resourceName, error)
        }

        return new UnknownSupabaseError(error, error)
    }

    // Unknown error type
    return new UnknownSupabaseError('An unexpected error occurred.', error)
}
