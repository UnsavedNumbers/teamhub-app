/**
 * Roster Validation Utilities
 * 
 * Utilities for validating team roster size constraints (min and max).
 * Ensures roster operations respect both minimum and maximum roster size limits.
 */

/**
 * Validation result for roster size checks
 */
export interface RosterValidationResult {
  isValid: boolean
  error?: string
  currentCount: number
  minSize?: number | null
  maxSize?: number | null
  effectiveMaxLimit?: number | null
}

/**
 * Validate roster limits for a team
 * 
 * Checks if the current roster count meets minimum requirements and
 * if adding players would exceed maximum limits.
 * 
 * @param currentCount - Current number of active players on the roster
 * @param minRosterSize - Minimum roster size (null means no minimum)
 * @param maxRosterSize - Maximum roster size (null means no maximum)
 * @param tierLimit - Tier-based limit (null means no tier limit)
 * @param playersToAdd - Number of players being added (default: 0, for checking current state)
 * @returns Validation result with error message if validation fails
 */
export function validateRosterLimits(
  currentCount: number,
  minRosterSize: number | null | undefined,
  maxRosterSize: number | null | undefined,
  tierLimit: number | null | undefined = null,
  playersToAdd: number = 0
): RosterValidationResult {
  // Normalize null/undefined to null
  const minSize = minRosterSize ?? null
  const maxSize = maxRosterSize ?? null
  const tierMax = tierLimit ?? null

  // Calculate effective maximum limit (lowest of tier limit and team max)
  const effectiveMaxLimit = tierMax !== null && maxSize !== null
    ? Math.min(tierMax, maxSize)
    : tierMax !== null
    ? tierMax
    : maxSize

  // Check minimum roster size requirement
  if (minSize !== null && minSize > 0) {
    // Allow if we're adding players that will bring us to or above minimum
    // But warn if current count is below minimum
    if (currentCount < minSize && playersToAdd === 0) {
      return {
        isValid: true, // Don't block operations, just warn
        currentCount,
        minSize,
        maxSize,
        effectiveMaxLimit,
        error: `Team roster is below minimum size (${currentCount}/${minSize} players).`,
      }
    }
  }

  // Check maximum roster size limit
  if (effectiveMaxLimit !== null && effectiveMaxLimit > 0) {
    const wouldExceed = currentCount + playersToAdd > effectiveMaxLimit
    
    if (wouldExceed) {
      const remaining = Math.max(0, effectiveMaxLimit - currentCount)
      const limitSource = tierMax !== null && maxSize !== null && tierMax < maxSize
        ? 'tier limit'
        : 'team roster size'
      
      return {
        isValid: false,
        currentCount,
        minSize,
        maxSize,
        effectiveMaxLimit,
        error: `Cannot add players: team would exceed ${limitSource} (${effectiveMaxLimit} players). ${remaining > 0 ? `Only ${remaining} more can be added.` : 'Team is full.'}`,
      }
    }
  }

  // Check that min doesn't exceed max when both are set
  if (minSize !== null && effectiveMaxLimit !== null && minSize > effectiveMaxLimit) {
    return {
      isValid: false,
      currentCount,
      minSize,
      maxSize,
      effectiveMaxLimit,
      error: `Invalid roster configuration: minimum size (${minSize}) cannot exceed maximum size (${effectiveMaxLimit}).`,
    }
  }

  return {
    isValid: true,
    currentCount,
    minSize,
    maxSize,
    effectiveMaxLimit,
  }
}

/**
 * Check if roster is below minimum size
 * 
 * @param currentCount - Current number of active players
 * @param minRosterSize - Minimum roster size (null means no minimum)
 * @returns True if roster is below minimum, false otherwise
 */
export function isBelowMinimumRosterSize(
  currentCount: number,
  minRosterSize: number | null | undefined
): boolean {
  const minSize = minRosterSize ?? null
  if (minSize === null || minSize <= 0) {
    return false
  }
  return currentCount < minSize
}

/**
 * Get remaining capacity before hitting maximum roster size
 * 
 * @param currentCount - Current number of active players
 * @param maxRosterSize - Maximum roster size (null means no maximum)
 * @param tierLimit - Tier-based limit (null means no tier limit)
 * @returns Number of players that can still be added, or null if no limit
 */
export function getRemainingRosterCapacity(
  currentCount: number,
  maxRosterSize: number | null | undefined,
  tierLimit: number | null | undefined = null
): number | null {
  const maxSize = maxRosterSize ?? null
  const tierMax = tierLimit ?? null

  const effectiveMaxLimit = tierMax !== null && maxSize !== null
    ? Math.min(tierMax, maxSize)
    : tierMax !== null
    ? tierMax
    : maxSize

  if (effectiveMaxLimit === null) {
    return null
  }

  return Math.max(0, effectiveMaxLimit - currentCount)
}
