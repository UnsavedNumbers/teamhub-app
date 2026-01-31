/**
 * RPC Error Handler
 * 
 * Unified error handling for Supabase RPC calls.
 * Normalizes different error formats and provides user-friendly messages.
 * 
 * Issue #10 Solution: RPC Error Handling - Different Error Formats
 */

/**
 * Normalized error response
 */
export interface NormalizedError {
  message: string
  retryable: boolean
  code?: string
}

/**
 * Handle RPC errors and normalize them to a consistent format
 * 
 * @param error - Error from RPC call (can be various types)
 * @param rpcName - Name of the RPC function (for context)
 * @returns Normalized error object
 * 
 * @example
 * ```tsx
 * const { data, error } = await supabase.rpc('admin_activate_organization', {...})
 * if (error) {
 *   const normalized = handleRpcError(error, 'admin_activate_organization')
 *   setError(normalized.message)
 * }
 * ```
 */
export function handleRpcError(
  error: unknown,
  rpcName: string
): NormalizedError {
  // Handle PostgREST/Supabase errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as { message: string; code?: string; details?: string }
    const message = errorObj.message || 'An error occurred'
    const code = errorObj.code

    // Check for specific error types
    if (message.includes('row-level security') || message.includes('RLS')) {
      return {
        message: 'Permission denied. You do not have access to perform this action.',
        retryable: false,
        code: 'PERMISSION_DENIED',
      }
    }

    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return {
        message: 'Network error. Please check your connection and try again.',
        retryable: true,
        code: 'NETWORK_ERROR',
      }
    }

    if (message.includes('violates foreign key') || message.includes('constraint')) {
      return {
        message: 'Invalid data. Please check your input and try again.',
        retryable: false,
        code: 'VALIDATION_ERROR',
      }
    }

    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return {
        message: 'This record already exists.',
        retryable: false,
        code: 'DUPLICATE_ERROR',
      }
    }

    // Return the error message with context
    return {
      message: errorObj.details || message,
      retryable: true,
      code: code || 'UNKNOWN_ERROR',
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return {
        message: 'Network error. Please check your connection and try again.',
        retryable: true,
        code: 'NETWORK_ERROR',
      }
    }

    return {
      message: error.message || `Error in ${rpcName}`,
      retryable: true,
      code: 'ERROR',
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      retryable: true,
      code: 'STRING_ERROR',
    }
  }

  // Unknown error type
  return {
    message: `An unexpected error occurred in ${rpcName}. Please try again.`,
    retryable: true,
    code: 'UNKNOWN_ERROR',
  }
}

/**
 * Check if an error is retryable
 * 
 * @param error - Error to check
 * @param rpcName - Name of the RPC function
 * @returns true if the error is retryable
 */
export function isRetryableError(error: unknown, rpcName: string): boolean {
  return handleRpcError(error, rpcName).retryable
}

/**
 * Get user-friendly error message from RPC error
 * 
 * @param error - Error from RPC call
 * @param rpcName - Name of the RPC function
 * @returns User-friendly error message
 */
export function getRpcErrorMessage(error: unknown, rpcName: string): string {
  return handleRpcError(error, rpcName).message
}
