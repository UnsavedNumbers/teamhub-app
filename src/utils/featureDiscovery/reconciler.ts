import { scanRoutes } from './routeScanner';
import { scanSchema, getSchemaHash } from './schemaScanner';
import { scanServices } from './serviceScanner';
import { scanFeatureFlags } from './featureFlagScanner';
import { scanIntegrations } from './integrationScanner';
import { updateConfidence } from './confidence';
import { analyzeDependencies } from './dependencyGraph';
import { logDiscoveryError } from './errorHandling';
import { safeParseJSONB } from './jsonbUtils';
import type { DiscoveredFeature } from './types';
import type { Json } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

// Helper to merge features
function mergeFeatures(existing: Partial<DiscoveredFeature>, newFeat: Partial<DiscoveredFeature>): Partial<DiscoveredFeature> {
    const merged = { ...existing, ...newFeat };

    // Merge arrays
    merged.discoveredFrom = [...new Set([...(existing.discoveredFrom || []), ...(newFeat.discoveredFrom || [])])];
    merged.discoveredKeys = [...(existing.discoveredKeys || []), ...(newFeat.discoveredKeys || [])]; // Keep duplicates for trace? Or dedup?
    merged.routeKeys = [...new Set([...(existing.routeKeys || []), ...(newFeat.routeKeys || [])])];
    merged.tables = [...new Set([...(existing.tables || []), ...(newFeat.tables || [])])];
    merged.services = [...new Set([...(existing.services || []), ...(newFeat.services || [])])];
    merged.edgeFunctions = [...new Set([...(existing.edgeFunctions || []), ...(newFeat.edgeFunctions || [])])];

    // Merge boolean flags (OR logic)
    merged.visibility = {
        platformAdmin: existing.visibility?.platformAdmin || newFeat.visibility?.platformAdmin || false,
        orgAdmin: existing.visibility?.orgAdmin || newFeat.visibility?.orgAdmin || false,
        coach: existing.visibility?.coach || newFeat.visibility?.coach || false,
        guardian: existing.visibility?.guardian || newFeat.visibility?.guardian || false
    };

    merged.orgScoped = existing.orgScoped || newFeat.orgScoped || false;
    merged.platformScoped = existing.platformScoped || newFeat.platformScoped || false;
    merged.isQuantifiable = existing.isQuantifiable || newFeat.isQuantifiable || false;

    return merged;
}

export async function discoverAndReconcile(force: boolean = false): Promise<DiscoveredFeature[]> {
    try {
        // 1. Check Cache
        if (!force) {
            const { data: cache } = await supabase.from('feature_discovery_cache').select('*').limit(1).single();
            if (cache) {
                const schemaHash = await getSchemaHash();
                const isFresh = (Date.now() - new Date(cache.last_discovered_at).getTime()) < 24 * 60 * 60 * 1000;
                const schemaMatch = cache.schema_hash === schemaHash;

                if (isFresh && schemaMatch && cache.discovered_features) {
                    const parsed = safeParseJSONB(cache.discovered_features, []);
                    // Optional: Validate with Zod if strictness is required by "Bug 1"
                    // const validation = DiscoveredFeaturesListSchema.safeParse(parsed);
                    // if (validation.success) return validation.data;

                    return parsed as DiscoveredFeature[];
                }
            }
        }

        // 2. Run Scanners
        const [routes, schema, services, flags] = await Promise.all([
            scanRoutes(),
            scanSchema(),
            scanServices(),
            scanFeatureFlags()
        ]);

        // 3. Merge by Key
        const featuresMap = new Map<string, Partial<DiscoveredFeature>>();

        const allScanned = [...routes, ...schema, ...services, ...flags];

        // Fetch excluded features from database
        const { data: excludedFeatures } = await supabase
            .from('feature_entitlements')
            .select('feature_key')
            .eq('excluded_from_discovery', true)
            .is('archived_at', null);

        const excludedKeys = new Set(excludedFeatures?.map(f => f.feature_key) || []);

        for (const feat of allScanned) {
            if (!feat.featureKey) continue;
            
            // Skip excluded features
            if (excludedKeys.has(feat.featureKey)) continue;

            if (featuresMap.has(feat.featureKey)) {
                const existing = featuresMap.get(feat.featureKey)!;
                featuresMap.set(feat.featureKey, mergeFeatures(existing, feat));
            } else {
                featuresMap.set(feat.featureKey, feat);
            }
        }

        // 4. Enrich & Validate
        let results = Array.from(featuresMap.values()) as DiscoveredFeature[];

        // Integrations
        await scanIntegrations(results);

        // Confidence & Analysis
        results = results.map(updateConfidence);
        results = analyzeDependencies(results);

        // 5. Create/Update Cache
        await saveToCache(results);

        return results;

    } catch (err) {
        logDiscoveryError(err, { message: 'Reconciliation failed' });
        throw err;
    }
}

async function saveToCache(features: DiscoveredFeature[]) {
    const schemaHash = await getSchemaHash();

    // Invalidate old caches? Or just insert new latest?
    // We can single row it if we want, or keep history.
    // For now insert new.
    await supabase.from('feature_discovery_cache').insert({
        discovered_features: features as unknown as Json,
        last_discovered_at: new Date().toISOString(),
        schema_hash: schemaHash,
        sync_status: 'pending'
    });
}
