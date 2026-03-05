/**
 * Fake Admin Data Module
 *
 * Provides fake data for platform admin views.
 * Includes platform health metrics, audit logs, and admin users.
 */

import { DEMO_ORG_A_ID, DEMO_ORG_B_ID, DEMO_ORG_C_ID, DEMO_USER_IDS } from '../config'
import type {
    AdminOrganization,
    AdminUser,
    AdminPayment,
    AdminFeeStatus,
    AdminAuditLog,
    AdminPlatformHealth,
    AdminFeatureFlag,
    PlatformAdmin,
} from '../../types/platformAdmin.types'

// Dynamic year helpers
const getCurrentYear = () => new Date().getFullYear()
const getPreviousYear = () => getCurrentYear() - 1
const getSpringSeasonName = () => `Spring ${getCurrentYear()}`

// Helper functions for date generation relative to current year
const getDateInCurrentYear = (month: number, day: number, hour: number = 0, minute: number = 0): string => {
    const year = getCurrentYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`
}

const getDateInPreviousYear = (month: number, day: number, hour: number = 0, minute: number = 0): string => {
    const year = getPreviousYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`
}

const getDateString = (month: number, day: number): string => {
    const year = getCurrentYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ============================================================================
// Platform Admin Users
// ============================================================================

export const fakePlatformAdmins: PlatformAdmin[] = [
    {
        user_id: 'platform-admin-001',
        role: 'super_admin',
        created_at: '2023-01-01T00:00:00Z',
        email: 'super.admin@youthsports.team',
        display_name: 'System Administrator',
    },
    {
        user_id: 'platform-admin-002',
        role: 'support_admin',
        created_at: getDateInPreviousYear(6, 15),
        email: 'support@youthsports.team',
        display_name: 'Support Team',
    },
    {
        user_id: 'platform-admin-003',
        role: 'finance_admin',
        created_at: '2023-09-01T00:00:00Z',
        email: 'finance@youthsports.team',
        display_name: 'Finance Admin',
    },
]

// ============================================================================
// Admin Organizations View
// ============================================================================

export const fakeAdminOrganizations: AdminOrganization[] = [
    {
        id: DEMO_ORG_A_ID,
        name: 'Riverside Youth Athletics',
        org_type: 'club',
        status: 'active',
        slug: 'riverside-youth-athletics',
        website: 'https://riversideyouth.com',
        phone: '+1 (555) 123-4567',
        contact_email: 'info@riversideyouth.com',
        address: '123 Sports Way',
        city: 'Riverside',
        state: 'CA',
        zip: '92501',
        license_status: 'active',
        license_plan: 'pro',
        license_trial_ends_at: null,
        license_current_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        license_current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        license_grace_ends_at: null,
        license_cancel_at_period_end: false,
        stripe_customer_id: 'cus_riverside_001',
        stripe_subscription_id: 'sub_riverside_001',
        stripe_price_id: 'price_1234567890',
        stripe_connected: true,
        payout_account_id: 'acct_demo_riverside',
        payouts_enabled: true,
        payout_onboarding_status: 'completed',
        payout_descriptor: 'Riverside Youth',
        billing_mode: 'subscription',
        currency: 'usd',
        primary_city: 'Riverside',
        primary_state: 'CA',
        primary_region_radius_miles: 50,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: getDateInCurrentYear(1, 15),
        team_count: 8,
        sport_count: 4,
        user_count: 45,
    },
    {
        id: DEMO_ORG_B_ID,
        name: 'Lincoln High School Athletics',
        org_type: 'school',
        status: 'active',
        slug: 'lincoln-high-athletics',
        website: 'https://lincolnhs.edu/athletics',
        phone: '+1 (555) 234-5678',
        contact_email: 'athletics@lincolnhs.edu',
        address: '456 School Street',
        city: 'Lincoln',
        state: 'NE',
        zip: '68508',
        license_status: 'active',
        license_plan: 'standard',
        license_trial_ends_at: null,
        license_current_period_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        license_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        license_grace_ends_at: null,
        license_cancel_at_period_end: false,
        stripe_customer_id: 'cus_lincoln_001',
        stripe_subscription_id: 'sub_lincoln_001',
        stripe_price_id: 'price_0987654321',
        stripe_connected: true,
        payout_account_id: 'acct_demo_lincoln',
        payouts_enabled: true,
        payout_onboarding_status: 'completed',
        payout_descriptor: 'Lincoln HS',
        billing_mode: 'subscription',
        currency: 'usd',
        primary_city: 'Lincoln',
        primary_state: 'NE',
        primary_region_radius_miles: 75,
        created_at: getDateInPreviousYear(6, 15),
        updated_at: '2024-02-01T00:00:00Z',
        team_count: 12,
        sport_count: 6,
        user_count: 120,
    },
    {
        id: DEMO_ORG_C_ID,
        name: 'California Youth Soccer League',
        org_type: 'league',
        status: 'trial',
        slug: 'ca-youth-soccer-league',
        website: 'https://cayouthsoccer.org',
        phone: '+1 (555) 345-6789',
        contact_email: 'contact@cayouthsoccer.org',
        address: '789 League Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        license_status: 'trial',
        license_plan: 'pro',
        license_trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        license_current_period_start: null,
        license_current_period_end: null,
        license_grace_ends_at: null,
        license_cancel_at_period_end: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_connected: false,
        payout_account_id: null,
        payouts_enabled: false,
        payout_onboarding_status: null,
        payout_descriptor: null,
        billing_mode: null,
        currency: null,
        primary_city: 'Los Angeles',
        primary_state: 'CA',
        primary_region_radius_miles: 100,
        created_at: getDateInCurrentYear(1, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team_count: 25,
        sport_count: 1,
        user_count: 200,
    },
    {
        id: 'org-academy-001',
        name: 'Elite Basketball Academy',
        org_type: 'academy',
        status: 'active',
        slug: 'elite-basketball-academy',
        website: 'https://elitebasketball.com',
        phone: '+1 (555) 456-7890',
        contact_email: 'info@elitebasketball.com',
        address: '321 Court Avenue',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
        license_status: 'past_due',
        license_plan: 'standard',
        license_trial_ends_at: null,
        license_current_period_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        license_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        license_grace_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        license_cancel_at_period_end: false,
        stripe_customer_id: 'cus_elite_001',
        stripe_subscription_id: 'sub_elite_001',
        stripe_price_id: 'price_1122334455',
        stripe_connected: true,
        payout_account_id: 'acct_demo_elite',
        payouts_enabled: false,
        payout_onboarding_status: 'restricted',
        payout_descriptor: 'Elite Basketball',
        billing_mode: 'subscription',
        currency: 'usd',
        primary_city: 'Phoenix',
        primary_state: 'AZ',
        primary_region_radius_miles: 60,
        created_at: '2023-03-15T00:00:00Z',
        updated_at: getDateInCurrentYear(1, 1),
        team_count: 6,
        sport_count: 1,
        user_count: 35,
    },
    {
        id: 'org-aau-001',
        name: 'Southern AAU Track & Field',
        org_type: 'aau',
        status: 'suspended',
        slug: 'southern-aau-track-field',
        website: null,
        phone: '+1 (555) 567-8901',
        contact_email: 'contact@southernaau.org',
        address: '654 Track Lane',
        city: 'Atlanta',
        state: 'GA',
        zip: '30301',
        license_status: 'expired',
        license_plan: 'starter',
        license_trial_ends_at: null,
        license_current_period_start: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        license_current_period_end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        license_grace_ends_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        license_cancel_at_period_end: null,
        stripe_customer_id: 'cus_aau_001',
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_connected: false,
        payout_account_id: null,
        payouts_enabled: false,
        payout_onboarding_status: null,
        payout_descriptor: null,
        billing_mode: null,
        currency: null,
        primary_city: 'Atlanta',
        primary_state: 'GA',
        primary_region_radius_miles: 80,
        created_at: '2022-09-01T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
        team_count: 4,
        sport_count: 1,
        user_count: 28,
    },
]

// ============================================================================
// Admin Users View
// ============================================================================

export const fakeAdminUsers: AdminUser[] = [
    {
        id: DEMO_USER_IDS['admin-only@example.com'],
        email: 'admin-only@example.com',
        phone: '+1 (555) 345-6789',
        display_name: 'Admin Sarah Wilson',
        created_at: getDateInPreviousYear(12, 1, 8),
        updated_at: getDateInPreviousYear(12, 1, 8),
        organizations: [{ org_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'org_admin' }],
        roles: ['org_admin'],
        is_platform_admin: false,
        is_disabled: false,
        last_sign_in_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
        family_id: null,
    },
    {
        id: DEMO_USER_IDS['parent-only@example.com'],
        email: 'parent-only@example.com',
        phone: '+1 (555) 123-4567',
        display_name: 'Jennifer Johnson',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        organizations: [
            { org_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'parent' },
            { org_id: DEMO_ORG_B_ID, org_name: 'Lincoln High School Athletics', role: 'parent' },
        ],
        roles: ['parent'],
        is_platform_admin: false,
        is_disabled: false,
        last_sign_in_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
        family_id: 'family-001',
    },
    {
        id: DEMO_USER_IDS['coach-only@example.com'],
        email: 'coach-only@example.com',
        phone: '+1 (555) 234-5678',
        display_name: 'Coach Michael Davis',
        created_at: getDateInCurrentYear(1, 10, 9),
        updated_at: getDateInCurrentYear(1, 10, 9),
        organizations: [{ org_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'coach' }],
        roles: ['coach'],
        is_platform_admin: false,
        is_disabled: false,
        last_sign_in_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
        family_id: null,
    },
    {
        id: DEMO_USER_IDS['parent-admin@example.com'],
        email: 'parent-admin@example.com',
        phone: '+1 (555) 456-7890',
        display_name: 'Robert Chen',
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
        organizations: [{ org_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'org_admin' }],
        roles: ['parent', 'org_admin'],
        is_platform_admin: false,
        is_disabled: false,
        last_sign_in_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
        family_id: 'family-002',
    },
    {
        id: 'platform-admin-001',
        email: 'super.admin@youthsports.team',
        phone: null,
        display_name: 'System Administrator',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        organizations: [],
        roles: [],
        is_platform_admin: true,
        is_disabled: false,
        last_sign_in_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        email_confirmed: true,
        family_id: null,
    },
]

// ============================================================================
// Admin Audit Log
// ============================================================================

const now = new Date()

function hoursAgo(hours: number): string {
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
}

export const fakeAdminAuditLogs: AdminAuditLog[] = [
    {
        id: 'audit-001',
        actor_id: 'platform-admin-001',
        actor_email: 'super.admin@youthsports.team',
        actor_name: 'System Administrator',
        action: 'activate_organization',
        entity_type: 'organization',
        entity_id: DEMO_ORG_A_ID,
        metadata: { reason: 'Payment received', plan: 'pro' },
        created_at: hoursAgo(2),
    },
    {
        id: 'audit-002',
        actor_id: 'platform-admin-002',
        actor_email: 'support@youthsports.team',
        actor_name: 'Support Team',
        action: 'pii_viewed',
        entity_type: 'user',
        entity_id: DEMO_USER_IDS['parent-only@example.com'],
        metadata: { viewed_fields: ['email', 'phone'], reason: 'Support ticket #12345' },
        created_at: hoursAgo(5),
    },
    {
        id: 'audit-003',
        actor_id: 'platform-admin-001',
        actor_email: 'super.admin@youthsports.team',
        actor_name: 'System Administrator',
        action: 'set_feature_flag',
        entity_type: 'feature_flag',
        entity_id: 'ff-payments',
        metadata: { org_id: DEMO_ORG_A_ID, feature: 'payments_enabled', old_value: false, new_value: true },
        created_at: hoursAgo(24),
    },
    {
        id: 'audit-004',
        actor_id: 'platform-admin-003',
        actor_email: 'finance@youthsports.team',
        actor_name: 'Finance Admin',
        action: 'issue_refund',
        entity_type: 'payment',
        entity_id: 'pay-refund-001',
        metadata: { amount_cents: 5000, reason: 'Customer request' },
        created_at: hoursAgo(48),
    },
    {
        id: 'audit-005',
        actor_id: 'platform-admin-001',
        actor_email: 'super.admin@youthsports.team',
        actor_name: 'System Administrator',
        action: 'suspend_organization',
        entity_type: 'organization',
        entity_id: 'org-aau-001',
        metadata: { reason: 'Payment failure - license expired' },
        created_at: hoursAgo(168), // 7 days ago
    },
]

// ============================================================================
// Platform Health Metrics
// ============================================================================

export const fakePlatformHealth: AdminPlatformHealth = {
    active_organizations: 3,
    trial_organizations: 1,
    suspended_organizations: 1,
    total_users: 428,
    platform_admin_count: 3,
    successful_payments: 156,
    failed_payments: 4,
    total_payment_volume_cents: 4850000, // $48,500
    total_teams: 55,
    total_children: 312,
}

// ============================================================================
// Admin Feature Flags View
// ============================================================================

export const fakeAdminFeatureFlags: AdminFeatureFlag[] = [
    { id: 'ff-001', org_id: DEMO_ORG_A_ID, organization_name: 'Riverside Youth Athletics', feature_key: 'payments_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-002', org_id: DEMO_ORG_A_ID, organization_name: 'Riverside Youth Athletics', feature_key: 'tryouts_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-003', org_id: DEMO_ORG_A_ID, organization_name: 'Riverside Youth Athletics', feature_key: 'travel_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-004', org_id: DEMO_ORG_B_ID, organization_name: 'Lincoln High School Athletics', feature_key: 'payments_enabled', enabled: true, created_at: getDateInPreviousYear(6, 15), updated_at: getDateInPreviousYear(6, 15) },
    { id: 'ff-005', org_id: DEMO_ORG_B_ID, organization_name: 'Lincoln High School Athletics', feature_key: 'tryouts_enabled', enabled: false, created_at: getDateInPreviousYear(6, 15), updated_at: getDateInPreviousYear(6, 15) },
]

// ============================================================================
// Admin Payments View
// ============================================================================

export const fakeAdminPayments: AdminPayment[] = [
    {
        id: 'pay-001',
        amount_cents: 15000,
        currency: 'usd',
        stripe_payment_intent_id: 'pi_demo_001',
        status: 'succeeded',
        created_at: hoursAgo(48),
        org_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        fee_assignment_id: 'fa-001',
        fee_id: 'fee-spring-soccer-reg-001',
        fee_title: `${getSpringSeasonName()} Soccer Registration`,
        athlete_id: 'child-emma-johnson-001',
        child_name: 'Emma Johnson',
        parent_email: 'parent-only@example.com',
        parent_name: 'Jennifer Johnson',
    },
    {
        id: 'pay-002',
        amount_cents: 12500,
        currency: 'usd',
        stripe_payment_intent_id: 'pi_demo_009',
        status: 'succeeded',
        created_at: hoursAgo(72),
        org_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        fee_assignment_id: 'fa-007',
        fee_id: 'fee-spring-bb-reg-002',
        fee_title: `${getSpringSeasonName()} Basketball Registration`,
        athlete_id: 'child-liam-johnson-002',
        child_name: 'Liam Johnson',
        parent_email: 'parent-only@example.com',
        parent_name: 'Jennifer Johnson',
    },
    {
        id: 'pay-failed-001',
        amount_cents: 12500,
        currency: 'usd',
        stripe_payment_intent_id: 'pi_demo_012_failed',
        status: 'failed',
        created_at: hoursAgo(24),
        org_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        fee_assignment_id: 'fa-009',
        fee_id: 'fee-spring-bb-reg-002',
        fee_title: `${getSpringSeasonName()} Basketball Registration`,
        athlete_id: 'child-ethan-williams-006',
        child_name: 'Ethan Williams',
        parent_email: 'parent-admin@example.com',
        parent_name: 'Robert Chen',
    },
]

// ============================================================================
// Admin Fees Status View
// ============================================================================

export const fakeAdminFeesStatus: AdminFeeStatus[] = [
    {
        id: 'fee-spring-soccer-reg-001',
        fee_id: 'fee-spring-soccer-reg-001',
        fee_name: `${getSpringSeasonName()} Soccer Registration`,
        amount_cents: 15000,
        currency: 'usd',
        due_date: getDateString(2, 28),
        fee_status: 'active',
        org_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        assigned_count: 6,
        paid_count: 4,
        unpaid_count: 2,
        payment_rate_percent: 67,
    },
    {
        id: 'fee-spring-bb-reg-002',
        fee_id: 'fee-spring-bb-reg-002',
        fee_name: `${getSpringSeasonName()} Basketball Registration`,
        amount_cents: 12500,
        currency: 'usd',
        due_date: getDateString(2, 28),
        fee_status: 'active',
        org_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        assigned_count: 4,
        paid_count: 2,
        unpaid_count: 2,
        payment_rate_percent: 50,
    },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getPlatformAdmins(): PlatformAdmin[] {
    return [...fakePlatformAdmins]
}

export function getPlatformAdminById(userId: string): PlatformAdmin | undefined {
    return fakePlatformAdmins.find((pa) => pa.user_id === userId)
}

export function getAdminOrganizations(): AdminOrganization[] {
    return [...fakeAdminOrganizations]
}

export function getAdminOrganizationById(orgId: string): AdminOrganization | undefined {
    return fakeAdminOrganizations.find((o) => o.id === orgId)
}

export function getAdminUsers(): AdminUser[] {
    return [...fakeAdminUsers]
}

export function getAdminUserById(userId: string): AdminUser | undefined {
    return fakeAdminUsers.find((u) => u.id === userId)
}

export function getAuditLogs(limit?: number): AdminAuditLog[] {
    const logs = [...fakeAdminAuditLogs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return limit ? logs.slice(0, limit) : logs
}

export function getPlatformHealth(): AdminPlatformHealth {
    return { ...fakePlatformHealth }
}

export function getAdminFeatureFlags(): AdminFeatureFlag[] {
    return [...fakeAdminFeatureFlags]
}

export function getAdminPayments(limit?: number): AdminPayment[] {
    const payments = [...fakeAdminPayments].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )
    return limit ? payments.slice(0, limit) : payments
}

export function getAdminFeesStatus(): AdminFeeStatus[] {
    return [...fakeAdminFeesStatus]
}
