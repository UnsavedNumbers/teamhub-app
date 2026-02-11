/**
 * Permission Checks Tests
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
  PLATFORM_ADMIN_NAV_ITEMS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type NavItem,
  type PlatformAdminAction,
  type PlatformAdminRole,
} from '@/utils/platformAdminPermissions'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { useAuth } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    profile: {
      id: 'user-123',
      platformAdminRole: 'super_admin',
      isPlatformAdmin: true,
      organizations: [],
    },
  })),
}))

const useAuthMock = vi.mocked(useAuth)

describe('Permission Checks', () => {
  describe('canPerformAction', () => {
    test('allows super_admin to perform all actions', () => {
      const superAdminActions = Object.keys(PERMISSION_MATRIX) as PlatformAdminAction[]
      superAdminActions.forEach(action => {
        expect(canPerformAction('super_admin', action)).toBe(true)
      })
    })

    test('restricts support_admin to appropriate actions', () => {
      expect(canPerformAction('support_admin', 'view_dashboard')).toBe(true)
      expect(canPerformAction('support_admin', 'force_logout')).toBe(true)
      expect(canPerformAction('support_admin', 'disable_user')).toBe(false)
      expect(canPerformAction('support_admin', 'activate_organization')).toBe(false)
    })

    test('denies access for null/undefined roles', () => {
      expect(canPerformAction(null, 'view_dashboard')).toBe(false)
      expect(canPerformAction(undefined, 'view_users')).toBe(false)
    })
  })

  describe('getAllowedActions', () => {
    test('returns all actions for super_admin', () => {
      const allowedActions = getAllowedActions('super_admin')
      const allActions = Object.keys(PERMISSION_MATRIX) as PlatformAdminAction[]
      expect(allowedActions).toHaveLength(allActions.length)
    })

    test('returns empty array for invalid roles', () => {
      expect(getAllowedActions('invalid_role' as PlatformAdminRole)).toEqual([])
    })
  })

  describe('requiredRoleLabel', () => {
    test('returns "Any platform admin" for universally allowed actions', () => {
      expect(requiredRoleLabel('view_dashboard')).toBe('Any platform admin')
    })

    test('returns specific role for single-role actions', () => {
      expect(requiredRoleLabel('add_platform_admin')).toBe('Super Admin')
    })
  })

  describe('getDeniedMessage', () => {
    test('generates appropriate denial messages', () => {
      expect(getDeniedMessage('add_platform_admin')).toBe('This action requires Super Admin role.')
    })
  })

  describe('useRolePermissions Hook', () => {
    test('returns correct permissions for super_admin', () => {
      useAuthMock.mockReturnValue({
        profile: {
          id: 'user-123',
          platformAdminRole: 'super_admin',
          isPlatformAdmin: true,
          organizations: [],
        },
      } as never)

      const { result } = renderHook(() => useRolePermissions())

      expect(result.current.canViewDashboard).toBe(true)
      expect(result.current.canActivateOrganization).toBe(true)
      expect(result.current.canAddPlatformAdmin).toBe(true)
    })

    test('returns all false for non-platform-admin users', () => {
      useAuthMock.mockReturnValue({
        profile: {
          id: 'user-123',
          platformAdminRole: null,
          isPlatformAdmin: false,
          organizations: [],
        },
      } as never)

      const { result } = renderHook(() => useRolePermissions())

      Object.values(result.current).forEach(permission => {
        expect(permission).toBe(false)
      })
    })

    test('handles null profile gracefully', () => {
      useAuthMock.mockReturnValue({ profile: null } as never)

      const { result } = renderHook(() => useRolePermissions())

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
      })
    })

    test('role labels and descriptions exist for all roles', () => {
      const validRoles: PlatformAdminRole[] = ['super_admin', 'support_admin', 'finance_admin', 'ops_admin']
      validRoles.forEach(role => {
        expect(ROLE_LABELS[role]).toBeDefined()
        expect(ROLE_DESCRIPTIONS[role]).toBeDefined()
      })
    })

    test('navigation items have valid required actions', () => {
      PLATFORM_ADMIN_NAV_ITEMS.forEach((item: NavItem) => {
        expect(PERMISSION_MATRIX[item.requiredAction]).toBeDefined()
      })
    })
  })
})
