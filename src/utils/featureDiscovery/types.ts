import { FeatureCategory, FeatureType } from "../../types/licenseTiers.types";

export type DiscoverySource = 'routes' | 'schema' | 'services' | 'manual' | 'integrations' | 'flags';

export interface DiscoveredFeature {
    // Core identity
    featureKey: string;           // Normalized, stable identifier
    displayName: string;          // Human-readable name
    category: FeatureCategory;    // Existing categories
    featureType: FeatureType;
    description: string | null;

    // Discovery metadata
    discoveredFrom: DiscoverySource[];
    discoveredKeys: Array<{ source: string, key: string }>;
    routeKeys: string[];          // Related route keys
    tables: string[];             // Related DB tables
    services: string[];           // Related service files
    edgeFunctions: string[];      // Related edge functions

    // Confidence & review
    confidenceScore: number;     // 0-100
    needsReview: boolean;         // confidenceScore < 70
    manualCorrections: number;    // Count of manual adjustments

    // Visibility & permissions
    visibility: {
        platformAdmin: boolean;
        orgAdmin: boolean;
        coach: boolean;
        guardian: boolean;
    };
    visibilityInferred: boolean;  // true if inferred from RLS, false if manual
    orgScoped: boolean;           // true if org-specific
    platformScoped: boolean;      // true if platform-wide

    // Gating
    featureFlag: string | null;   // Associated feature flag key
    licenseTierGated: boolean;    // Requires specific tier
    alwaysOn: boolean;            // Cannot be disabled

    // Quantifiable
    isQuantifiable: boolean;
    countSource: string | null;   // Table/column for counting

    // Integrations
    integrations: string[];       // ['stripe', 'email', 'calendar']

    // Dependencies
    dependsOn: string[];          // Other feature keys (normalized)
    dependencyCycles: string[];   // Features in same cycle

    // Sync status
    syncedToDb: boolean;          // Exists in feature_entitlements
    lastDiscoveredAt: string;
    lastSyncedAt: string | null;
    syncStatus: 'pending' | 'synced' | 'failed';
    syncErrors: string[];
}
