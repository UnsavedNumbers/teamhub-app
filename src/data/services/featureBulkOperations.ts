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
  if (featureIds.length === 0) {
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
  if (featureIds.length === 0) {
    return { success: false, error: 'No features selected' }
  }

  const CHUNK_SIZE = 100
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
  onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  if (featureIds.length === 0) {
    return { success: false, error: 'No features selected' }
  }

  if (tierIds.length === 0) {
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
 * Bulk update role visibility
 */
export async function bulkUpdateRoleVisibility(
  featureIds: string[],
  roleType: 'admin' | 'coach' | 'parent',
  visible: boolean,
  onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  if (featureIds.length === 0) {
    return { success: false, error: 'No features selected' }
  }

  const CHUNK_SIZE = 100
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
