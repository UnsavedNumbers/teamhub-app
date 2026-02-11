/**
 * RLS Contract Test – Environment configuration
 *
 * Loads env vars required for running against the remote TEST project.
 * Fails fast with a clear message if any required var is missing.
 */

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `[rls-contract] Missing required env var: ${name}.\n` +
            'Copy .env.test.example → .env.test and fill in the values.'
        );
    }
    return value;
}

function optionalEnv(name: string, fallback: string): string {
    return process.env[name] ?? fallback;
}

export const ENV = {
    /** Supabase TEST project URL */
    SUPABASE_URL: requireEnv('SUPABASE_TEST_URL'),

    /** Supabase TEST anon key (used for role-authenticated clients) */
    SUPABASE_ANON_KEY: requireEnv('SUPABASE_TEST_ANON_KEY'),

    /** Supabase TEST service-role key (setup/teardown ONLY) */
    SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_TEST_SERVICE_ROLE_KEY'),

    /** Storage bucket to test (optional – defaults to public-media) */
    STORAGE_BUCKET: optionalEnv('SUPABASE_TEST_STORAGE_BUCKET', 'public-media'),

    /** Shared test-user password */
    TEST_PASSWORD: optionalEnv('CONTRACT_TEST_PASSWORD', 'TestPassword123!'),
} as const;
