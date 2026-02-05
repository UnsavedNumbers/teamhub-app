/**
 * Permission Checks Tests
 *
 * Comprehensive test suite for role-based access control and permission evaluation.
 * Tests platform admin permissions, organization-level permissions, and security boundaries.
 */

import { describe, test, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  canPerformAction,
  getAllowedActions,
  getDeniedMessage,
  requiredRoleLabel,
  getNavItemsForRole,
  PERMISSION_MATRIX,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type NavItem,
  type PlatformAdminAction,
  type PlatformAdminRole,
} from '../../../utils/platformAdminPermissions'
import { useRolePermissions } from '../../../hooks/useRolePermissions'
import { useAuth } from '../../../hooks/useAuth'

// Mock the useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    profile: {
      id: 'user-123',
      platformAdminRole: 'super_admin', // Default for tests
      isPlatformAdmin: true,
      organizations: [],
    },
  })),
}))

const useAuthMock = vi.mocked(useAuth)

describe('Permission Checks', () => {
  describe('canPerformAction', () => {
    test('allows super_admin to perform all actions', () => {
      const superAdminActions: PlatformAdminAction[] = Object.keys(PERMISSION_MATRIX) as PlatformAdminAction[]

      superAdminActions.forEach(action => {
        expect(canPerformAction('super_admin', action)).toBe(true)
      })
    })

    test('restricts support_admin to appropriate actions', () => {
      // Support admin should be able to view but not modify
      expect(canPerformAction('support_admin', 'view_dashboard')).toBe(true)
      expect(canPerformAction('support_admin', 'view_users')).toBe(true)
      expect(canPerformAction('support_admin', 'force_logout')).toBe(true)
      expect(canPerformAction('support_admin', 'resend_verification')).toBe(true)

      // Should not be able to perform destructive actions
      expect(canPerformAction('support_admin', 'disable_user')).toBe(false)
      expect(canPerformAction('support_admin', 'activate_organization')).toBe(false)
      expect(canPerformAction('support_admin', 'toggle_feature_flag')).toBe(false)
    })

    test('restricts finance_admin to finance-related actions', () => {
      // Finance admin should be able to view and handle payments
      expect(canPerformAction('finance_admin', 'view_payments')).toBe(true)
      expect(canPerformAction('finance_admin', 'issue_refund')).toBe(true)
      expect(canPerformAction('finance_admin', 'mark_dispute')).toBe(true)
      expect(canPerformAction('finance_admin', 'view_full_email')).toBe(true)

      // Should not be able to manage organizations or users
      expect(canPerformAction('finance_admin', 'disable_user')).toBe(false)
      expect(canPerformAction('finance_admin', 'activate_organization')).toBe(false)
      expect(canPerformAction('finance_admin', 'toggle_feature_flag')).toBe(false)
    })

    test('restricts ops_admin to operations-related actions', () => {
      // Ops admin should be able to manage orgs and features
      expect(canPerformAction('ops_admin', 'activate_organization')).toBe(true)
      expect(canPerformAction('ops_admin', 'suspend_organization')).toBe(true)
      expect(canPerformAction('ops_admin', 'toggle_feature_flag')).toBe(true)
      expect(canPerformAction('ops_admin', 'disable_user')).toBe(true)
      expect(canPerformAction('ops_admin', 'enable_user')).toBe(true)

      // Should not be able to manage platform admins or issue refunds
      expect(canPerformAction('ops_admin', 'add_platform_admin')).toBe(false)
      expect(canPerformAction('ops_admin', 'issue_refund')).toBe(false)
    })

    test('denies access for null/undefined roles', () => {
      expect(canPerformAction(null, 'view_dashboard')).toBe(false)
      expect(canPerformAction(undefined, 'view_users')).toBe(false)
    })

    test('handles unknown actions gracefully', () => {
      expect(canPerformAction('super_admin', 'unknown_action' as any)).toBe(false)
    })

    test('validates role types', () => {
      expect(canPerformAction('invalid_role' as PlatformAdminRole, 'view_dashboard')).toBe(false)
    })
  })

  describe('getAllowedActions', () => {
    test('returns all actions for super_admin', () => {
      const allowedActions = getAllowedActions('super_admin')
      const allActions = Object.keys(PERMISSION_MATRIX) as PlatformAdminAction[]

      expect(allowedActions).toHaveLength(allActions.length)
      expect(allowedActions).toEqual(expect.arrayContaining(allActions))
    })

    test('returns correct subset for support_admin', () => {
      const allowedActions = getAllowedActions('support_admin')

      expect(allowedActions).toContain('view_dashboard')
      expect(allowedActions).toContain('force_logout')
      expect(allowedActions).toContain('resend_verification')
      expect(allowedActions).not.toContain('disable_user')
      expect(allowedActions).not.toContain('activate_organization')
    })

    test('returns correct subset for finance_admin', () => {
      const allowedActions = getAllowedActions('finance_admin')

      expect(allowedActions).toContain('view_payments')
      expect(allowedActions).toContain('issue_refund')
      expect(allowedActions).toContain('mark_dispute')
      expect(allowedActions).toContain('view_full_email')
      expect(allowedActions).not.toContain('disable_user')
      expect(allowedActions).not.toContain('toggle_feature_flag')
    })

    test('returns correct subset for ops_admin', () => {
      const allowedActions = getAllowedActions('ops_admin')

      expect(allowedActions).toContain('activate_organization')
      expect(allowedActions).toContain('toggle_feature_flag')
      expect(allowedActions).toContain('disable_user')
      expect(allowedActions).not.toContain('add_platform_admin')
      expect(allowedActions).not.toContain('issue_refund')
    })

    test('returns empty array for invalid roles', () => {
      const allowedActions = getAllowedActions('invalid_role' as PlatformAdminRole)
      expect(allowedActions).toEqual([])
    })
  })

  describe('requiredRoleLabel', () => {
    test('returns "Any platform admin" for universally allowed actions', () => {
      expect(requiredRoleLabel('view_dashboard')).toBe('Any platform admin')
      expect(requiredRoleLabel('view_users')).toBe('Any platform admin')
    })

    test('returns specific role for single-role actions', () => {
      expect(requiredRoleLabel('add_platform_admin')).toBe('Super Admin')
      expect(requiredRoleLabel('remove_platform_admin')).toBe('Super Admin')
    })

    test('returns combined roles for multi-role actions', () => {
      expect(requiredRoleLabel('issue_refund')).toBe('Super Admin or Finance Admin')
      expect(requiredRoleLabel('force_logout')).toBe('Super Admin or Support Admin')
    })
  })

  describe('getDeniedMessage', () => {
    test('generates appropriate denial messages', () => {
      expect(getDeniedMessage('add_platform_admin')).toBe('This action requires Super Admin role.')
      expect(getDeniedMessage('issue_refund')).toBe('This action requires Super Admin or Finance Admin role.')
      expect(getDeniedMessage('view_dashboard')).toBe('This action requires Any platform admin role.')
    })
  })

  describe('Navigation Gating', () => {
    test('shows all navigation items for super_admin', () => {
      const navItems = getNavItemsForRole('super_admin')

      expect(navItems).toHaveLength(9) // All navigation items
      expect(navItems.map((item: NavItem) => item.text)).toEqual([
        'Dashboard',
        'Organizations',
        'Users',
        'Structure',
        'Payments',
        'Fees',
        'Audit Log',
        'Feature Flags',
        'Platform Admins',
      ])
    })

    test('filters navigation for support_admin', () => {
      const navItems = getNavItemsForRole('support_admin')

      // Support admin can see all view pages but not Platform Admins
      expect(navItems.map((item: NavItem) => item.text)).toEqual([
        'Dashboard',
        'Organizations',
        'Users',
        'Structure',
        'Payments',
        'Fees',
        'Audit Log',
        'Feature Flags',
      ])
      expect(navItems).not.toContainEqual(
        expect.objectContaining({ text: 'Platform Admins' })
      )
    })

    test('filters navigation for finance_admin', () => {
      const navItems = getNavItemsForRole('finance_admin')

      expect(navItems.map((item: NavItem) => item.text)).toEqual([
        'Dashboard',
        'Organizations',
        'Users',
        'Structure',
        'Payments',
        'Fees',
        'Audit Log',
        'Feature Flags',
      ])
    })

    test('filters navigation for ops_admin', () => {
      const navItems = getNavItemsForRole('ops_admin')

      expect(navItems.map((item: NavItem) => item.text)).toEqual([
        'Dashboard',
        'Organizations',
        'Users',
        'Structure',
        'Payments',
        'Fees',
        'Audit Log',
        'Feature Flags',
      ])
    })

    test('returns empty navigation for null/undefined roles', () => {
      expect(getNavItemsForRole(null)).toEqual([])
      expect(getNavItemsForRole(undefined)).toEqual([])
    })
  })

  describe('useRolePermissions Hook', () => {
    test('returns correct permissions for super_admin', () => {
      // Mock super_admin role
      useAuthMock.mockReturnValue({
        profile: {
          id: 'user-123',
          platformAdminRole: 'super_admin',
          isPlatformAdmin: true,
          organizations: [],
        },
      })

      const { result } = renderHook(() => useRolePermissions())

      expect(result.current.canViewDashboard).toBe(true)
      expect(result.current.canActivateOrganization).toBe(true)
      expect(result.current.canAddPlatformAdmin).toBe(true)
      expect(result.current.canIssueRefund).toBe(true)
      expect(result.current.canViewStripeDetails).toBe(true)
    })

    test('returns correct permissions for support_admin', () => {
      useAuthMock.mockReturnValue({
        profile: {
          id: 'user-123',
          platformAdminRole: 'support_admin',
          isPlatformAdmin: true,
          organizations: [],
        },
      })

      const { result } = renderHook(() => useRolePermissions())

      expect(result.current.canViewDashboard).toBe(true)
      expect(result.current.canForceLogout).toBe(true)
      expect(result.current.canResendVerification).toBe(true)
      expect(result.current.canActivateOrganization).toBe(false)
      expect(result.current.canAddPlatformAdmin).toBe(false)
      expect(result.current.canIssueRefund).toBe(false)
    })

    test('returns correct permissions for finance_admin', () => {
      useAuthMock.mockReturnValue({
        profile: {
          id: 'user-123',
          platformAdminRole: 'finance_admin',
          isPlatformAdmin: true,
          organizations: [],
        },
      })

      const { result } = renderHook(() => useRolePermissions())

      expect(result.current.canViewPayments).toBe(true)
      expect(result.current.canIssueRefund).toBe(true)
      expect(result.current.canMarkDispute).toBe(true)
      expect(result.current.canViewStripeDetails).toBe(true)
      expect(result.current.canActivateOrganization).toBe(false)
      expect(result.current.canAddPlatformAdmin).toBe(false)
    })

    test('returns correct permissions for ops_admin', () => {
      useAuthMock.mockReturnValue({
        profile: {
          id: 'user-123',
          platformAdminRole: 'ops_admin',
          isPlatformAdmin: true,
          organizations: [],
        },
      })

      const { result } = renderHook(() => useRolePermissions())

      expect(result.current.canActivateOrganization).toBe(true)
      expect(result.current.canToggleFeatureFlag).toBe(true)
      expect(result.current.canDisableUser).toBe(true)
      expect(result.current.canManageFeatures).toBe(true)
      expect(result.current.canAddPlatformAdmin).toBe(false)
      expect(result.current.canIssueRefund).toBe(false)
    })

    test('returns all false for non-platform-admin users', () => {
      useAuthMock.mockReturnValue({
        profile: {
          id: 'user-123',
          platformAdminRole: null,
          isPlatformAdmin: false,
          organizations: [],
        },
      })

      const { result } = renderHook(() => useRolePermissions())

      // All permissions should be false
      Object.values(result.current).forEach(permission => {
        expect(permission).toBe(false)
      })
    })

    test('handles null profile gracefully', () => {
      useAuthMock.mockReturnValue({
        profile: null,
      })

      const { result } = renderHook(() => useRolePermissions())

      // All permissions should be false
      Object.values(result.current).forEach(permission => {
        expect(permission).toBe(false)
      })
    })
  })

  describe('Permission Matrix Integrity', () => {
    test('all actions have at least one allowed role', () => {
      const actions = Object.keys(PERMISSION_MATRIX) as PlatformAdminAction[]

      actions.forEach(action => {
        const allowedRoles = PERMISSION_MATRIX[action]
        expect(allowedRoles.length).toBeGreaterThan(0)
        expect(allowedRoles.every((role: PlatformAdminRole) => ['super_admin', 'support_admin', 'finance_admin', 'ops_admin'].includes(role))).toBe(true)
      })
    })

    test('all roles are valid platform admin roles', () => {
      const actions = Object.keys(PERMISSION_MATRIX) as PlatformAdminAction[]

      actions.forEach(action => {
        const allowedRoles = PERMISSION_MATRIX[action]
        allowedRoles.forEach((role: PlatformAdminRole) => {
          expect(['super_admin', 'support_admin', 'finance_admin', 'ops_admin']).toContain(role)
        })
      })
    })

    test('role labels and descriptions exist for all roles', () => {
      const validRoles: PlatformAdminRole[] = ['super_admin', 'support_admin', 'finance_admin', 'ops_admin']

      validRoles.forEach(role => {
        expect(ROLE_LABELS[role]).toBeDefined()
        expect(typeof ROLE_LABELS[role]).toBe('string')
        expect(ROLE_LABELS[role].length).toBeGreaterThan(0)

        expect(ROLE_DESCRIPTIONS[role]).toBeDefined()
        expect(typeof ROLE_DESCRIPTIONS[role]).toBe('string')
        expect(ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(0)
      })
    })

    test('navigation items have valid required actions', () => {
      const { PLATFORM_ADMIN_NAV_ITEMS } = require('../../../utils/platformAdminPermissions')

      PLATFORM_ADMIN_NAV_ITEMS.forEach((item: NavItem) => {
        expect(PERMISSION_MATRIX[item.requiredAction]).toBeDefined()
        expect(PERMISSION_MATRIX[item.requiredAction].length).toBeGreaterThan(0)
      })
    })
  })

  describe('Security Boundaries', () => {
    test('prevents privilege escalation through role changes', () => {
      // This test ensures that role validation happens server-side
      // and client-side checks are just for UX

      // Even if we manually call canPerformAction with mismatched roles,
      // it should still respect the permission matrix
      expect(canPerformAction('support_admin', 'add_platform_admin')).toBe(false)
      expect(canPerformAction('finance_admin', 'toggle_feature_flag')).toBe(false)
      expect(canPerformAction('ops_admin', 'issue_refund')).toBe(false)
    })

    test('ensures sensitive actions require highest privileges', () => {
      const sensitiveActions: PlatformAdminAction[] = [
        'add_platform_admin',
        'remove_platform_admin',
        'update_platform_admin_role',
      ]

      sensitiveActions.forEach(action => {
        const allowedRoles = PERMISSION_MATRIX[action]
        expect(allowedRoles).toEqual(['super_admin'])
      })
    })

    test('PII access is properly restricted', () => {
      // Full email access should only be for finance and super admins
      const emailAccessRoles = PERMISSION_MATRIX['view_full_email']
      expect(emailAccessRoles).toEqual(['super_admin', 'finance_admin'])

      // Stripe ID copying should also be restricted
      const stripeAccessRoles = PERMISSION_MATRIX['copy_full_stripe_id']
      expect(stripeAccessRoles).toEqual(['super_admin', 'finance_admin'])
    })

    test('destructive actions require appropriate oversight', () => {
      // Organization suspension should require ops or super
      const suspendRoles = PERMISSION_MATRIX['suspend_organization']
      expect(suspendRoles).toContain('super_admin')
      expect(suspendRoles).toContain('ops_admin')

      // User disabling should require ops or super
      const disableRoles = PERMISSION_MATRIX['disable_user']
      expect(disableRoles).toContain('super_admin')
      expect(disableRoles).toContain('ops_admin')
    })

    test('feature flag changes are restricted', () => {
      // Feature flag toggling should only be for ops and super
      const featureFlagRoles = PERMISSION_MATRIX['toggle_feature_flag']
      expect(featureFlagRoles).toEqual(['super_admin', 'ops_admin'])
    })
  })

  describe('Role Hierarchy Validation', () => {
    test('super_admin has all permissions', () => {
      const superActions = getAllowedActions('super_admin')
      const allActions = Object.keys(PERMISSION_MATRIX) as PlatformAdminAction[]

      expect(superActions).toHaveLength(allActions.length)
      expect(superActions.sort()).toEqual(allActions.sort())
    })

    test('ops_admin has more permissions than support_admin', () => {
      const opsActions = getAllowedActions('ops_admin')
      const supportActions = getAllowedActions('support_admin')

      const opsOnlyActions = opsActions.filter((action: PlatformAdminAction) => !supportActions.includes(action))
      expect(opsOnlyActions.length).toBeGreaterThan(0)
    })

    test('finance_admin has unique financial permissions', () => {
      const financeActions = getAllowedActions('finance_admin')
      const otherRoles = ['super_admin', 'support_admin', 'ops_admin'] as PlatformAdminRole[]

      const uniqueFinanceActions = financeActions.filter((action: PlatformAdminAction) => {
        return otherRoles.every((role: PlatformAdminRole) => !getAllowedActions(role).includes(action))
      })

      expect(uniqueFinanceActions.length).toBeGreaterThan(0)
      expect(uniqueFinanceActions).toContain('issue_refund')
      expect(uniqueFinanceActions).toContain('mark_dispute')
    })

    test('support_admin has unique support permissions', () => {
      const supportActions = getAllowedActions('support_admin')
      const otherRoles = ['super_admin', 'finance_admin', 'ops_admin'] as PlatformAdminRole[]

      const uniqueSupportActions = supportActions.filter((action: PlatformAdminAction) => {
        return otherRoles.every((role: PlatformAdminRole) => !getAllowedActions(role).includes(action))
      })

      expect(uniqueSupportActions.length).toBeGreaterThan(0)
      expect(uniqueSupportActions).toContain('force_logout')
      expect(uniqueSupportActions).toContain('resend_verification')
    })
  })

  describe('Error Handling', () => {
    test('handles invalid role types gracefully', () => {
      expect(canPerformAction('invalid_role' as any, 'view_dashboard')).toBe(false)
      expect(getAllowedActions('invalid_role' as any)).toEqual([])
      expect(getNavItemsForRole('invalid_role' as any)).toEqual([])
    })

    test('handles invalid action types gracefully', () => {
      expect(canPerformAction('super_admin', 'invalid_action' as any)).toBe(false)
      expect(requiredRoleLabel('invalid_action' as any)).toBe('Any platform admin') // Fallback
    })

    test('requiredRoleLabel handles edge cases', () => {
      // Mock an action with no allowed roles (shouldn't happen in practice)
      const originalMatrix = { ...PERMISSION_MATRIX }
      ;(PERMISSION_MATRIX as Record<string, PlatformAdminRole[]>)['test_action'] = []

      expect(requiredRoleLabel('test_action' as any)).toBe('Any platform admin') // Fallback

      // Restore
      Object.assign(PERMISSION_MATRIX, originalMatrix)
    })
  })
})
