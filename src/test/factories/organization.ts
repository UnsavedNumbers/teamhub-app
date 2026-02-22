import type { Database } from '@/lib/database.types'
import type { Organization } from '@/contexts/OrganizationContext'

type OrganizationsRow = Database['public']['Tables']['organizations']['Row']

const defaultOrg: OrganizationsRow = {
  id: '650e8400-e29b-41d4-a716-446655440001',
  address: null,
  billing_mode: 'platform_facilitated',
  branding_email_footer_text: null,
  branding_email_from_name: null,
  branding_primary_color: null,
  branding_secondary_color: null,
  city: null,
  connect_link_created_at: null,
  contact_email: null,
  created_at: '2026-01-01T00:00:00Z',
  currency: 'usd',
  current_tier_id: null,
  default_ticket_fees_cents: null,
  default_seat_map_id: null,
  demo_org_id: null,
  description: null,
  email: null,
  is_demo_org: false,
  latitude: null,
  license_cancel_at_period_end: false,
  license_current_period_end: '2027-01-01T00:00:00Z',
  license_current_period_start: '2026-01-01T00:00:00Z',
  license_grace_ends_at: null,
  license_status: 'active',
  license_trial_ends_at: null,
  logo_url: null,
  longitude: null,
  name: 'Test Org',
  org_type: 'club',
  payout_account_id: null,
  payout_descriptor: null,
  payout_onboarding_status: null,
  payouts_enabled: false,
  phone: null,
  place_id: null,
  primary_city: null,
  primary_region_radius_miles: null,
  primary_state: null,
  privacy_level: 'private',
  profile_visible_to_fans: true,
  refund_policy: null,
  slug: 'test-org',
  state: null,
  status: 'active',
  stripe_customer_id: null,
  stripe_payouts_disabled_reason: null,
  stripe_payouts_enabled: false,
  stripe_price_id: null,
  stripe_requirements_deadline: null,
  stripe_requirements_due: null,
  stripe_requirements_errors: null,
  stripe_status_updated_at: null,
  stripe_subscription_id: null,
  ticket_terms: null,
  ticketing_enabled: false,
  updated_at: '2026-01-01T00:00:00Z',
  website: null,
  zip: null,
  parent_org_id: null,
  inherits_license: false,
  sub_org_public_registration_enabled: null,
  sub_org_require_approval: null,
  sub_org_max_count: null,
}

export function createMockOrganization(overrides?: Partial<OrganizationsRow>): OrganizationsRow {
  return { ...defaultOrg, ...overrides }
}

export function createMockOrgMembership(overrides?: Partial<Omit<Organization, 'role'>>): Organization {
  return {
    id: defaultOrg.id,
    name: defaultOrg.name,
    roles: ['parent'],
    slug: defaultOrg.slug ?? undefined,
    org_type: defaultOrg.org_type ?? undefined,
    ...overrides,
    get role() {
      return this.roles[0] ?? 'parent'
    },
  }
}
