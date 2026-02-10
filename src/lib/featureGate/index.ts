/**
 * Feature Gate System
 * 
 * Centralized system for resolving feature access based on:
 * - Organization license tier
 * - User role within organization
 * - Platform admin status
 * - Entitlement overrides
 * 
 * @example
 * ```tsx
 * // Check single feature
 * const { allowed, gate_action, loading } = useFeatureGate('travel');
 * 
 * // Check multiple features (for navigation)
 * const { gates } = useFeatureGateBatch(['travel', 'tryouts', 'payments']);
 * 
 * // Get feature key for a route
 * const featureKey = getFeatureKeyForRoute('admin.travel.list');
 * 
 * // Wrap routes with gate
 * <FeatureGateRoute routeKey="admin.travel.list">
 *   <TravelPage />
 * </FeatureGateRoute>
 * ```
 */

// Types
export type {
    GateAction,
    ReasonCode,
    FeatureGateResult,
    FeatureGateContext,
    UseFeatureGateResult,
    UseFeatureGateBatchResult,
} from './types';

export { DEFAULT_DENIED_RESULT, DEFAULT_ALLOWED_RESULT } from './types';

// Generated feature keys (DB → TypeScript)
export type { FeatureKey } from './generatedFeatureKeys';
export { VALID_FEATURE_KEYS, FEATURE_KEY_METADATA, isValidFeatureKey } from './generatedFeatureKeys';

// Registry
export {
    ROUTE_TO_FEATURE,
    ACTION_TO_FEATURE,
    UNGATED_ROUTES,
    getFeatureKeyForRoute,
    getFeatureKeyForAction,
    isRouteUngated,
    getAllRouteFeatureKeys,
    getAllActionFeatureKeys,
    validateRegistry,
} from './registry';

// Reason Messages
export {
    REASON_MESSAGES,
    REASON_LABELS,
    getReasonMessage,
    getReasonLabel,
    getTooltipText,
    shouldShowUpgradePrompt,
    isPermanentRestriction,
    getCtaText,
    getReasonIcon,
} from './reasonMessages';

// API
export {
    fetchFeatureGate,
    fetchFeatureGates,
    canAccessFeature,
    getFeatureGateBehavior,
    clearFeatureGateCache,
    clearFeatureGateCacheForOrg,
    onCacheInvalidation,
} from './api';

// Hooks
export { useFeatureGate, useCanAccessFeature } from './useFeatureGate';
export { useFeatureGateBatch, useFeatureGateChecker } from './useFeatureGateBatch';

// Provider
export { FeatureGateProvider, useFeatureGateProvider } from './FeatureGateProvider';
