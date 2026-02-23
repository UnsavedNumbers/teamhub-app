/**
 * Program Status Utility
 * 
 * Computes program lifecycle status based on activity dates.
 * Status values: unpublished, upcoming, live, completed
 */

export type ProgramStatus = 'unpublished' | 'upcoming' | 'live' | 'completed'

export function getProgramStatus(program: {
  activity_start_date?: string | null
  activity_end_date?: string | null
}): ProgramStatus {
  // If no start date, program is unpublished
  if (!program.activity_start_date) {
    return 'unpublished'
  }
  
  try {
    const now = new Date()
    const start = new Date(program.activity_start_date)
    
    // Validate date parsing
    if (isNaN(start.getTime())) {
      return 'unpublished'
    }
    
    const end = program.activity_end_date ? new Date(program.activity_end_date) : null
    
    // If end date exists and is invalid, treat as unpublished
    if (end && isNaN(end.getTime())) {
      return 'unpublished'
    }
    
    // If end date exists and we're past it, program is completed
    if (end && now > end) {
      return 'completed'
    }
    
    // If we're before the start date, program is upcoming
    if (now < start) {
      return 'upcoming'
    }
    
    // Otherwise, program is live
    return 'live'
  } catch (error) {
    // Fallback to unpublished on any error
    console.warn('[getProgramStatus] Error computing status:', error)
    return 'unpublished'
  }
}
