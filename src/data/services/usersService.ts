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
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

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
    if (USE_FAKE_DATA) {
        try {
            await simulateDelay()

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

    try {
        type OrgMemberRow = Database['public']['Tables']['organization_members']['Row']
        type OrgMemberWithUser = OrgMemberRow & {
            user: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'email' | 'display_name' | 'phone'> | null
        }

        const { data, error } = await supabase
            .from('organization_members')
            .select(
                `role, created_at, user:users(id, email, display_name, phone)`
            )
            .eq('org_id', context.orgId)

        if (error) throw error

        const byUser = new Map<string, OrgUser>()

        for (const row of (data as OrgMemberWithUser[]) ?? []) {
            if (!row.user) continue
            const existing = byUser.get(row.user.id)
            if (existing) {
                if (!existing.roles.includes(row.role)) {
                    existing.roles.push(row.role)
                }
                continue
            }

            byUser.set(row.user.id, {
                id: row.user.id,
                email: row.user.email ?? '',
                display_name: row.user.display_name ?? null,
                phone: row.user.phone ?? null,
                roles: [row.role],
                created_at: row.created_at ?? new Date().toISOString(),
            })
        }

        return { data: Array.from(byUser.values()), error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch organization users') }
    }
}
