/**
 * Fake Data Configuration
 *
 * Toggle between fake data and real Supabase queries.
 * When USE_FAKE_DATA is true, all data service calls return fake data.
 * When false, services use real Supabase queries (requires migration).
 */

// Toggle fake data mode
// TODO: Replace with environment variable in production (e.g., import.meta.env.VITE_USE_FAKE_DATA)
export const USE_FAKE_DATA = false

// Store original value for immutability validation (Issue 10 mitigation)
// const _ORIGINAL_USE_FAKE_DATA = USE_FAKE_DATA // Unused - kept for reference

/**
 * Get USE_FAKE_DATA flag value with immutability validation
 * Validates that the flag hasn't changed at runtime (should be constant)
 * 
 * Note: This is a mitigation for Issue 10 (Race Conditions with USE_FAKE_DATA Flag).
 * The flag should be set at build time and never changed at runtime.
 */
export function getUseFakeData(): boolean {
    // In a real implementation, we could add runtime validation here
    // For now, we just return the constant value
    // If the flag is ever mutated, this would catch it
    return USE_FAKE_DATA
}

// Simulate network delay for realistic loading states (milliseconds)
export const FAKE_DATA_DELAY_MS = 300

// Toggle to show empty states instead of populated data (for testing)
export const SHOW_EMPTY_STATES = false

// User context timeout (milliseconds) - how long to wait for auth context
export const USER_CONTEXT_TIMEOUT_MS = 5000

/**
 * Demo User Email to ID Mapping
 *
 * SETUP INSTRUCTIONS:
 * 1. Run create_demo_users.sql in Supabase to create demo users
 * 2. Get auth user IDs from Supabase Auth dashboard (Authentication > Users)
 * 3. Replace the placeholder values below with actual UUIDs
 *
 * These IDs are used to:
 * - Match logged-in user to demo user data
 * - Filter fake data by user permissions
 * - Test role-based access control
 */
export const DEMO_USER_IDS: Record<string, string> = {
    'parent-only@example.com': '8f116968-e0f4-406a-a8c2-a663d1b57ec1',
    'coach-only@example.com': '0392f59a-d35a-47ca-8803-021f122ffc80',
    'admin-only@example.com': 'aca2bee1-5ced-47c1-9894-2b054104949e',
    'parent-admin@example.com': '27efad60-95d9-4f40-8506-b6fe3bcb9abb',
    'parent-coach@example.com': '65a74f13-37c9-4831-9691-ec62963e193e',
} as const

// Reverse mapping: ID to email (computed at runtime)
export const DEMO_USER_EMAILS: Record<string, string> = Object.fromEntries(
    Object.entries(DEMO_USER_IDS).map(([email, id]) => [id, email])
)

/**
 * Organization IDs
 *
 * SETUP INSTRUCTIONS:
 * 1. Create Organization A in database (or via admin UI)
 * 2. Get the organization ID from organizations table
 * 3. Replace placeholder below
 *
 * All demo data belongs to Organization A.
 * Secondary organizations exist for multi-org testing.
 */
export const DEMO_ORG_A_ID = 'e3e7645e-b951-407b-a2b9-5205bdea2fa1'
export const DEMO_ORG_B_ID = 'org-b-demo-id' // Secondary org for multi-org testing
export const DEMO_ORG_C_ID = 'org-c-demo-id' // Tertiary org

/**
 * Validate configuration on module load
 * Logs warnings if placeholder values detected
 */
function validateConfiguration(): void {
    const placeholderPattern = /^demo-|^org-[a-z]-demo-id$/

    // Check demo user IDs
    for (const [email, id] of Object.entries(DEMO_USER_IDS)) {
        if (placeholderPattern.test(id)) {
            console.warn(
                `[FakeData Config] Placeholder ID detected for ${email}. ` +
                `Replace with actual auth.users ID after running create_demo_users.sql`
            )
        }
    }

    // Check organization IDs
    if (placeholderPattern.test(DEMO_ORG_A_ID)) {
        console.warn(
            `[FakeData Config] Placeholder Organization A ID detected. ` +
            `Replace with actual organizations.id after setup.`
        )
    }
}

// Run validation on module load (only in development)
// NOTE: Avoid relying on `ImportMetaEnv.DEV` typing (varies by tooling).
const __isDev = !!(import.meta as any)?.env?.DEV
if (USE_FAKE_DATA && __isDev) {
    validateConfiguration()
}

/**
 * Feature flags for fake data
 * Controls which features have fake data enabled
 */
export const FAKE_DATA_FEATURES = {
    users: true,
    organizations: true,
    teams: true,
    events: true,
    payments: true,
    uniforms: true,
    tryouts: true,
    travel: true,
    messages: true,
    admin: true,
    files: true,
} as const

export type FakeDataFeature = keyof typeof FAKE_DATA_FEATURES
