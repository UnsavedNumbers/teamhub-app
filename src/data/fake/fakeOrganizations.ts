/**
 * Fake Organizations Data Module
 *
 * Provides fake data for organizations.
 * Organization A is the primary org for all demo users.
 */

import { DEMO_ORG_A_ID, DEMO_ORG_B_ID, DEMO_ORG_C_ID } from '../config'

// ============================================================================
// Types
// ============================================================================

export type OrganizationType = 'school' | 'club' | 'league' | 'academy' | 'aau'
export type OrganizationStatus = 'trial' | 'active' | 'suspended' | 'expired'
export type LicenseStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
export type LicensePlan = 'starter' | 'standard' | 'pro'

export interface FakeOrganization {
    id: string
    name: string
    slug: string
    org_type: OrganizationType
    status: OrganizationStatus
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
    timezone: string
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string
    phone: string | null
    email: string | null
    website: string | null
    created_at: string
    updated_at: string
}

export interface FakeOrganizationLicense {
    id: string
    org_id: string
    status: LicenseStatus
    plan: LicensePlan
    trial_ends_at: string | null
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    created_at: string
    updated_at: string
}

export interface FakeOrganizationFeatureFlag {
    id: string
    org_id: string
    feature_key: string
    enabled: boolean
    created_at: string
    updated_at: string
}

// ============================================================================
// Fake Organizations Data
// ============================================================================

export const fakeOrganizations: FakeOrganization[] = [
    // Organization A - Primary demo org (Club)
    {
        id: DEMO_ORG_A_ID,
        name: 'Riverside Youth Athletics',
        slug: 'riverside-youth-athletics',
        org_type: 'club',
        status: 'active',
        logo_url: null,
        primary_color: 'var(--org-btn-primary-bg, #137fec)',
        secondary_color: '#1e293b',
        timezone: 'America/New_York',
        address_line1: '1234 Sports Complex Dr',
        address_line2: 'Building A',
        city: 'Riverside',
        state: 'CA',
        postal_code: '92501',
        country: 'US',
        phone: '+1 (555) 100-2000',
        email: 'info@riversideyouth.com',
        website: 'https://riversideyouth.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
    },
    // Organization B - Secondary org for multi-org testing (School)
    {
        id: DEMO_ORG_B_ID,
        name: 'Lincoln High School Athletics',
        slug: 'lincoln-hs-athletics',
        org_type: 'school',
        status: 'active',
        logo_url: null,
        primary_color: '#dc2626',
        secondary_color: '#facc15',
        timezone: 'America/Los_Angeles',
        address_line1: '500 Education Blvd',
        address_line2: null,
        city: 'Lincoln',
        state: 'CA',
        postal_code: '95648',
        country: 'US',
        phone: '+1 (555) 200-3000',
        email: 'athletics@lincolnhs.edu',
        website: 'https://lincolnhs.edu/athletics',
        created_at: '2023-06-15T00:00:00Z',
        updated_at: '2024-02-01T09:00:00Z',
    },
    // Organization C - Tertiary org (League)
    {
        id: DEMO_ORG_C_ID,
        name: 'California Youth Soccer League',
        slug: 'ca-youth-soccer-league',
        org_type: 'league',
        status: 'trial',
        logo_url: null,
        primary_color: '#16a34a',
        secondary_color: '#ffffff',
        timezone: 'America/Los_Angeles',
        address_line1: '789 League HQ',
        address_line2: 'Suite 100',
        city: 'Sacramento',
        state: 'CA',
        postal_code: '95814',
        country: 'US',
        phone: '+1 (555) 300-4000',
        email: 'info@cayouthsoccer.org',
        website: 'https://cayouthsoccer.org',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-03-01T10:00:00Z',
    },
    // Additional organizations for platform admin views
    {
        id: 'org-academy-001',
        name: 'Elite Basketball Academy',
        slug: 'elite-basketball-academy',
        org_type: 'academy',
        status: 'active',
        logo_url: null,
        primary_color: '#7c3aed',
        secondary_color: '#f59e0b',
        timezone: 'America/Chicago',
        address_line1: '456 Training Center Rd',
        address_line2: null,
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'US',
        phone: '+1 (555) 400-5000',
        email: 'info@elitebasketball.com',
        website: 'https://elitebasketball.com',
        created_at: '2023-03-15T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
    },
    {
        id: 'org-aau-001',
        name: 'Southern AAU Track & Field',
        slug: 'southern-aau-track',
        org_type: 'aau',
        status: 'suspended',
        logo_url: null,
        primary_color: '#0891b2',
        secondary_color: '#1e293b',
        timezone: 'America/New_York',
        address_line1: '321 Track Lane',
        address_line2: null,
        city: 'Atlanta',
        state: 'GA',
        postal_code: '30301',
        country: 'US',
        phone: '+1 (555) 500-6000',
        email: 'info@southernaau.org',
        website: null,
        created_at: '2022-09-01T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
    },
    {
        id: 'org-community-001',
        name: 'Eastside Community Sports',
        slug: 'eastside-community-sports',
        org_type: 'club',
        status: 'active',
        logo_url: null,
        primary_color: '#059669',
        secondary_color: '#064e3b',
        timezone: 'America/Chicago',
        address_line1: '890 Community Center Pkwy',
        address_line2: null,
        city: 'Austin',
        state: 'TX',
        postal_code: '78702',
        country: 'US',
        phone: '+1 (555) 600-7000',
        email: 'info@eastsidecommunity.org',
        website: 'https://eastsidecommunity.org',
        created_at: '2023-08-01T00:00:00Z',
        updated_at: '2024-06-01T10:00:00Z',
    },
    {
        id: 'org-tournament-001',
        name: 'Texas Premier Tournaments',
        slug: 'texas-premier-tournaments',
        org_type: 'league',
        status: 'active',
        logo_url: null,
        primary_color: '#b91c1c',
        secondary_color: '#fbbf24',
        timezone: 'America/Chicago',
        address_line1: '2100 Tournament Way',
        address_line2: 'Suite 400',
        city: 'Dallas',
        state: 'TX',
        postal_code: '75202',
        country: 'US',
        phone: '+1 (555) 700-8000',
        email: 'events@texaspremier.com',
        website: 'https://texaspremier.com',
        created_at: '2022-04-15T00:00:00Z',
        updated_at: '2024-09-01T00:00:00Z',
    },
    {
        id: 'org-school-002',
        name: 'Washington Middle School Athletics',
        slug: 'washington-ms-athletics',
        org_type: 'school',
        status: 'active',
        logo_url: null,
        primary_color: '#1d4ed8',
        secondary_color: '#f97316',
        timezone: 'America/Denver',
        address_line1: '400 Eagle Dr',
        address_line2: null,
        city: 'Denver',
        state: 'CO',
        postal_code: '80202',
        country: 'US',
        phone: '+1 (555) 800-9000',
        email: 'athletics@washingtonms.edu',
        website: 'https://washingtonms.edu/athletics',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-08-15T00:00:00Z',
    },
    {
        id: 'org-club-002',
        name: 'Phoenix Rising Soccer Club',
        slug: 'phoenix-rising-sc',
        org_type: 'club',
        status: 'active',
        logo_url: null,
        primary_color: '#ea580c',
        secondary_color: '#1e293b',
        timezone: 'America/Phoenix',
        address_line1: '555 Camelback Rd',
        address_line2: null,
        city: 'Phoenix',
        state: 'AZ',
        postal_code: '85012',
        country: 'US',
        phone: '+1 (555) 900-1000',
        email: 'info@phoenixrisingsc.com',
        website: 'https://phoenixrisingsc.com',
        created_at: '2023-05-01T00:00:00Z',
        updated_at: '2024-10-01T00:00:00Z',
    },
    {
        id: 'org-academy-002',
        name: 'Gulf Coast Baseball Academy',
        slug: 'gulf-coast-baseball',
        org_type: 'academy',
        status: 'active',
        logo_url: null,
        primary_color: '#0369a1',
        secondary_color: '#fde68a',
        timezone: 'America/Chicago',
        address_line1: '1800 Diamond Blvd',
        address_line2: null,
        city: 'Houston',
        state: 'TX',
        postal_code: '77002',
        country: 'US',
        phone: '+1 (555) 110-2200',
        email: 'info@gulfcoastbaseball.com',
        website: 'https://gulfcoastbaseball.com',
        created_at: '2022-11-01T00:00:00Z',
        updated_at: '2024-05-15T00:00:00Z',
    },
    {
        id: 'org-aau-002',
        name: 'Pacific Northwest AAU Basketball',
        slug: 'pnw-aau-basketball',
        org_type: 'aau',
        status: 'trial',
        logo_url: null,
        primary_color: '#6d28d9',
        secondary_color: '#34d399',
        timezone: 'America/Los_Angeles',
        address_line1: '750 Hoops Way',
        address_line2: 'Suite 200',
        city: 'Portland',
        state: 'OR',
        postal_code: '97201',
        country: 'US',
        phone: '+1 (555) 220-3300',
        email: 'info@pnwaauhoops.org',
        website: 'https://pnwaauhoops.org',
        created_at: '2024-10-01T00:00:00Z',
        updated_at: '2024-12-15T00:00:00Z',
    },
]

// ============================================================================
// Fake Organization Licenses
// ============================================================================

// Calculate dates relative to "now" for realistic data
const now = new Date()
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

export const fakeOrganizationLicenses: FakeOrganizationLicense[] = [
    {
        id: 'license-001',
        org_id: DEMO_ORG_A_ID,
        status: 'active',
        plan: 'pro',
        trial_ends_at: null,
        current_period_start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: oneYearFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_org_a',
        stripe_subscription_id: 'sub_demo_org_a',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-002',
        org_id: DEMO_ORG_B_ID,
        status: 'active',
        plan: 'standard',
        trial_ends_at: null,
        current_period_start: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: thirtyDaysFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_org_b',
        stripe_subscription_id: 'sub_demo_org_b',
        created_at: '2023-06-15T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-003',
        org_id: DEMO_ORG_C_ID,
        status: 'trial',
        plan: 'pro',
        trial_ends_at: fourteenDaysFromNow.toISOString(),
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-004',
        org_id: 'org-academy-001',
        status: 'past_due',
        plan: 'standard',
        trial_ends_at: null,
        current_period_start: sevenDaysAgo.toISOString(),
        current_period_end: thirtyDaysFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_academy',
        stripe_subscription_id: 'sub_demo_academy',
        created_at: '2023-03-15T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-005',
        org_id: 'org-aau-001',
        status: 'expired',
        plan: 'starter',
        trial_ends_at: null,
        current_period_start: null,
        current_period_end: sevenDaysAgo.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_aau',
        stripe_subscription_id: null,
        created_at: '2022-09-01T00:00:00Z',
        updated_at: sevenDaysAgo.toISOString(),
    },
    {
        id: 'license-006',
        org_id: 'org-community-001',
        status: 'active',
        plan: 'standard',
        trial_ends_at: null,
        current_period_start: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: oneYearFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_community',
        stripe_subscription_id: 'sub_demo_community',
        created_at: '2023-08-01T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-007',
        org_id: 'org-tournament-001',
        status: 'active',
        plan: 'pro',
        trial_ends_at: null,
        current_period_start: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: oneYearFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_tournament',
        stripe_subscription_id: 'sub_demo_tournament',
        created_at: '2022-04-15T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-008',
        org_id: 'org-school-002',
        status: 'active',
        plan: 'starter',
        trial_ends_at: null,
        current_period_start: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: thirtyDaysFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_school2',
        stripe_subscription_id: 'sub_demo_school2',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-009',
        org_id: 'org-club-002',
        status: 'active',
        plan: 'pro',
        trial_ends_at: null,
        current_period_start: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: oneYearFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_phoenix',
        stripe_subscription_id: 'sub_demo_phoenix',
        created_at: '2023-05-01T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-010',
        org_id: 'org-academy-002',
        status: 'active',
        plan: 'standard',
        trial_ends_at: null,
        current_period_start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: oneYearFromNow.toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_demo_gulfcoast',
        stripe_subscription_id: 'sub_demo_gulfcoast',
        created_at: '2022-11-01T00:00:00Z',
        updated_at: now.toISOString(),
    },
    {
        id: 'license-011',
        org_id: 'org-aau-002',
        status: 'trial',
        plan: 'pro',
        trial_ends_at: fourteenDaysFromNow.toISOString(),
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: '2024-10-01T00:00:00Z',
        updated_at: now.toISOString(),
    },
]

// ============================================================================
// Fake Organization Feature Flags
// ============================================================================

export const fakeOrganizationFeatureFlags: FakeOrganizationFeatureFlag[] = [
    // Organization A - All features enabled (Pro plan)
    { id: 'ff-001', org_id: DEMO_ORG_A_ID, feature_key: 'payments_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-002', org_id: DEMO_ORG_A_ID, feature_key: 'tryouts_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-003', org_id: DEMO_ORG_A_ID, feature_key: 'travel_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-004', org_id: DEMO_ORG_A_ID, feature_key: 'uniforms_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-005', org_id: DEMO_ORG_A_ID, feature_key: 'messaging_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    // Organization B - Standard plan (some features disabled)
    { id: 'ff-006', org_id: DEMO_ORG_B_ID, feature_key: 'payments_enabled', enabled: true, created_at: '2023-06-15T00:00:00Z', updated_at: '2023-06-15T00:00:00Z' },
    { id: 'ff-007', org_id: DEMO_ORG_B_ID, feature_key: 'tryouts_enabled', enabled: false, created_at: '2023-06-15T00:00:00Z', updated_at: '2023-06-15T00:00:00Z' },
    { id: 'ff-008', org_id: DEMO_ORG_B_ID, feature_key: 'travel_enabled', enabled: false, created_at: '2023-06-15T00:00:00Z', updated_at: '2023-06-15T00:00:00Z' },
    { id: 'ff-009', org_id: DEMO_ORG_B_ID, feature_key: 'uniforms_enabled', enabled: true, created_at: '2023-06-15T00:00:00Z', updated_at: '2023-06-15T00:00:00Z' },
    { id: 'ff-010', org_id: DEMO_ORG_B_ID, feature_key: 'messaging_enabled', enabled: true, created_at: '2023-06-15T00:00:00Z', updated_at: '2023-06-15T00:00:00Z' },
    // Community Sports - Standard plan
    { id: 'ff-011', org_id: 'org-community-001', feature_key: 'payments_enabled', enabled: true, created_at: '2023-08-01T00:00:00Z', updated_at: '2023-08-01T00:00:00Z' },
    { id: 'ff-012', org_id: 'org-community-001', feature_key: 'messaging_enabled', enabled: true, created_at: '2023-08-01T00:00:00Z', updated_at: '2023-08-01T00:00:00Z' },
    { id: 'ff-013', org_id: 'org-community-001', feature_key: 'tryouts_enabled', enabled: false, created_at: '2023-08-01T00:00:00Z', updated_at: '2023-08-01T00:00:00Z' },
    // Texas Premier Tournaments - Pro plan
    { id: 'ff-014', org_id: 'org-tournament-001', feature_key: 'payments_enabled', enabled: true, created_at: '2022-04-15T00:00:00Z', updated_at: '2022-04-15T00:00:00Z' },
    { id: 'ff-015', org_id: 'org-tournament-001', feature_key: 'tryouts_enabled', enabled: true, created_at: '2022-04-15T00:00:00Z', updated_at: '2022-04-15T00:00:00Z' },
    { id: 'ff-016', org_id: 'org-tournament-001', feature_key: 'travel_enabled', enabled: true, created_at: '2022-04-15T00:00:00Z', updated_at: '2022-04-15T00:00:00Z' },
    { id: 'ff-017', org_id: 'org-tournament-001', feature_key: 'messaging_enabled', enabled: true, created_at: '2022-04-15T00:00:00Z', updated_at: '2022-04-15T00:00:00Z' },
    // Phoenix Rising - Pro plan
    { id: 'ff-018', org_id: 'org-club-002', feature_key: 'payments_enabled', enabled: true, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z' },
    { id: 'ff-019', org_id: 'org-club-002', feature_key: 'tryouts_enabled', enabled: true, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z' },
    { id: 'ff-020', org_id: 'org-club-002', feature_key: 'travel_enabled', enabled: true, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z' },
    { id: 'ff-021', org_id: 'org-club-002', feature_key: 'uniforms_enabled', enabled: true, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z' },
    { id: 'ff-022', org_id: 'org-club-002', feature_key: 'messaging_enabled', enabled: true, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z' },
    // Gulf Coast Baseball - Standard plan
    { id: 'ff-023', org_id: 'org-academy-002', feature_key: 'payments_enabled', enabled: true, created_at: '2022-11-01T00:00:00Z', updated_at: '2022-11-01T00:00:00Z' },
    { id: 'ff-024', org_id: 'org-academy-002', feature_key: 'messaging_enabled', enabled: true, created_at: '2022-11-01T00:00:00Z', updated_at: '2022-11-01T00:00:00Z' },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getOrganizationById(orgId: string): FakeOrganization | undefined {
    return fakeOrganizations.find((o) => o.id === orgId)
}

export function getOrganizationBySlug(slug: string): FakeOrganization | undefined {
    return fakeOrganizations.find((o) => o.slug === slug)
}

export function getOrganizationLicense(orgId: string): FakeOrganizationLicense | undefined {
    return fakeOrganizationLicenses.find((l) => l.org_id === orgId)
}

export function getOrganizationFeatureFlags(orgId: string): FakeOrganizationFeatureFlag[] {
    return fakeOrganizationFeatureFlags.filter((ff) => ff.org_id === orgId)
}

export function isFeatureEnabled(orgId: string, featureKey: string): boolean {
    const flag = fakeOrganizationFeatureFlags.find(
        (ff) => ff.org_id === orgId && ff.feature_key === featureKey
    )
    return flag?.enabled ?? false
}

export function getActiveOrganizations(): FakeOrganization[] {
    return fakeOrganizations.filter((o) => o.status === 'active')
}

export function getTrialOrganizations(): FakeOrganization[] {
    return fakeOrganizations.filter((o) => o.status === 'trial')
}

export function getSuspendedOrganizations(): FakeOrganization[] {
    return fakeOrganizations.filter((o) => o.status === 'suspended')
}

export function getAllOrganizationsWithLicenses(): Array<FakeOrganization & { license?: FakeOrganizationLicense }> {
    return fakeOrganizations.map((org) => ({
        ...org,
        license: getOrganizationLicense(org.id),
    }))
}
