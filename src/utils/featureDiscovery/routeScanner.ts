import { routes } from '../routes/definitions';
import { normalizeFeatureKey, formatDisplayName } from './normalizer';
import type { DiscoveredFeature, DiscoverySource } from './types';
import type { RouteDefinition } from '../routes/types';

// Helper to deduce category from route path/structure
function deduceCategory(path: string, groupKey: string): string {
    if (path.includes('calendar') || path.includes('schedule')) return 'Scheduling & Calendar';
    if (path.includes('teams') || path.includes('athletes') || path.includes('roster')) return 'Teams & Rosters';
    if (path.includes('messages') || path.includes('announcements')) return 'Messaging & Communication';
    if (path.includes('payments') || path.includes('fees') || path.includes('billing')) return 'Payments';
    if (path.includes('tryouts')) return 'Tryouts';
    if (path.includes('travel')) return 'Travel';
    if (path.includes('uniforms')) return 'Uniforms & Gear';
    if (groupKey === 'admin.settings' || groupKey === 'platformAdmin') return 'Admin & Permissions';
    if (path.includes('report') || path.includes('dashboard')) return 'Reporting & Analytics';

    return 'Support Tools'; // Default
}

// Helper to traverse the route object
function traverseRoutes(
    routeObj: any,
    pathPrefix: string = '',
    foundFeatures: Partial<DiscoveredFeature>[] = []
) {
    Object.entries(routeObj).forEach(([key, value]) => {
        if (key === 'root') return; // Skip marketing root in this context if desired, or keep it.

        const routeDef = value as any;

        // If it has a path, it's a route definition (or close enough for our structure)
        if (routeDef && typeof routeDef.path === 'string') {
            const normalizedKey = normalizeFeatureKey(key);
            const category = deduceCategory(routeDef.path, pathPrefix ? `${pathPrefix}.${key}` : key);

            foundFeatures.push({
                featureKey: normalizedKey,
                displayName: routeDef.label || formatDisplayName(normalizedKey),
                category: category as any,
                featureType: 'module',
                description: routeDef.description || null,
                discoveredFrom: ['routes'],
                discoveredKeys: [{ source: 'routes', key: `${pathPrefix}.${key}` }],
                routeKeys: [routeDef.path],
                confidenceScore: routeDef.description ? 80 : 60, // Higher confidence if description exists
                needsReview: !routeDef.description,
                visibility: {
                    platformAdmin: pathPrefix.includes('platformAdmin'),
                    orgAdmin: pathPrefix.includes('admin'),
                    coach: pathPrefix.includes('portal'), // Simplification
                    guardian: pathPrefix.includes('portal')
                },
                orgScoped: pathPrefix.includes('admin') || pathPrefix.includes('portal'),
                platformScoped: pathPrefix.includes('platformAdmin'),
                tables: [],
                services: [],
                edgeFunctions: [],
                manualCorrections: 0,
                integrations: [],
                dependsOn: [],
                dependencyCycles: [],
                syncedToDb: false,
                syncStatus: 'pending',
                syncErrors: [],
                isQuantifiable: false,
                countSource: null
            });
        } else if (typeof routeDef === 'object' && routeDef !== null) {
            // Recurse
            traverseRoutes(routeDef, pathPrefix ? `${pathPrefix}.${key}` : key, foundFeatures);
        }
    });

    return foundFeatures;
}

export function scanRoutes(): Partial<DiscoveredFeature>[] {
    // We only scan the subsets we care about
    const allRoutes = {
        portal: routes.portal,
        admin: routes.admin,
        platformAdmin: routes.platformAdmin
    };

    return traverseRoutes(allRoutes);
}
