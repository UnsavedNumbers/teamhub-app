/**
 * Feature Flags TypeScript Types
 * 
 * Type definitions for the feature flags system.
 */

// ============================================================================
// Enums
// ============================================================================

export type FeatureFlagValueType = 'boolean' | 'integer' | 'double'
export type FeatureFlagEnvironment = 'dev' | 'staging' | 'prod'
export type FeatureFlagScope = 'platform' | 'organization' | 'user'

// ============================================================================
// Core Types
// ============================================================================

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  id: string
  key: string
  value_type: FeatureFlagValueType
  description: string | null
  environment: FeatureFlagEnvironment
  deleted_at: string | null
  version: number
  created_at: string
  updated_at: string
}

/**
 * Resolved feature flag value
 */
export interface ResolvedFeatureFlag {
  value: boolean | number
  value_type: FeatureFlagValueType
  resolved_from: FeatureFlagScope | 'fallback'
  source_id: string | null
}

/**
 * Platform default value
 */
export interface FeatureFlagPlatformDefault {
  feature_flag_id: string
  environment: FeatureFlagEnvironment
  value_boolean: boolean | null
  value_integer: number | null
  value_double: number | null
  version: number
  created_at: string
  updated_at: string
}

/**
 * Organization override
 */
export interface FeatureFlagOrgOverride {
  feature_flag_id: string
  org_id: string
  environment: FeatureFlagEnvironment
  value_boolean: boolean | null
  value_integer: number | null
  value_double: number | null
  version: number
  created_at: string
  updated_at: string
}

/**
 * User override
 */
export interface FeatureFlagUserOverride {
  feature_flag_id: string
  user_id: string
  environment: FeatureFlagEnvironment
  value_boolean: boolean | null
  value_integer: number | null
  value_double: number | null
  version: number
  created_at: string
  updated_at: string
}

/**
 * Override record (union type for admin views)
 */
export interface FeatureFlagOverride {
  id: string // Composite key: feature_flag_id:scope_id:environment
  override_type: 'org' | 'user'
  feature_flag_id: string
  feature_key: string
  scope_id: string
  scope_name: string
  environment: FeatureFlagEnvironment
  value_boolean: boolean | null
  value_integer: number | null
  value_double: number | null
  version: number
  created_at: string
  updated_at: string
}

/**
 * Feature flag with default and override counts (admin view)
 */
export interface AdminFeatureFlag {
  id: string
  key: string
  value_type: FeatureFlagValueType
  description: string | null
  environment: FeatureFlagEnvironment
  deleted_at: string | null
  version: number
  created_at: string
  updated_at: string
  default_value_boolean: boolean | null
  default_value_integer: number | null
  default_value_double: number | null
  org_override_count: number
  user_override_count: number
}

/**
 * Audit log entry
 */
export interface FeatureFlagAuditLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  action: string
  feature_flag_id: string | null
  feature_key: string | null
  scope_type: string | null
  scope_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  environment: FeatureFlagEnvironment
  created_at: string
}

// ============================================================================
// RPC Request/Response Types
// ============================================================================

/**
 * Create feature flag request
 */
export interface CreateFeatureFlagRequest {
  key: string
  value_type: FeatureFlagValueType
  description?: string
  environment: FeatureFlagEnvironment
}

/**
 * Set platform default request
 */
export interface SetPlatformDefaultRequest {
  feature_flag_id: string
  value_boolean?: boolean
  value_integer?: number
  value_double?: number
  environment: FeatureFlagEnvironment
  reason: string
  expected_version?: number
}

/**
 * Set org override request
 */
export interface SetOrgOverrideRequest {
  feature_flag_id: string
  org_id: string
  value_boolean?: boolean
  value_integer?: number
  value_double?: number
  environment: FeatureFlagEnvironment
  reason: string
  expected_version?: number
}

/**
 * Set user override request
 */
export interface SetUserOverrideRequest {
  feature_flag_id: string
  user_id: string
  value_boolean?: boolean
  value_integer?: number
  value_double?: number
  environment: FeatureFlagEnvironment
  reason: string
  expected_version?: number
}

/**
 * Remove override request
 */
export interface RemoveOverrideRequest {
  feature_flag_id: string
  scope_id: string // org_id or user_id
  scope_type: 'org' | 'user'
  environment: FeatureFlagEnvironment
  reason: string
  expected_version?: number
}

/**
 * Delete/restore flag request
 */
export interface DeleteFeatureFlagRequest {
  feature_flag_id: string
  environment: FeatureFlagEnvironment
  reason: string
}

/**
 * RPC response
 */
export interface RpcResponse {
  success: boolean
  error?: string
  flag_id?: string
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cached flag value with metadata
 */
export interface CachedFlagValue {
  value: boolean | number
  value_type: FeatureFlagValueType
  resolved_from: FeatureFlagScope | 'fallback'
  source_id: string | null
  timestamp: number
}
