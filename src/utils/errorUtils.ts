export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err

  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/**
 * Normalize Supabase errors to user-friendly messages (Technical Bug #9)
 * Handles PostgrestError, AuthError, and other Supabase error types
 */
export function normalizeSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'object' && error !== null) {
    // Handle Supabase PostgrestError
    if ('message' in error) {
      return String(error.message)
    }
    
    // Handle Supabase error with code
    if ('code' in error && 'message' in error) {
      return String(error.message)
    }
  }
  
  return 'An unexpected error occurred'
}

/**
 * Error type classification for better UX
 */
export type ErrorType = 'network' | 'permission' | 'not_found' | 'validation' | 'unknown'

/**
 * Check if an error is a "not found" (404) error
 * Handles various Supabase error codes and message patterns
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; message?: string }
  return !!(
    err.code === 'PGRST116' ||
    err.message?.toLowerCase().includes('not found') ||
    err.message?.toLowerCase().includes('no rows') ||
    err.message?.includes('404')
  )
}

/**
 * Classify error type for appropriate handling and UX
 */
export function classifyError(error: unknown): ErrorType {
  if (!error || typeof error !== 'object') return 'unknown'
  const err = error as { code?: string; message?: string }
  
  // Permission errors
  if (err.code === 'PGRST301' || err.message?.includes('permission') || err.message?.includes('RLS')) {
    return 'permission'
  }
  
  // Not found errors
  if (isNotFoundError(error)) return 'not_found'
  
  // Network errors
  if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
    return 'network'
  }
  
  // Validation errors
  if (err.message?.includes('constraint') || err.message?.includes('validation')) {
    return 'validation'
  }
  
  return 'unknown'
}
