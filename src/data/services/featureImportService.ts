/**
 * Feature Import Service
 * 
 * Handles importing features from JSON file for bulk updates.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { bulkUpdateStatus, bulkUpdateCategory, bulkApplyToTiers, bulkUpdateRoleVisibility, bulkSetSystemFeature, bulkSetPlatformOnly, bulkExcludeFromDiscovery } from './featureBulkOperations'
import type { FeatureCategory } from '../../types/licenseTiers.types'

export interface ImportFeature {
  feature_key: string
  display_name?: string
  category?: FeatureCategory
  feature_type?: 'module' | 'permission' | 'limit' | 'visibility' | 'integration'
  description?: string | null
  rollout_status?: 'Live' | 'Disabled' | 'Draft' | 'Deprecated' | 'Review'
  tier_keys?: string[]
  role_visibility?: {
    admin?: boolean
    coach?: boolean
    parent?: boolean
  }
  is_system_feature?: boolean
  platform_admin_only?: boolean
  parent_feature_key?: string | null
  excluded_from_discovery?: boolean
}

export interface ImportResult {
  success: boolean
  processed: number
  updated: number
  skipped: number
  errors: Array<{ feature_key: string; error: string }>
}

/**
 * Import features from JSON file
 */
export async function importFeaturesFromJSON(
  jsonData: { features: ImportFeature[] },
  onProgress?: (processed: number, total: number) => void
): Promise<ImportResult> {
  console.groupCollapsed(`%cimportFeaturesFromJSON: ${jsonData.features.length} features`, 'color: #666; font-weight: bold;')
  debug.flow('FeatureImportService.importFeaturesFromJSON', 'Importing features', { featureCount: jsonData.features.length })
  debug.perf.start('featureImportService.importFeaturesFromJSON')

  const result: ImportResult = {
    success: true,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  if (!jsonData.features || !Array.isArray(jsonData.features)) {
    const error = 'Invalid JSON format: features array is required'
    debug.error('FeatureImportService.importFeaturesFromJSON', error)
    console.groupEnd()
    return {
      success: false,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [{ feature_key: 'root', error }],
    }
  }

  // First, fetch all features to get their IDs
  const { data: allFeatures, error: fetchError } = await supabase
    .from('admin_feature_entitlements_list')
    .select('id, feature_key')
    .is('archived_at', null)

  if (fetchError) {
    const error = `Failed to fetch features: ${fetchError.message}`
    debug.error('FeatureImportService.importFeaturesFromJSON', error)
    console.groupEnd()
    return {
      success: false,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [{ feature_key: 'root', error }],
    }
  }

  const featureKeyToId = new Map<string, string>()
  allFeatures?.forEach(f => {
    if (f.feature_key && f.id) {
      featureKeyToId.set(f.feature_key, f.id)
    }
  })

  // Fetch available tiers
  const { data: tiers } = await supabase
    .from('license_tiers')
    .select('id, tier_key')
    .eq('status', 'active')

  const tierKeyToId = new Map<string, string>()
  tiers?.forEach(t => {
    tierKeyToId.set(t.tier_key, t.id)
  })

  // Process each feature
  for (let i = 0; i < jsonData.features.length; i++) {
    const importFeature = jsonData.features[i]
    onProgress?.(i + 1, jsonData.features.length)

    if (!importFeature.feature_key) {
      result.skipped++
      result.errors.push({
        feature_key: `feature[${i}]`,
        error: 'Missing feature_key',
      })
      continue
    }

    const featureId = featureKeyToId.get(importFeature.feature_key)
    if (!featureId) {
      result.skipped++
      result.errors.push({
        feature_key: importFeature.feature_key,
        error: 'Feature not found',
      })
      continue
    }

    try {
      // Update basic fields (category is handled separately via RPC)
      const updates: Record<string, any> = {}

      if (importFeature.display_name !== undefined) {
        updates.display_name = importFeature.display_name
      }
      if (importFeature.feature_type !== undefined) {
        updates.feature_type = importFeature.feature_type
      }
      if (importFeature.description !== undefined) {
        updates.description = importFeature.description
      }
      if (importFeature.parent_feature_key !== undefined) {
        // parent_feature_key should be stored as the feature_key string, not the ID
        updates.parent_feature_key = importFeature.parent_feature_key || null
      }

      // Apply basic updates if any
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('feature_entitlements')
          .update(updates)
          .eq('id', featureId)

        if (updateError) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `Update failed: ${updateError.message}`,
          })
          continue
        }
      }

      // Update status if provided
      if (importFeature.rollout_status !== undefined) {
        const statusResult = await bulkUpdateStatus([featureId], importFeature.rollout_status)
        if (!statusResult.success) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `Status update failed: ${statusResult.error}`,
          })
        }
      }

      // Update category if provided (separate from basic updates to use RPC)
      if (importFeature.category !== undefined) {
        const categoryResult = await bulkUpdateCategory([featureId], importFeature.category)
        if (!categoryResult.success) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `Category update failed: ${categoryResult.error}`,
          })
        }
      }

      // Handle system feature flag
      if (importFeature.is_system_feature === true) {
        const systemResult = await bulkSetSystemFeature([featureId])
        if (!systemResult.success) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `System feature update failed: ${systemResult.error}`,
          })
        }
      } else if (importFeature.is_system_feature === false) {
        // Unset system feature
        const { error: updateError } = await supabase
          .from('feature_entitlements')
          .update({ is_system_feature: false })
          .eq('id', featureId)

        if (updateError) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `System feature unset failed: ${updateError.message}`,
          })
        }
      }

      // Handle platform admin only flag
      if (importFeature.platform_admin_only === true) {
        const platformResult = await bulkSetPlatformOnly([featureId])
        if (!platformResult.success) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `Platform admin only update failed: ${platformResult.error}`,
          })
        }
      } else if (importFeature.platform_admin_only === false) {
        // Unset platform admin only
        const { error: updateError } = await supabase
          .from('feature_entitlements')
          .update({ platform_admin_only: false })
          .eq('id', featureId)

        if (updateError) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `Platform admin only unset failed: ${updateError.message}`,
          })
        }
      }

      // Handle tier assignments
      if (importFeature.tier_keys !== undefined) {
        if (importFeature.tier_keys.length === 0) {
          // Empty array means remove all tier assignments
          const { data: existingAssignments } = await supabase
            .from('tier_feature_assignments')
            .select('license_tier_id')
            .eq('feature_entitlement_id', featureId)

          if (existingAssignments && existingAssignments.length > 0) {
            const allTierIds = existingAssignments.map(a => a.license_tier_id)
            const removeResult = await bulkApplyToTiers(
              [featureId],
              allTierIds,
              'remove',
              {
                admin: true,
                coach: true,
                parent: false,
              }
            )

            if (!removeResult.success) {
              result.errors.push({
                feature_key: importFeature.feature_key,
                error: `Tier removal failed: ${removeResult.error}`,
              })
            }
          }
        } else {
          // Add tier assignments
          const tierIds = importFeature.tier_keys
            .map(key => tierKeyToId.get(key))
            .filter((id): id is string => !!id)

          if (tierIds.length > 0) {
            const roleVisibility = importFeature.role_visibility || {
              admin: true,
              coach: true,
              parent: false,
            }

            const tierResult = await bulkApplyToTiers(
              [featureId],
              tierIds,
              'add',
              {
                admin: roleVisibility.admin ?? true,
                coach: roleVisibility.coach ?? true,
                parent: roleVisibility.parent ?? false,
              }
            )

            if (!tierResult.success) {
              result.errors.push({
                feature_key: importFeature.feature_key,
                error: `Tier assignment failed: ${tierResult.error}`,
              })
            }
          } else {
            result.errors.push({
              feature_key: importFeature.feature_key,
              error: 'No valid tier keys found',
            })
          }
        }
      }

      // Handle role visibility (if tier_keys not provided, update visibility on existing assignments)
      if (importFeature.role_visibility && importFeature.tier_keys === undefined) {
        const roleVisibility = importFeature.role_visibility

        if (roleVisibility.admin !== undefined) {
          const adminResult = await bulkUpdateRoleVisibility([featureId], 'admin', roleVisibility.admin)
          if (!adminResult.success) {
            result.errors.push({
              feature_key: importFeature.feature_key,
              error: `Admin visibility update failed: ${adminResult.error}`,
            })
          }
        }

        if (roleVisibility.coach !== undefined) {
          const coachResult = await bulkUpdateRoleVisibility([featureId], 'coach', roleVisibility.coach)
          if (!coachResult.success) {
            result.errors.push({
              feature_key: importFeature.feature_key,
              error: `Coach visibility update failed: ${coachResult.error}`,
            })
          }
        }

        if (roleVisibility.parent !== undefined) {
          const parentResult = await bulkUpdateRoleVisibility([featureId], 'parent', roleVisibility.parent)
          if (!parentResult.success) {
            result.errors.push({
              feature_key: importFeature.feature_key,
              error: `Parent visibility update failed: ${parentResult.error}`,
            })
          }
        }
      }

      // Handle excluded_from_discovery (mark as "Not a feature")
      if (importFeature.excluded_from_discovery !== undefined) {
        const excludeResult = await bulkExcludeFromDiscovery([featureId], importFeature.excluded_from_discovery)
        if (!excludeResult.success) {
          result.errors.push({
            feature_key: importFeature.feature_key,
            error: `Exclude from discovery update failed: ${excludeResult.error}`,
          })
        }
      }

      result.updated++
    } catch (err: any) {
      result.errors.push({
        feature_key: importFeature.feature_key,
        error: err.message || 'Unknown error',
      })
    }

    result.processed++
  }

  result.success = result.errors.length === 0

  debug.perf.end('featureImportService.importFeaturesFromJSON')
  debug.flow('FeatureImportService.importFeaturesFromJSON', 'Import completed', result)
  console.groupEnd()

  return result
}
