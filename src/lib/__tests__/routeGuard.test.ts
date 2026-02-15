/**
 * Route Guard Tests
 *
 * Tests for the route access control utilities.
 */

import { describe, test, expect } from 'vitest';
import {
  isRouteAllowedForRole,
  getRedirectForUnauthorizedAccess,
  getNamespaceForRole,
  mapAuthRoleToStandardRole,
} from '../routeGuard';

describe('Route Access Control', () => {
  describe('isRouteAllowedForRole', () => {
    test('allows parent to access /portal routes', () => {
      expect(isRouteAllowedForRole('/portal', 'parent')).toBe(true);
      expect(isRouteAllowedForRole('/portal/dashboard', 'parent')).toBe(true);
      expect(isRouteAllowedForRole('/portal/settings', 'parent')).toBe(true);
    });

    test('blocks parent from accessing /admin routes', () => {
      expect(isRouteAllowedForRole('/admin', 'parent')).toBe(false);
      expect(isRouteAllowedForRole('/admin/dashboard', 'parent')).toBe(false);
      expect(isRouteAllowedForRole('/admin/settings', 'parent')).toBe(false);
    });

    test('blocks parent from accessing /platform-admin routes', () => {
      expect(isRouteAllowedForRole('/platform-admin', 'parent')).toBe(false);
      expect(isRouteAllowedForRole('/platform-admin/dashboard', 'parent')).toBe(false);
    });

    test('blocks parent from accessing /fan routes', () => {
      expect(isRouteAllowedForRole('/fan', 'parent')).toBe(false);
      expect(isRouteAllowedForRole('/fan/home', 'parent')).toBe(false);
    });

    test('allows org_admin to access /admin routes', () => {
      expect(isRouteAllowedForRole('/admin', 'org_admin')).toBe(true);
      expect(isRouteAllowedForRole('/admin/dashboard', 'org_admin')).toBe(true);
    });

    test('blocks org_admin from accessing /portal routes', () => {
      expect(isRouteAllowedForRole('/portal', 'org_admin')).toBe(false);
      expect(isRouteAllowedForRole('/portal/dashboard', 'org_admin')).toBe(false);
    });

    test('allows coach to access /admin routes', () => {
      expect(isRouteAllowedForRole('/admin', 'coach')).toBe(true);
      expect(isRouteAllowedForRole('/admin/dashboard', 'coach')).toBe(true);
    });

    test('blocks coach from accessing /portal routes', () => {
      expect(isRouteAllowedForRole('/portal', 'coach')).toBe(false);
      expect(isRouteAllowedForRole('/portal/dashboard', 'coach')).toBe(false);
    });

    test('allows platform_admin to access /platform-admin routes', () => {
      expect(isRouteAllowedForRole('/platform-admin', 'platform_admin')).toBe(true);
      expect(isRouteAllowedForRole('/platform-admin/dashboard', 'platform_admin')).toBe(true);
    });

    test('blocks platform_admin from accessing /portal routes', () => {
      expect(isRouteAllowedForRole('/portal', 'platform_admin')).toBe(false);
    });

    test('blocks platform_admin from accessing /admin routes', () => {
      expect(isRouteAllowedForRole('/admin', 'platform_admin')).toBe(false);
    });

    test('allows fan to access /fan routes', () => {
      expect(isRouteAllowedForRole('/fan', 'fan')).toBe(true);
      expect(isRouteAllowedForRole('/fan/home', 'fan')).toBe(true);
    });

    test('blocks fan from accessing /portal routes', () => {
      expect(isRouteAllowedForRole('/portal', 'fan')).toBe(false);
    });

    test('allows access to unprotected routes for all roles', () => {
      expect(isRouteAllowedForRole('/', 'parent')).toBe(true);
      expect(isRouteAllowedForRole('/public', 'parent')).toBe(true);
      expect(isRouteAllowedForRole('/portal/tickets', 'parent')).toBe(true);
    });
  });

  describe('getRedirectForUnauthorizedAccess', () => {
    test('redirects parent attempting /admin to /portal', () => {
      expect(getRedirectForUnauthorizedAccess('/admin', 'parent')).toBe('/portal');
      expect(getRedirectForUnauthorizedAccess('/admin/dashboard', 'parent')).toBe('/portal');
    });

    test('redirects org_admin attempting /portal to /admin', () => {
      expect(getRedirectForUnauthorizedAccess('/portal', 'org_admin')).toBe('/admin');
      expect(getRedirectForUnauthorizedAccess('/portal/dashboard', 'org_admin')).toBe('/admin');
    });

    test('redirects unauthorized access to correct namespace', () => {
      expect(getRedirectForUnauthorizedAccess('/platform-admin', 'parent')).toBe('/portal');
      expect(getRedirectForUnauthorizedAccess('/fan', 'org_admin')).toBe('/admin');
      expect(getRedirectForUnauthorizedAccess('/portal', 'platform_admin')).toBe('/platform-admin');
    });
  });

  describe('getNamespaceForRole', () => {
    test('returns correct namespace for each role', () => {
      expect(getNamespaceForRole('parent')).toBe('/portal');
      expect(getNamespaceForRole('org_admin')).toBe('/admin');
      expect(getNamespaceForRole('coach')).toBe('/admin');
      expect(getNamespaceForRole('platform_admin')).toBe('/platform-admin');
      expect(getNamespaceForRole('fan')).toBe('/fan');
    });
  });

  describe('mapAuthRoleToStandardRole', () => {
    test('maps platform admin correctly', () => {
      expect(mapAuthRoleToStandardRole('parent', true, [])).toBe('platform_admin');
    });

    test('maps org_admin from organizations', () => {
      const orgs = [{ roles: ['org_admin'] }];
      expect(mapAuthRoleToStandardRole(undefined, false, orgs)).toBe('org_admin');
    });

    test('maps coach from organizations', () => {
      const orgs = [{ roles: ['coach'] }];
      expect(mapAuthRoleToStandardRole(undefined, false, orgs)).toBe('coach');
    });

    test('maps parent from organizations', () => {
      const orgs = [{ roles: ['parent'] }];
      expect(mapAuthRoleToStandardRole(undefined, false, orgs)).toBe('parent');
    });

    test('maps legacy admin role', () => {
      expect(mapAuthRoleToStandardRole('admin', false, [])).toBe('org_admin');
    });

    test('maps legacy parent role', () => {
      expect(mapAuthRoleToStandardRole('parent', false, [])).toBe('parent');
    });

    test('maps users with no organizations and isFan=true as fans', () => {
      expect(mapAuthRoleToStandardRole(undefined, false, [], true)).toBe('fan');
    });

    test('maps users with no organizations and isFan=false as parents (guardians)', () => {
      // Guardians without org memberships should NOT be treated as fans
      expect(mapAuthRoleToStandardRole(undefined, false, [])).toBe('parent');
    });

    test('defaults to parent for unknown cases without fan flag', () => {
      // Unknown role without fan flag should default to parent, not fan
      expect(mapAuthRoleToStandardRole('unknown', false, [])).toBe('parent');
    });

    test('explicit fan flag takes precedence for users without org roles', () => {
      expect(mapAuthRoleToStandardRole('unknown', false, [], true)).toBe('fan');
    });
  });
});