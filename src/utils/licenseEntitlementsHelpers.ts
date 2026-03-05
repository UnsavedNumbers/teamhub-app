/**
 * License Entitlements Helper Functions
 * 
 * Utilities for handling common operations with proper error handling,
 * transaction management, and audit logging.
 */

import { supabase } from '../lib/supabase'
import type { SupabaseExtended as Database } from '../lib/supabase.extended.types'
import type { LicenseTier } from '../types/licenseTiers.types'

const db = supabase as any

/**
 * Get current authenticated user for audit logging
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('User not authenticated')
  }
  return user
}

/**
 * Log audit event with automatic actor information
 */
export async function logAuditEvent(params: {
  action: string
  targetType: 'tier' | 'feature' | 'override' | null
  targetId: string | null
  beforeState?: Record<string, unknown> | null
  afterState?: Record<string, unknown> | null
  reason?: string | null
}) {
  try {
    const user = await getCurrentUser()

    type AuditInsert = Record<string, unknown>
    const insertData = {
      actor_id: user.id,
      actor_email: user.email || null,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      before_state: params.beforeState ? JSON.stringify(params.beforeState) : null,
      after_state: params.afterState ? JSON.stringify(params.afterState) : null,
      reason: params.reason || null,
    } as AuditInsert
    const { error } = await db.from('entitlement_audit_log').insert(insertData)

    if (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging failure shouldn't break the operation
    }
  } catch (err) {
    console.error('Error getting user for audit log:', err)
    // Continue silently - audit is best effort
  }
}

/**
 * Save tier with optimistic locking and transaction
 * Returns true if successful, false if version conflict
 */
export async function saveTierWithLock(
  tierId: string,
  updates: Partial<LicenseTier>,
  expectedVersion: number
): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
  try {
    // Use RPC function for transaction with locking
    // Note: This requires a database function to be created
    // For now, we'll do a simple version check

    const { data: currentTier, error: fetchError } = await supabase
      .from('license_tiers')
      .select('version')
      .eq('id', tierId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    if ((currentTier as any).version !== expectedVersion) {
      return { success: false, conflict: true }
    }

    type LicenseTierUpdate = Database['public']['Tables']['license_tiers']['Update']
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    } as LicenseTierUpdate
    const { error: updateError } = await supabase
      .from('license_tiers')
      .update(updateData)
      .eq('id', tierId)
      .eq('version', expectedVersion)

    if (updateError) {
      // Check if it's a version conflict (0 rows affected)
      if (updateError.code === 'PGRST116' || updateError.message?.includes('0 rows')) {
        return { success: false, conflict: true }
      }
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' }
  }
}

/**
 * Validate feature dependencies before creating override
 */
export async function validateFeatureDependencies(
  targetId: string,
  targetType: 'organization' | 'user',
  featureId: string,
  overrideAction: 'enable' | 'disable' | 'set_limit'
): Promise<{ valid: boolean; missingDependencies?: string[] }> {
  if (overrideAction !== 'enable') {
    return { valid: true }
  }

  try {
    // Check for required dependencies
    const { data: dependencies, error } = await db
      .from('feature_dependencies')
      .select(`
        depends_on_feature_id,
        feature_entitlements!feature_dependencies_depends_on_feature_id_fkey(display_name)
      `)
      .eq('feature_id', featureId)
      .eq('required', true)

    if (error) {
      console.error('Error checking dependencies:', error)
      return { valid: true } // Fail open - don't block if we can't check
    }

    if (!dependencies || dependencies.length === 0) {
      return { valid: true }
    }

    // Check if dependencies are enabled for the target
    const missing: string[] = []

    for (const dep of dependencies) {
      const depFeatureId = (dep as any).depends_on_feature_id
      const depName = ((dep as any).feature_entitlements as any)?.display_name || 'Unknown'

      // Check if enabled via tier (using current_tier_id; column may exist before types are regenerated)
      if (targetType === 'organization') {
        const { data: org } = await (supabase as any)
          .from('organizations')
          .select('current_tier_id')
          .eq('id', targetId)
          .single() as { data: { current_tier_id?: string | null } | null }

        if (org?.current_tier_id) {
          const { data: assignment } = await supabase
            .from('tier_feature_assignments')
            .select('included')
            .eq('license_tier_id', org.current_tier_id)
            .eq('feature_entitlement_id', depFeatureId)
            .eq('included', true)
            .single()

          if (assignment) {
            continue // Dependency is enabled via tier
          }
        }
      }

      // Check if enabled via override
      const { data: override } = await supabase
        .from('entitlement_overrides')
        .select('id')
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('feature_entitlement_id', depFeatureId)
        .eq('override_action', 'enable')
        .is('revoked_at', null)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .single()

      if (!override) {
        missing.push(depName)
      }
    }

    return {
      valid: missing.length === 0,
      missingDependencies: missing.length > 0 ? missing : undefined,
    }
  } catch (err) {
    console.error('Error validating dependencies:', err)
    return { valid: true } // Fail open
  }
}

/**
 * Check if Stripe Price ID verification is still valid (within 24 hours)
 */
export function isStripeVerificationValid(verifiedAt: string | null): boolean {
  if (!verifiedAt) return false

  const verified = new Date(verifiedAt)
  const now = new Date()
  const hoursSinceVerification = (now.getTime() - verified.getTime()) / (1000 * 60 * 60)

  return hoursSinceVerification < 24
}

/**
 * Get archived features count for a tier
 */
export async function getArchivedFeaturesCount(tierId: string): Promise<number> {
  try {
    // First, get all assignments for this tier
    const { data: assignments, error: assignmentsError } = await supabase
      .from('tier_feature_assignments')
      .select('feature_entitlement_id')
      .eq('license_tier_id', tierId)
      .eq('included', true)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return 0
    }

    if (!assignments || assignments.length === 0) {
      return 0
    }

    // Get all non-archived feature IDs
    const { data: activeFeatures, error: featuresError } = await supabase
      .from('feature_entitlements')
      .select('id')
      .is('archived_at', null)

    if (featuresError) {
      console.error('Error fetching features:', featuresError)
      return 0
    }

    // Count assignments that reference archived features
    const activeFeatureIds = new Set((activeFeatures || []).map(f => f.id))
    const archivedCount = (assignments || []).filter(
      assignment => !activeFeatureIds.has(assignment.feature_entitlement_id)
    ).length

    return archivedCount
  } catch (err) {
    console.error('Error getting archived features count:', err)
    return 0
  }
}
