/**
 * Feature Flag Hardcoded Fallbacks
 * 
 * Hardcoded fallback values used when flag resolution returns null
 * (flag doesn't exist or resolution failed).
 * 
 * These values are used as a safety net to ensure the application
 * continues working even if the feature flag system is unavailable.
 */

import type { FeatureFlagValueType } from '../types/featureFlags.types'

/**
 * Fallback flag values
 * 
 * Add fallback values for each feature flag here.
 * TypeScript ensures type safety (boolean, integer, double).
 */
export const FALLBACK_FLAGS: Record<string, boolean | number> = {
  // Boolean flags
  payments_enabled: false,
  tryouts_enabled: false,
  travel_enabled: false,
  uniforms_enabled: false,
  messaging_enabled: false,
  orgadmin_advanced_personal_settings: false,
  org_advanced_settings: false,
  org_settings_attendance: false,

  // Integer flags
  // Example: max_team_size: 20,
  
  // Double flags
  // Example: payment_fee_percentage: 2.5,
}

/**
 * Get fallback value for a flag key
 * 
 * @param key - Feature flag key
 * @param valueType - Expected value type
 * @returns Fallback value or undefined if not found
 */
export function getFallbackValue(
  key: string,
  valueType: FeatureFlagValueType
): boolean | number | undefined {
  const fallback = FALLBACK_FLAGS[key]
  
  if (fallback === undefined) {
    return undefined
  }
  
  // Type check: ensure fallback matches expected type
  if (valueType === 'boolean' && typeof fallback === 'boolean') {
    return fallback
  }
  
  if (valueType === 'integer' && typeof fallback === 'number' && Number.isInteger(fallback)) {
    return fallback
  }
  
  if (valueType === 'double' && typeof fallback === 'number') {
    return fallback
  }
  
  // Type mismatch - return undefined
  console.warn(`Fallback type mismatch for flag "${key}": expected ${valueType}, got ${typeof fallback}`)
  return undefined
}

/**
 * Check if a fallback exists for a flag key
 */
export function hasFallback(key: string): boolean {
  return key in FALLBACK_FLAGS
}
