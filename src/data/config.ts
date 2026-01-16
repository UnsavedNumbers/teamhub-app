/**
 * Fake Data Configuration
 *
 * Toggle between fake data and real Supabase queries.
 * When USE_FAKE_DATA is true, all data service calls return fake data.
 * When false, services use real Supabase queries (requires migration).
 */

// Toggle fake data mode
// TODO: Replace with environment variable in production (e.g., import.meta.env.VITE_USE_FAKE_DATA)
export const USE_FAKE_DATA = true

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
    'parent-only@example.com': 'demo-parent-only-id',
    'coach-only@example.com': 'demo-coach-only-id',
    'admin-only@example.com': 'demo-admin-only-id',
    'parent-admin@example.com': 'demo-parent-admin-id',
    'parent-coach@example.com': 'demo-parent-coach-id',
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
export const DEMO_ORG_A_ID = 'org-a-demo-id'
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
if (USE_FAKE_DATA && import.meta.env?.DEV) {
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
