/**
 * Registration Status Utility
 * 
 * Computes registration availability status based on registration dates.
 * Status values: opens_soon, accepting, closed
 */

export type RegistrationStatus = 'opens_soon' | 'accepting' | 'closed'

export function getRegistrationStatus(program: {
  registration_start_date?: string | null
  registration_end_date?: string | null
}): RegistrationStatus {
  // If no start date, default to accepting (backward compatible)
  if (!program.registration_start_date) {
    return 'accepting'
  }
  
  try {
    const now = new Date()
    const start = new Date(program.registration_start_date)
    
    // Validate date parsing
    if (isNaN(start.getTime())) {
      return 'accepting'
    }
    
    const end = program.registration_end_date ? new Date(program.registration_end_date) : null
    
    // If end date exists and is invalid, treat as accepting
    if (end && isNaN(end.getTime())) {
      return 'accepting'
    }
    
    // If we're before the start date, registration opens soon
    if (now < start) {
      return 'opens_soon'
    }
    
    // If end date exists and we're past it, registration is closed
    if (end && now > end) {
      return 'closed'
    }
    
    // Otherwise, registration is accepting
    return 'accepting'
  } catch (error) {
    // Fallback to accepting on any error
    console.warn('[getRegistrationStatus] Error computing status:', error)
    return 'accepting'
  }
}
