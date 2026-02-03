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
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { t } from '../../i18n'
import type {
  StaffMember,
  StaffMemberInput,
  StaffMemberUpdate,
} from '../../types/staffAndFan'

const supabaseAny = supabase as any

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
                `role, created_at, user:user_id(id, email, display_name, phone)`
            )
            .eq('org_id', context.orgId)

        if (error) {
            console.error('[usersService] Error fetching organization users:', error)
            // Return empty array instead of throwing to allow page to load
            return { data: [], error: new Error(error.message || 'Failed to fetch organization users') }
        }

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
        console.error('[usersService] Exception in getOrganizationUsers:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch organization users') }
    }
}

// ============================================================================
// Staff Management Functions
// ============================================================================

/**
 * Add staff member to organization
 */
export async function addStaffMember(
  context: UserContext,
  input: StaffMemberInput
): Promise<{ data: StaffMember | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    return {
      data: null,
      error: new Error(t('admin.staff.errors.staffManagementNotAvailable' as any)),
    }
  }

  try {
    const { error } = await supabaseAny.rpc('add_org_role_with_permissions', {
      p_user_id: input.user_id,
      p_org_id: input.org_id,
      p_role: 'staff',
      p_permissions: input.permissions || null,
    })

    if (error) throw error

    // Fetch the created staff member
    return getStaffMember(context, input.org_id, input.user_id)
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('admin.staff.errors.addStaffMemberFailed' as any)),
    }
  }
}

/**
 * Get staff member by org and user ID
 */
export async function getStaffMember(
  context: UserContext,
  orgId: string,
  userId: string
): Promise<{ data: StaffMember | null; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny
      .from('organization_members')
      .select(
        `
        id,
        user_id,
        org_id,
        role,
        permissions,
        is_active,
        created_at,
        updated_at,
        ended_at,
        ended_reason,
        revoked_by,
        user:users(id, email, display_name, first_name, last_name)
        `
      )
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('role', 'staff' as any)
      .single()

    if (error) throw error

    return {
      data: data as unknown as StaffMember,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('admin.staff.errors.getStaffMemberFailed' as any)),
    }
  }
}

/**
 * List all staff for an organization
 */
export async function getOrgStaff(
  _context: UserContext,
  orgId: string
): Promise<{ data: StaffMember[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny.rpc('get_org_staff', {
      p_org_id: orgId,
    })

    if (error) throw error

    return {
      data: (data || []) as unknown as StaffMember[],
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('admin.staff.errors.getOrgStaffFailed' as any)),
    }
  }
}

/**
 * Update staff permissions
 */
export async function updateStaffPermissions(
  context: UserContext,
  orgId: string,
  userId: string,
  permissions: StaffMemberUpdate['permissions']
): Promise<{ data: StaffMember | null; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('update_staff_permissions', {
      p_org_id: orgId,
      p_user_id: userId,
      p_permissions: permissions || {},
    })

    if (error) throw error

    return getStaffMember(context, orgId, userId)
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('admin.staff.errors.updateStaffPermissionsFailed' as any)),
    }
  }
}

/**
 * Revoke staff access
 */
export async function revokeStaffAccess(
  _context: UserContext,
  orgId: string,
  userId: string,
  reason?: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('revoke_staff_access', {
      p_org_id: orgId,
      p_user_id: userId,
      p_reason: reason || null,
    })

    if (error) throw error

    return { data: true, error: null }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error(t('admin.staff.errors.revokeStaffAccessFailed' as any)),
    }
  }
}
