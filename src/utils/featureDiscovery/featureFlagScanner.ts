import { supabase } from '../../lib/supabase';
import { normalizeFeatureKey, formatDisplayName } from './normalizer';
import type { DiscoveredFeature } from './types';

export async function scanFeatureFlags(): Promise<Partial<DiscoveredFeature>[]> {
    const discovered: Partial<DiscoveredFeature>[] = [];

    try {
        // Assuming table is 'feature_flags' based on migration 037
        const { data: flags, error } = await supabase
            .from('feature_flags')
            .select('*');

        if (error) return [];

        for (const flag of (flags || [])) {
            const rawKey = flag.key || flag.feature_key;
            if (!rawKey) continue;
            const normalizedKey = normalizeFeatureKey(rawKey); // Adjust based on actual schema

            discovered.push({
                featureKey: normalizedKey,
                displayName: formatDisplayName(normalizedKey),
                category: 'Support Tools', // Default
                featureType: 'module',
                description: flag.description || 'Feature Flag',
                discoveredFrom: ['flags'],
                discoveredKeys: [{ source: 'flags', key: rawKey }],

                featureFlag: rawKey,
                confidenceScore: 90,
                needsReview: false,

                // Defaults
                manualCorrections: 0,
                integrations: [],
                routeKeys: [],
                tables: [],
                services: [],
                edgeFunctions: [],
                dependsOn: [],
                dependencyCycles: [],
                syncedToDb: false,
                syncStatus: 'pending',
                syncErrors: [],
                visibility: { platformAdmin: true, orgAdmin: true, coach: false, guardian: false },
                isQuantifiable: false,
            });
        }

    } catch (err) {
        console.warn('Feature flag scan failed', err);
    }

    return discovered;
}
