import { normalizeFeatureKey, formatDisplayName } from './normalizer';
import type { DiscoveredFeature } from './types';

// Use Vite's import.meta.glob to list service files
const serviceModules = import.meta.glob('../../data/services/*.ts');

export async function scanServices(): Promise<Partial<DiscoveredFeature>[]> {
    const discovered: Partial<DiscoveredFeature>[] = [];

    for (const path in serviceModules) {
        // path is relative, e.g., '../../data/services/eventsService.ts'
        const fileName = path.split('/').pop() || '';
        const nameWithoutExt = fileName.replace(/\.ts$/, '');
        const serviceName = nameWithoutExt.replace(/Service$/, ''); // 'events' from 'eventsService'

        // We can optionally load the module to check exports if needed
        // const module = await serviceModules[path]();

        // Check for "integrations" based on file name or content hints if checking content were easy
        // Here we rely on name.

        const normalizedKey = normalizeFeatureKey(serviceName);

        let category = 'Support Tools';

        // Heuristics
        if (normalizedKey.includes('event')) category = 'Scheduling & Calendar';
        if (normalizedKey.includes('team')) category = 'Teams & Rosters';
        if (normalizedKey.includes('payment')) category = 'Payments';

        discovered.push({
            featureKey: normalizedKey,
            displayName: formatDisplayName(normalizedKey),
            category: category as any,
            featureType: 'module',
            description: `Service Module: ${fileName}`,
            discoveredFrom: ['services'],
            discoveredKeys: [{ source: 'services', key: nameWithoutExt }],
            services: [fileName],
            confidenceScore: 85, // High confidence since code exists
            needsReview: false,

            // Defaults
            routeKeys: [],
            tables: [],
            edgeFunctions: [],
            manualCorrections: 0,
            integrations: [],
            dependsOn: [],
            dependencyCycles: [],
            syncedToDb: false,
            syncStatus: 'pending',
            syncErrors: [],
            visibility: { platformAdmin: true, orgAdmin: true, coach: false, guardian: false },
            orgScoped: true,
            platformScoped: false,
            isQuantifiable: false,
            featureFlag: null,
            licenseTierGated: false,
            alwaysOn: false
        });
    }

    return discovered;
}
