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
        created_at: '2023-06-15T00:00:00Z',
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
        license_status: 'active',
        license_plan: 'pro',
        license_trial_ends_at: null,
        license_current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        payout_account_id: 'acct_demo_riverside',
        payouts_enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        team_count: 8,
        sport_count: 4,
        user_count: 45,
        stripe_connected: true,
    },
    {
        id: DEMO_ORG_B_ID,
        name: 'Lincoln High School Athletics',
        org_type: 'school',
        status: 'active',
        license_status: 'active',
        license_plan: 'standard',
        license_trial_ends_at: null,
        license_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payout_account_id: 'acct_demo_lincoln',
        payouts_enabled: true,
        created_at: '2023-06-15T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
        team_count: 12,
        sport_count: 6,
        user_count: 120,
        stripe_connected: true,
    },
    {
        id: DEMO_ORG_C_ID,
        name: 'California Youth Soccer League',
        org_type: 'league',
        status: 'trial',
        license_status: 'trial',
        license_plan: 'pro',
        license_trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        license_current_period_end: null,
        payout_account_id: null,
        payouts_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
        team_count: 25,
        sport_count: 1,
        user_count: 200,
        stripe_connected: false,
    },
    {
        id: 'org-academy-001',
        name: 'Elite Basketball Academy',
        org_type: 'academy',
        status: 'active',
        license_status: 'past_due',
        license_plan: 'standard',
        license_trial_ends_at: null,
        license_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payout_account_id: 'acct_demo_elite',
        payouts_enabled: false,
        created_at: '2023-03-15T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        team_count: 6,
        sport_count: 1,
        user_count: 35,
        stripe_connected: true,
    },
    {
        id: 'org-aau-001',
        name: 'Southern AAU Track & Field',
        org_type: 'aau',
        status: 'suspended',
        license_status: 'expired',
        license_plan: 'starter',
        license_trial_ends_at: null,
        license_current_period_end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        payout_account_id: null,
        payouts_enabled: false,
        created_at: '2022-09-01T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
        team_count: 4,
        sport_count: 1,
        user_count: 28,
        stripe_connected: false,
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
        created_at: '2023-12-01T08:00:00Z',
        updated_at: '2023-12-01T08:00:00Z',
        organizations: [{ organization_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'org_admin' }],
        roles: ['org_admin'],
        is_platform_admin: false,
        last_sign_in_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
    },
    {
        id: DEMO_USER_IDS['parent-only@example.com'],
        email: 'parent-only@example.com',
        phone: '+1 (555) 123-4567',
        display_name: 'Jennifer Johnson',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        organizations: [
            { organization_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'parent' },
            { organization_id: DEMO_ORG_B_ID, org_name: 'Lincoln High School Athletics', role: 'parent' },
        ],
        roles: ['parent'],
        is_platform_admin: false,
        last_sign_in_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
    },
    {
        id: DEMO_USER_IDS['coach-only@example.com'],
        email: 'coach-only@example.com',
        phone: '+1 (555) 234-5678',
        display_name: 'Coach Michael Davis',
        created_at: '2024-01-10T09:00:00Z',
        updated_at: '2024-01-10T09:00:00Z',
        organizations: [{ organization_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'coach' }],
        roles: ['coach'],
        is_platform_admin: false,
        last_sign_in_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
    },
    {
        id: DEMO_USER_IDS['parent-admin@example.com'],
        email: 'parent-admin@example.com',
        phone: '+1 (555) 456-7890',
        display_name: 'Robert Chen',
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
        organizations: [{ organization_id: DEMO_ORG_A_ID, org_name: 'Riverside Youth Athletics', role: 'org_admin' }],
        roles: ['parent', 'org_admin'],
        is_platform_admin: false,
        last_sign_in_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        email_confirmed: true,
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
        last_sign_in_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        email_confirmed: true,
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
    { id: 'ff-001', organization_id: DEMO_ORG_A_ID, organization_name: 'Riverside Youth Athletics', feature_key: 'payments_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-002', organization_id: DEMO_ORG_A_ID, organization_name: 'Riverside Youth Athletics', feature_key: 'tryouts_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-003', organization_id: DEMO_ORG_A_ID, organization_name: 'Riverside Youth Athletics', feature_key: 'travel_enabled', enabled: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'ff-004', organization_id: DEMO_ORG_B_ID, organization_name: 'Lincoln High School Athletics', feature_key: 'payments_enabled', enabled: true, created_at: '2023-06-15T00:00:00Z', updated_at: '2023-06-15T00:00:00Z' },
    { id: 'ff-005', organization_id: DEMO_ORG_B_ID, organization_name: 'Lincoln High School Athletics', feature_key: 'tryouts_enabled', enabled: false, created_at: '2023-06-15T00:00:00Z', updated_at: '2023-06-15T00:00:00Z' },
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
        organization_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        fee_assignment_id: 'fa-001',
        fee_id: 'fee-spring-soccer-reg-001',
        fee_title: 'Spring 2024 Soccer Registration',
        child_id: 'child-emma-johnson-001',
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
        organization_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        fee_assignment_id: 'fa-007',
        fee_id: 'fee-spring-bb-reg-002',
        fee_title: 'Spring 2024 Basketball Registration',
        child_id: 'child-liam-johnson-002',
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
        organization_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        fee_assignment_id: 'fa-009',
        fee_id: 'fee-spring-bb-reg-002',
        fee_title: 'Spring 2024 Basketball Registration',
        child_id: 'child-ethan-williams-006',
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
        fee_name: 'Spring 2024 Soccer Registration',
        amount_cents: 15000,
        currency: 'usd',
        due_date: '2024-02-28',
        fee_status: 'active',
        organization_id: DEMO_ORG_A_ID,
        organization_name: 'Riverside Youth Athletics',
        assigned_count: 6,
        paid_count: 4,
        unpaid_count: 2,
        payment_rate_percent: 67,
    },
    {
        id: 'fee-spring-bb-reg-002',
        fee_id: 'fee-spring-bb-reg-002',
        fee_name: 'Spring 2024 Basketball Registration',
        amount_cents: 12500,
        currency: 'usd',
        due_date: '2024-02-28',
        fee_status: 'active',
        organization_id: DEMO_ORG_A_ID,
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
