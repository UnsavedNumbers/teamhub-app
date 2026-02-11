/**
 * FeatureGateProvider
 * 
 * React context provider that:
 * 1. Prefetches all navigation-relevant feature gates on mount
 * 2. Re-fetches when the org or license changes
 * 3. Listens for cache invalidation events (e.g. license upgrade) and refetches
 * 4. Shares prefetched results via context so child hooks can read warm-cache values
 * 5. Runs dev-mode registry validation on first mount
 *
 * Place inside OrganizationProvider + AuthProvider but outside route tree.
 */

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import {
    fetchFeatureGates,
    onCacheInvalidation,
    clearFeatureGateCache,
} from './api';
import { getAllRouteFeatureKeys, validateRegistry } from './registry';
import type { FeatureGateContext } from './types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface FeatureGateProviderContextValue {
    /** Whether the initial prefetch has completed */
    prefetched: boolean;
    /** Trigger a full re-prefetch (e.g. after a plan change) */
    invalidate: () => void;
}

const FeatureGateProviderContext = createContext<FeatureGateProviderContextValue>({
    prefetched: false,
    invalidate: () => {},
});

export function useFeatureGateProvider(): FeatureGateProviderContextValue {
    return useContext(FeatureGateProviderContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface FeatureGateProviderProps {
    children: ReactNode;
}

export function FeatureGateProvider({ children }: FeatureGateProviderProps) {
    const { currentOrganization } = useOrganization();
    const { user, profile } = useAuth();
    const prefetchedRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);

    // Run dev-mode registry validation once
    useEffect(() => {
        if (import.meta.env.DEV) {
            const errors = validateRegistry();
            if (errors.length > 0) {
                console.warn(
                    '[FeatureGateProvider] Registry validation issues:\n' +
                    errors.join('\n')
                );
            }
        }
    }, []);

    // Build the RPC context
    const context: FeatureGateContext | null = useMemo(() => {
        if (!user?.id || !profile) return null;

        const currentOrg = profile.organizations.find(
            (org) => org.id === currentOrganization?.id
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

    // Prefetch all route feature keys so the cache is warm
    const prefetch = useCallback(
        async (signal?: AbortSignal) => {
            if (!context) return;

            const featureKeys = getAllRouteFeatureKeys();
            if (featureKeys.length === 0) return;

            try {
                await fetchFeatureGates(featureKeys, context, signal);
                if (!signal?.aborted) {
                    prefetchedRef.current = true;
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('[FeatureGateProvider] Prefetch error:', err);
            }
        },
        [context]
    );

    // Prefetch whenever context changes (login, org switch)
    useEffect(() => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        prefetchedRef.current = false;
        prefetch(ac.signal);
        return () => ac.abort();
    }, [prefetch]);

    // Listen for cache invalidation events (fired by clearFeatureGateCache*)
    useEffect(() => {
        const unsubscribe = onCacheInvalidation(() => {
            abortRef.current?.abort();
            const ac = new AbortController();
            abortRef.current = ac;
            prefetchedRef.current = false;
            prefetch(ac.signal);
        });
        return unsubscribe;
    }, [prefetch]);

    const invalidate = useCallback(() => {
        clearFeatureGateCache();
    }, []);

    const value = useMemo<FeatureGateProviderContextValue>(
        () => ({ prefetched: prefetchedRef.current, invalidate }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [invalidate, context]
    );

    return (
        <FeatureGateProviderContext.Provider value={value}>
            {children}
        </FeatureGateProviderContext.Provider>
    );
}

export default FeatureGateProvider;
