/**
 * Platform Admin Types
 * 
 * TypeScript types for the platform admin panel.
 * These types correspond to the 8 admin views in the database.
 */

// ============================================================================
// Enums matching database
// ============================================================================

export type PlatformAdminRole = 'super_admin' | 'support_admin' | 'finance_admin' | 'ops_admin'

export type OrganizationStatus = 'trial' | 'active' | 'suspended' | 'expired'

// ============================================================================
// Admin View Types (corresponding to SQL views)
// ============================================================================

/**
 * admin_organizations view row
 */
export interface AdminOrganization {
    id: string
    name: string
    org_type: string | null
    status: OrganizationStatus
    license_status: string | null
    license_plan: string | null
    license_trial_ends_at: string | null
    license_current_period_end: string | null
    payout_account_id: string | null
    payouts_enabled: boolean | null
    created_at: string | null
    updated_at: string | null
    team_count: number
    sport_count: number
    user_count: number
    stripe_connected: boolean
}

/**
 * Organization membership info for admin_users view
 */
export interface AdminUserOrganization {
    organization_id: string
    org_name: string
    role: string
}

/**
 * admin_users view row
 */
export interface AdminUser {
    id: string
    email: string | null
    phone: string | null
    display_name: string | null
    created_at: string | null
    updated_at: string | null
    organizations: AdminUserOrganization[]
    roles: string[]
    is_platform_admin: boolean
    last_sign_in_at: string | null
    email_confirmed: boolean
}

/**
 * admin_structure view row
 */
export interface AdminStructure {
    organization_id: string
    organization_name: string
    team_id: string | null
    team_name: string | null
    season_id: string | null
    season_name: string | null
    season_active: boolean | null
    player_count: number
}

/**
 * admin_payments view row
 */
export interface AdminPayment {
    id: string
    amount_cents: number
    currency: string | null
    stripe_payment_intent_id: string | null
    status: string
    created_at: string | null
    organization_id: string
    organization_name: string
    fee_assignment_id: string | null
    fee_id: string | null
    fee_title: string | null
    child_id: string | null
    child_name: string | null
    parent_email: string | null
    parent_name: string | null
}

/**
 * admin_fees_status view row
 */
export interface AdminFeeStatus {
    id: string // Mapped from fee_id
    fee_id: string
    fee_name: string
    amount_cents: number
    currency: string | null
    due_date: string | null
    fee_status: string
    organization_id: string
    organization_name: string
    assigned_count: number
    paid_count: number
    unpaid_count: number
    payment_rate_percent: number
}

/**
 * admin_audit_log view row
 */
export interface AdminAuditLog {
    id: string
    actor_id: string | null
    actor_email: string | null
    actor_name: string | null
    action: string
    entity_type: string
    entity_id: string
    metadata: Record<string, unknown>
    created_at: string
}

/**
 * admin_platform_health view row (singleton)
 */
export interface AdminPlatformHealth {
    active_organizations: number
    trial_organizations: number
    suspended_organizations: number
    total_users: number
    platform_admin_count: number
    successful_payments: number
    failed_payments: number
    total_payment_volume_cents: number
    total_teams: number
    total_children: number
}

/**
 * admin_feature_flags view row
 */
export interface AdminFeatureFlag {
    id: string
    organization_id: string
    organization_name: string
    feature_key: string
    enabled: boolean
    created_at: string | null
    updated_at: string | null
}

/**
 * Platform admin record (from platform_admins table)
 */
export interface PlatformAdmin {
    user_id: string
    role: PlatformAdminRole
    created_at: string | null
    // Joined user info
    email?: string | null
    display_name?: string | null
}

// ============================================================================
// RPC Response Types
// ============================================================================

export interface AdminRpcResponse {
    success: boolean
    error?: string
    action?: string
}

// ============================================================================
// UI State Types
// ============================================================================

export interface PaginationState {
    page: number
    rowsPerPage: number
    totalCount: number
}

export interface FilterState {
    search: string
    status?: string
    dateFrom?: string
    dateTo?: string
    organizationId?: string
}

/**
 * Known feature flags (for type safety)
 */
export type KnownFeatureFlag =
    | 'payments_enabled'
    | 'tryouts_enabled'
    | 'travel_enabled'
    | 'uniforms_enabled'
    | 'messaging_enabled'

/**
 * Action types for audit logging
 */
export type AuditAction =
    | 'activate_organization'
    | 'suspend_organization'
    | 'disable_user'
    | 'enable_user'
    | 'set_feature_flag'
    | 'add_platform_admin'
    | 'update_platform_admin'
    | 'remove_platform_admin'
    | 'pii_viewed'
    | 'issue_refund'
    | 'mark_dispute'
    | 'resend_verification'
    | 'force_logout'

/**
 * Entity types for audit logging
 */
export type AuditEntityType =
    | 'organization'
    | 'user'
    | 'feature_flag'
    | 'platform_admin'
    | 'payment'
