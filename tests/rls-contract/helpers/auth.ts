/**
 * RLS Contract Test – Auth helpers
 *
 * Signs in pre-existing test users and returns their JWTs.
 * Test users are defined in /test_users.md and must already exist
 * in the remote TEST Supabase Auth table (do NOT delete them).
 *
 * Includes retry/backoff for sign-in only (network flakiness).
 *
 * Role Mapping (per RLS_MATRIX.md):
 *   orgAdmin       → org_admin in test org
 *   coach          → coach in test org
 *   parent         → parent in test org (guardian of test athlete)
 *   staff          → staff in test org (created via seed)
 *   fan            → authenticated user with NO membership in test org
 *   platformAdmin  → platform_admins table (no org membership)
 *   orgAdmin2      → org_admin in a DIFFERENT org (cross-org/cross-tenant)
 *   anon           → unauthenticated (getAnonClient, no JWT)
 */

import { ENV } from './env';
import { getAnonClient, getAuthedClient } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Test user definitions ──────────────────────────────────────────
export interface TestUser {
    label: string;
    email: string;
    password: string;
    /** Expected role from organization_members (null = fan/anon) */
    expectedRole: 'org_admin' | 'coach' | 'parent' | 'staff' | 'fan' | 'platform_admin';
}

export const TEST_USERS: Record<string, TestUser> = {
    orgAdmin: {
        label: 'Org Admin 1',
        email: 'admin-org1@test.com',
        password: ENV.TEST_PASSWORD,
        expectedRole: 'org_admin',
    },
    coach: {
        label: 'Coach 1',
        email: 'coach-org1@test.com',
        password: ENV.TEST_PASSWORD,
        expectedRole: 'coach',
    },
    parent: {
        label: 'Guardian 1',
        email: 'parent-org1@test.com',
        password: ENV.TEST_PASSWORD,
        expectedRole: 'parent',
    },
    /**
     * Staff user – uses coach-multi@test.com which has no membership in the
     * test org until we create one during seed. This gives us a clean staff role.
     */
    staff: {
        label: 'Staff 1',
        email: 'coach-multi@test.com',
        password: ENV.TEST_PASSWORD,
        expectedRole: 'staff',
    },
    /**
     * Fan user – uses parent-org2@test.com who is authenticated but has
     * NO membership in our test org. Simulates an external fan/visitor.
     */
    fan: {
        label: 'Fan 1 (no test-org membership)',
        email: 'parent-org2@test.com',
        password: ENV.TEST_PASSWORD,
        expectedRole: 'fan',
    },
    platformAdmin: {
        label: 'Platform Admin',
        email: 'platform-admin@test.com',
        password: ENV.TEST_PASSWORD,
        expectedRole: 'platform_admin',
    },
    // Cross-org admin (Riverside) – for cross-tenant isolation tests
    orgAdmin2: {
        label: 'Org Admin 2 (cross-org)',
        email: 'admin-org2@test.com',
        password: ENV.TEST_PASSWORD,
        expectedRole: 'org_admin',
    },
};

// ── Sign-in with retry ─────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * Sign in a test user with retry/backoff.
 * Returns the access_token (JWT).
 */
export async function signIn(user: TestUser): Promise<string> {
    const client = getAnonClient();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { data, error } = await client.auth.signInWithPassword({
            email: user.email,
            password: user.password,
        });

        if (!error && data.session?.access_token) {
            return data.session.access_token;
        }

        lastError = new Error(
            `Sign-in failed for ${user.email}: ${error?.message ?? 'no session returned'}`
        );

        if (attempt < MAX_RETRIES) {
            await sleep(BASE_DELAY_MS * attempt);
        }
    }

    throw lastError!;
}

/**
 * Sign in a test user, return an authenticated Supabase client.
 */
export async function signInAsClient(user: TestUser): Promise<SupabaseClient> {
    const token = await signIn(user);
    return getAuthedClient(token);
}

/**
 * Get the user ID (auth.uid()) for a signed-in user.
 */
export async function getUserId(user: TestUser): Promise<string> {
    const token = await signIn(user);
    const client = getAuthedClient(token);
    const { data } = await client.auth.getUser();
    if (!data.user?.id) throw new Error(`Cannot get user id for ${user.email}`);
    return data.user.id;
}
