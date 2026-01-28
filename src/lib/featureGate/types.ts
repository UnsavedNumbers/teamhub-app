/**
 * Feature Gate System - Types
 * 
 * TypeScript types for the feature gate system that resolves access
 * based on org, user, role, tier, and entitlement overrides.
 */

/**
 * Gate action types - specifies behavior when feature is unavailable
 */
export type GateAction =
    | 'disable'  // Show element but grayed out, non-interactive
    | 'overlay'  // Show element with upgrade overlay/tooltip
    | 'hide'     // Remove element from UI entirely
    | 'modal'    // Show element but trigger modal on interaction
    | 'paywall'  // Redirect to billing/upgrade page
    | 'custom';  // Custom app-specific handling

/**
 * Reason codes explaining why access was granted or denied
 */
export type ReasonCode =
    | 'tier_assignment'       // Allowed by license tier assignment
    | 'system_feature'        // Always-on system feature
    | 'platform_admin'        // User is platform admin
    | 'enabled_by_override'   // Explicit org/user override enabling access
    | 'disabled_by_override'  // Explicitly disabled by override
    | 'limit_set_by_override' // Has usage limit set by override
    | 'license_tier'          // Not included in current license tier
    | 'role'                  // User role not permitted
    | 'platform_admin_only'   // Feature requires platform admin
    | 'not_found'             // Feature key doesn't exist
    | 'no_organization'       // No org context provided
    | 'limit_exceeded'        // Usage limit has been reached
    | 'error';                // Resolution error occurred

/**
 * Result from feature gate resolution (matches RPC return shape)
 */
export interface FeatureGateResult {
    allowed: boolean;
    gate_action: GateAction | null;
    reason_code: ReasonCode;
    feature_key: string;
    limit_value?: number;
    current_usage?: number;
    user_role?: string;
    error?: string;
}

/**
 * Context needed to resolve a feature gate
 */
export interface FeatureGateContext {
    org_id: string | null;
    user_id: string;
    role: 'parent' | 'coach' | 'org_admin';
    license_tier: string | null;
    is_platform_admin: boolean;
}

/**
 * Hook return type extending FeatureGateResult with loading state
 */
export interface UseFeatureGateResult extends FeatureGateResult {
    loading: boolean;
    refetch: () => Promise<void>;
}

/**
 * Batch hook return type
 */
export interface UseFeatureGateBatchResult {
    gates: Map<string, FeatureGateResult>;
    loading: boolean;
    refetch: () => Promise<void>;
}

/**
 * Default denied result for error/loading states
 */
export const DEFAULT_DENIED_RESULT: FeatureGateResult = {
    allowed: false,
    gate_action: 'overlay',
    reason_code: 'error',
    feature_key: '',
};

/**
 * Default allowed result for ungated features
 */
export const DEFAULT_ALLOWED_RESULT: FeatureGateResult = {
    allowed: true,
    gate_action: null,
    reason_code: 'system_feature',
    feature_key: '',
};
