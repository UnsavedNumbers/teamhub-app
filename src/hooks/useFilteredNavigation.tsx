/**
 * useFilteredNavigation Hook
 * 
 * Hook to filter navigation sections based on feature gates.
 * Used by portal and admin navigation components.
 * 
 * @example
 * ```tsx
 * const { filteredSections, loading } = useFilteredNavigation(parentNavSections);
 * 
 * return (
 *   <nav>
 *     {filteredSections.map(section => (
 *       <NavSection key={section.label} {...section} />
 *     ))}
 *   </nav>
 * );
 * ```
 */

import { useMemo } from 'react';
import type { NavigationSection, NavigationItem } from '@/utils/routes/types';
import {
    useFeatureGateBatch,
    getFeatureKeyForRoute,
    isRouteUngated,
    getReasonMessage,
    type GateAction,
    type ReasonCode,
} from '@/lib/featureGate';

/**
 * Extended navigation item with gate information
 */
export interface FilteredNavigationItem extends NavigationItem {
    /** Gate action if feature is unavailable */
    gateAction?: GateAction | null;
    /** Localized message explaining why feature is unavailable */
    gateMessage?: string;
    /** Whether the item should be shown as gated (overlay/tooltip) */
    isGated?: boolean;
}

/**
 * Extended navigation group
 */
export interface FilteredNavigationGroup {
    label: string;
    items: FilteredNavigationItem[];
}

/**
 * Extended navigation section
 */
export interface FilteredNavigationSection {
    label: string;
    route?: string;
    groups: FilteredNavigationGroup[];
}

/**
 * Hook return type
 */
export interface UseFilteredNavigationResult {
    /** Filtered navigation sections with gate info */
    filteredSections: FilteredNavigationSection[];
    /** Whether gates are still loading */
    loading: boolean;
    /** Refetch all gates */
    refetch: () => Promise<void>;
}

/**
 * Hook to filter navigation sections based on feature gates
 * 
 * @param sections - Navigation sections to filter
 * @returns Filtered sections with gate information
 */
export function useFilteredNavigation(
    sections: NavigationSection[]
): UseFilteredNavigationResult {
    // Extract all unique feature keys from navigation items
    const featureKeys = useMemo(() => {
        const keys = new Set<string>();

        for (const section of sections) {
            for (const group of section.groups) {
                for (const item of group.items) {
                    // Allow explicit featureKey on item or derive from routeKey
                    const featureKey = (item as any).featureKey ?? getFeatureKeyForRoute(item.routeKey);
                    if (featureKey) {
                        keys.add(featureKey);
                    }
                }
            }
        }

        return Array.from(keys);
    }, [sections]);

    const { gates, loading, refetch } = useFeatureGateBatch(featureKeys);

    // Filter and annotate sections based on gate results
    const filteredSections = useMemo((): FilteredNavigationSection[] => {
        const result: FilteredNavigationSection[] = [];

        for (const section of sections) {
            const filteredGroups: FilteredNavigationGroup[] = [];

            for (const group of section.groups) {
                const filteredItems: FilteredNavigationItem[] = [];

                for (const item of group.items) {
                    const featureKey = (item as any).featureKey ?? getFeatureKeyForRoute(item.routeKey);

                    // Ungated routes always show as-is
                    if (!featureKey || isRouteUngated(item.routeKey)) {
                        filteredItems.push({ ...item });
                        continue;
                    }

                    const gate = gates.get(featureKey);

                    // Still loading - show item normally
                    if (!gate) {
                        filteredItems.push({ ...item });
                        continue;
                    }

                    // Feature is allowed - show normally
                    if (gate.allowed) {
                        filteredItems.push({ ...item });
                        continue;
                    }

                    // Feature is gated
                    if (gate.gate_action === 'hide') {
                        // Remove from navigation entirely
                        continue;
                    }

                    if (gate.gate_action === 'disable') {
                        // Show but disabled
                        filteredItems.push({
                            ...item,
                            disabled: true,
                            gateAction: gate.gate_action,
                            gateMessage: getReasonMessage(gate.reason_code as ReasonCode),
                            isGated: true,
                        });
                    } else {
                        // Show with gate indicator
                        filteredItems.push({
                            ...item,
                            gateAction: gate.gate_action,
                            gateMessage: getReasonMessage(gate.reason_code as ReasonCode),
                            isGated: true,
                        });
                    }
                }

                // Only include group if it has items
                if (filteredItems.length > 0) {
                    filteredGroups.push({
                        label: group.label,
                        items: filteredItems,
                    });
                }
            }

            // Only include section if it has groups
            if (filteredGroups.length > 0) {
                result.push({
                    label: section.label,
                    route: section.route,
                    groups: filteredGroups,
                });
            }
        }

        return result;
    }, [sections, gates]);

    return {
        filteredSections,
        loading,
        refetch,
    };
}

/**
 * Simpler hook that just checks if specific nav items should be shown
 * Useful for sidebar navigation with flat list
 */
export function useFilteredNavItems<T extends { routeKey: string; featureKey?: string }>(
    items: T[]
): {
    filteredItems: (T & { isGated?: boolean; gateMessage?: string })[];
    loading: boolean;
} {
    // Extract feature keys
    const featureKeys = useMemo(() => {
        const keys: string[] = [];
        for (const item of items) {
            const key = item.featureKey ?? getFeatureKeyForRoute(item.routeKey);
            if (key) {
                keys.push(key);
            }
        }
        return keys;
    }, [items]);

    const { gates, loading } = useFeatureGateBatch(featureKeys);

    const filteredItems = useMemo(() => {
        const result: (T & { isGated?: boolean; gateMessage?: string })[] = [];

        for (const item of items) {
            const featureKey = item.featureKey ?? getFeatureKeyForRoute(item.routeKey);

            if (!featureKey || isRouteUngated(item.routeKey)) {
                result.push(item);
                continue;
            }

            const gate = gates.get(featureKey);

            if (!gate || gate.allowed) {
                result.push(item);
                continue;
            }

            if (gate.gate_action === 'hide') {
                continue;
            }

            result.push({
                ...item,
                isGated: true,
                gateMessage: getReasonMessage(gate.reason_code as ReasonCode),
            });
        }

        return result;
    }, [items, gates]);

    return {
        filteredItems,
        loading,
    };
}

export default useFilteredNavigation;
