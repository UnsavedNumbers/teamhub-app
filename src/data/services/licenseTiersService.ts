/**
 * License Tiers Service
 *
 * Centralized service for license tier, feature entitlements, and tier feature assignments.
 * Returns domain models (licenseTiers.types). Uses Supabase with Database types.
 * When USE_FAKE_DATA is true, delegates to licenseTiersFakeService.
 */

import { supabase } from '../../lib/supabase'
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
  license_plan: string
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
  if (USE_FAKE_DATA) return getTierByIdFake(id)

  if (!id) return null

  const { data, error } = await supabase
    .from('license_tiers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? mapTierRow(data as LicenseTierRow) : null
}

export async function getFeatures(): Promise<FeatureEntitlement[]> {
  if (USE_FAKE_DATA) return getFeaturesFake()

  const { data, error } = await supabase
    .from('feature_entitlements')
    .select('*')
    .is('archived_at', null)
    .eq('platform_admin_only', false)
    .order('category', { ascending: true })
    .order('display_name', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => mapFeatureRow(row as FeatureEntitlementRow))
}

export async function getAssignments(tierId: string): Promise<Record<string, TierFeatureAssignment>> {
  if (USE_FAKE_DATA) return getAssignmentsFake(tierId)

  if (!tierId) return {}

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
  return out
}

export async function getOrganizationsUsingTier(tierKey: string): Promise<OrgUsingTier[]> {
  if (USE_FAKE_DATA) return getOrganizationsUsingTierFake(tierKey)

  // license_plan enum values are: 'starter', 'standard', 'pro'
  // tier_key 'basic' maps to license_plan 'starter'
  // tier_key 'power' maps to license_plan 'standard' or 'pro'
  type LicensePlan = 'starter' | 'standard' | 'pro'
  const plans: LicensePlan[] =
    tierKey === 'basic' ? ['starter'] : tierKey === 'power' ? ['standard', 'pro'] : []

  if (plans.length === 0) return []

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, license_plan')
    .in('license_plan', plans)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as OrgUsingTier[]
}

export async function getArchivedFeaturesCount(tierId: string): Promise<number> {
  if (USE_FAKE_DATA) return getArchivedFeaturesCountFake(tierId)

  const { data: assignments, error: assignmentsError } = await supabase
    .from('tier_feature_assignments')
    .select('feature_entitlement_id')
    .eq('license_tier_id', tierId)
    .eq('included', true)

  if (assignmentsError) return 0
  if (!assignments?.length) return 0

  const { data: activeFeatures, error: featuresError } = await supabase
    .from('feature_entitlements')
    .select('id')
    .is('archived_at', null)

  if (featuresError) return 0
  const activeIds = new Set((activeFeatures ?? []).map((f) => f.id))
  return (assignments ?? []).filter((a) => !activeIds.has(a.feature_entitlement_id)).length
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
  if (USE_FAKE_DATA) return updateTierFake(id, input, expectedVersion)

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
      return { tier: existing!, conflict: true }
    }
    throw updateError
  }
  return { tier: mapTierRow(updated as LicenseTierRow) }
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
  if (USE_FAKE_DATA) return duplicateTierFake(id, tier, assignments)

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

  return newTier
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
  if (USE_FAKE_DATA) return saveAssignmentsFake(tierId, featureIds, assignmentsMap)

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
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

export async function verifyStripePrice(
  priceId: string,
  forceRefresh = false
): Promise<StripePriceVerification> {
  if (USE_FAKE_DATA) return verifyStripePriceFake(priceId, forceRefresh)

  if (!priceId || !priceId.startsWith('price_')) {
    return { valid: false, error: 'Invalid Price ID format' }
  }

  const { data, error } = await supabase.functions.invoke('stripe-verify-price', {
    body: { price_id: priceId },
  })

  if (error) return { valid: false, error: error.message ?? 'Verification failed' }
  return data as StripePriceVerification
}
