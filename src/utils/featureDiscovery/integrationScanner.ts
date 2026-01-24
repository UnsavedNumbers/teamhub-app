import { supabase } from '../../lib/supabase';
import type { DiscoveredFeature } from './types';

// Client-side integration scanner
// Note: Real analysis of 'supabase/functions/' directory requires server-side access (Node/Deno).
// In the browser, we rely on the database registry of known integrations and function mappings.

export async function scanIntegrations(features: Partial<DiscoveredFeature>[]): Promise<void> {
    try {
        const { data: registry, error } = await supabase
            .from('feature_integrations')
            .select('*');

        if (error || !registry) return;

        // Apply registry patterns to discovered features
        for (const feature of features) {
            if (!feature.featureKey) continue;

            const matched = registry.filter(reg => {
                try {
                    const regex = new RegExp(reg.feature_key_pattern);
                    return regex.test(feature.featureKey!);
                } catch {
                    return false;
                }
            });

            if (matched.length > 0) {
                feature.integrations = [...(feature.integrations || []), ...matched.map(m => m.integration_name)];
                // Unique
                feature.integrations = [...new Set(feature.integrations)];
            }
        }
    } catch (err) {
        console.error('Integration scan failed', err);
    }
}
