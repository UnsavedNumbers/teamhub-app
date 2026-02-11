import type { LicenseSummary } from '@/utils/licenseUtils'
import type { Database } from '@/lib/database.types'

type BillingEventsRow = Database['public']['Tables']['billing_events']['Row']

export function createMockLicenseSummary(overrides?: Partial<LicenseSummary>): LicenseSummary {
  return {
    status: 'active',
    plan: 'standard',
    currentPeriodEnd: '2027-01-01T00:00:00Z',
    currentPeriodStart: '2026-01-01T00:00:00Z',
    trialEndsAt: null,
    graceEndsAt: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    tierName: 'Standard',
    ...overrides,
  }
}

const defaultBillingEvent: BillingEventsRow = {
  id: 'b50e8400-e29b-41d4-a716-446655440006',
  created_at: '2026-01-01T00:00:00Z',
  error_message: null,
  event_type: 'invoice.paid',
  org_id: '650e8400-e29b-41d4-a716-446655440001',
  payload: null,
  processed_at: '2026-01-01T00:00:00Z',
  stripe_event_id: 'evt_123',
  stripe_object_id: 'in_123',
}

export function createMockBillingEvent(overrides?: Partial<BillingEventsRow>): BillingEventsRow {
  return { ...defaultBillingEvent, ...overrides }
}

export function createMockSubscription(overrides?: Partial<{
  id: string
  status: string
  current_period_end: string
  current_period_start: string
  cancel_at_period_end: boolean
}>): {
  id: string
  status: string
  current_period_end: string
  current_period_start: string
  cancel_at_period_end: boolean
} {
  return {
    id: 'sub_123',
    status: 'active',
    current_period_end: '2027-01-01T00:00:00Z',
    current_period_start: '2026-01-01T00:00:00Z',
    cancel_at_period_end: false,
    ...overrides,
  }
}
