/**
 * Platform Admin Permissions
 * 
 * Single source of truth for platform admin RBAC.
 * This module centralizes all permission checks for the platform admin panel.
 * 
 * IMPORTANT: This is for UX gating only. Server-side RPCs enforce actual authorization.
 */

import type { PlatformAdminRole } from '../types/platformAdmin.types'

// ============================================================================
// Action Definitions
// ============================================================================

/**
 * All actions that can be performed in the platform admin panel
 */
export type PlatformAdminAction =
    // View actions (all roles can view)
    | 'view_dashboard'
    | 'view_organizations'
    | 'view_organization_detail'
    | 'view_users'
    | 'view_user_detail'
    | 'view_structure'
    | 'view_payments'
    | 'view_fees'
    | 'view_audit_log'
    | 'view_feature_flags'
    | 'view_platform_admins'
    // Org management (ops/super)
    | 'activate_organization'
    | 'suspend_organization'
    | 'reset_mock_organization'
    // User management
    | 'disable_user'        // ops/super
    | 'enable_user'         // ops/super
    | 'force_logout'        // support/super
    | 'resend_verification' // support/super
    // Feature flags (ops/super)
    | 'toggle_feature_flag'
    // Platform admins (super only)
    | 'add_platform_admin'
    | 'remove_platform_admin'
    | 'update_platform_admin_role'
    // Finance actions (finance/super)
    | 'issue_refund'
    | 'mark_dispute'
    // PII access (finance/super for full email, others get masked)
    | 'view_full_email'
    | 'copy_full_stripe_id'
    // Licenses & Entitlements
    | 'view_licenses'
    | 'manage_license_tiers'
    | 'manage_features'
    | 'manage_overrides'
    | 'view_licenses_audit'
    // Email system
    | 'view_email_preview'
    | 'send_test_emails'

/**
 * Permission matrix: maps actions to allowed roles
 */
const PERMISSION_MATRIX: Record<PlatformAdminAction, PlatformAdminRole[]> = {
    // View actions - all platform admins can view
    view_dashboard: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_organizations: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_organization_detail: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_users: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_user_detail: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_structure: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_payments: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_fees: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_audit_log: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_feature_flags: ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'],
    view_platform_admins: ['super_admin'], // Only super_admin can see the admins page

    // Org management - ops/super
    activate_organization: ['super_admin', 'ops_admin'],
    suspend_organization: ['super_admin', 'ops_admin'],
    reset_mock_organization: ['super_admin', 'ops_admin'],

    // User management
    disable_user: ['super_admin', 'ops_admin'],
    enable_user: ['super_admin', 'ops_admin'],
    force_logout: ['super_admin', 'support_admin'],
    resend_verification: ['super_admin', 'support_admin'],

    // Feature flags - ops/super
    toggle_feature_flag: ['super_admin', 'ops_admin'],

    // Platform admin management - super only
    add_platform_admin: ['super_admin'],
    remove_platform_admin: ['super_admin'],
    update_platform_admin_role: ['super_admin'],

    // Finance actions - finance/super
    issue_refund: ['super_admin', 'finance_admin'],
    mark_dispute: ['super_admin', 'finance_admin'],

    // PII access - finance/super
    view_full_email: ['super_admin', 'finance_admin'],
    copy_full_stripe_id: ['super_admin', 'finance_admin'],

    // Licenses & Entitlements - ops/super
    view_licenses: ['super_admin', 'ops_admin'],
    manage_license_tiers: ['super_admin', 'ops_admin'],
    manage_features: ['super_admin', 'ops_admin'],
    manage_overrides: ['super_admin', 'ops_admin'],
    view_licenses_audit: ['super_admin', 'ops_admin'],

    // Email system - ops/super (development/testing only)
    view_email_preview: ['super_admin', 'ops_admin'],
    send_test_emails: ['super_admin', 'ops_admin'],
}

/**
 * Human-readable role labels
 */
export const ROLE_LABELS: Record<PlatformAdminRole, string> = {
    super_admin: 'Super Admin',
    support_admin: 'Support Admin',
    finance_admin: 'Finance Admin',
    ops_admin: 'Operations Admin',
}

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<PlatformAdminRole, string> = {
    super_admin: 'Full access including managing platform admins',
    support_admin: 'Read-only access plus resend verification and force logout',
    finance_admin: 'Read-only access plus refunds and disputes',
    ops_admin: 'Read-only access plus org status changes, user enable/disable, and feature flags',
}

// ============================================================================
// Permission Checking Functions
// ============================================================================

/**
 * Check if a role can perform a specific action
 * 
 * @param role - The platform admin role
 * @param action - The action to check
 * @returns true if the role can perform the action
 */
export function canPerformAction(
    role: PlatformAdminRole | null | undefined,
    action: PlatformAdminAction
): boolean {
    if (!role) return false
    const allowedRoles = PERMISSION_MATRIX[action]
    return allowedRoles.includes(role)
}

/**
 * Get the required role label for an action (for tooltips/messages)
 * 
 * @param action - The action
 * @returns Human-readable string describing required role(s)
 */
export function requiredRoleLabel(action: PlatformAdminAction): string {
    const allowedRoles = PERMISSION_MATRIX[action]

    if (allowedRoles.length === 4) {
        return 'Any platform admin'
    }

    if (allowedRoles.length === 1) {
        return ROLE_LABELS[allowedRoles[0]]
    }

    return allowedRoles.map(r => ROLE_LABELS[r]).join(' or ')
}

/**
 * Get human-readable error message for denied action
 * 
 * @param action - The action that was denied
 * @returns User-friendly error message
 */
export function getDeniedMessage(action: PlatformAdminAction): string {
    const required = requiredRoleLabel(action)
    return `This action requires ${required} role.`
}

/**
 * Get all actions available to a role
 * 
 * @param role - The platform admin role
 * @returns Array of allowed actions
 */
export function getAllowedActions(role: PlatformAdminRole): PlatformAdminAction[] {
    return (Object.entries(PERMISSION_MATRIX) as [PlatformAdminAction, PlatformAdminRole[]][])
        .filter(([_, roles]) => roles.includes(role))
        .map(([action]) => action)
}

// ============================================================================
// Navigation Gating
// ============================================================================

/**
 * Navigation items with their required actions
 */
export interface NavItem {
    text: string
    path: string
    icon: string // Material icon name
    requiredAction: PlatformAdminAction
}

/**
 * Platform admin navigation items
 */
export const PLATFORM_ADMIN_NAV_ITEMS: NavItem[] = [
    { text: 'Dashboard', path: '/platform-admin', icon: 'Dashboard', requiredAction: 'view_dashboard' },
    { text: 'Organizations', path: '/platform-admin/organizations', icon: 'Business', requiredAction: 'view_organizations' },
    { text: 'Users', path: '/platform-admin/users', icon: 'People', requiredAction: 'view_users' },
    { text: 'Structure', path: '/platform-admin/structure', icon: 'AccountTree', requiredAction: 'view_structure' },
    { text: 'Payments', path: '/platform-admin/payments', icon: 'Payment', requiredAction: 'view_payments' },
    { text: 'Fees', path: '/platform-admin/fees', icon: 'Receipt', requiredAction: 'view_fees' },
    { text: 'Audit Log', path: '/platform-admin/audit', icon: 'History', requiredAction: 'view_audit_log' },
    { text: 'Feature Flags', path: '/platform-admin/feature-flags', icon: 'Flag', requiredAction: 'view_feature_flags' },
    { text: 'Platform Admins', path: '/platform-admin/admins', icon: 'AdminPanelSettings', requiredAction: 'view_platform_admins' },
]

/**
 * Filter navigation items based on role
 * 
 * @param role - The platform admin role
 * @returns Filtered navigation items
 */
export function getNavItemsForRole(role: PlatformAdminRole | null | undefined): NavItem[] {
    if (!role) return []
    return PLATFORM_ADMIN_NAV_ITEMS.filter(item =>
        canPerformAction(role, item.requiredAction)
    )
}
