/**
 * License Tiers & Entitlements TypeScript Types
 * 
 * Type definitions for the licenses & entitlements system.
 */

// ============================================================================
// Enums
// ============================================================================

export type LicenseTierKey = 'basic' | 'power'

export type LicenseTierStatus = 'active' | 'archived'

export type FeatureCategory = 
  | 'Scheduling & Calendar'
  | 'Teams & Rosters'
  | 'Messaging & Communication'
  | 'Payments'
  | 'Registration & Forms'
  | 'Tryouts'
  | 'Travel'
  | 'Uniforms & Gear'
  | 'Reporting & Analytics'
  | 'Admin & Permissions'
  | 'Integrations'
  | 'Security & Compliance'
  | 'Support Tools'

export type FeatureType = 'module' | 'permission' | 'limit' | 'visibility' | 'integration'

export type FeatureRolloutStatus = 'live' | 'beta' | 'hidden'

export type OverrideTargetType = 'organization' | 'user'

export type OverrideAction = 'enable' | 'disable' | 'set_limit'

export type OverrideStatus = 'active' | 'expired' | 'revoked'

// ============================================================================
// Core Types
// ============================================================================

/**
 * License tier definition
 */
export interface LicenseTier {
  id: string
  tier_key: LicenseTierKey
  tier_name: string
  description: string | null
  stripe_price_id: string
  stripe_verified_at: string | null
  stripe_product_name: string | null
  stripe_amount_cents: number | null
  stripe_interval: string | null // 'year', 'month'
  stripe_currency: string | null // 'usd'
  stripe_active: boolean | null
  status: LicenseTierStatus
  version?: number // For optimistic locking
  created_at: string
  updated_at: string
}

/**
 * License tier with counts (from admin view)
 */
export interface LicenseTierWithCounts extends LicenseTier {
  included_features_count: number
  orgs_using_count: number
}

/**
 * Feature entitlement definition
 */
export interface FeatureEntitlement {
  id: string
  feature_key: string
  display_name: string
  category: FeatureCategory
  feature_type: FeatureType
  description: string | null
  rollout_status: FeatureRolloutStatus
  created_at: string
  updated_at: string
  archived_at: string | null
}

/**
 * Feature entitlement with counts (from admin view)
 */
export interface FeatureEntitlementWithCounts extends FeatureEntitlement {
  tier_assignments_count: number
  active_overrides_count: number
}

/**
 * Tier feature assignment
 */
export interface TierFeatureAssignment {
  id: string
  license_tier_id: string
  feature_entitlement_id: string
  included: boolean
  limit_value: number | null
  role_admin: boolean
  role_coach: boolean
  role_parent: boolean
  created_at: string
  updated_at: string
}

/**
 * Tier feature assignment with feature details
 */
export interface TierFeatureAssignmentWithFeature extends TierFeatureAssignment {
  feature: FeatureEntitlement
}

/**
 * Entitlement override
 */
export interface EntitlementOverride {
  id: string
  target_type: OverrideTargetType
  target_id: string
  feature_entitlement_id: string
  override_action: OverrideAction
  limit_value: number | null
  role_admin: boolean | null
  role_coach: boolean | null
  role_parent: boolean | null
  reason: string
  expires_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  revoked_at: string | null
  revoked_by: string | null
  revoked_reason: string | null
}

/**
 * Entitlement override with details (from admin view)
 */
export interface EntitlementOverrideWithDetails extends EntitlementOverride {
  target_name: string | null
  feature_key: string
  feature_name: string
  created_by_email: string | null
  revoked_by_email: string | null
  status: OverrideStatus
}

/**
 * Entitlement audit log entry
 */
export interface EntitlementAuditLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  reason: string | null
  created_at: string
}

/**
 * License metrics (dashboard)
 */
export interface LicenseMetrics {
  active_tiers: number
  total_features: number
  archived_features?: number
  orgs_on_basic: number
  orgs_on_power: number
  active_overrides: number
  tiers_missing_price_id: number
  features_without_assignment: number
  tiers_with_archived_features?: number
}

// ============================================================================
// Stripe Verification Types
// ============================================================================

export interface StripePriceVerification {
  valid: boolean
  product_name?: string
  amount_cents?: number
  interval?: string
  currency?: string
  active?: boolean
  error?: string
}

// ============================================================================
// Form Types
// ============================================================================

export interface CreateLicenseTierRequest {
  tier_key: LicenseTierKey
  tier_name: string
  description?: string
  stripe_price_id: string
}

export interface UpdateLicenseTierRequest {
  tier_name?: string
  description?: string
  stripe_price_id?: string
  status?: LicenseTierStatus
}

export interface CreateFeatureEntitlementRequest {
  feature_key: string
  display_name: string
  category: FeatureCategory
  feature_type: FeatureType
  description?: string
  rollout_status?: FeatureRolloutStatus
}

export interface UpdateFeatureEntitlementRequest {
  display_name?: string
  category?: FeatureCategory
  feature_type?: FeatureType
  description?: string
  rollout_status?: FeatureRolloutStatus
}

export interface CreateTierFeatureAssignmentRequest {
  license_tier_id: string
  feature_entitlement_id: string
  included: boolean
  limit_value?: number | null
  role_admin?: boolean
  role_coach?: boolean
  role_parent?: boolean
}

export interface CreateEntitlementOverrideRequest {
  target_type: OverrideTargetType
  target_id: string
  feature_entitlement_id: string
  override_action: OverrideAction
  limit_value?: number | null
  role_admin?: boolean | null
  role_coach?: boolean | null
  role_parent?: boolean | null
  reason: string
  expires_at?: string | null
}

// ============================================================================
// Alert Types
// ============================================================================

export interface LicenseAlert {
  type: 'warning' | 'error' | 'info'
  message: string
  details?: string
}
