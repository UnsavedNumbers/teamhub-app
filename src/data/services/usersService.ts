/**
 * Users Service
 *
 * Provides data access for user management.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'

// ============================================================================
// Types
// ============================================================================

export interface OrgUser {
    id: string
    email: string
    display_name: string | null
    phone: string | null
    roles: string[]
    created_at: string
}

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get users for organization
 */
export async function getOrganizationUsers(
    context: UserContext
): Promise<{ data: OrgUser[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        // Return demo users
        const demoUsers: OrgUser[] = [
            {
                id: context.userId,
                email: 'admin@example.com',
                display_name: 'Admin User',
                phone: null,
                roles: ['admin'],
                created_at: new Date().toISOString(),
            },
        ]

        return { data: demoUsers, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
