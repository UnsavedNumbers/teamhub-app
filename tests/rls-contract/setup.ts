/**
 * RLS Contract Test – Global setup/teardown
 *
 * Runs once before all contract spec files: seeds the shared test data.
 * Runs once after all: tears down all seeded data.
 *
 * Exports:
 *   seeded      – SeededData (IDs, names, membership IDs)
 *   clients     – Named, role-specific Supabase clients
 *   anonClient  – Unauthenticated client (no JWT)
 *
 * Role aliases (per RLS_MATRIX.md):
 *   clients.orgAdmin       → org_admin in test org
 *   clients.coach          → coach in test org
 *   clients.parent         → parent in test org (guardian)
 *   clients.staff          → staff in test org
 *   clients.fan            → authenticated, NO test-org membership
 *   clients.platformAdmin  → platform admin (platform_admins table)
 *   clients.orgAdmin2      → org_admin in DIFFERENT org (cross-tenant)
 *   anonClient             → unauthenticated (anon key only)
 */

import { beforeAll, afterAll } from 'vitest';
import { seedTestData } from './helpers/seed';
import { teardownTestData, cleanupStaleTestData } from './helpers/teardown';
import type { SeededData } from './helpers/seed';
import { TEST_USERS, signInAsClient } from './helpers/auth';
import { getAnonClient } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Global state (shared across all spec files) ─────────────────
export let seeded: SeededData;
export const clients: Record<string, SupabaseClient> = {};

/** Unauthenticated client for anonymous role tests */
export let anonClient: SupabaseClient;

beforeAll(async () => {
    // Clean up any stale data from previous crashed runs (best-effort)
    await cleanupStaleTestData();

    // Seed fresh test data
    seeded = await seedTestData();

    // Pre-authenticate all test users
    for (const [key, user] of Object.entries(TEST_USERS)) {
        clients[key] = await signInAsClient(user);
    }

    // Create anonymous client (no JWT, anon key only)
    anonClient = getAnonClient();
}, 120_000); // generous timeout for network calls

afterAll(async () => {
    if (seeded) {
        await teardownTestData(seeded);
    }
}, 60_000);
