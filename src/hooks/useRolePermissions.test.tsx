import { describe, test, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRolePermissions } from './useRolePermissions'

vi.mock('./useAuth', () => ({
  useAuth: () => ({ profile: { platformAdminRole: null } }),
}))

describe('useRolePermissions', () => {
  test('returns permission flags', () => {
    const { result } = renderHook(() => useRolePermissions())
    expect(result.current).toHaveProperty('canViewDashboard')
    expect(result.current).toHaveProperty('canActivateOrganization')
  })
})
