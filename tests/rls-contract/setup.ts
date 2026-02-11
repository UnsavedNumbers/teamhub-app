/**
 * RLS Contract Test – Global setup/teardown
 *
 * Runs once before all contract spec files: seeds the shared test data.
 * Runs once after all: tears down all seeded data.
 *
 * The seeded data object is available globally via `globalThis.__RLS_SEEDED__`.
 */

import { beforeAll, afterAll } from 'vitest';
import { seedTestData } from './helpers/seed';
import { teardownTestData, cleanupStaleTestData } from './helpers/teardown';
import type { SeededData } from './helpers/seed';
import { TEST_USERS, signInAsClient } from './helpers/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Global state (shared across all spec files) ─────────────────
export let seeded: SeededData;
export const clients: Record<string, SupabaseClient> = {};

beforeAll(async () => {
    // Clean up any stale data from previous crashed runs (best-effort)
    await cleanupStaleTestData();

    // Seed fresh test data
    seeded = await seedTestData();

    // Pre-authenticate all test users
    for (const [key, user] of Object.entries(TEST_USERS)) {
        clients[key] = await signInAsClient(user);
    }
}, 120_000); // generous timeout for network calls

afterAll(async () => {
    if (seeded) {
        await teardownTestData(seeded);
    }
}, 60_000);
