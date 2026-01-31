import { supabase } from '../../lib/supabase';
import { normalizeFeatureKey, formatDisplayName } from './normalizer';
import type { DiscoveredFeature } from './types';

interface SchemaTable {
    table_name: string;
    table_type: string;
}

interface SchemaColumn {
    table_name: string;
    column_name: string;
    data_type: string;
}

export async function scanSchema(): Promise<Partial<DiscoveredFeature>[]> {
    const discovered: Partial<DiscoveredFeature>[] = [];

    try {
        // 1. Fetch Tables
        const { data: tables, error: tablesError } = await supabase.rpc('get_schema_tables');

        if (tablesError) throw tablesError;

        // 2. Fetch Columns (for detection of quantifiable fields or properties)
        const { data: columns, error: columnsError } = await supabase.rpc('get_schema_columns');

        if (columnsError) throw columnsError;

        const tableList = (tables as unknown as SchemaTable[]) || [];
        const columnList = (columns as unknown as SchemaColumn[]) || [];

        for (const table of tableList) {
            if (table.table_name.startsWith('pg_')) continue; // Skip internal
            if (table.table_name.startsWith('supabase_')) continue; // Skip internal

            const normalizedKey = normalizeFeatureKey(table.table_name);

            // Check for specific columns to determine capabilities
            const tableColumns = columnList.filter(c => c.table_name === table.table_name);
            const hasOrgId = tableColumns.some(c => c.column_name === 'org_id' || c.column_name === 'organization_id');

            // Determine category (heuristic)
            let category = 'Support Tools';
            if (normalizedKey.includes('team') || normalizedKey.includes('athlete')) category = 'Teams & Rosters';
            if (normalizedKey.includes('event') || normalizedKey.includes('schedule')) category = 'Scheduling & Calendar';
            if (normalizedKey.includes('pay') || normalizedKey.includes('fee')) category = 'Payments';
            if (normalizedKey.includes('uniform')) category = 'Uniforms & Gear';

            discovered.push({
                featureKey: normalizedKey,
                displayName: formatDisplayName(normalizedKey),
                category: category as any,
                featureType: 'module',
                description: `Database table: ${table.table_name}`,
                discoveredFrom: ['schema'],
                discoveredKeys: [{ source: 'schema', key: table.table_name }],
                tables: [table.table_name],
                orgScoped: hasOrgId,
                platformScoped: !hasOrgId,
                confidenceScore: 75, // Reasonable confidence it exists
                needsReview: false,
                // Defaults
                manualCorrections: 0,
                integrations: [],
                routeKeys: [],
                services: [],
                edgeFunctions: [],
                dependsOn: [],
                dependencyCycles: [],
                syncedToDb: false,
                syncStatus: 'pending',
                syncErrors: [],
                visibility: { platformAdmin: true, orgAdmin: hasOrgId, coach: false, guardian: false },
                isQuantifiable: true, // Tables are usually countable
                countSource: table.table_name
            });
        }

    } catch (err) {
        console.error('Schema discovery failed (likely permissions or setup). Check RLS on information_schema.', err);
        // Return empty or throw depending on desired resilience. Return empty allows partial discovery.
    }

    return discovered;
}

export async function getSchemaHash(): Promise<string> {
    try {
        const { data, error } = await supabase.rpc('get_schema_hash'); // We might need to create this RPC
        if (error || !data) {
            // Fallback: Query tables and hash them manually if RPC missing, 
            // but strictly we should rely on a robust method.
            return Date.now().toString(); // Placeholder if RPC missing
        }
        return data as string;
    } catch {
        return Date.now().toString();
    }
}
