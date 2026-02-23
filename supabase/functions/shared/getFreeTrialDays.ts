/**
 * Get Free Trial Days Utility
 * 
 * Server-side utility to read and validate the free_trial_days feature flag.
 * This is the authoritative source for trial length - UI should not trust its own flag reads.
 * 
 * Policy:
 * - Reads feature flag 'free_trial_days' via RPC
 * - Validates: must be integer, min 0, max 60 days
 * - Returns 0 if flag missing, invalid, or RPC call fails (fail-safe behavior)
 * 
 * @param supabase - Supabase client instance (service role)
 * @param orgId - Organization ID
 * @param userId - Optional user ID for feature flag resolution
 * @returns Number of trial days (0 if not eligible or flag missing/invalid)
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const FEATURE_FLAG_KEY = "free_trial_days"
const MIN_TRIAL_DAYS = 0
const MAX_TRIAL_DAYS = 60 // Safety limit to prevent accidental long trials

export async function getFreeTrialDaysForOrgSignup(
  supabase: SupabaseClient,
  orgId: string,
  userId?: string
): Promise<number> {
  // Validate inputs
  if (!orgId || typeof orgId !== "string") {
    console.error("[getFreeTrialDays] Invalid orgId:", orgId)
    return 0
  }

  try {
    // Call feature flag resolution RPC
    const { data, error } = await supabase.rpc("resolve_feature_flag", {
      p_feature_key: FEATURE_FLAG_KEY,
      p_org_id: orgId,
      p_user_id: userId ?? undefined,
      p_environment: undefined, // Let RPC auto-detect environment
    })

    // If RPC call failed, return 0 (fail-safe)
    if (error) {
      console.error(`[getFreeTrialDays] RPC error for org ${orgId}:`, error.message)
      return 0
    }

    // If flag not found, return 0 (no trial)
    if (!data) {
      console.warn(`[getFreeTrialDays] Feature flag '${FEATURE_FLAG_KEY}' not found for org ${orgId}`)
      return 0
    }

    // Validate value type
    const valueType = (data as any)?.value_type
    if (valueType !== "integer") {
      console.error(
        `[getFreeTrialDays] Invalid value type for '${FEATURE_FLAG_KEY}': expected 'integer', got '${valueType}'`
      )
      return 0
    }

    // Extract and validate integer value
    const days = (data as any)?.value as number | undefined
    if (typeof days !== "number" || !Number.isInteger(days)) {
      console.error(`[getFreeTrialDays] Invalid value for '${FEATURE_FLAG_KEY}': not an integer`, days)
      return 0
    }

    // Validate range: min 0, max 60
    if (days < MIN_TRIAL_DAYS) {
      console.warn(
        `[getFreeTrialDays] Value ${days} below minimum ${MIN_TRIAL_DAYS}, clamping to ${MIN_TRIAL_DAYS}`
      )
      return MIN_TRIAL_DAYS
    }

    if (days > MAX_TRIAL_DAYS) {
      console.warn(
        `[getFreeTrialDays] Value ${days} above maximum ${MAX_TRIAL_DAYS}, clamping to ${MAX_TRIAL_DAYS}`
      )
      return MAX_TRIAL_DAYS
    }

    return days
  } catch (err) {
    // Catch any unexpected errors (network, parsing, etc.)
    console.error(`[getFreeTrialDays] Unexpected error for org ${orgId}:`, err)
    return 0 // Fail-safe: return 0 on any error
  }
}
