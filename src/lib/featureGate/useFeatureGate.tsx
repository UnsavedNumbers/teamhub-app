/**
 * useFeatureGate Hook
 * 
 * React hook to check feature gate for a single feature.
 * Automatically builds context from OrganizationContext and useAuth.
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

/**
 * Hook to check feature gate for a single feature
 * 
 * @param featureKey - The feature key to check, or null to skip
 * @returns Gate result with loading state and refetch function
 * 
 * @example
 * ```tsx
 * const { allowed, gate_action, loading } = useFeatureGate('travel');
 * if (!allowed) {
 *   return <UpgradePrompt action={gate_action} />;
 * }
 * ```
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

    // Build context from hooks
    const context: FeatureGateContext | null = useMemo(() => {
        if (!user?.id || !profile) {
            return null;
        }

        // Get user's role in current org
        const currentOrg = profile.organizations.find(
            org => org.id === currentOrganization?.id
        );
        const currentOrgRole = currentOrg?.roles?.[0] ?? 'parent';

        return {
            org_id: currentOrganization?.id ?? null,
            user_id: user.id,
            role: currentOrgRole as 'parent' | 'coach' | 'org_admin',
            license_tier: null, // Will be resolved by RPC
            is_platform_admin: profile.isPlatformAdmin ?? false,
        };
    }, [user?.id, profile, currentOrganization?.id]);

    const refetch = useCallback(async () => {
        // No feature key means skip
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

        // No context yet - still loading
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
            const gateResult = await fetchFeatureGate(featureKey, context);
            if (isMountedRef.current) {
                setResult(gateResult);
            }
        } catch (err) {
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
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [featureKey, context]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        refetch();
    }, [refetch]);

    return {
        ...result,
        loading,
        refetch,
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
