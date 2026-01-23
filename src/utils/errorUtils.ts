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
