/**
 * useRolePermissions Hook
 * 
 * Centralized permission checking hook for platform admin panel.
 * Provides convenient boolean flags for all permissions based on the current user's role.
 * 
 * This is for UX gating only. Server-side RPCs enforce actual authorization.
 */

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { canPerformAction } from '../utils/platformAdminPermissions'
import type { PlatformAdminRole } from '../types/platformAdmin.types'

/**
 * Permission flags returned by useRolePermissions hook
 */
export interface RolePermissions {
  // View permissions (all roles can view)
  canViewDashboard: boolean
  canViewOrganizations: boolean
  canViewUsers: boolean
  canViewStructure: boolean
  canViewPayments: boolean
  canViewFees: boolean
  canViewAuditLog: boolean
  canViewFeatureFlags: boolean
  canViewPlatformAdmins: boolean

  // Org management
  canActivateOrganization: boolean
  canSuspendOrganization: boolean
  canResetMockOrganization: boolean

  // User management
  canDisableUser: boolean
  canEnableUser: boolean
  canForceLogout: boolean
  canResendVerification: boolean

  // Feature flags
  canToggleFeatureFlag: boolean

  // Platform admin management
  canAddPlatformAdmin: boolean
  canRemovePlatformAdmin: boolean
  canUpdatePlatformAdminRole: boolean

  // Finance actions
  canIssueRefund: boolean
  canMarkDispute: boolean

  // PII access
  canViewStripeDetails: boolean
  canCopyStripeId: boolean

  // Licenses & Entitlements
  canViewLicenses: boolean
  canManageLicenseTiers: boolean
  canManageFeatures: boolean
  canManageOverrides: boolean
  canViewLicensesAudit: boolean
}

/**
 * Hook that returns permission flags based on the current user's platform admin role
 * 
 * @returns Object with boolean flags for all permissions
 */
export function useRolePermissions(): RolePermissions {
  const { profile } = useAuth()
  const adminRole = useMemo<PlatformAdminRole | null>(() => {
    return profile?.platformAdminRole ?? null
  }, [profile?.platformAdminRole])

  return useMemo(() => ({
    // View permissions
    canViewDashboard: canPerformAction(adminRole, 'view_dashboard'),
    canViewOrganizations: canPerformAction(adminRole, 'view_organizations'),
    canViewUsers: canPerformAction(adminRole, 'view_users'),
    canViewStructure: canPerformAction(adminRole, 'view_structure'),
    canViewPayments: canPerformAction(adminRole, 'view_payments'),
    canViewFees: canPerformAction(adminRole, 'view_fees'),
    canViewAuditLog: canPerformAction(adminRole, 'view_audit_log'),
    canViewFeatureFlags: canPerformAction(adminRole, 'view_feature_flags'),
    canViewPlatformAdmins: canPerformAction(adminRole, 'view_platform_admins'),

    // Org management
    canActivateOrganization: canPerformAction(adminRole, 'activate_organization'),
    canSuspendOrganization: canPerformAction(adminRole, 'suspend_organization'),
    canResetMockOrganization: canPerformAction(adminRole, 'reset_mock_organization'),

    // User management
    canDisableUser: canPerformAction(adminRole, 'disable_user'),
    canEnableUser: canPerformAction(adminRole, 'enable_user'),
    canForceLogout: canPerformAction(adminRole, 'force_logout'),
    canResendVerification: canPerformAction(adminRole, 'resend_verification'),

    // Feature flags
    canToggleFeatureFlag: canPerformAction(adminRole, 'toggle_feature_flag'),

    // Platform admin management
    canAddPlatformAdmin: canPerformAction(adminRole, 'add_platform_admin'),
    canRemovePlatformAdmin: canPerformAction(adminRole, 'remove_platform_admin'),
    canUpdatePlatformAdminRole: canPerformAction(adminRole, 'update_platform_admin_role'),

    // Finance actions
    canIssueRefund: canPerformAction(adminRole, 'issue_refund'),
    canMarkDispute: canPerformAction(adminRole, 'mark_dispute'),

    // PII access
    canViewStripeDetails: canPerformAction(adminRole, 'view_full_email'),
    canCopyStripeId: canPerformAction(adminRole, 'copy_full_stripe_id'),

    // Licenses & Entitlements
    canViewLicenses: canPerformAction(adminRole, 'view_licenses'),
    canManageLicenseTiers: canPerformAction(adminRole, 'manage_license_tiers'),
    canManageFeatures: canPerformAction(adminRole, 'manage_features'),
    canManageOverrides: canPerformAction(adminRole, 'manage_overrides'),
    canViewLicensesAudit: canPerformAction(adminRole, 'view_licenses_audit'),
  }), [adminRole])
}
