/**
 * License Tiers Fake Service
 *
 * Demo implementation for license tier, features, and assignments.
 * Same method signatures as licenseTiersService; used when USE_FAKE_DATA is true.
 */

import { FAKE_DATA_DELAY_MS } from '../config'
import type {
  LicenseTier,
  FeatureEntitlement,
  TierFeatureAssignment,
  StripePriceVerification,
  LicenseTierKey,
  LicenseTierStatus,
} from '../../types/licenseTiers.types'
import type {
  CreateTierInput,
  UpdateTierInput,
  OrgUsingTier,
} from '../services/licenseTiersService'

// ---------------------------------------------------------------------------
// In-memory store (reset per session)
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString()

const fakeTiers: LicenseTier[] = [
  {
    id: 'tier-basic-fake',
    tier_key: 'basic',
    tier_name: 'Basic License',
    description: 'For small clubs',
    stripe_price_id: 'price_fake_basic',
    stripe_verified_at: now(),
    stripe_product_name: 'Basic',
    stripe_amount_cents: 2900,
    stripe_interval: 'year',
    stripe_currency: 'usd',
    stripe_active: true,
    status: 'active',
    version: 1,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: 'tier-power-fake',
    tier_key: 'power',
    tier_name: 'Power License',
    description: 'Full feature set',
    stripe_price_id: 'price_fake_power',
    stripe_verified_at: now(),
    stripe_product_name: 'Power',
    stripe_amount_cents: 9900,
    stripe_interval: 'year',
    stripe_currency: 'usd',
    stripe_active: true,
    status: 'active',
    version: 1,
    created_at: now(),
    updated_at: now(),
  },
]

const fakeFeatures: FeatureEntitlement[] = [
  {
    id: 'feat-1-fake',
    feature_key: 'payments',
    display_name: 'Payments',
    category: 'Payments',
    feature_type: 'module',
    description: 'Collect payments',
    rollout_status: 'live',
    created_at: now(),
    updated_at: now(),
    archived_at: null,
    platform_admin_only: false,
  },
  {
    id: 'feat-2-fake',
    feature_key: 'travel',
    display_name: 'Travel',
    category: 'Travel',
    feature_type: 'module',
    description: 'Travel plans',
    rollout_status: 'live',
    created_at: now(),
    updated_at: now(),
    archived_at: null,
    platform_admin_only: false,
  },
]

const fakeAssignmentsStore: Record<string, Record<string, TierFeatureAssignment>> = {}

function delay(ms: number = FAKE_DATA_DELAY_MS): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getTierById(id: string): Promise<LicenseTier | null> {
  await delay()
  return fakeTiers.find((t) => t.id === id) ?? null
}

export async function getFeatures(): Promise<FeatureEntitlement[]> {
  await delay()
  return [...fakeFeatures]
}

export async function getAssignments(tierId: string): Promise<Record<string, TierFeatureAssignment>> {
  await delay()
  return { ...(fakeAssignmentsStore[tierId] ?? {}) }
}

export async function getOrganizationsUsingTier(tierKey: string): Promise<OrgUsingTier[]> {
  await delay()
  // license_plan enum values are: 'starter', 'standard', 'pro'
  const plans = tierKey === 'basic' ? ['starter'] : tierKey === 'power' ? ['standard', 'pro'] : []
  if (plans.length === 0) return []
  return [
    { id: 'org-fake-1', name: 'Demo Org A', license_plan: plans[0] },
    { id: 'org-fake-2', name: 'Demo Org B', license_plan: plans[0] },
  ]
}

export async function getArchivedFeaturesCount(_tierId: string): Promise<number> {
  await delay()
  return 0
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function createTier(input: CreateTierInput): Promise<LicenseTier> {
  await delay()
  const newTier: LicenseTier = {
    id: `tier-${Date.now()}-fake`,
    tier_key: input.tier_key,
    tier_name: input.tier_name,
    description: input.description ?? null,
    stripe_price_id: input.stripe_price_id,
    stripe_verified_at: input.stripe_verified_at ?? null,
    stripe_product_name: input.stripe_product_name ?? null,
    stripe_amount_cents: input.stripe_amount_cents ?? null,
    stripe_interval: input.stripe_interval ?? null,
    stripe_currency: input.stripe_currency ?? null,
    stripe_active: input.stripe_active ?? null,
    status: input.status ?? 'active',
    version: 1,
    created_at: now(),
    updated_at: now(),
  }
  fakeTiers.push(newTier)
  return newTier
}

export async function updateTier(
  id: string,
  input: UpdateTierInput,
  expectedVersion: number
): Promise<{ tier: LicenseTier; conflict?: boolean }> {
  await delay()
  const idx = fakeTiers.findIndex((t) => t.id === id)
  if (idx === -1) {
    const existing = fakeTiers.find((t) => t.id === id)
    return { tier: existing!, conflict: true }
  }
  const current = fakeTiers[idx]
  if (current.version !== expectedVersion) {
    return { tier: current, conflict: true }
  }
  const updated: LicenseTier = {
    ...current,
    ...input,
    version: current.version + 1,
    updated_at: now(),
  }
  fakeTiers[idx] = updated
  return { tier: updated }
}

export async function archiveOrActivateTier(
  id: string,
  expectedVersion: number,
  currentStatus: LicenseTierStatus
): Promise<{ tier: LicenseTier; conflict?: boolean }> {
  await delay()
  const idx = fakeTiers.findIndex((t) => t.id === id)
  if (idx === -1) {
    const existing = fakeTiers.find((t) => t.id === id)
    return { tier: existing!, conflict: true }
  }
  const current = fakeTiers[idx]
  if (current.version !== expectedVersion) return { tier: current, conflict: true }
  const newStatus: LicenseTierStatus = currentStatus === 'active' ? 'archived' : 'active'
  const updated: LicenseTier = { ...current, status: newStatus, version: current.version + 1, updated_at: now() }
  fakeTiers[idx] = updated
  return { tier: updated }
}

export async function duplicateTier(
  _id: string,
  tier: LicenseTier,
  assignments: Record<string, TierFeatureAssignment>
): Promise<LicenseTier> {
  await delay()
  const newTier: LicenseTier = {
    ...tier,
    id: `tier-${Date.now()}-fake`,
    tier_name: `${tier.tier_name} (Copy)`,
    stripe_price_id: '',
    version: 1,
    created_at: now(),
    updated_at: now(),
  }
  fakeTiers.push(newTier)
  fakeAssignmentsStore[newTier.id] = { ...assignments }
  return newTier
}

export async function saveAssignments(
  tierId: string,
  featureIds: string[],
  assignmentsMap: Record<string, TierFeatureAssignment>
): Promise<void> {
  await delay()
  const next: Record<string, TierFeatureAssignment> = {}
  const iso = now()
  for (const featureId of featureIds) {
    const a = assignmentsMap[featureId]
    next[featureId] = {
      id: a?.id ?? `tfa-${tierId}-${featureId}`,
      license_tier_id: tierId,
      feature_entitlement_id: featureId,
      included: a?.included ?? false,
      limit_value: a?.limit_value ?? null,
      role_admin: a?.role_admin ?? true,
      role_coach: a?.role_coach ?? true,
      role_parent: a?.role_parent ?? false,
      created_at: a?.created_at ?? iso,
      updated_at: iso,
    }
  }
  fakeAssignmentsStore[tierId] = next
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

export async function verifyStripePrice(
  priceId: string,
  _forceRefresh = false
): Promise<StripePriceVerification> {
  await delay()
  if (!priceId || !priceId.startsWith('price_')) {
    return { valid: false, error: 'Invalid Price ID format' }
  }
  return {
    valid: true,
    product_name: 'Demo Product',
    amount_cents: 2900,
    interval: 'year',
    currency: 'usd',
    active: true,
  }
}
