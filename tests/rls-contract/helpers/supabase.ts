/**
 * RLS Contract Test – Supabase client factory
 *
 * Three kinds of clients:
 *   1. serviceClient  – uses service_role key. For seed/teardown ONLY.
 *   2. anonClient     – uses anon key, no auth header. Simulates anonymous.
 *   3. authedClient   – uses anon key + user JWT. Simulates a real role.
 *
 * ⚠️  NEVER use serviceClient for behavior assertions!
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env';

/** Service-role client (bypasses RLS) – seed/teardown ONLY */
export function getServiceClient(): SupabaseClient {
    return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/** Anonymous client (anon key, no auth header) */
export function getAnonClient(): SupabaseClient {
    return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * Build an authenticated client bound to a specific user JWT.
 * This simulates a real end-user making requests through the API.
 */
export function getAuthedClient(accessToken: string): SupabaseClient {
    return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
        global: {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
