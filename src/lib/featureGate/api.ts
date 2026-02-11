/**
 * Feature Gate API
 * 
 * Functions to call the feature gate RPC and resolve feature access.
 * Includes in-memory caching, AbortController support, and org-scoped invalidation.
 */

import { supabase } from '../supabase';
import type { FeatureGateResult, FeatureGateContext, ReasonCode, GateAction } from './types';
import { CACHE_TTL } from '../../constants/api';

/**
 * Cache for feature gate results to reduce RPC calls
 * Key format: `${org_id}:${user_id}:${feature_key}`
 */
const gateCache = new Map<string, { result: FeatureGateResult; timestamp: number }>();
const CACHE_TTL_MS = CACHE_TTL.FEATURE_GATE_MS;

/** Listeners notified when the cache is cleared (used by FeatureGateProvider) */
type CacheInvalidationListener = (orgId?: string) => void;
const cacheInvalidationListeners = new Set<CacheInvalidationListener>();

/**
 * Register a listener that fires whenever the cache is cleared.
 * Returns an unsubscribe function.
 */
export function onCacheInvalidation(listener: CacheInvalidationListener): () => void {
    cacheInvalidationListeners.add(listener);
    return () => { cacheInvalidationListeners.delete(listener); };
}

/**
 * Clear the entire feature gate cache.
 * Call this when org or license changes.
 */
export function clearFeatureGateCache(): void {
    gateCache.clear();
    _lastGateFailure = 0;
    cacheInvalidationListeners.forEach(fn => fn());
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
    _lastGateFailure = 0;
    cacheInvalidationListeners.forEach(fn => fn(orgId));
}

/**
 * Negative cache: prevent retry storms when RPCs are unreachable (CORS / network).
 * After a failure, skip new RPCs for NEGATIVE_CACHE_TTL_MS.
 */
const GATE_NEGATIVE_CACHE_TTL_MS = 30_000; // 30 seconds
let _lastGateFailure = 0;

function isGateInNegativeCooldown(): boolean {
    return _lastGateFailure > 0 && Date.now() - _lastGateFailure < GATE_NEGATIVE_CACHE_TTL_MS;
}

function markGateFailure(): void {
    _lastGateFailure = Date.now();
}

/**
 * Generate cache key
 */
function getCacheKey(orgId: string | null, userId: string, featureKey: string): string {
    return `${orgId ?? 'null'}:${userId}:${featureKey}`;
}

/**
 * Call the get_feature_gate RPC.
 * Supports AbortController for cancellation.
 */
export async function fetchFeatureGate(
    featureKey: string,
    context: FeatureGateContext,
    signal?: AbortSignal
): Promise<FeatureGateResult> {
    // Skip RPC if we recently had a failure (CORS / network)
    if (isGateInNegativeCooldown()) {
        return { allowed: true, gate_action: null as any, reason_code: null as any, feature_key: featureKey };
    }

    // Check cache first
    const cacheKey = getCacheKey(context.org_id, context.user_id, featureKey);
    const cached = gateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.result;
    }

    // Bail out early if already aborted
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    try {
        const params: any = {
            p_org_id: context.org_id ?? null,
            p_user_id: context.user_id,
            p_feature_key: featureKey,
        }
        const { data, error } = await supabase.rpc('get_feature_gate', params as any);

        // Respect abort after the await
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        if (error) {
            markGateFailure();
            console.error('[FeatureGate] RPC error:', error);
            return {
                allowed: false,
                gate_action: 'overlay' as GateAction,
                reason_code: 'error' as ReasonCode,
                feature_key: featureKey,
                error: error.message,
            };
        }

        const result = data as unknown as FeatureGateResult;

        // Cache the result
        gateCache.set(cacheKey, { result, timestamp: Date.now() });

        return result;
    } catch (err) {
        // Let AbortError propagate so hooks can ignore it
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw err;
        }
        markGateFailure();
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
 * Call the get_feature_gates batch RPC.
 * Supports AbortController for cancellation.
 */
export async function fetchFeatureGates(
    featureKeys: string[],
    context: FeatureGateContext,
    signal?: AbortSignal
): Promise<Record<string, FeatureGateResult>> {
    if (featureKeys.length === 0) {
        return {};
    }

    // Skip RPC if we recently had a failure (CORS / network)
    // Return "allowed: true" so the UI doesn't block navigation during outages
    if (isGateInNegativeCooldown()) {
        const fallback: Record<string, FeatureGateResult> = {};
        for (const key of featureKeys) {
            fallback[key] = { allowed: true, gate_action: null as any, reason_code: null as any, feature_key: key };
        }
        return fallback;
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

    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    try {
        const batchParams: any = {
            p_org_id: context.org_id ?? null,
            p_user_id: context.user_id,
            p_feature_keys: uncachedKeys,
        }
        const { data, error } = await supabase.rpc('get_feature_gates', batchParams as any);

        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        if (error) {
            markGateFailure();
            console.error('[FeatureGate] Batch RPC error:', error);
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

        const results = data as unknown as Record<string, FeatureGateResult>;

        // Cache the new results
        for (const [key, result] of Object.entries(results)) {
            const cacheKey = getCacheKey(context.org_id, context.user_id, key);
            gateCache.set(cacheKey, { result, timestamp: Date.now() });
        }

        return { ...cachedResults, ...results };
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw err;
        }
        markGateFailure();
        console.error('[FeatureGate] Batch fetch error:', err);
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
