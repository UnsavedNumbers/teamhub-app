/**
 * Sub-Organization Service
 * 
 * Handles sub-organization management: settings, requests, and parent org configuration.
 */

import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../utils/errorUtils'
import { notifyUsers } from './notificationServiceCore'
import { USE_FAKE_DATA } from '../config'

// ============================================================================
// Types
// ============================================================================

export interface SubOrgSettings {
  id: string
  sub_org_id: string
  enabled_sports: string[]
  enabled_features: Record<string, boolean>
  branding_overrides?: Record<string, unknown> | null
  status: 'active' | 'suspended'
  created_at: string
  updated_at: string
}

export interface SubOrgRequest {
  id: string
  parent_org_id: string
  requested_name: string
  contact_email: string
  contact_name: string
  school_league_type?: string | null
  requested_sport_codes: string[]
  status: 'pending' | 'approved' | 'rejected'
  resolved_at?: string | null
  resolved_by?: string | null
  created_sub_org_id?: string | null
  created_at: string
  updated_at: string
}

export interface ParentOrgSubConfig {
  sub_org_public_registration_enabled: boolean
  sub_org_require_approval: boolean
  sub_org_max_count?: number | null
}

export interface SubOrgWithSettings {
  id: string
  name: string
  slug: string | null
  status: string
  created_at: string
  parent_org_id: string | null
  sub_org_settings?: SubOrgSettings | null
}

export interface CreateSubOrgRequestInput {
  parent_org_id: string
  requested_name: string
  contact_email: string
  contact_name: string
  school_league_type?: string
  requested_sport_codes: string[]
}

export interface UpdateSubOrgSettingsInput {
  enabled_sports?: string[]
  enabled_features?: Record<string, boolean>
  branding_overrides?: Record<string, unknown> | null
  status?: 'active' | 'suspended'
}

export interface UpdateParentSubConfigInput {
  sub_org_public_registration_enabled?: boolean
  sub_org_require_approval?: boolean
  sub_org_max_count?: number | null
}

export interface SendSubOrgSetupInstructionsInput {
  inviterUserId: string
  invitedAdminUserId: string
  parentOrgId: string
  subOrgName: string
  publicOrgUrl: string
  note?: string
}

// ============================================================================
// Parent Org Configuration
// ============================================================================

/**
 * Get parent org sub-org configuration
 */
export async function getParentSubConfig(
  parentOrgId: string
): Promise<{ data: ParentOrgSubConfig | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('sub_org_public_registration_enabled, sub_org_require_approval, sub_org_max_count')
      .eq('id', parentOrgId)
      .maybeSingle()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    if (!data) {
      return { data: null, error: new Error('Parent organization not found') }
    }

    return {
      data: {
        sub_org_public_registration_enabled: data.sub_org_public_registration_enabled ?? false,
        sub_org_require_approval: data.sub_org_require_approval ?? true,
        sub_org_max_count: data.sub_org_max_count ?? null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * Update parent org sub-org configuration
 */
export async function updateParentSubConfig(
  parentOrgId: string,
  config: UpdateParentSubConfigInput
): Promise<{ data: ParentOrgSubConfig | null; error: Error | null }> {
  try {
    if (USE_FAKE_DATA) {
      // Demo mode: return updated config without persisting
      return {
        data: {
          sub_org_public_registration_enabled: config.sub_org_public_registration_enabled ?? false,
          sub_org_require_approval: config.sub_org_require_approval ?? true,
          sub_org_max_count: config.sub_org_max_count ?? null,
        },
        error: null,
      }
    }
    const updateData: Record<string, unknown> = {}
    if (config.sub_org_public_registration_enabled !== undefined) {
      updateData.sub_org_public_registration_enabled = config.sub_org_public_registration_enabled
    }
    if (config.sub_org_require_approval !== undefined) {
      updateData.sub_org_require_approval = config.sub_org_require_approval
    }
    if (config.sub_org_max_count !== undefined) {
      updateData.sub_org_max_count = config.sub_org_max_count
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', parentOrgId)
      .select('sub_org_public_registration_enabled, sub_org_require_approval, sub_org_max_count')
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return {
      data: {
        sub_org_public_registration_enabled: data.sub_org_public_registration_enabled ?? false,
        sub_org_require_approval: data.sub_org_require_approval ?? true,
        sub_org_max_count: data.sub_org_max_count ?? null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

// ============================================================================
// Sub-Org Settings
// ============================================================================

/**
 * Get sub-org settings
 */
export async function getSubOrgSettings(
  subOrgId: string
): Promise<{ data: SubOrgSettings | null; error: Error | null }> {
  try {
    if (USE_FAKE_DATA) {
      // Demo mode: return null (settings may not exist yet)
      return { data: null, error: null }
    }
    const { data, error } = await supabase
      .from('sub_org_settings')
      .select('*')
      .eq('sub_org_id', subOrgId)
      .maybeSingle()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    if (!data) {
      return { data: null, error: null } // Settings may not exist yet
    }

    return {
      data: {
        id: data.id,
        sub_org_id: data.sub_org_id,
        enabled_sports: data.enabled_sports ?? [],
        enabled_features: (data.enabled_features as Record<string, boolean>) ?? {},
        branding_overrides: data.branding_overrides as Record<string, unknown> | null,
        status: data.status as 'active' | 'suspended',
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * Update sub-org settings
 */
export async function updateSubOrgSettings(
  subOrgId: string,
  settings: UpdateSubOrgSettingsInput
): Promise<{ data: SubOrgSettings | null; error: Error | null }> {
  try {
    const updateData: Record<string, unknown> = {}
    if (settings.enabled_sports !== undefined) {
      updateData.enabled_sports = settings.enabled_sports
    }
    if (settings.enabled_features !== undefined) {
      updateData.enabled_features = settings.enabled_features
    }
    if (settings.branding_overrides !== undefined) {
      updateData.branding_overrides = settings.branding_overrides
    }
    if (settings.status !== undefined) {
      updateData.status = settings.status
    }

    const { data, error } = await supabase
      .from('sub_org_settings')
      .update(updateData)
      .eq('sub_org_id', subOrgId)
      .select('*')
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    // Notify sub-org admins if status changed to suspended or settings changed significantly
    if (settings.status === 'suspended') {
      await notifySubOrgAdmins(
        subOrgId,
        'sub_org_suspended',
        'Your sub-organization has been suspended by the parent organization.'
      )
    } else if (settings.enabled_sports || settings.enabled_features) {
      await notifySubOrgAdmins(
        subOrgId,
        'sub_org_settings_updated',
        'Your sub-organization settings have been updated by the parent organization.'
      )
    }

    return {
      data: {
        id: data.id,
        sub_org_id: data.sub_org_id,
        enabled_sports: data.enabled_sports ?? [],
        enabled_features: (data.enabled_features as Record<string, boolean>) ?? {},
        branding_overrides: data.branding_overrides as Record<string, unknown> | null,
        status: data.status as 'active' | 'suspended',
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

// ============================================================================
// Sub-Org Requests
// ============================================================================

/**
 * Create a sub-org registration request
 */
export async function createSubOrgRequest(
  input: CreateSubOrgRequestInput
): Promise<{ data: SubOrgRequest | null; error: Error | null }> {
  try {
    if (USE_FAKE_DATA) {
      // Demo mode: return fake request without persisting
      return {
        data: {
          id: `demo-request-${Date.now()}`,
          parent_org_id: input.parent_org_id,
          requested_name: input.requested_name,
          contact_email: input.contact_email,
          contact_name: input.contact_name,
          school_league_type: input.school_league_type ?? null,
          requested_sport_codes: input.requested_sport_codes,
          status: 'pending',
          resolved_at: null,
          resolved_by: null,
          created_sub_org_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }
    }
    const { data, error } = await supabase
      .from('sub_org_requests')
      .insert({
        parent_org_id: input.parent_org_id,
        requested_name: input.requested_name,
        contact_email: input.contact_email,
        contact_name: input.contact_name,
        school_league_type: input.school_league_type ?? null,
        requested_sport_codes: input.requested_sport_codes,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    // Notify parent org admins of new request
    await notifyParentAdminsOfRequest(
      input.parent_org_id,
      input.requested_name,
      input.contact_name
    )

    return {
      data: {
        id: data.id,
        parent_org_id: data.parent_org_id,
        requested_name: data.requested_name,
        contact_email: data.contact_email,
        contact_name: data.contact_name,
        school_league_type: data.school_league_type,
        requested_sport_codes: data.requested_sport_codes ?? [],
        status: data.status as 'pending' | 'approved' | 'rejected',
        resolved_at: data.resolved_at,
        resolved_by: data.resolved_by,
        created_sub_org_id: data.created_sub_org_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * Get sub-org requests for a parent org
 */
export async function getSubOrgRequests(
  parentOrgId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<{ data: SubOrgRequest[]; error: Error | null }> {
  try {
    let query = supabase
      .from('sub_org_requests')
      .select('*')
      .eq('parent_org_id', parentOrgId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return { data: [], error: new Error(error.message) }
    }

    return {
      data:
        data?.map((req) => ({
          id: req.id,
          parent_org_id: req.parent_org_id,
          requested_name: req.requested_name,
          contact_email: req.contact_email,
          contact_name: req.contact_name,
          school_league_type: req.school_league_type,
          requested_sport_codes: req.requested_sport_codes ?? [],
          status: req.status as 'pending' | 'approved' | 'rejected',
          resolved_at: req.resolved_at,
          resolved_by: req.resolved_by,
          created_sub_org_id: req.created_sub_org_id,
          created_at: req.created_at,
          updated_at: req.updated_at,
        })) ?? [],
      error: null,
    }
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * Get sub-organizations for a parent org
 */
export async function getSubOrgs(
  parentOrgId: string
): Promise<{ data: SubOrgWithSettings[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select(
        `
        id,
        name,
        slug,
        status,
        created_at,
        parent_org_id,
        sub_org_settings (
          id,
          sub_org_id,
          enabled_sports,
          enabled_features,
          branding_overrides,
          status,
          created_at,
          updated_at
        )
      `
      )
      .eq('parent_org_id', parentOrgId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: [], error: new Error(error.message) }
    }

    type OrgRow = {
      id: string
      name: string
      slug: string | null
      status: string
      created_at: string
      parent_org_id: string | null
      sub_org_settings: {
        id: string
        sub_org_id: string
        enabled_sports: string[]
        enabled_features: Record<string, boolean>
        branding_overrides: unknown
        status: string
        created_at: string
        updated_at: string
      } | null
    }
    const rows = (data ?? []) as OrgRow[]

    return {
      data:
        rows.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status as 'active' | 'suspended',
          created_at: org.created_at,
          parent_org_id: org.parent_org_id,
          sub_org_settings: org.sub_org_settings
            ? {
                id: org.sub_org_settings.id,
                sub_org_id: org.sub_org_settings.sub_org_id,
                enabled_sports: org.sub_org_settings.enabled_sports ?? [],
                enabled_features:
                  (org.sub_org_settings.enabled_features as Record<string, boolean>) ?? {},
                branding_overrides: org.sub_org_settings.branding_overrides as
                  | Record<string, unknown>
                  | null,
                status: org.sub_org_settings.status as 'active' | 'suspended',
                created_at: org.sub_org_settings.created_at,
                updated_at: org.sub_org_settings.updated_at,
              }
            : null,
        })),
      error: null,
    }
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * Check if parent org allows public registration and get max count
 */
export async function canCreateSubOrg(
  parentOrgId: string
): Promise<{ canCreate: boolean; reason?: string; error: Error | null }> {
  try {
    const { data: config, error: configError } = await getParentSubConfig(parentOrgId)
    if (configError || !config) {
      return { canCreate: false, reason: 'Parent org configuration not found', error: configError }
    }

    if (!config.sub_org_public_registration_enabled) {
      return { canCreate: false, reason: 'Public registration is disabled', error: null }
    }

    // Check max count if set
    if (config.sub_org_max_count !== null && config.sub_org_max_count !== undefined) {
      const { data: subOrgs, error: subOrgsError } = await getSubOrgs(parentOrgId)
      if (subOrgsError) {
        return { canCreate: false, reason: 'Failed to check sub-org count', error: subOrgsError }
      }

      if (subOrgs.length >= config.sub_org_max_count) {
        return {
          canCreate: false,
          reason: `Maximum number of sub-organizations (${config.sub_org_max_count}) reached`,
          error: null,
        }
      }
    }

    return { canCreate: true, error: null }
  } catch (err) {
    return {
      canCreate: false,
      reason: 'Unknown error',
      error: err instanceof Error ? err : new Error(getErrorMessage(err)),
    }
  }
}

/**
 * Generate a unique slug for sub-org based on name and parent
 */
async function generateSubOrgSlug(name: string, parentOrgId: string): Promise<string> {
  // Get parent org slug for prefix
  const { data: parentOrg } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', parentOrgId)
    .maybeSingle()

  const parentSlug = parentOrg?.slug || 'org'
  
  // Create base slug from name
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  // Try with parent prefix first
  let candidate = `${parentSlug}-${baseSlug}`
  let suffix = 1

  // Check uniqueness and append number if needed
  while (true) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    if (!existing) {
      return candidate
    }

    candidate = `${parentSlug}-${baseSlug}-${suffix}`
    suffix++
    
    // Safety limit
    if (suffix > 1000) {
      // Fallback to timestamp
      candidate = `${parentSlug}-${baseSlug}-${Date.now()}`
      break
    }
  }

  return candidate
}

/**
 * Create a sub-organization (Model A - auto-approval)
 */
export interface CreateSubOrgInput {
  parent_org_id: string
  name: string
  contact_email: string
  contact_name: string
  school_league_type?: string
  enabled_sport_codes: string[]
}

export async function createSubOrg(
  input: CreateSubOrgInput
): Promise<{ data: { subOrgId: string; adminUserId?: string } | null; error: Error | null }> {
  try {
    if (USE_FAKE_DATA) {
      // Demo mode: disallow creation
      return {
        data: null,
        error: new Error('Demo mode: Sub-organization creation is not available'),
      }
    }
    // Check if parent allows creation (includes max count check)
    const { canCreate, reason, error: checkError } = await canCreateSubOrg(input.parent_org_id)
    if (!canCreate || checkError) {
      return { data: null, error: new Error(reason || 'Cannot create sub-org') }
    }

    // Double-check max count using DB function (race condition protection)
    const { data: maxCountCheck, error: maxCountError } = await supabase.rpc(
      'check_max_sub_org_count',
      { p_parent_org_id: input.parent_org_id }
    )
    
    if (maxCountError || maxCountCheck === false) {
      return { 
        data: null, 
        error: new Error('Maximum number of sub-organizations reached. Please contact the parent organization.') 
      }
    }

    // Generate slug
    const slug = await generateSubOrgSlug(input.name, input.parent_org_id)

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: input.name,
        slug,
        parent_org_id: input.parent_org_id,
        inherits_license: true,
        status: 'active',
      })
      .select('id')
      .single()

    if (orgError || !orgData) {
      return { data: null, error: new Error(orgError?.message || 'Failed to create organization') }
    }

    const subOrgId = orgData.id

    // Create sub_org_settings
    const { error: settingsError } = await supabase
      .from('sub_org_settings')
      .insert({
        sub_org_id: subOrgId,
        enabled_sports: input.enabled_sport_codes,
        enabled_features: {},
        status: 'active',
      })

    if (settingsError) {
      // Cleanup org if settings creation fails
      await supabase.from('organizations').delete().eq('id', subOrgId)
      return { data: null, error: new Error(`Failed to create sub-org settings: ${settingsError.message}`) }
    }

    // Create organization_sports entries
    if (input.enabled_sport_codes.length > 0) {
      const { data: sportsData } = await supabase
        .from('sports')
        .select('id, slug')
        .in('slug', input.enabled_sport_codes)

      if (sportsData && sportsData.length > 0) {
        const sportInserts = sportsData.map((sport) => ({
          org_id: subOrgId,
          sport_id: sport.id,
        }))

        const { error: sportsError } = await supabase
          .from('organization_sports')
          .insert(sportInserts)

        if (sportsError) {
          console.warn(`Failed to create organization_sports: ${sportsError.message}`)
        }
      }
    }

    // Create admin user (via API)
    let adminUserId: string | undefined
    try {
      const { createOrganizationUser } = await import('../../api/users')
      const nameParts = input.contact_name.trim().split(/\s+/)
      const firstName = nameParts[0] || 'Admin'
      const lastName = nameParts.slice(1).join(' ') || 'User'

      const userResult = await createOrganizationUser({
        org_id: subOrgId,
        email: input.contact_email,
        first_name: firstName,
        last_name: lastName,
        phone: '', // Sub-org registration doesn't require phone
        role: 'admin',
      })

      if (userResult.success && userResult.user_id) {
        adminUserId = userResult.user_id
      }
    } catch (userErr) {
      console.warn(`Failed to create admin user: ${getErrorMessage(userErr)}`)
      // Non-fatal - org and settings are created
    }

    return { data: { subOrgId, adminUserId }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * Approve a sub-org request (Model B - approval required)
 */
export async function approveSubOrgRequest(
  requestId: string
): Promise<{ data: { subOrgId: string; adminUserId?: string } | null; error: Error | null }> {
  try {
    // Get request
    const { data: request, error: requestError } = await supabase
      .from('sub_org_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()

    if (requestError || !request) {
      return { data: null, error: new Error(requestError?.message || 'Request not found or already processed') }
    }

    // Create sub-org
    const createResult = await createSubOrg({
      parent_org_id: request.parent_org_id,
      name: request.requested_name,
      contact_email: request.contact_email,
      contact_name: request.contact_name,
      school_league_type: request.school_league_type ?? undefined,
      enabled_sport_codes: request.requested_sport_codes,
    })

    if (createResult.error || !createResult.data) {
      return createResult
    }

    const { subOrgId, adminUserId } = createResult.data

    // Update request status
    const { data: authData } = await supabase.auth.getUser()
    const resolvedBy = authData.user?.id ?? null

    const { error: updateError } = await supabase
      .from('sub_org_requests')
      .update({
        status: 'approved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        created_sub_org_id: subOrgId,
      })
      .eq('id', requestId)

    if (updateError) {
      console.warn(`Failed to update request status: ${updateError.message}`)
      // Non-fatal - org is created
    }

    // Notify requester of approval
    await notifyRequesterOfApproval(request.contact_email, request.requested_name)

    return { data: { subOrgId, adminUserId }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * Reject a sub-org request
 */
export async function rejectSubOrgRequest(
  requestId: string,
  _reason?: string
): Promise<{ error: Error | null }> {
  try {
    if (USE_FAKE_DATA) {
      // Demo mode: return success without persisting
      return { error: null }
    }
    const { data: authData } = await supabase.auth.getUser()
    const resolvedBy = authData.user?.id ?? null

    const { error } = await supabase
      .from('sub_org_requests')
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
      })
      .eq('id', requestId)
      .eq('status', 'pending')

    if (error) {
      return { error: new Error(error.message) }
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Notify parent org admins of a new sub-org registration request
 */
export async function notifyParentAdminsOfRequest(
  parentOrgId: string,
  requestName: string,
  contactName: string
): Promise<void> {
  try {
    // Get parent org admins
    const { data: admins } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', parentOrgId)
      .eq('role', 'org_admin')

    if (!admins || admins.length === 0) return

    const adminUserIds = admins.map((a) => a.user_id)

    await notifyUsers({
      userIds: adminUserIds,
      orgId: parentOrgId,
      action: 'event_created' as any, // Using existing action type for now
      roleContext: 'org_admin',
      title: 'New Sub-Organization Registration Request',
      body: `${contactName} has requested to register "${requestName}" as a sub-organization.`,
      linkUrl: `/admin/organization/sub-orgs`,
      entityType: 'organization' as any,
      entityId: parentOrgId,
    })
  } catch (err) {
    console.error('Failed to notify parent admins:', err)
  }
}

/**
 * Notify requester that their sub-org request was approved
 */
export async function notifyRequesterOfApproval(
  contactEmail: string,
  subOrgName: string
): Promise<void> {
  try {
    // Find user by email
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', contactEmail)
      .maybeSingle()

    if (!user) {
      // User doesn't exist yet - will be created with admin account
      // Email notification will be sent separately
      return
    }

    // Find the sub-org to get its org_id
    const { data: subOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', subOrgName)
      .maybeSingle()

    await notifyUsers({
      userIds: [user.id],
      orgId: subOrg?.id || '', // Use sub-org id if available
      action: 'event_created' as any, // Using existing action type for now
      roleContext: 'org_admin',
      title: 'Sub-Organization Approved',
      body: `Your request to register "${subOrgName}" has been approved. You can now log in to manage your sub-organization.`,
      linkUrl: `/portal/login`,
      entityType: 'organization' as any,
      entityId: subOrg?.id,
    })
  } catch (err) {
    console.error('Failed to notify requester:', err)
  }
}

/**
 * Notify sub-org admins of suspension or settings change
 */
export async function notifySubOrgAdmins(
  subOrgId: string,
  action: 'sub_org_suspended' | 'sub_org_settings_updated',
  message: string
): Promise<void> {
  try {
    // Get sub-org admins
    const { data: admins } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', subOrgId)
      .eq('role', 'org_admin')

    if (!admins || admins.length === 0) return

    const adminUserIds = admins.map((a) => a.user_id)

    await notifyUsers({
      userIds: adminUserIds,
      orgId: subOrgId,
      action: 'event_created' as any, // Using existing action type for now
      roleContext: 'org_admin',
      title: action === 'sub_org_suspended' ? 'Sub-Organization Suspended' : 'Settings Updated',
      body: message,
      linkUrl: `/admin/organization`,
      entityType: 'organization' as any,
      entityId: subOrgId,
    })
  } catch (err) {
    console.error('Failed to notify sub-org admins:', err)
  }
}

/**
 * Send sub-organization setup instructions to an org admin
 */
export async function sendSubOrgSetupInstructions(
  input: SendSubOrgSetupInstructionsInput
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { inviterUserId, invitedAdminUserId, parentOrgId, subOrgName, publicOrgUrl, note } = input

    // Validate required fields
    if (!inviterUserId || !invitedAdminUserId || !parentOrgId || !subOrgName || !publicOrgUrl) {
      return {
        success: false,
        error: new Error('Missing required fields: inviterUserId, invitedAdminUserId, parentOrgId, subOrgName, publicOrgUrl'),
      }
    }

    // Demo mode: return success without sending
    if (USE_FAKE_DATA) {
      return { success: true, error: null }
    }

    // Get parent org name
    const { data: parentOrg, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', parentOrgId)
      .maybeSingle()

    if (orgError || !parentOrg) {
      return {
        success: false,
        error: new Error(orgError?.message || 'Failed to fetch parent organization'),
      }
    }

    // Get invited admin user details
    const { data: invitedUser, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name, first_name, last_name')
      .eq('id', invitedAdminUserId)
      .maybeSingle()

    if (userError || !invitedUser) {
      return {
        success: false,
        error: new Error(userError?.message || 'Failed to fetch invited admin user'),
      }
    }

    // Build setup instructions body
    const steps = [
      `You've been invited to set up "${subOrgName}" as a sub-organization under ${parentOrg.name}.`,
      `Click the link below to register and complete setup.`,
      `Once registered, you'll have full admin access to manage your sub-organization's teams, athletes, and operations.`,
    ]

    if (note) {
      steps.push(`Note from ${parentOrg.name}: ${note}`)
    }

    const body = [
      `You've been invited to set up a sub-organization under ${parentOrg.name}.`,
      '',
      `Sub-Organization Name: ${subOrgName}`,
      `Parent Organization: ${parentOrg.name}`,
      '',
      'Setup Steps:',
      ...steps.map((step, idx) => `${idx + 1}. ${step}`),
      '',
      `Registration Link: ${publicOrgUrl}`,
      '',
      'Click the button below to begin setup.',
    ].join('\n')

    // Send notification with setup instructions
    // Use 'invite_sent' action which is valid and maps to 'team_invite' email template
    const notifyResult = await notifyUsers({
      userIds: [invitedAdminUserId],
      orgId: parentOrgId,
      action: 'invite_sent',
      roleContext: 'org_admin',
      title: `Set Up Sub-Organization: ${subOrgName}`,
      body,
      linkUrl: publicOrgUrl,
      entityType: 'system',
      entityId: parentOrgId,
      metadata: {
        sub_org_name: subOrgName,
        parent_org_name: parentOrg.name,
        public_org_url: publicOrgUrl,
        note: note || null,
        team_name: subOrgName, // For email subject template compatibility
      },
    })

    // Check if notification failed
    if (!notifyResult.success) {
      const errorMessage = notifyResult.error?.message || 'Failed to send notification'
      console.error('Sub-org setup notification failed:', {
        inviterUserId,
        invitedAdminUserId,
        subOrgName,
        error: errorMessage,
        inAppCount: notifyResult.inAppCount,
        emailCount: notifyResult.emailCount,
      })
      return {
        success: false,
        error: new Error(
          `Failed to send setup instructions. ${errorMessage}. ` +
          `Please try again or contact support if the problem persists.`
        ),
      }
    }

    // Log success metrics
    console.log('Sub-org setup instructions sent successfully:', {
      inviterUserId,
      invitedAdminUserId,
      subOrgName,
      inAppCount: notifyResult.inAppCount,
      emailCount: notifyResult.emailCount,
    })

    // Log event if eventLogger is available
    try {
      const { logEvent } = await import('../../utils/eventLogger')
      await logEvent({
        category: 'SUB_ORG',
        eventType: 'SEND_SETUP_INSTRUCTIONS',
        actorRole: 'org_admin',
        actorUserId: inviterUserId,
        orgId: parentOrgId,
        metadata: {
          invited_admin_user_id: invitedAdminUserId,
          invited_admin_email: invitedUser.email,
          sub_org_name: subOrgName,
        },
      })
    } catch (logErr) {
      // Non-fatal: event logging failed, but notification was sent
      console.warn('Failed to log sub-org invite event:', logErr)
    }

    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(getErrorMessage(err)),
    }
  }
}
