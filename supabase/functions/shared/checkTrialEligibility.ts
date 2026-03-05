/**
 * Check Trial Eligibility Utility
 * 
 * Server-side utility to check if an organization is eligible for a free trial.
 * 
 * Policy:
 * - Eligible if organizations.trial_used_at IS NULL (org has never used a trial)
 * - Not eligible if trial_used_at exists (org has used trial before)
 * - This enforces "one trial per org" policy server-side
 * 
 * @param supabase - Supabase client instance (service role)
 * @param orgId - Organization ID to check
 * @returns Object with eligible boolean and optional reason string
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

export interface TrialEligibilityResult {
  eligible: boolean
  reason?: string
}

export async function checkTrialEligibility(
  supabase: SupabaseClient,
  orgId: string
): Promise<TrialEligibilityResult> {
  // Validate input
  if (!orgId || typeof orgId !== "string") {
    return {
      eligible: false,
      reason: "Invalid organization ID",
    }
  }

  try {
    // Query organizations table for trial_used_at
    const { data, error } = await supabase
      .from("organizations")
      .select("trial_used_at")
      .eq("id", orgId)
      .maybeSingle()

    // If query failed, return not eligible with error reason
    if (error) {
      console.error(`[checkTrialEligibility] Database error for org ${orgId}:`, error.message)
      return {
        eligible: false,
        reason: `Database error: ${error.message}`,
      }
    }

    // If org not found, return not eligible
    if (!data) {
      return {
        eligible: false,
        reason: "Organization not found",
      }
    }

    // Eligible if trial_used_at is NULL (org has never used a trial)
    // Not eligible if trial_used_at exists (org has used trial before)
    if (data.trial_used_at === null || data.trial_used_at === undefined) {
      return {
        eligible: true,
      }
    } else {
      return {
        eligible: false,
        reason: "Organization has already used a free trial",
      }
    }
  } catch (err) {
    // Catch any unexpected errors
    console.error(`[checkTrialEligibility] Unexpected error for org ${orgId}:`, err)
    return {
      eligible: false,
      reason: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
