/**
 * Bulk Operations Service for Feature Entitlements
 * 
 * Provides type-safe functions for bulk operations on features:
 * - Update status
 * - Update category
 * - Apply to license tiers
 * - Update role visibility
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { FeatureCategory } from '../../types/licenseTiers.types'

// Type definitions
export type UIFeatureStatus = 'Live' | 'Disabled' | 'Draft' | 'Deprecated' | 'Review'
export type DBFeatureStatus = 'live' | 'beta' | 'hidden'

export interface BulkOperationResult {
  success: boolean
  updated?: number
  processed?: number
  error?: string
  code?: string
  message?: string
  failedChunk?: number
  locked_features?: Array<{ feature_key: string; display_name: string; lock_reason: string | null }>
}

/**
 * Map UI status values to database status values
 */
function mapUIStatusToDB(status: UIFeatureStatus): DBFeatureStatus {
  switch (status) {
    case 'Live':
      return 'live'
    case 'Disabled':
    case 'Deprecated':
      return 'hidden'
    case 'Draft':
    case 'Review':
      return 'beta'
    default:
      // Exhaustive check - TypeScript error if case missing
      const _exhaustive: never = status
      throw new Error(`Unknown status: ${_exhaustive}`)
  }
}

/**
 * Chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Bulk update feature status
 */
export async function bulkUpdateStatus(
  featureIds: string[],
  status: UIFeatureStatus,
  onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  console.groupCollapsed(`%cbulkUpdateStatus: ${featureIds.length} features - ${status}`, 'color: #666; font-weight: bold;');
  debug.flow('FeatureBulkOperationsService.bulkUpdateStatus', 'Bulk updating status', { featureCount: featureIds.length, status })
  debug.perf.start('featureBulkOperationsService.bulkUpdateStatus')

  if (featureIds.length === 0) {
    debug.perf.end('featureBulkOperationsService.bulkUpdateStatus')
    debug.error('FeatureBulkOperationsService.bulkUpdateStatus', 'No features selected', { status })
    console.groupEnd()
    return { success: false, error: 'No features selected' }
  }

  const CHUNK_SIZE = 100
  const chunks = chunkArray(featureIds, CHUNK_SIZE)
  let totalUpdated = 0
  let failedChunk = -1
  let error: Error | null = null

  // Map UI status to DB status
  const dbStatus = mapUIStatusToDB(status)

  try {
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(i * CHUNK_SIZE, featureIds.length)

      const { data, error: rpcError } = await supabase.rpc('bulk_update_feature_status', {
        p_feature_ids: chunks[i],
        p_new_status: dbStatus,
      })

      if (rpcError) {
        failedChunk = i
        error = new Error(rpcError.message)
        throw error
      }

      if (data && typeof data === 'object' && 'updated' in data) {
        const result = data as { success: boolean; updated: number; error?: string }
        if (!result.success) {
          failedChunk = i
          error = new Error(result.error || 'Update failed')
          throw error
        }
        totalUpdated += result.updated || 0
      }
    }

    return { success: true, updated: totalUpdated }
  } catch (err) {
    return {
      success: false,
      updated: totalUpdated,
      error: err instanceof Error ? err.message : 'Unknown error',
      failedChunk,
      message: `Failed at chunk ${failedChunk + 1} of ${chunks.length}. ${totalUpdated} features updated before failure.`,
    }
  }
}

/**
 * Bulk update feature category
 */
export async function bulkUpdateCategory(
  featureIds: string[],
  category: FeatureCategory,
  onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  console.groupCollapsed(`%cbulkUpdateCategory: ${featureIds.length} features - ${category}`, 'color: #666; font-weight: bold;');
  debug.flow('FeatureBulkOperationsService.bulkUpdateCategory', 'Bulk updating category', { featureCount: featureIds.length, category })
  debug.perf.start('featureBulkOperationsService.bulkUpdateCategory')

  if (featureIds.length === 0) {
    debug.perf.end('featureBulkOperationsService.bulkUpdateCategory')
    debug.error('FeatureBulkOperationsService.bulkUpdateCategory', 'No features selected', { category })
    console.groupEnd()
    return { success: false, error: 'No features selected' }
  }

  const CHUNK_SIZE = 50 // Limit bulk operations to 50 features per operation
  const chunks = chunkArray(featureIds, CHUNK_SIZE)
  let totalUpdated = 0
  let failedChunk = -1
  let error: Error | null = null

  try {
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(i * CHUNK_SIZE, featureIds.length)

      const { data, error: rpcError } = await supabase.rpc('bulk_update_feature_category', {
        p_feature_ids: chunks[i],
        p_new_category: category,
      })

      if (rpcError) {
        failedChunk = i
        error = new Error(rpcError.message)
        throw error
      }

      if (data && typeof data === 'object') {
        const result = data as { 
          success: boolean
          updated?: number
          error?: string
          code?: string
          locked_features?: Array<{ feature_key: string; display_name: string; lock_reason: string | null }>
        }
        if (!result.success) {
          failedChunk = i
          if (result.code === 'FEATURE_LOCKED') {
            return {
              success: false,
              error: result.error || 'One or more features are locked',
              code: 'FEATURE_LOCKED',
              locked_features: result.locked_features || [],
              message: result.error || 'Cannot modify locked features'
            }
          }
          error = new Error(result.error || 'Update failed')
          throw error
        }
        totalUpdated += result.updated || 0
      }
    }

    return { success: true, updated: totalUpdated }
  } catch (err) {
    return {
      success: false,
      updated: totalUpdated,
      error: err instanceof Error ? err.message : 'Unknown error',
      failedChunk,
      message: `Failed at chunk ${failedChunk + 1} of ${chunks.length}. ${totalUpdated} features updated before failure.`,
    }
  }
}

/**
 * Bulk apply features to license tiers
 */
export async function bulkApplyToTiers(
  featureIds: string[],
  tierIds: string[],
  action: 'add' | 'remove',
  roleVisibility: { admin: boolean; coach: boolean; parent: boolean },
  _onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  console.groupCollapsed(`%cbulkApplyToTiers: ${featureIds.length} features - ${tierIds.length} tiers - ${action}`, 'color: #666; font-weight: bold;');
  debug.flow('FeatureBulkOperationsService.bulkApplyToTiers', 'Bulk applying to tiers', { featureCount: featureIds.length, tierCount: tierIds.length, action, roleVisibility })
  debug.perf.start('featureBulkOperationsService.bulkApplyToTiers')

  if (featureIds.length === 0) {
    debug.perf.end('featureBulkOperationsService.bulkApplyToTiers')
    debug.error('FeatureBulkOperationsService.bulkApplyToTiers', 'No features selected', { tierCount: tierIds.length, action })
    console.groupEnd()
    return { success: false, error: 'No features selected' }
  }

  if (tierIds.length === 0) {
    debug.perf.end('featureBulkOperationsService.bulkApplyToTiers')
    debug.error('FeatureBulkOperationsService.bulkApplyToTiers', 'No tiers selected', { featureCount: featureIds.length, action })
    console.groupEnd()
    return { success: false, error: 'No tiers selected' }
  }

  // Process all at once (not chunked, as RPC handles it)
  const { data, error: rpcError } = await supabase.rpc('bulk_apply_to_tiers', {
    p_feature_ids: featureIds,
    p_tier_ids: tierIds,
    p_action: action,
    p_role_admin: roleVisibility.admin,
    p_role_coach: roleVisibility.coach,
    p_role_parent: roleVisibility.parent,
  })

  if (rpcError) {
    return {
      success: false,
      error: rpcError.message,
      code: rpcError.code,
    }
  }

  if (data && typeof data === 'object') {
    const result = data as { 
      success: boolean
      processed?: number
      error?: string
      code?: string
      locked_features?: Array<{ feature_key: string; display_name: string; lock_reason: string | null }>
    }
    if (!result.success) {
      if (result.code === 'FEATURE_LOCKED') {
        return {
          success: false,
          error: result.error || 'One or more features are locked',
          code: 'FEATURE_LOCKED',
          locked_features: result.locked_features || [],
          message: result.error || 'Cannot modify locked features'
        }
      }
      return {
        success: false,
        error: result.error || 'Operation failed',
        code: result.code,
      }
    }
    return {
      success: true,
      processed: result.processed || 0,
    }
  }

  return { success: false, error: 'Unexpected response format' }
}

/**
 * Bulk set features as System Feature
 * - Sets is_system_feature = true, rollout_status = 'live'
 * - Removes all tier assignments (system features are auto-available)
 * - Role visibility is irrelevant for system features
 */
export async function bulkSetSystemFeature(
  featureIds: string[],
  _onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  console.groupCollapsed(`%cbulkSetSystemFeature: ${featureIds.length} features`, 'color: #666; font-weight: bold;');
  debug.flow('FeatureBulkOperationsService.bulkSetSystemFeature', 'Bulk setting system feature', { featureCount: featureIds.length })
  debug.perf.start('featureBulkOperationsService.bulkSetSystemFeature')

  if (featureIds.length === 0) {
    debug.perf.end('featureBulkOperationsService.bulkSetSystemFeature')
    debug.error('FeatureBulkOperationsService.bulkSetSystemFeature', 'No features selected')
    console.groupEnd()
    return { success: false, error: 'No features selected' }
  }

  try {
    // 1. Update feature_entitlements flags
    const { error: updateError } = await supabase
      .from('feature_entitlements')
      .update({
        is_system_feature: true,
        platform_admin_only: false,
        rollout_status: 'live',
      })
      .in('id', featureIds)
      .eq('is_toggleable', true) // Skip locked features

    if (updateError) throw updateError

    // 2. Remove all tier assignments for these features
    const { error: deleteError } = await supabase
      .from('tier_feature_assignments')
      .delete()
      .in('feature_entitlement_id', featureIds)

    if (deleteError) throw deleteError

    return { success: true, updated: featureIds.length }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Bulk set features as Platform Admin Only
 * - Sets platform_admin_only = true, rollout_status = 'live'
 * - Removes all tier assignments (not available to orgs)
 * - Role visibility is irrelevant for platform-only features
 */
export async function bulkSetPlatformOnly(
  featureIds: string[],
  _onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  console.groupCollapsed(`%cbulkSetPlatformOnly: ${featureIds.length} features`, 'color: #666; font-weight: bold;');
  debug.flow('FeatureBulkOperationsService.bulkSetPlatformOnly', 'Bulk setting platform only', { featureCount: featureIds.length })
  debug.perf.start('featureBulkOperationsService.bulkSetPlatformOnly')

  if (featureIds.length === 0) {
    debug.perf.end('featureBulkOperationsService.bulkSetPlatformOnly')
    debug.error('FeatureBulkOperationsService.bulkSetPlatformOnly', 'No features selected')
    console.groupEnd()
    return { success: false, error: 'No features selected' }
  }

  try {
    // 1. Update feature_entitlements flags
    const { error: updateError } = await supabase
      .from('feature_entitlements')
      .update({
        platform_admin_only: true,
        is_system_feature: false,
        rollout_status: 'live',
      })
      .in('id', featureIds)
      .eq('is_toggleable', true) // Skip locked features

    if (updateError) throw updateError

    // 2. Remove all tier assignments for these features
    const { error: deleteError } = await supabase
      .from('tier_feature_assignments')
      .delete()
      .in('feature_entitlement_id', featureIds)

    if (deleteError) throw deleteError

    return { success: true, updated: featureIds.length }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Bulk update role visibility
 */
export async function bulkUpdateRoleVisibility(
  featureIds: string[],
  roleType: 'admin' | 'coach' | 'parent',
  visible: boolean,
  onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  console.groupCollapsed(`%cbulkUpdateRoleVisibility: ${featureIds.length} features - ${roleType} - ${visible}`, 'color: #666; font-weight: bold;');
  debug.flow('FeatureBulkOperationsService.bulkUpdateRoleVisibility', 'Bulk updating role visibility', { featureCount: featureIds.length, roleType, visible })
  debug.perf.start('featureBulkOperationsService.bulkUpdateRoleVisibility')

  if (featureIds.length === 0) {
    debug.perf.end('featureBulkOperationsService.bulkUpdateRoleVisibility')
    debug.error('FeatureBulkOperationsService.bulkUpdateRoleVisibility', 'No features selected', { roleType, visible })
    console.groupEnd()
    return { success: false, error: 'No features selected' }
  }

  const CHUNK_SIZE = 50 // Limit bulk operations to 50 features per operation
  const chunks = chunkArray(featureIds, CHUNK_SIZE)
  let totalUpdated = 0
  let failedChunk = -1
  let error: Error | null = null

  try {
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(i * CHUNK_SIZE, featureIds.length)

      const { data, error: rpcError } = await supabase.rpc('bulk_update_role_visibility', {
        p_feature_ids: chunks[i],
        p_role_type: roleType,
        p_visible: visible,
      })

      if (rpcError) {
        failedChunk = i
        error = new Error(rpcError.message)
        throw error
      }

      if (data && typeof data === 'object') {
        const result = data as { 
          success: boolean
          updated?: number
          error?: string
          code?: string
          locked_features?: Array<{ feature_key: string; display_name: string; lock_reason: string | null }>
        }
        if (!result.success) {
          failedChunk = i
          if (result.code === 'FEATURE_LOCKED') {
            return {
              success: false,
              error: result.error || 'One or more features are locked',
              code: 'FEATURE_LOCKED',
              locked_features: result.locked_features || [],
              message: result.error || 'Cannot modify locked features'
            }
          }
          error = new Error(result.error || 'Update failed')
          throw error
        }
        totalUpdated += result.updated || 0
      }
    }

    return { success: true, updated: totalUpdated }
  } catch (err) {
    return {
      success: false,
      updated: totalUpdated,
      error: err instanceof Error ? err.message : 'Unknown error',
      failedChunk,
      message: `Failed at chunk ${failedChunk + 1} of ${chunks.length}. ${totalUpdated} features updated before failure.`,
    }
  }
}
