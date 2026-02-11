/**
 * Feature Hierarchy Service
 * 
 * Service layer for managing parent-child feature relationships.
 * Provides helper functions for:
 * - Retrieving feature ancestry/descendants
 * - Validating parent assignments
 * - Querying affected children when modifying features
 * - Hierarchy visualization data
 */

import { supabase } from '../../lib/supabase';
import type { FeatureEntitlement } from '../../types/domain/License';

/**
 * Feature with hierarchy metadata
 */
export interface FeatureWithHierarchy extends FeatureEntitlement {
  depth: number; // Distance from root (0 = root-level feature)
  ancestorKeys: string[]; // Array of ancestor feature keys from immediate parent to root
  childrenKeys: string[]; // Array of immediate child feature keys
}

/**
 * Result from hierarchy tree query
 */
export interface FeatureHierarchyTree {
  featureKey: string;
  displayName: string;
  depth: number;
  children: FeatureHierarchyTree[];
}

/**
 * Validation result for parent assignment
 */
export interface ParentValidationResult {
  valid: boolean;
  error?: string;
  wouldCreateCycle?: boolean;
  affectedChildren?: string[];
}

/**
 * Get all ancestors of a feature (from immediate parent to root)
 * Uses database function for efficient retrieval
 * 
 * @param featureKey - The feature key to get ancestors for
 * @returns Array of ancestor feature keys, or null if feature not found
 */
export async function getFeatureAncestors(featureKey: string): Promise<string[] | null> {
  try {
    const { data, error } = await (supabase as any).rpc('get_feature_ancestors', {
      p_feature_key: featureKey,
      p_max_depth: 10
    });

    if (error) {
      console.error('[FeatureHierarchy] Error fetching ancestors:', error);
      return null;
    }

    return data as string[];
  } catch (err) {
    console.error('[FeatureHierarchy] Exception fetching ancestors:', err);
    return null;
  }
}

/**
 * Get all children of a feature (recursive)
 * Returns children with depth information
 * 
 * @param featureKey - The parent feature key
 * @param includeArchived - Whether to include archived features
 * @returns Array of child features with depth, or null if error
 */
export async function getFeatureChildren(
  featureKey: string,
  includeArchived: boolean = false
): Promise<Array<{ featureKey: string; featureName: string; depth: number }> | null> {
  try {
    const { data, error } = await (supabase as any).rpc('get_feature_children', {
      p_feature_key: featureKey,
      p_include_archived: includeArchived
    });

    if (error) {
      console.error('[FeatureHierarchy] Error fetching children:', error);
      return null;
    }

    return data as Array<{ featureKey: string; featureName: string; depth: number }>;
  } catch (err) {
    console.error('[FeatureHierarchy] Exception fetching children:', err);
    return null;
  }
}

/**
 * Validate a parent assignment before saving
 * Checks for cycles, self-references, and other constraints
 * 
 * @param featureKey - The feature being updated
 * @param newParentKey - The new parent feature key (null = root-level)
 * @returns Validation result
 */
export async function validateParentAssignment(
  featureKey: string,
  newParentKey: string | null
): Promise<ParentValidationResult> {
  // Null parent is always valid (root-level feature)
  if (!newParentKey) {
    return { valid: true };
  }

  // Self-reference check
  if (featureKey === newParentKey) {
    return {
      valid: false,
      error: 'A feature cannot be its own parent'
    };
  }

  // Check if parent exists
  const { data: parentExists, error: parentError } = await supabase
    .from('feature_entitlements')
    .select('feature_key')
    .eq('feature_key', newParentKey)
    .is('archived_at', null)
    .single();

  if (parentError || !parentExists) {
    return {
      valid: false,
      error: `Parent feature '${newParentKey}' not found or is archived`
    };
  }

  // Check for cycles: get ancestors of the proposed parent
  // If our feature_key appears in those ancestors, it would create a cycle
  const parentAncestors = await getFeatureAncestors(newParentKey);
  
  if (parentAncestors && parentAncestors.includes(featureKey)) {
    return {
      valid: false,
      error: `Assigning '${newParentKey}' as parent would create a circular reference`,
      wouldCreateCycle: true
    };
  }

  // Get children to warn about affected descendants
  const children = await getFeatureChildren(featureKey, false);
  const childrenKeys = children?.map(c => c.featureKey) || [];

  return {
    valid: true,
    affectedChildren: childrenKeys.length > 0 ? childrenKeys : undefined
  };
}

/**
 * Get feature hierarchy as a flat list with depth metadata
 * Useful for rendering tree views in admin UI
 * 
 * @param includeArchived - Whether to include archived features
 * @returns Array of features with hierarchy metadata
 */
export async function getFeatureHierarchyFlat(
  includeArchived: boolean = false
): Promise<FeatureWithHierarchy[]> {
  try {
    type FeatureEntitlementRowWithParent = {
      id: string;
      feature_key: string;
      display_name: string | null;
      category: string | null;
      feature_type: string | null;
      description: string | null;
      rollout_status: string | null;
      unavailable_gate_action: string | null;
      created_at: string | null;
      updated_at: string | null;
      archived_at: string | null;
      is_toggleable: boolean | null;
      is_removable: boolean | null;
      lock_reason: string | null;
      is_system_feature: boolean | null;
      platform_admin_only: boolean | null;
      parent_feature_key: string | null;
    };

    // Get all features
    let query = (supabase as any)
      .from('feature_entitlements')
      .select('*')
      .order('parent_feature_key', { ascending: true, nullsFirst: true })
      .order('display_name', { ascending: true });

    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data, error } = await query;
    const features = (data ?? []) as FeatureEntitlementRowWithParent[];

    if (error) {
      console.error('[FeatureHierarchy] Error fetching features:', error);
      return [];
    }

    if (!features || features.length === 0) {
      return [];
    }

    // Build a map for quick lookups
    const featureMap = new Map<string, FeatureEntitlementRowWithParent>(
      features.map((f: FeatureEntitlementRowWithParent) => [f.feature_key, f])
    );

    // Calculate depth and ancestors for each feature
    const result: FeatureWithHierarchy[] = [];

    for (const feature of features) {
      const ancestorKeys: string[] = [];
      let depth = 0;
      let currentKey = feature.parent_feature_key;

      // Walk up the parent chain
      while (currentKey && depth < 10) {
        ancestorKeys.push(currentKey);
        const parent = featureMap.get(currentKey);
        currentKey = parent?.parent_feature_key ?? null;
        depth++;
      }

      // Get immediate children
      const children = features.filter((f: FeatureEntitlementRowWithParent) => f.parent_feature_key === feature.feature_key);
      const childrenKeys = children.map((c: FeatureEntitlementRowWithParent) => c.feature_key);

      result.push({
        id: feature.id,
        featureKey: feature.feature_key,
        displayName: feature.display_name ?? '',
        category: feature.category ?? '',
        featureType: (feature.feature_type ?? 'module') as any,
        description: feature.description ?? null,
        rolloutStatus: (feature.rollout_status ?? 'live') as any,
        unavailableGateAction: feature.unavailable_gate_action as any,
        createdAt: feature.created_at ?? '',
        updatedAt: feature.updated_at ?? '',
        archivedAt: feature.archived_at,
        isToggleable: feature.is_toggleable ?? true,
        isRemovable: feature.is_removable ?? true,
        lockReason: feature.lock_reason,
        isSystemFeature: feature.is_system_feature ?? false,
        platformAdminOnly: feature.platform_admin_only ?? false,
        parentFeatureKey: feature.parent_feature_key,
        depth,
        ancestorKeys: ancestorKeys.reverse(), // Reverse to go from root to immediate parent
        childrenKeys
      });
    }

    return result;
  } catch (err) {
    console.error('[FeatureHierarchy] Exception fetching hierarchy:', err);
    return [];
  }
}

/**
 * Get features that would be affected by a tier assignment change
 * When changing a parent feature's tier availability, all children are affected
 * 
 * @param featureKey - The feature being modified
 * @returns Array of affected child feature keys (recursive)
 */
export async function getAffectedChildren(featureKey: string): Promise<string[]> {
  const children = await getFeatureChildren(featureKey, false);
  return children?.map(c => c.featureKey) || [];
}

/**
 * Update feature's parent assignment
 * Validates before updating
 * 
 * @param featureId - The feature ID to update
 * @param newParentKey - The new parent feature key (null = root-level)
 * @returns Success status and error message if applicable
 */
export async function updateFeatureParent(
  featureId: string,
  featureKey: string,
  newParentKey: string | null
): Promise<{ success: boolean; error?: string }> {
  // Validate first
  const validation = await validateParentAssignment(featureKey, newParentKey);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const { error } = await supabase
      .from('feature_entitlements')
      .update({ parent_feature_key: newParentKey } as any)
      .eq('id', featureId);

    if (error) {
      console.error('[FeatureHierarchy] Error updating parent:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[FeatureHierarchy] Exception updating parent:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Build a hierarchical tree structure from flat feature list
 * Useful for rendering nested tree views
 * 
 * @param features - Flat array of features with hierarchy data
 * @returns Array of root features with nested children
 */
export function buildHierarchyTree(features: FeatureWithHierarchy[]): FeatureHierarchyTree[] {
  // Build tree nodes
  const treeMap = new Map<string, FeatureHierarchyTree>();
  
  for (const feature of features) {
    treeMap.set(feature.featureKey, {
      featureKey: feature.featureKey,
      displayName: feature.displayName,
      depth: feature.depth,
      children: []
    });
  }

  // Link children to parents
  const roots: FeatureHierarchyTree[] = [];

  for (const feature of features) {
    const node = treeMap.get(feature.featureKey);
    if (!node) continue;

    if (!feature.parentFeatureKey) {
      // Root-level feature
      roots.push(node);
    } else {
      // Find parent and add as child
      const parent = treeMap.get(feature.parentFeatureKey);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found (shouldn't happen with valid data), treat as root
        roots.push(node);
      }
    }
  }

  return roots;
}
