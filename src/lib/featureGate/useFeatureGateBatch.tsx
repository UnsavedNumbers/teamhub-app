/**
 * useFeatureGateBatch Hook
 * 
 * React hook to check feature gates for multiple features at once.
 * Useful for navigation filtering where many features need to be checked.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { fetchFeatureGates } from './api';
import type { FeatureGateResult, FeatureGateContext, UseFeatureGateBatchResult } from './types';

/**
 * Hook to check feature gates for multiple features at once
 * 
 * @param featureKeys - Array of feature keys to check
 * @returns Map of feature key to gate result, with loading state
 * 
 * @example
 * ```tsx
 * const { gates, loading } = useFeatureGateBatch(['travel', 'tryouts', 'payments']);
 * const travelGate = gates.get('travel');
 * if (!travelGate?.allowed) {
 *   // Hide or disable travel nav item
 * }
 * ```
 */
export function useFeatureGateBatch(featureKeys: string[]): UseFeatureGateBatchResult {
    const { currentOrganization } = useOrganization();
    const { user, profile } = useAuth();

    const [gates, setGates] = useState<Map<string, FeatureGateResult>>(new Map());
    const [loading, setLoading] = useState(true);

    // Track if component is mounted
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Build context
    const context: FeatureGateContext | null = useMemo(() => {
        if (!user?.id || !profile) {
            return null;
        }

        const currentOrg = profile.organizations.find(
            org => org.id === currentOrganization?.id
        );
        const currentOrgRole = currentOrg?.roles?.[0] ?? 'parent';

        return {
            org_id: currentOrganization?.id ?? null,
            user_id: user.id,
            role: currentOrgRole as 'parent' | 'coach' | 'org_admin',
            license_tier: null,
            is_platform_admin: profile.isPlatformAdmin ?? false,
        };
    }, [user?.id, profile, currentOrganization?.id]);

    // Stable key string for dependency checking (sorted to avoid re-renders from order changes)
    const keysString = useMemo(() =>
        [...featureKeys].sort().join(','),
        [featureKeys]
    );

    const refetch = useCallback(async () => {
        // No keys to fetch
        if (featureKeys.length === 0) {
            if (isMountedRef.current) {
                setGates(new Map());
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
            const results = await fetchFeatureGates(featureKeys, context);

            if (isMountedRef.current) {
                const newMap = new Map<string, FeatureGateResult>();
                for (const [key, value] of Object.entries(results)) {
                    newMap.set(key, value);
                }
                setGates(newMap);
            }
        } catch (err) {
            console.error('[useFeatureGateBatch] Error:', err);
            // Keep existing gates on error
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keysString, context]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return {
        gates,
        loading,
        refetch,
    };
}

/**
 * Hook that returns a function to check if a feature is allowed
 * Useful when you have the gates map and need to check multiple features
 */
export function useFeatureGateChecker(featureKeys: string[]): {
    isAllowed: (featureKey: string) => boolean;
    getGate: (featureKey: string) => FeatureGateResult | undefined;
    loading: boolean;
} {
    const { gates, loading } = useFeatureGateBatch(featureKeys);

    const isAllowed = useCallback(
        (featureKey: string): boolean => {
            const gate = gates.get(featureKey);
            return gate?.allowed ?? false;
        },
        [gates]
    );

    const getGate = useCallback(
        (featureKey: string): FeatureGateResult | undefined => {
            return gates.get(featureKey);
        },
        [gates]
    );

    return {
        isAllowed,
        getGate,
        loading,
    };
}
