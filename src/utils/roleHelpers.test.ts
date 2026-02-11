import { describe, test, expect } from 'vitest'
import {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  getPrimaryRole,
  hasRoleInAnyOrg,
  formatRoleName,
  mapFrontendRoleToDbRole,
  mapDbRoleToFrontendRole,
} from '@/utils/roleHelpers'
import { createMockOrgMembership } from '@/test/factories'

describe('hasRole', () => {
  test('returns false for null org', () => {
    expect(hasRole(null, 'parent')).toBe(false)
  })

  test('returns false for empty roles', () => {
    expect(hasRole(createMockOrgMembership({ roles: [] }), 'parent')).toBe(false)
  })

  test('returns true for matching role', () => {
    expect(hasRole(createMockOrgMembership({ roles: ['parent'] }), 'parent')).toBe(true)
  })

  test('returns false for non-matching', () => {
    expect(hasRole(createMockOrgMembership({ roles: ['parent'] }), 'coach')).toBe(false)
  })
})

describe('hasAnyRole', () => {
  test('returns false for null org', () => {
    expect(hasAnyRole(null, ['parent', 'coach'])).toBe(false)
  })

  test('returns true for partial match', () => {
    expect(hasAnyRole(createMockOrgMembership({ roles: ['parent'] }), ['coach', 'parent'])).toBe(true)
  })
})

describe('hasAllRoles', () => {
  test('returns false for null org', () => {
    expect(hasAllRoles(null, ['parent'])).toBe(false)
  })

  test('returns true when all present', () => {
    expect(hasAllRoles(createMockOrgMembership({ roles: ['org_admin', 'coach'] }), ['org_admin', 'coach'])).toBe(true)
  })

  test('returns false when missing some', () => {
    expect(hasAllRoles(createMockOrgMembership({ roles: ['parent'] }), ['parent', 'coach'])).toBe(false)
  })
})

describe('getPrimaryRole', () => {
  test('returns null for null org', () => {
    expect(getPrimaryRole(null)).toBeNull()
  })

  test('returns org_admin when present', () => {
    expect(getPrimaryRole(createMockOrgMembership({ roles: ['org_admin', 'coach'] }))).toBe('org_admin')
  })

  test('returns coach when no org_admin', () => {
    expect(getPrimaryRole(createMockOrgMembership({ roles: ['coach', 'parent'] }))).toBe('coach')
  })
})

describe('hasRoleInAnyOrg', () => {
  test('returns true when role in any org', () => {
    const orgs = [createMockOrgMembership({ roles: ['parent'] }), createMockOrgMembership({ roles: ['coach'] })]
    expect(hasRoleInAnyOrg(orgs, 'coach')).toBe(true)
  })

  test('returns false when role not in any', () => {
    expect(hasRoleInAnyOrg([createMockOrgMembership({ roles: ['parent'] })], 'coach')).toBe(false)
  })
})

describe('formatRoleName', () => {
  test('formats org_admin as Admin', () => {
    expect(formatRoleName('org_admin')).toBe('Admin')
  })

  test('formats coach as Coach', () => {
    expect(formatRoleName('coach')).toBe('Coach')
  })

  test('formats parent as Parent', () => {
    expect(formatRoleName('parent')).toBe('Parent')
  })
})

describe('mapFrontendRoleToDbRole', () => {
  test('maps admin to org_admin', () => {
    expect(mapFrontendRoleToDbRole('admin')).toBe('org_admin')
  })

  test('maps coach to coach', () => {
    expect(mapFrontendRoleToDbRole('coach')).toBe('coach')
  })
})

describe('mapDbRoleToFrontendRole', () => {
  test('maps org_admin to admin', () => {
    expect(mapDbRoleToFrontendRole('org_admin')).toBe('admin')
  })

  test('maps staff to admin', () => {
    expect(mapDbRoleToFrontendRole('staff')).toBe('admin')
  })
})
