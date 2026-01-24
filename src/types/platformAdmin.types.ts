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

/**
 * Valid platform admin roles array for runtime validation (Technical Bug #6)
 */
export const VALID_ROLES: PlatformAdminRole[] = ['super_admin', 'support_admin', 'finance_admin', 'ops_admin']

export type OrganizationStatus = 'trial' | 'active' | 'suspended' | 'expired'

// ============================================================================
// Admin View Types (corresponding to SQL views)
// ============================================================================

/**
 * admin_organizations view row
 * 
 * Enhanced with all fields from the database including contact info,
 * Stripe details, and license information.
 */
export interface AdminOrganization {
    // Basic organization info
    id: string
    name: string
    org_type: string | null
    status: OrganizationStatus
    slug: string | null
    
    // Contact information
    website: string | null
    phone: string | null
    contact_email: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    logo_path: string | null
    
    // License information
    license_status: string | null
    license_plan: string | null
    license_trial_ends_at: string | null
    license_current_period_start: string | null
    license_current_period_end: string | null
    license_grace_ends_at: string | null
    license_cancel_at_period_end: boolean | null
    
    // Stripe information
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    stripe_price_id: string | null
    stripe_connected: boolean
    
    // Payout information
    payout_account_id: string | null
    payouts_enabled: boolean | null
    payout_onboarding_status: 'pending' | 'completed' | 'restricted' | null
    payout_descriptor: string | null
    billing_mode: string | null
    currency: string | null
    
    // Primary location (for travel detection)
    primary_city: string | null
    primary_state: string | null
    primary_region_radius_miles: number | null
    
    // Timestamps
    created_at: string | null
    updated_at: string | null
    
    // Aggregated counts
    team_count: number
    sport_count: number
    user_count: number
}

/**
 * Validation function for AdminOrganization
 * Ensures data from API matches expected schema
 * 
 * @param data - Data to validate
 * @returns true if data is a valid AdminOrganization
 */
export function validateAdminOrganization(data: unknown): data is AdminOrganization {
    if (!data || typeof data !== 'object') return false
    
    const org = data as any
    
    // Check required fields
    if (typeof org.id !== 'string') return false
    if (typeof org.name !== 'string') return false
    if (typeof org.status !== 'string') return false
    if (typeof org.team_count !== 'number') return false
    if (typeof org.sport_count !== 'number') return false
    if (typeof org.user_count !== 'number') return false
    if (typeof org.stripe_connected !== 'boolean') return false
    
    // Validate status enum
    const validStatuses: OrganizationStatus[] = ['trial', 'active', 'suspended', 'expired']
    if (!validStatuses.includes(org.status)) return false
    
    return true
}

/**
 * Organization membership info for admin_users view
 */
export interface AdminUserOrganization {
    org_id: string
    org_name: string
    role: string
}

/**
 * admin_users view row
 */
export interface AdminUser {
    created_at: string | null
    display_name: string | null
    email: string | null
    email_confirmed: boolean | null
    id: string | null
    is_platform_admin: boolean | null
    is_disabled: boolean | null
    last_sign_in_at: string | null
    organizations: AdminUserOrganization[] | null
    phone: string | null
    roles: string[] | null
    updated_at: string | null
    family_id: string | null
}

/**
 * admin_structure view row
 */
export interface AdminStructure {
    org_id: string
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
    org_id: string
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
    org_id: string
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
    active_organizations: number | null
    trial_organizations: number | null
    suspended_organizations: number | null
    total_users: number | null
    platform_admin_count: number | null
    successful_payments: number | null
    failed_payments: number | null
    total_payment_volume_cents: number | null
    total_teams: number | null
    total_children: number | null
}

/**
 * admin_feature_flags view row
 */
export interface AdminFeatureFlag {
    id: string
    org_id: string
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
