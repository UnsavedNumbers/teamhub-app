/**
 * useFeatureGate Hook
 * 
 * React hook to check feature gate for a single feature.
 * Automatically builds context from OrganizationContext and useAuth.
 * 
 * Improvements:
 *  - AbortController cancels in-flight requests on unmount / dependency change
 *  - Context validation logs warnings in dev when org_id is missing
 *  - Empty/null featureKey is handled without an RPC call
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { fetchFeatureGate } from './api';
import type {
    FeatureGateResult,
    UseFeatureGateResult,
    FeatureGateContext,
    GateAction,
    ReasonCode
} from './types';

// Warn only once per feature key per session to avoid log spam
const _warnedKeys = new Set<string>();

/**
 * Hook to check feature gate for a single feature
 * 
 * @param featureKey - The feature key to check, or null/empty string to skip
 * @returns Gate result with loading state and refetch function
 */
export function useFeatureGate(featureKey: string | null): UseFeatureGateResult {
    const { currentOrganization } = useOrganization();
    const { user, profile } = useAuth();

    const [result, setResult] = useState<FeatureGateResult>({
        allowed: false,
        gate_action: null,
        reason_code: 'error' as ReasonCode,
        feature_key: featureKey ?? '',
    });
    const [loading, setLoading] = useState(true);

    // Track if component is mounted to prevent state updates after unmount
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Build context from hooks — with validation
    const context: FeatureGateContext | null = useMemo(() => {
        if (!user?.id || !profile) {
            return null;
        }

        const currentOrg = profile.organizations.find(
            org => org.id === currentOrganization?.id
        );
        const currentOrgRole = currentOrg?.roles?.[0] ?? 'parent';

        const orgId = currentOrganization?.id ?? null;

        // Dev-mode context validation
        if (import.meta.env.DEV && featureKey && !orgId && !profile.isPlatformAdmin) {
            if (!_warnedKeys.has(featureKey)) {
                _warnedKeys.add(featureKey);
                console.warn(
                    `[useFeatureGate] Checking feature '${featureKey}' without an org_id. ` +
                    'The RPC will likely return no_organization. Ensure OrganizationContext is set.'
                );
            }
        }

        return {
            org_id: orgId,
            user_id: user.id,
            role: currentOrgRole as 'parent' | 'coach' | 'org_admin',
            license_tier: null, // Will be resolved by RPC
            is_platform_admin: profile.isPlatformAdmin ?? false,
        };
    }, [user?.id, profile, currentOrganization?.id, featureKey]);

    const refetch = useCallback(async (signal?: AbortSignal) => {
        // No feature key (or empty string) means skip
        if (!featureKey) {
            if (isMountedRef.current) {
                setResult({
                    allowed: true,
                    gate_action: null,
                    reason_code: 'system_feature' as ReasonCode,
                    feature_key: '',
                });
                setLoading(false);
            }
            return;
        }

        // No context yet — still loading
        if (!context) {
            if (isMountedRef.current) {
                setLoading(true);
            }
            return;
        }

        if (isMountedRef.current) {
            setLoading(true);
        }

        try {
            const gateResult = await fetchFeatureGate(featureKey, context, signal);
            if (isMountedRef.current && !signal?.aborted) {
                setResult(gateResult);
            }
        } catch (err) {
            // Silently ignore AbortError — component unmounted or deps changed
            if (err instanceof DOMException && err.name === 'AbortError') {
                return;
            }
            console.error('[useFeatureGate] Error:', err);
            if (isMountedRef.current) {
                setResult({
                    allowed: false,
                    gate_action: 'overlay' as GateAction,
                    reason_code: 'error' as ReasonCode,
                    feature_key: featureKey,
                    error: err instanceof Error ? err.message : 'Unknown error',
                });
            }
        } finally {
            if (isMountedRef.current && !signal?.aborted) {
                setLoading(false);
            }
        }
    }, [featureKey, context]);

    // Fetch on mount and when dependencies change, with abort on cleanup
    useEffect(() => {
        const abortController = new AbortController();
        refetch(abortController.signal);
        return () => {
            abortController.abort();
        };
    }, [refetch]);

    return {
        ...result,
        loading,
        refetch: () => refetch(),
    };
}

/**
 * Convenience hook that returns just the allowed boolean
 * Useful for simple conditional rendering
 */
export function useCanAccessFeature(featureKey: string | null): {
    allowed: boolean;
    loading: boolean;
} {
    const { allowed, loading } = useFeatureGate(featureKey);
    return { allowed, loading };
}
