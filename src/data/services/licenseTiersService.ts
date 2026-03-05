/**
 * License Tiers Service
 *
 * Centralized service for license tier, feature entitlements, and tier feature assignments.
 * Returns domain models (licenseTiers.types). Uses Supabase with Database types.
 * When USE_FAKE_DATA is true, delegates to licenseTiersFakeService.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { USE_FAKE_DATA } from '../config'
import { logAuditEvent } from '../../utils/licenseEntitlementsHelpers'
import type {
  LicenseTier,
  FeatureEntitlement,
  TierFeatureAssignment,
  StripePriceVerification,
  LicenseTierKey,
  LicenseTierStatus,
} from '../../types/licenseTiers.types'
import {
  getTierById as getTierByIdFake,
  getFeatures as getFeaturesFake,
  getAssignments as getAssignmentsFake,
  getOrganizationsUsingTier as getOrganizationsUsingTierFake,
  createTier as createTierFake,
  updateTier as updateTierFake,
  archiveOrActivateTier as archiveOrActivateTierFake,
  duplicateTier as duplicateTierFake,
  saveAssignments as saveAssignmentsFake,
  verifyStripePrice as verifyStripePriceFake,
  getArchivedFeaturesCount as getArchivedFeaturesCountFake,
} from '../fake/licenseTiersFakeService'

// ---------------------------------------------------------------------------
// Domain mapping: Supabase Row -> licenseTiers.types (snake_case)
// ---------------------------------------------------------------------------

type LicenseTierRow = Database['public']['Tables']['license_tiers']['Row']
type FeatureEntitlementRow = Database['public']['Tables']['feature_entitlements']['Row']
type TierFeatureAssignmentRow = Database['public']['Tables']['tier_feature_assignments']['Row']

function mapTierRow(row: LicenseTierRow): LicenseTier {
  return {
    id: row.id,
    tier_key: row.tier_key as LicenseTierKey,
    tier_name: row.tier_name ?? '',
    description: row.description ?? null,
    stripe_price_id: row.stripe_price_id,
    stripe_verified_at: row.stripe_verified_at ?? null,
    stripe_product_name: row.stripe_product_name ?? null,
    stripe_amount_cents: row.stripe_amount_cents ?? null,
    stripe_interval: row.stripe_interval ?? null,
    stripe_currency: row.stripe_currency ?? null,
    stripe_active: row.stripe_active ?? null,
    status: (row.status ?? 'active') as LicenseTierStatus,
    version: row.version ?? 1,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

function mapFeatureRow(row: FeatureEntitlementRow): FeatureEntitlement {
  return {
    id: row.id,
    feature_key: row.feature_key,
    display_name: row.display_name ?? '',
    category: row.category ? (row.category as FeatureEntitlement['category']) : 'Admin & Permissions',
    feature_type: row.feature_type as FeatureEntitlement['feature_type'],
    description: row.description ?? null,
    rollout_status: (row.rollout_status ?? 'live') as FeatureEntitlement['rollout_status'],
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    archived_at: row.archived_at ?? null,
    platform_admin_only: row.platform_admin_only ?? false,
  }
}

function mapAssignmentRow(row: TierFeatureAssignmentRow): TierFeatureAssignment {
  return {
    id: row.id,
    license_tier_id: row.license_tier_id,
    feature_entitlement_id: row.feature_entitlement_id,
    included: row.included ?? false,
    limit_value: row.limit_value ?? null,
    role_admin: row.role_admin ?? true,
    role_coach: row.role_coach ?? true,
    role_parent: row.role_parent ?? false,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface OrgUsingTier {
  id: string
  name: string
  tier_name: string
  tier_key: string
}

export interface CreateTierInput {
  tier_key: LicenseTierKey
  tier_name: string
  description?: string | null
  stripe_price_id: string
  stripe_product_name?: string | null
  stripe_amount_cents?: number | null
  stripe_interval?: string | null
  stripe_currency?: string | null
  stripe_active?: boolean | null
  stripe_verified_at?: string | null
  status?: LicenseTierStatus
}

export interface UpdateTierInput {
  tier_name?: string
  description?: string | null
  stripe_price_id?: string
  stripe_product_name?: string | null
  stripe_amount_cents?: number | null
  stripe_interval?: string | null
  stripe_currency?: string | null
  stripe_active?: boolean | null
  stripe_verified_at?: string | null
  status?: LicenseTierStatus
}

export interface AssignmentInput {
  included: boolean
  limit_value: number | null
  role_admin: boolean
  role_coach: boolean
  role_parent: boolean
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getTierById(id: string): Promise<LicenseTier | null> {
  console.groupCollapsed(`%cgetTierById: ${id}`, 'color: #666; font-weight: bold;');
  debug.data('LicenseTiersService.getTierById', 'Request', { id })
  debug.perf.start('licenseTiersService.getTierById')

  if (USE_FAKE_DATA) {
    const result = getTierByIdFake(id)
    debug.perf.end('licenseTiersService.getTierById')
    debug.data('LicenseTiersService.getTierById', 'Response (fake)', { id, hasData: !!result })
    console.groupEnd()
    return result
  }

  if (!id) {
    debug.perf.end('licenseTiersService.getTierById')
    debug.data('LicenseTiersService.getTierById', 'Response (no id)', { id })
    console.groupEnd()
    return null
  }

  try {
    const { data, error } = await supabase
      .from('license_tiers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        debug.perf.end('licenseTiersService.getTierById')
        debug.data('LicenseTiersService.getTierById', 'Response (not found)', { id })
        console.groupEnd()
        return null
      }
      throw error
    }
    const result = data ? mapTierRow(data as LicenseTierRow) : null
    debug.perf.end('licenseTiersService.getTierById')
    debug.data('LicenseTiersService.getTierById', 'Response', { id, hasData: !!result })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('licenseTiersService.getTierById')
    debug.error('LicenseTiersService.getTierById', 'Failed to get tier', { error: err, id })
    console.groupEnd()
    throw err
  }
}

export async function getFeatures(): Promise<FeatureEntitlement[]> {
  console.groupCollapsed(`%cgetFeatures`, 'color: #666; font-weight: bold;');
  debug.data('LicenseTiersService.getFeatures', 'Request')
  debug.perf.start('licenseTiersService.getFeatures')

  if (USE_FAKE_DATA) {
    const result = await getFeaturesFake()
    debug.perf.end('licenseTiersService.getFeatures')
    debug.data('LicenseTiersService.getFeatures', 'Response (fake)', { featureCount: result.length })
    console.groupEnd()
    return result
  }

  try {
    const { data, error } = await supabase
      .from('feature_entitlements')
      .select('*')
      .is('archived_at', null)
      .eq('platform_admin_only', false)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) throw error
    const result = (data ?? []).map((row) => mapFeatureRow(row as FeatureEntitlementRow))
    debug.perf.end('licenseTiersService.getFeatures')
    debug.data('LicenseTiersService.getFeatures', 'Response', { featureCount: result.length })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('licenseTiersService.getFeatures')
    debug.error('LicenseTiersService.getFeatures', 'Failed to get features', { error: err })
    console.groupEnd()
    throw err
  }
}

export async function getActiveTiers(): Promise<LicenseTier[]> {
  console.groupCollapsed('%cgetActiveTiers', 'color: #666; font-weight: bold;');
  debug.data('LicenseTiersService.getActiveTiers', 'Request')
  debug.perf.start('licenseTiersService.getActiveTiers')

  if (USE_FAKE_DATA) {
    // Return fake tiers
    const fakeTiers: LicenseTier[] = [
      {
        id: 'fake-tier-1',
        tier_key: 'tier1',
        tier_name: 'Starter',
        description: 'Core scheduling and roster tools for small programs.',
        stripe_price_id: 'price_fake_starter',
        stripe_verified_at: null,
        stripe_product_name: null,
        stripe_amount_cents: 29900,
        stripe_interval: 'year',
        stripe_currency: 'usd',
        stripe_active: true,
        status: 'active',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'fake-tier-2',
        tier_key: 'tier2',
        tier_name: 'Growth',
        description: 'Full suite with travel, tryouts, and advanced insights.',
        stripe_price_id: 'price_fake_growth',
        stripe_verified_at: null,
        stripe_product_name: null,
        stripe_amount_cents: 99900,
        stripe_interval: 'year',
        stripe_currency: 'usd',
        stripe_active: true,
        status: 'active',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'fake-tier-3',
        tier_key: 'tier3',
        tier_name: 'Professional',
        description: 'Enterprise-grade tools with white-labeling, advanced analytics, and priority support.',
        stripe_price_id: 'price_fake_professional',
        stripe_verified_at: null,
        stripe_product_name: null,
        stripe_amount_cents: 199900,
        stripe_interval: 'year',
        stripe_currency: 'usd',
        stripe_active: true,
        status: 'active',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    debug.perf.end('licenseTiersService.getActiveTiers')
    debug.data('LicenseTiersService.getActiveTiers', 'Response (fake)', { count: fakeTiers.length })
    console.groupEnd()
    return fakeTiers
  }

  try {
    const { data, error } = await supabase
      .from('license_tiers')
      .select('*')
      .eq('status', 'active')
      .order('tier_key', { ascending: true })

    if (error) {
      throw error
    }

    const result = (data || []).map(row => mapTierRow(row as LicenseTierRow))
    debug.perf.end('licenseTiersService.getActiveTiers')
    debug.data('LicenseTiersService.getActiveTiers', 'Response', { count: result.length })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('licenseTiersService.getActiveTiers')
    debug.error('LicenseTiersService.getActiveTiers', 'Failed to get active tiers', { error: err })
    console.groupEnd()
    throw err
  }
}

export async function getAssignments(tierId: string): Promise<Record<string, TierFeatureAssignment>> {
  console.groupCollapsed(`%cgetAssignments: ${tierId}`, 'color: #666; font-weight: bold;');
  debug.data('LicenseTiersService.getAssignments', 'Request', { tierId })
  debug.perf.start('licenseTiersService.getAssignments')

  if (USE_FAKE_DATA) {
    const result = getAssignmentsFake(tierId)
    debug.perf.end('licenseTiersService.getAssignments')
    debug.data('LicenseTiersService.getAssignments', 'Response (fake)', { tierId, assignmentCount: Object.keys(result).length })
    console.groupEnd()
    return result
  }

  if (!tierId) {
    debug.perf.end('licenseTiersService.getAssignments')
    debug.data('LicenseTiersService.getAssignments', 'Response (no tierId)', { tierId })
    console.groupEnd()
    return {}
  }

  try {
    const { data, error } = await supabase
      .from('tier_feature_assignments')
      .select('*')
      .eq('license_tier_id', tierId)

    if (error) throw error

    const out: Record<string, TierFeatureAssignment> = {}
    for (const row of data ?? []) {
      const mapped = mapAssignmentRow(row as TierFeatureAssignmentRow)
      out[mapped.feature_entitlement_id] = mapped
    }
    debug.perf.end('licenseTiersService.getAssignments')
    debug.data('LicenseTiersService.getAssignments', 'Response', { tierId, assignmentCount: Object.keys(out).length })
    console.groupEnd()
    return out
  } catch (err) {
    debug.perf.end('licenseTiersService.getAssignments')
    debug.error('LicenseTiersService.getAssignments', 'Failed to get assignments', { error: err, tierId })
    console.groupEnd()
    throw err
  }
}

export async function getOrganizationsUsingTier(tierKey: string): Promise<OrgUsingTier[]> {
  console.groupCollapsed(`%cgetOrganizationsUsingTier: ${tierKey}`, 'color: #666; font-weight: bold;');
  debug.data('LicenseTiersService.getOrganizationsUsingTier', 'Request', { tierKey })
  debug.perf.start('licenseTiersService.getOrganizationsUsingTier')

  if (USE_FAKE_DATA) {
    const result = await getOrganizationsUsingTierFake(tierKey)
    debug.perf.end('licenseTiersService.getOrganizationsUsingTier')
    debug.data('LicenseTiersService.getOrganizationsUsingTier', 'Response (fake)', { tierKey, orgCount: result.length })
    console.groupEnd()
    return result
  }

  // Look up tier by tier_key, then query organizations by current_tier_id
  const { data: tier, error: tierError } = await supabase
    .from('license_tiers')
    .select('id, tier_name, tier_key')
    .eq('tier_key', tierKey)
    .eq('status', 'active')
    .maybeSingle()

  if (tierError || !tier) {
    debug.perf.end('licenseTiersService.getOrganizationsUsingTier')
    debug.data('LicenseTiersService.getOrganizationsUsingTier', 'Response (tier not found)', { tierKey })
    console.groupEnd()
    return []
  }

  try {
    // Use typed assertion to avoid "excessively deep" inference (current_tier_id may exist before types are regenerated)
    type OrgWithTierRow = { id: string; name: string; current_tier_id?: string | null; license_tiers?: { tier_name: string; tier_key: string } | null }
    const { data, error } = await (supabase as any)
      .from('organizations')
      .select('id, name, current_tier_id, license_tiers:current_tier_id(tier_name, tier_key)')
      .eq('current_tier_id', tier.id)
      .order('name', { ascending: true }) as { data: OrgWithTierRow[] | null; error: Error | null }

    if (error) {
      console.error('[getOrganizationsUsingTier] Query error:', error)
      throw error
    }
    
    // Debug: Log query results
    if (process.env.NODE_ENV === 'development') {
      console.log('[getOrganizationsUsingTier] Query results:', {
        tierId: tier.id,
        tierKey: tier.tier_key,
        orgCount: data?.length ?? 0,
        orgs: data?.map(org => ({
          id: org.id,
          name: org.name,
          current_tier_id: org.current_tier_id,
          tier_name_from_join: org.license_tiers?.tier_name,
        })),
      })
    }
    
    // Map response to OrgUsingTier format
    // Use tier.tier_name as fallback if JOIN didn't return tier_name (handles NULL tier_name in database)
    const result: OrgUsingTier[] = (data ?? []).map((org: OrgWithTierRow) => ({
      id: org.id,
      name: org.name,
      tier_name: org.license_tiers?.tier_name ?? tier.tier_name,
      tier_key: org.license_tiers?.tier_key ?? tier.tier_key,
    }))
    
    debug.perf.end('licenseTiersService.getOrganizationsUsingTier')
    debug.data('LicenseTiersService.getOrganizationsUsingTier', 'Response', { tierKey, orgCount: result.length })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('licenseTiersService.getOrganizationsUsingTier')
    debug.error('LicenseTiersService.getOrganizationsUsingTier', 'Failed to get organizations', { error: err, tierKey })
    console.groupEnd()
    throw err
  }
}

export async function getArchivedFeaturesCount(tierId: string): Promise<number> {
  console.groupCollapsed(`%cgetArchivedFeaturesCount: ${tierId}`, 'color: #666; font-weight: bold;');
  debug.data('LicenseTiersService.getArchivedFeaturesCount', 'Request', { tierId })
  debug.perf.start('licenseTiersService.getArchivedFeaturesCount')

  if (USE_FAKE_DATA) {
    const result = getArchivedFeaturesCountFake(tierId)
    debug.perf.end('licenseTiersService.getArchivedFeaturesCount')
    debug.data('LicenseTiersService.getArchivedFeaturesCount', 'Response (fake)', { tierId, count: result })
    console.groupEnd()
    return result
  }

  try {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('tier_feature_assignments')
      .select('feature_entitlement_id')
      .eq('license_tier_id', tierId)
      .eq('included', true)

    if (assignmentsError) {
      debug.perf.end('licenseTiersService.getArchivedFeaturesCount')
      debug.error('LicenseTiersService.getArchivedFeaturesCount', 'Failed to get assignments', { error: assignmentsError, tierId })
      console.groupEnd()
      return 0
    }
    if (!assignments?.length) {
      debug.perf.end('licenseTiersService.getArchivedFeaturesCount')
      debug.data('LicenseTiersService.getArchivedFeaturesCount', 'Response (no assignments)', { tierId, count: 0 })
      console.groupEnd()
      return 0
    }

    const { data: activeFeatures, error: featuresError } = await supabase
      .from('feature_entitlements')
      .select('id')
      .is('archived_at', null)

    if (featuresError) {
      debug.perf.end('licenseTiersService.getArchivedFeaturesCount')
      debug.error('LicenseTiersService.getArchivedFeaturesCount', 'Failed to get active features', { error: featuresError, tierId })
      console.groupEnd()
      return 0
    }
    const activeIds = new Set((activeFeatures ?? []).map((f) => f.id))
    const count = (assignments ?? []).filter((a) => !activeIds.has(a.feature_entitlement_id)).length
    debug.perf.end('licenseTiersService.getArchivedFeaturesCount')
    debug.data('LicenseTiersService.getArchivedFeaturesCount', 'Response', { tierId, count })
    console.groupEnd()
    return count
  } catch (err) {
    debug.perf.end('licenseTiersService.getArchivedFeaturesCount')
    debug.error('LicenseTiersService.getArchivedFeaturesCount', 'Exception getting archived features count', { error: err, tierId })
    console.groupEnd()
    throw err
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function createTier(input: CreateTierInput): Promise<LicenseTier> {
  if (USE_FAKE_DATA) return createTierFake(input)

  type Insert = Database['public']['Tables']['license_tiers']['Insert']
  const insertData: Insert = {
    tier_key: input.tier_key,
    tier_name: input.tier_name,
    description: input.description ?? null,
    stripe_price_id: input.stripe_price_id,
    stripe_product_name: input.stripe_product_name ?? null,
    stripe_amount_cents: input.stripe_amount_cents ?? null,
    stripe_interval: input.stripe_interval ?? null,
    stripe_currency: input.stripe_currency ?? null,
    stripe_active: input.stripe_active ?? null,
    stripe_verified_at: input.stripe_verified_at ?? null,
    status: input.status ?? 'active',
  }

  const { data, error } = await supabase.from('license_tiers').insert(insertData).select().single()
  if (error) throw error
  return mapTierRow(data as LicenseTierRow)
}

export async function updateTier(
  id: string,
  input: UpdateTierInput,
  expectedVersion: number
): Promise<{ tier: LicenseTier; conflict?: boolean }> {
  console.groupCollapsed(`%cupdateTier: ${id}`, 'color: #666; font-weight: bold;');
  debug.flow('LicenseTiersService.updateTier', 'Updating tier', { id, expectedVersion, updates: Object.keys(input) })
  debug.perf.start('licenseTiersService.updateTier')

  if (USE_FAKE_DATA) {
    const result = await updateTierFake(id, input, expectedVersion)
    debug.perf.end('licenseTiersService.updateTier')
    debug.flow('LicenseTiersService.updateTier', 'Tier updated (fake)', { id, hasConflict: !!result.conflict })
    console.groupEnd()
    return result
  }

  try {
    const { data: current, error: fetchError } = await supabase
      .from('license_tiers')
      .select('version')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if ((current as { version: number })?.version !== expectedVersion) {
      const existing = await getTierById(id)
      debug.perf.end('licenseTiersService.updateTier')
      debug.error('LicenseTiersService.updateTier', 'Version conflict', { id, expectedVersion, currentVersion: (current as { version: number })?.version })
      console.groupEnd()
      return { tier: existing!, conflict: true }
    }

    type Update = Database['public']['Tables']['license_tiers']['Update']
    const updateData: Update = {
      tier_name: input.tier_name,
      description: input.description ?? null,
      stripe_price_id: input.stripe_price_id,
      stripe_product_name: input.stripe_product_name ?? null,
      stripe_amount_cents: input.stripe_amount_cents ?? null,
      stripe_interval: input.stripe_interval ?? null,
      stripe_currency: input.stripe_currency ?? null,
      stripe_active: input.stripe_active ?? null,
      stripe_verified_at: input.stripe_verified_at ?? null,
      status: input.status,
    }

    const { data: updated, error: updateError } = await supabase
      .from('license_tiers')
      .update(updateData)
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116' || updateError.message?.includes('0 rows')) {
        const existing = await getTierById(id)
        debug.perf.end('licenseTiersService.updateTier')
        debug.error('LicenseTiersService.updateTier', 'Update conflict (no rows)', { id, expectedVersion })
        console.groupEnd()
        return { tier: existing!, conflict: true }
      }
      throw updateError
    }
    const result = { tier: mapTierRow(updated as LicenseTierRow) }
    debug.perf.end('licenseTiersService.updateTier')
    debug.flow('LicenseTiersService.updateTier', 'Tier updated successfully', { id })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('licenseTiersService.updateTier')
    debug.error('LicenseTiersService.updateTier', 'Failed to update tier', { error: err, id })
    console.groupEnd()
    throw err
  }
}

export async function archiveOrActivateTier(
  id: string,
  expectedVersion: number,
  currentStatus: LicenseTierStatus
): Promise<{ tier: LicenseTier; conflict?: boolean }> {
  if (USE_FAKE_DATA) return archiveOrActivateTierFake(id, expectedVersion, currentStatus)

  const { data: current, error: fetchError } = await supabase
    .from('license_tiers')
    .select('version')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError
  if ((current as { version: number })?.version !== expectedVersion) {
    const existing = await getTierById(id)
    return { tier: existing!, conflict: true }
  }

  const newStatus: LicenseTierStatus = currentStatus === 'active' ? 'archived' : 'active'
  type Update = Database['public']['Tables']['license_tiers']['Update']
  const updateData: Update = { status: newStatus }

  const { data: updated, error: updateError } = await supabase
    .from('license_tiers')
    .update(updateData)
    .eq('id', id)
    .eq('version', expectedVersion)
    .select()
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116' || updateError.message?.includes('0 rows')) {
      const existing = await getTierById(id)
      return { tier: existing!, conflict: true }
    }
    throw updateError
  }
  return { tier: mapTierRow(updated as LicenseTierRow) }
}

export async function duplicateTier(
  id: string,
  tier: LicenseTier,
  assignments: Record<string, TierFeatureAssignment>
): Promise<LicenseTier> {
  console.groupCollapsed(`%cduplicateTier: ${id}`, 'color: #666; font-weight: bold;');
  debug.flow('LicenseTiersService.duplicateTier', 'Duplicating tier', { id, tierName: tier.tier_name, assignmentCount: Object.keys(assignments).length })
  debug.perf.start('licenseTiersService.duplicateTier')

  if (USE_FAKE_DATA) {
    const result = await duplicateTierFake(id, tier, assignments)
    debug.perf.end('licenseTiersService.duplicateTier')
    debug.flow('LicenseTiersService.duplicateTier', 'Tier duplicated (fake)', { id, newTierId: result.id })
    console.groupEnd()
    return result
  }

  try {
    const newTier = await createTier({
    tier_key: tier.tier_key,
    tier_name: `${tier.tier_name} (Copy)`,
    description: tier.description ?? null,
    stripe_price_id: `pending_duplicate_${id}_${Date.now()}`, // Must be replaced with real Stripe Price ID
    stripe_product_name: tier.stripe_product_name ?? null,
    stripe_amount_cents: tier.stripe_amount_cents ?? null,
    stripe_interval: tier.stripe_interval ?? null,
    stripe_currency: tier.stripe_currency ?? null,
    stripe_active: tier.stripe_active ?? null,
    status: 'active',
  })

  type Insert = Database['public']['Tables']['tier_feature_assignments']['Insert']
  const entries = Object.entries(assignments).filter(([, a]) => a.included)
  for (const [featureId, a] of entries) {
    const insertData: Insert = {
      license_tier_id: newTier.id,
      feature_entitlement_id: featureId,
      included: a.included,
      limit_value: a.limit_value ?? null,
      role_admin: a.role_admin ?? true,
      role_coach: a.role_coach ?? true,
      role_parent: a.role_parent ?? false,
    }
    await supabase.from('tier_feature_assignments').upsert(insertData, {
      onConflict: 'license_tier_id,feature_entitlement_id',
    })
  }

    await logAuditEvent({
      action: 'tier_duplicated',
      targetType: 'tier',
      targetId: newTier.id,
      beforeState: null,
      afterState: newTier as unknown as Record<string, unknown>,
      reason: `Duplicated from tier ${id}`,
    })

    debug.perf.end('licenseTiersService.duplicateTier')
    debug.flow('LicenseTiersService.duplicateTier', 'Tier duplicated successfully', { id, newTierId: newTier.id })
    console.groupEnd()
    return newTier
  } catch (err) {
    debug.perf.end('licenseTiersService.duplicateTier')
    debug.error('LicenseTiersService.duplicateTier', 'Failed to duplicate tier', { error: err, id })
    console.groupEnd()
    throw err
  }
}

/**
 * Persist assignments for a tier. Upserts one row per feature (from featureIds);
 * for each feature, uses assignment from map if present, otherwise default (included: false).
 */
export async function saveAssignments(
  tierId: string,
  featureIds: string[],
  assignmentsMap: Record<string, TierFeatureAssignment>
): Promise<void> {
  console.groupCollapsed(`%csaveAssignments: ${tierId}`, 'color: #666; font-weight: bold;');
  debug.flow('LicenseTiersService.saveAssignments', 'Saving assignments', { tierId, featureCount: featureIds.length })
  debug.perf.start('licenseTiersService.saveAssignments')

  if (USE_FAKE_DATA) {
    await saveAssignmentsFake(tierId, featureIds, assignmentsMap)
    debug.perf.end('licenseTiersService.saveAssignments')
    debug.flow('LicenseTiersService.saveAssignments', 'Assignments saved (fake)', { tierId })
    console.groupEnd()
    return
  }

  try {
    type Insert = Database['public']['Tables']['tier_feature_assignments']['Insert']
    for (const featureId of featureIds) {
      const a = assignmentsMap[featureId]
      const included = a?.included ?? false
      const insertData: Insert = {
        license_tier_id: tierId,
        feature_entitlement_id: featureId,
        included,
        limit_value: a?.limit_value ?? null,
        role_admin: a?.role_admin ?? true,
        role_coach: a?.role_coach ?? true,
        role_parent: a?.role_parent ?? false,
      }
      const { error } = await supabase.from('tier_feature_assignments').upsert(insertData, {
        onConflict: 'license_tier_id,feature_entitlement_id',
      })
      if (error) throw error
    }
    debug.perf.end('licenseTiersService.saveAssignments')
    debug.flow('LicenseTiersService.saveAssignments', 'Assignments saved successfully', { tierId, featureCount: featureIds.length })
    console.groupEnd()
  } catch (err) {
    debug.perf.end('licenseTiersService.saveAssignments')
    debug.error('LicenseTiersService.saveAssignments', 'Failed to save assignments', { error: err, tierId })
    console.groupEnd()
    throw err
  }
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

export async function verifyStripePrice(
  priceId: string,
  forceRefresh = false
): Promise<StripePriceVerification> {
  console.groupCollapsed(`%cverifyStripePrice: ${priceId}`, 'color: #666; font-weight: bold;');
  debug.data('LicenseTiersService.verifyStripePrice', 'Request', { priceId, forceRefresh })
  debug.perf.start('licenseTiersService.verifyStripePrice')

  if (USE_FAKE_DATA) {
    const result = await verifyStripePriceFake(priceId, forceRefresh)
    debug.perf.end('licenseTiersService.verifyStripePrice')
    debug.data('LicenseTiersService.verifyStripePrice', 'Response (fake)', { priceId, valid: result.valid })
    console.groupEnd()
    return result
  }

  try {
    if (!priceId || !priceId.startsWith('price_')) {
      debug.perf.end('licenseTiersService.verifyStripePrice')
      debug.error('LicenseTiersService.verifyStripePrice', 'Invalid Price ID format', { priceId })
      console.groupEnd()
      return { valid: false, error: 'Invalid Price ID format' }
    }

    const { data, error } = await supabase.functions.invoke('stripe-verify-price', {
      body: { price_id: priceId },
    })

    if (error) {
      debug.perf.end('licenseTiersService.verifyStripePrice')
      debug.error('LicenseTiersService.verifyStripePrice', 'Verification failed', { error, priceId })
      console.groupEnd()
      return { valid: false, error: error.message ?? 'Verification failed' }
    }
    const result = data as StripePriceVerification
    debug.perf.end('licenseTiersService.verifyStripePrice')
    debug.data('LicenseTiersService.verifyStripePrice', 'Response', { priceId, valid: result.valid })
    console.groupEnd()
    return result
  } catch (err) {
    debug.perf.end('licenseTiersService.verifyStripePrice')
    debug.error('LicenseTiersService.verifyStripePrice', 'Exception verifying Stripe price', { error: err, priceId })
    console.groupEnd()
    throw err
  }
}
