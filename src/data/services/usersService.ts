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
import { DEFAULT_STAFF_PERMISSIONS } from '../../constants/permissions'
import { getUserByEmail, getUserById, fakeUsers } from '../fake/fakeUsers'
import { debug } from '../../lib/debug'


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

export interface StaffAuditLogEntry {
  id: string
  org_user_id: string
  action: string
  changed_by: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
  changed_by_user?: {
    email: string | null
    display_name: string | null
  }
}

export interface UserLookupResult {
  id: string
  email: string | null
  display_name: string | null
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
// Fake Staff Store (demo mode)
// ============================================================================

const fakeStaffStore = new Map<string, StaffMember[]>()
const fakeStaffAuditLogStore = new Map<string, StaffAuditLogEntry[]>()

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function splitName(displayName: string | null): { first: string; last: string } {
  if (!displayName) return { first: '', last: '' }
  const parts = displayName.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function ensureFakeStaff(orgId: string): StaffMember[] {
  const existing = fakeStaffStore.get(orgId)
  if (existing) return existing

  const now = new Date().toISOString()
  const seedUsers = fakeUsers.slice(0, 2)
  const seeded: StaffMember[] = seedUsers.map((user, idx) => {
    const nameParts = splitName(user.display_name)
    return {
      id: `org-user-${idx + 1}`,
      user_id: user.id,
      org_id: orgId,
      role: 'staff',
      permissions: DEFAULT_STAFF_PERMISSIONS,
      is_active: true,
      created_at: now,
      updated_at: now,
      ended_at: null,
      ended_reason: null,
      revoked_by: null,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        first_name: nameParts.first,
        last_name: nameParts.last,
      },
    }
  })

  fakeStaffStore.set(orgId, seeded)
  seeded.forEach((member) => {
    if (!fakeStaffAuditLogStore.has(member.id)) {
      fakeStaffAuditLogStore.set(member.id, [])
    }
  })

  return seeded
}

function addFakeAuditEntry(
  orgUserId: string,
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  changedBy?: UserLookupResult | null
): void {
  const entry: StaffAuditLogEntry = {
    id: uuidv4(),
    org_user_id: orgUserId,
    action,
    changed_by: changedBy?.id ?? null,
    old_values: oldValues,
    new_values: newValues,
    created_at: new Date().toISOString(),
    changed_by_user: changedBy
      ? { email: changedBy.email, display_name: changedBy.display_name }
      : undefined,
  }

  const existing = fakeStaffAuditLogStore.get(orgUserId) ?? []
  fakeStaffAuditLogStore.set(orgUserId, [entry, ...existing])
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
    console.groupCollapsed(`%cgetOrganizationUsers: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('UsersService.getOrganizationUsers', 'Request', { context: { userId: context.userId, orgId: context.orgId } })
    debug.perf.start('usersService.getOrganizationUsers')

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

        for (const row of (data as unknown as OrgMemberWithUser[]) ?? []) {
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

        debug.perf.end('usersService.getOrganizationUsers')
        debug.data('UsersService.getOrganizationUsers', 'Response', { userCount: Array.from(byUser.values()).length })
        console.groupEnd()
        return { data: Array.from(byUser.values()), error: null }
    } catch (err) {
        debug.perf.end('usersService.getOrganizationUsers')
        debug.error('UsersService.getOrganizationUsers', 'Failed to fetch organization users', { error: err, context: { userId: context.userId, orgId: context.orgId } })
        console.groupEnd()
        return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch organization users') }
    }
}

/**
 * Find a user by email (used for staff search)
 */
export async function findUserByEmail(
  email: string
): Promise<{ data: UserLookupResult | null; error: Error | null }> {
  try {
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      return { data: null, error: new Error(t('formFields.emailRequired' as any)) }
    }

    if (USE_FAKE_DATA) {
      await simulateDelay()
      const user = getUserByEmail(normalized)
      if (!user) {
        return { data: null, error: new Error(t('admin.staff.userNotFound' as any)) }
      }
      return {
        data: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
        },
        error: null,
      }
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name')
      .ilike('email', normalized)
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return { data: null, error: new Error(t('admin.staff.userNotFound' as any)) }
    }

    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('admin.staff.searchFailed' as any)),
    }
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
  console.groupCollapsed(`%caddStaffMember: ${input.user_id}`, 'color: #666; font-weight: bold;');
  debug.flow('UsersService.addStaffMember', 'Started', { input: { user_id: input.user_id }, context: { userId: context.userId, orgId: context.orgId } })
  debug.perf.start('usersService.addStaffMember')

  if (USE_FAKE_DATA) {
      try {
      await simulateDelay()

      if (!input.org_id || !input.user_id) {
        return { data: null, error: new Error(t('common.error.notFound' as any)) }
      }

      const staffList = ensureFakeStaff(input.org_id)
      const existing = staffList.find((member) => member.user_id === input.user_id)
      if (existing && existing.is_active) {
        return { data: null, error: new Error(t('common.error.alreadyExists' as any)) }
      }

      const user = getUserById(input.user_id)
      if (!user) {
        return { data: null, error: new Error(t('admin.staff.userNotFound' as any)) }
      }

      const nameParts = splitName(user.display_name)
      const now = new Date().toISOString()
      const member: StaffMember = {
        id: uuidv4(),
        user_id: user.id,
        org_id: input.org_id,
        role: 'staff',
        permissions: input.permissions ?? DEFAULT_STAFF_PERMISSIONS,
        is_active: true,
        created_at: now,
        updated_at: now,
        ended_at: null,
        ended_reason: null,
        revoked_by: null,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          first_name: nameParts.first,
          last_name: nameParts.last,
        },
      }

      const nextList = existing
        ? staffList.map((item) => (item.user_id === input.user_id ? member : item))
        : [member, ...staffList]

      fakeStaffStore.set(input.org_id, nextList)

      const changedByUser = context?.userId ? getUserById(context.userId) : undefined
      addFakeAuditEntry(
        member.id,
        'created',
        null,
        { permissions: member.permissions },
        changedByUser
          ? { id: changedByUser.id, email: changedByUser.email, display_name: changedByUser.display_name }
          : null
      )

      return { data: member, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error(t('admin.staff.errors.addStaffMemberFailed' as any)),
      }
    }
  }

  try {
    const permissionsPayload: Record<string, boolean> | null = input.permissions
      ? { ...input.permissions }
      : null
    const { error } = await supabase.rpc('add_org_role_with_permissions', {
      p_user_id: input.user_id,
      p_org_id: input.org_id,
      p_role: 'staff',
      p_permissions: permissionsPayload,
    })

    if (error) throw error

    // Fetch the created staff member
    debug.perf.end('usersService.addStaffMember')
    debug.flow('UsersService.addStaffMember', 'Staff member added successfully', { userId: input.user_id })
    console.groupEnd()
    return getStaffMember(context, input.org_id, input.user_id)
  } catch (err) {
    debug.perf.end('usersService.addStaffMember')
    debug.error('UsersService.addStaffMember', 'Failed to add staff member', { error: err, input: { userId: input.user_id }, context: { userId: context.userId, orgId: context.orgId } })
    console.groupEnd()
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
  _context: UserContext,
  orgId: string,
  userId: string
): Promise<{ data: StaffMember | null; error: Error | null }> {
  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      if (!orgId || !userId) {
        return { data: null, error: new Error(t('common.error.notFound' as any)) }
      }
      const staffList = ensureFakeStaff(orgId)
      const member = staffList.find((item) => item.user_id === userId) ?? null
      if (!member) {
        return { data: null, error: new Error(t('admin.staff.errors.getStaffMemberFailed' as any)) }
      }
      return { data: member, error: null }
    }

    const { data, error } = await supabase
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
    if (USE_FAKE_DATA) {
      await simulateDelay()
      if (!orgId) {
        return { data: [], error: new Error(t('common.error.notFound' as any)) }
      }
      return { data: ensureFakeStaff(orgId), error: null }
    }

    const { data, error } = await supabase.rpc('get_org_staff', {
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
    if (USE_FAKE_DATA) {
      await simulateDelay()
      if (!orgId || !userId) {
        return { data: null, error: new Error(t('common.error.notFound' as any)) }
      }

      const staffList = ensureFakeStaff(orgId)
      const member = staffList.find((item) => item.user_id === userId)
      if (!member) {
        return { data: null, error: new Error(t('admin.staff.errors.getStaffMemberFailed' as any)) }
      }

      const updated: StaffMember = {
        ...member,
        permissions: permissions ?? {},
        updated_at: new Date().toISOString(),
      }

      const nextList = staffList.map((item) => (item.user_id === userId ? updated : item))
      fakeStaffStore.set(orgId, nextList)

      const changedByUser = context?.userId ? getUserById(context.userId) : undefined
      addFakeAuditEntry(
        updated.id,
        'permissions_updated',
        { permissions: member.permissions },
        { permissions: updated.permissions },
        changedByUser
          ? { id: changedByUser.id, email: changedByUser.email, display_name: changedByUser.display_name }
          : null
      )

      return { data: updated, error: null }
    }

    const permissionsPayload: Record<string, boolean> = { ...permissions }
    const { error } = await supabase.rpc('update_staff_permissions', {
      p_org_id: orgId,
      p_user_id: userId,
      p_permissions: permissionsPayload,
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
    if (USE_FAKE_DATA) {
      await simulateDelay()
      if (!orgId || !userId) {
        return { data: false, error: new Error(t('common.error.notFound' as any)) }
      }

      const staffList = ensureFakeStaff(orgId)
      const member = staffList.find((item) => item.user_id === userId)
      if (!member) {
        return { data: false, error: new Error(t('admin.staff.errors.getStaffMemberFailed' as any)) }
      }

      const updated: StaffMember = {
        ...member,
        is_active: false,
        ended_at: new Date().toISOString(),
        ended_reason: reason ?? null,
        updated_at: new Date().toISOString(),
      }

      const nextList = staffList.map((item) => (item.user_id === userId ? updated : item))
      fakeStaffStore.set(orgId, nextList)

      addFakeAuditEntry(updated.id, 'revoked', { is_active: true }, { is_active: false }, null)

      return { data: true, error: null }
    }

    const { error } = await supabase.rpc('revoke_staff_access', {
      p_org_id: orgId,
      p_user_id: userId,
      p_reason: reason || undefined,
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

/**
 * Get audit log entries for a staff member
 */
export async function getStaffAuditLog(
  orgUserId: string
): Promise<{ data: StaffAuditLogEntry[]; error: Error | null }> {
  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      const entries = fakeStaffAuditLogStore.get(orgUserId) ?? []
      return { data: entries, error: null }
    }

    const { data, error } = await supabase
      .from('org_user_audit_log')
      .select(
        `
        id,
        action,
        changed_by,
        old_values,
        new_values,
        created_at,
        changed_by_user:users!org_user_audit_log_changed_by_fkey(email, display_name)
        `
      )
      .eq('org_user_id', orgUserId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return { data: (data || []) as StaffAuditLogEntry[], error: null }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('common.error.loadFailed' as any)),
    }
  }
}

// ----------------------------------------------------------------------------
// Compatibility export for tests
// ----------------------------------------------------------------------------

type ServiceResultCompat<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const usersService = {
  getUserProfile: async (): ServiceResultCompat => ({ data: null, error: null }),
  updateUserProfile: async (): ServiceResultCompat => ({ data: null, error: null }),
  deleteUserAccount: async (): ServiceResultCompat => ({ data: null, error: null }),
  updateNotificationPreferences: async (): ServiceResultCompat => ({ data: null, error: null }),
  updatePrivacySettings: async (): ServiceResultCompat => ({ data: null, error: null }),
}
