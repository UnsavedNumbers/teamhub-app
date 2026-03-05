/**
 * Tier Limits Service
 *
 * Utility service for querying tier-based limits (max_teams, max_athletes, etc.)
 * Uses the feature gate system to get limit_value from tier_feature_assignments.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'

// Limit feature keys
export type LimitFeatureKey =
  | 'max_teams'
  | 'max_athletes'
  | 'max_players_per_team'
  | 'photo_storage_gb'
  | 'max_sub_orgs'

export interface TierLimitResult {
  limit: number | null // null means unlimited
  error: Error | null
}

/**
 * Get a tier limit for an organization
 * @param orgId - Organization ID
 * @param userId - User ID (for feature gate context)
 * @param featureKey - Limit feature key (e.g., 'max_teams', 'max_athletes')
 * @returns Limit value (null = unlimited) or error
 */
export async function getTierLimit(
  orgId: string,
  userId: string,
  featureKey: LimitFeatureKey
): Promise<TierLimitResult> {
  console.groupCollapsed(`%cgetTierLimit: ${featureKey}`, 'color: #666; font-weight: bold;')
  debug.data('TierLimitsService.getTierLimit', 'Request', { orgId, userId, featureKey })
  debug.perf.start('tierLimitsService.getTierLimit')

  if (USE_FAKE_DATA) {
    // Return fake unlimited limits for demo
    debug.perf.end('tierLimitsService.getTierLimit')
    debug.data('TierLimitsService.getTierLimit', 'Response (fake)', { limit: null })
    console.groupEnd()
    return { limit: null, error: null }
  }

  try {
    if (!orgId || !userId) {
      return {
        limit: null,
        error: new Error('Organization ID and User ID are required'),
      }
    }

    // Use get_feature_gate RPC which returns limit_value in the result
    const { data, error } = await supabase.rpc('get_feature_gate', {
      p_org_id: orgId,
      p_user_id: userId,
      p_feature_key: featureKey,
    })

    if (error) {
      debug.perf.end('tierLimitsService.getTierLimit')
      debug.error('TierLimitsService.getTierLimit', 'RPC error', { error, orgId, featureKey })
      console.groupEnd()
      return {
        limit: null,
        error: error,
      }
    }

    const result = data as {
      allowed: boolean
      limit_value?: number | null
      reason_code: string
    }

    // Extract limit_value (null means unlimited)
    const limit = result.limit_value ?? null

    debug.perf.end('tierLimitsService.getTierLimit')
    debug.data('TierLimitsService.getTierLimit', 'Response', { limit, featureKey })
    console.groupEnd()

    return {
      limit,
      error: null,
    }
  } catch (err) {
    debug.perf.end('tierLimitsService.getTierLimit')
    debug.error('TierLimitsService.getTierLimit', 'Exception', { error: err, orgId, featureKey })
    console.groupEnd()
    return {
      limit: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get multiple tier limits in a single call
 * @param orgId - Organization ID
 * @param userId - User ID (for feature gate context)
 * @param featureKeys - Array of limit feature keys
 * @returns Map of feature key to limit value
 */
export async function getTierLimits(
  orgId: string,
  userId: string,
  featureKeys: LimitFeatureKey[]
): Promise<Record<LimitFeatureKey, number | null>> {
  console.groupCollapsed(`%cgetTierLimits: ${featureKeys.length} limits`, 'color: #666; font-weight: bold;')
  debug.data('TierLimitsService.getTierLimits', 'Request', { orgId, userId, featureKeys })
  debug.perf.start('tierLimitsService.getTierLimits')

  if (USE_FAKE_DATA) {
    // Return fake unlimited limits for demo
    const result: Record<LimitFeatureKey, number | null> = {} as Record<LimitFeatureKey, number | null>
    for (const key of featureKeys) {
      result[key] = null
    }
    debug.perf.end('tierLimitsService.getTierLimits')
    debug.data('TierLimitsService.getTierLimits', 'Response (fake)', result)
    console.groupEnd()
    return result
  }

  try {
    if (!orgId || !userId || featureKeys.length === 0) {
      return {} as Record<LimitFeatureKey, number | null>
    }

    // Use get_feature_gates batch RPC
    const { data, error } = await supabase.rpc('get_feature_gates', {
      p_org_id: orgId,
      p_user_id: userId,
      p_feature_keys: featureKeys,
    })

    if (error) {
      debug.perf.end('tierLimitsService.getTierLimits')
      debug.error('TierLimitsService.getTierLimits', 'RPC error', { error, orgId, featureKeys })
      console.groupEnd()
      return {} as Record<LimitFeatureKey, number | null>
    }

    const results = data as Record<string, { limit_value?: number | null }>
    const limits: Record<LimitFeatureKey, number | null> = {} as Record<LimitFeatureKey, number | null>

    for (const key of featureKeys) {
      const result = results[key]
      limits[key] = result?.limit_value ?? null
    }

    debug.perf.end('tierLimitsService.getTierLimits')
    debug.data('TierLimitsService.getTierLimits', 'Response', limits)
    console.groupEnd()

    return limits
  } catch (err) {
    debug.perf.end('tierLimitsService.getTierLimits')
    debug.error('TierLimitsService.getTierLimits', 'Exception', { error: err, orgId, featureKeys })
    console.groupEnd()
    return {} as Record<LimitFeatureKey, number | null>
  }
}

/**
 * Check if a limit has been exceeded
 * @param currentCount - Current count/usage
 * @param limit - Limit value (null = unlimited)
 * @returns true if limit is exceeded
 */
export function isLimitExceeded(currentCount: number, limit: number | null): boolean {
  if (limit === null) {
    return false // Unlimited
  }
  return currentCount >= limit
}

/**
 * Get remaining capacity for a limit
 * @param currentCount - Current count/usage
 * @param limit - Limit value (null = unlimited)
 * @returns Remaining capacity (null = unlimited)
 */
export function getRemainingCapacity(currentCount: number, limit: number | null): number | null {
  if (limit === null) {
    return null // Unlimited
  }
  return Math.max(0, limit - currentCount)
}
