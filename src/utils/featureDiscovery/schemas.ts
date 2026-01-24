import { z } from 'zod';

// We import the values from the types file or redeclare enums if necessary for Zod
// Since FeatureCategory is a type union in the other file, we'll use z.enum or z.string
// Ideally we keep it in sync. For now, valid strings are acceptable.

export const DiscoverySourceSchema = z.enum(['routes', 'schema', 'services', 'manual', 'integrations', 'flags']);

export const FeatureCategorySchema = z.enum([
    'Scheduling & Calendar',
    'Teams & Rosters',
    'Messaging & Communication',
    'Payments',
    'Registration & Forms',
    'Tryouts',
    'Travel',
    'Uniforms & Gear',
    'Reporting & Analytics',
    'Admin & Permissions',
    'Integrations',
    'Security & Compliance',
    'Support Tools'
]);

export const FeatureTypeSchema = z.enum(['module', 'permission', 'limit', 'visibility', 'integration']);

export const DiscoveredFeatureSchema = z.object({
    featureKey: z.string(),
    displayName: z.string(),
    category: FeatureCategorySchema,
    featureType: FeatureTypeSchema,
    description: z.string().nullable(),

    discoveredFrom: z.array(DiscoverySourceSchema),
    discoveredKeys: z.array(z.object({
        source: z.string(),
        key: z.string()
    })),
    routeKeys: z.array(z.string()),
    tables: z.array(z.string()),
    services: z.array(z.string()),
    edgeFunctions: z.array(z.string()),

    confidenceScore: z.number().min(0).max(100),
    needsReview: z.boolean(),
    manualCorrections: z.number(),

    visibility: z.object({
        platformAdmin: z.boolean(),
        orgAdmin: z.boolean(),
        coach: z.boolean(),
        guardian: z.boolean()
    }),
    visibilityInferred: z.boolean(),
    orgScoped: z.boolean(),
    platformScoped: z.boolean(),

    featureFlag: z.string().nullable(),
    licenseTierGated: z.boolean(),
    alwaysOn: z.boolean(),

    isQuantifiable: z.boolean(),
    countSource: z.string().nullable(),

    integrations: z.array(z.string()),

    dependsOn: z.array(z.string()),
    dependencyCycles: z.array(z.string()),

    syncedToDb: z.boolean(),
    lastDiscoveredAt: z.string(),
    lastSyncedAt: z.string().nullable(),
    syncStatus: z.enum(['pending', 'synced', 'failed']),
    syncErrors: z.array(z.string())
});

export const DiscoveredFeaturesListSchema = z.array(DiscoveredFeatureSchema);
