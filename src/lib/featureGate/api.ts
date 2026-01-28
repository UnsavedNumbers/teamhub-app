/**
 * Feature Gate API
 * 
 * Functions to call the feature gate RPC and resolve feature access.
 */

import { supabase } from '../supabase';
import type { FeatureGateResult, FeatureGateContext, ReasonCode, GateAction } from './types';

/**
 * Cache for feature gate results to reduce RPC calls
 * Key format: `${org_id}:${user_id}:${feature_key}`
 */
const gateCache = new Map<string, { result: FeatureGateResult; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Clear the feature gate cache
 * Call this when org or license changes
 */
export function clearFeatureGateCache(): void {
    gateCache.clear();
}

/**
 * Clear cache for a specific org
 */
export function clearFeatureGateCacheForOrg(orgId: string): void {
    for (const key of gateCache.keys()) {
        if (key.startsWith(`${orgId}:`)) {
            gateCache.delete(key);
        }
    }
}

/**
 * Generate cache key
 */
function getCacheKey(orgId: string | null, userId: string, featureKey: string): string {
    return `${orgId ?? 'null'}:${userId}:${featureKey}`;
}

/**
 * Call the get_feature_gate RPC
 */
export async function fetchFeatureGate(
    featureKey: string,
    context: FeatureGateContext
): Promise<FeatureGateResult> {
    // Check cache first
    const cacheKey = getCacheKey(context.org_id, context.user_id, featureKey);
    const cached = gateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.result;
    }

    try {
        const { data, error } = await supabase.rpc('get_feature_gate', {
            p_org_id: context.org_id,
            p_user_id: context.user_id,
            p_feature_key: featureKey,
        });

        if (error) {
            console.error('[FeatureGate] RPC error:', error);
            return {
                allowed: false,
                gate_action: 'overlay' as GateAction,
                reason_code: 'error' as ReasonCode,
                feature_key: featureKey,
                error: error.message,
            };
        }

        const result = data as FeatureGateResult;

        // Cache the result
        gateCache.set(cacheKey, { result, timestamp: Date.now() });

        return result;
    } catch (err) {
        console.error('[FeatureGate] Fetch error:', err);
        return {
            allowed: false,
            gate_action: 'overlay' as GateAction,
            reason_code: 'error' as ReasonCode,
            feature_key: featureKey,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}

/**
 * Call the get_feature_gates batch RPC
 */
export async function fetchFeatureGates(
    featureKeys: string[],
    context: FeatureGateContext
): Promise<Record<string, FeatureGateResult>> {
    if (featureKeys.length === 0) {
        return {};
    }

    // Check which keys need fetching vs which are cached
    const uncachedKeys: string[] = [];
    const cachedResults: Record<string, FeatureGateResult> = {};

    for (const key of featureKeys) {
        const cacheKey = getCacheKey(context.org_id, context.user_id, key);
        const cached = gateCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            cachedResults[key] = cached.result;
        } else {
            uncachedKeys.push(key);
        }
    }

    // If all keys are cached, return early
    if (uncachedKeys.length === 0) {
        return cachedResults;
    }

    try {
        const { data, error } = await supabase.rpc('get_feature_gates', {
            p_org_id: context.org_id,
            p_user_id: context.user_id,
            p_feature_keys: uncachedKeys,
        });

        if (error) {
            console.error('[FeatureGate] Batch RPC error:', error);
            // Return cached results plus error results for uncached
            return {
                ...cachedResults,
                ...uncachedKeys.reduce((acc, key) => {
                    acc[key] = {
                        allowed: false,
                        gate_action: 'overlay' as GateAction,
                        reason_code: 'error' as ReasonCode,
                        feature_key: key,
                        error: error.message,
                    };
                    return acc;
                }, {} as Record<string, FeatureGateResult>),
            };
        }

        const results = data as Record<string, FeatureGateResult>;

        // Cache the new results
        for (const [key, result] of Object.entries(results)) {
            const cacheKey = getCacheKey(context.org_id, context.user_id, key);
            gateCache.set(cacheKey, { result, timestamp: Date.now() });
        }

        return { ...cachedResults, ...results };
    } catch (err) {
        console.error('[FeatureGate] Batch fetch error:', err);
        // Return cached results plus error results for uncached
        return {
            ...cachedResults,
            ...uncachedKeys.reduce((acc, key) => {
                acc[key] = {
                    allowed: false,
                    gate_action: 'overlay' as GateAction,
                    reason_code: 'error' as ReasonCode,
                    feature_key: key,
                    error: err instanceof Error ? err.message : 'Unknown error',
                };
                return acc;
            }, {} as Record<string, FeatureGateResult>),
        };
    }
}

/**
 * Simple check if user can access a feature
 * @param featureKey - The feature key to check
 * @param context - The context for resolution
 * @returns True if access is allowed
 */
export async function canAccessFeature(
    featureKey: string,
    context: FeatureGateContext
): Promise<boolean> {
    const result = await fetchFeatureGate(featureKey, context);
    return result.allowed;
}

/**
 * Get full gate behavior for a feature
 * @param featureKey - The feature key to check
 * @param context - The context for resolution
 * @returns Full gate result with action and reason
 */
export async function getFeatureGateBehavior(
    featureKey: string,
    context: FeatureGateContext
): Promise<FeatureGateResult> {
    return fetchFeatureGate(featureKey, context);
}
