/**
 * Route Access Control Utilities
 *
 * Centralized utilities for enforcing role-based route access control.
 * Implements strict namespace restrictions as defined in the audit requirements.
 */

import { findRouteKeyByPath, requiresOrganization, getLink, RouteKeys } from '@/utils/routes';
import { getFeatureKeyForRoute } from '@/lib/featureGate/registry';
import { canAccessFeature } from '@/lib/featureGate/api';

export type UserRole = 'parent' | 'org_admin' | 'coach' | 'platform_admin' | 'fan' | 'athlete';

export interface PathAccessContext {
  isAuthenticated: boolean;
  role: UserRole;
  isPlatformAdmin: boolean;
  hasOrganization: boolean;
  orgId?: string | null;
  userId?: string | null;
  organizationRoles?: string[];
}

interface RouteNamespaceConfig {
  namespace: string;
  allowedRoles: UserRole[];
  redirectTo: Record<UserRole, string>;
}

const ROUTE_NAMESPACE_CONFIG: RouteNamespaceConfig[] = [
  {
    namespace: '/portal',
    allowedRoles: ['parent', 'athlete'],
    redirectTo: {
      parent: '/portal',
      athlete: '/portal',
      org_admin: '/admin',
      coach: '/admin',
      platform_admin: '/platform-admin',
      fan: '/fan',
    },
  },
  {
    namespace: '/admin',
    allowedRoles: ['org_admin', 'coach'],
    redirectTo: {
      parent: '/portal',
      athlete: '/portal',
      org_admin: '/admin',
      coach: '/admin',
      platform_admin: '/platform-admin',
      fan: '/fan',
    },
  },
  {
    namespace: '/platform-admin',
    allowedRoles: ['platform_admin'],
    redirectTo: {
      parent: '/portal',
      athlete: '/portal',
      org_admin: '/admin',
      coach: '/admin',
      platform_admin: '/platform-admin',
      fan: '/fan',
    },
  },
  {
    namespace: '/fan',
    allowedRoles: ['fan'],
    redirectTo: {
      parent: '/portal',
      athlete: '/portal',
      org_admin: '/admin',
      coach: '/admin',
      platform_admin: '/platform-admin',
      fan: '/fan',
    },
  },
  {
    namespace: '/help',
    allowedRoles: ['parent', 'org_admin', 'coach', 'athlete', 'platform_admin'],
    redirectTo: {
      parent: '/help',
      athlete: '/help',
      org_admin: '/help',
      coach: '/help',
      platform_admin: '/help',
      fan: '/fan',
    },
  },
];

/**
 * Maps user roles from the auth system to our standardized roles
 * 
 * Note: The isFan parameter should be determined by checking:
 * 1. user.user_metadata?.signup_mode === 'fan'
 * 2. OR user has entries in fan_org_follows table
 * 
 * A guardian/parent with no org memberships is NOT a fan - they default to 'parent'.
 */
export function mapAuthRoleToStandardRole(
  authRole: string | undefined, 
  isPlatformAdmin: boolean, 
  organizations: any[],
  isFan: boolean = false
): UserRole {
  if (isPlatformAdmin) return 'platform_admin';

  // Check for admin/coach roles in organizations
  const hasOrgAdmin = organizations.some(org => org.roles?.includes('org_admin'));
  const hasCoach = organizations.some(org => org.roles?.includes('coach'));
  const hasParent = organizations.some(org => org.roles?.includes('parent'));
  const hasAthlete = organizations.some(org => org.roles?.includes('athlete'));

  if (hasOrgAdmin) return 'org_admin';
  if (hasCoach) return 'coach';
  if (hasParent) return 'parent';
  if (hasAthlete) return 'athlete';

  // Check legacy role field
  if (authRole === 'admin') return 'org_admin';
  if (authRole === 'parent') return 'parent';

  // Check if explicitly identified as a fan
  if (isFan) return 'fan';

  // Default: Users without org memberships who aren't fans are parents/guardians
  // (e.g., guardians waiting to be linked to athletes)
  return 'parent';
}

/**
 * Check if a route is allowed for a given role
 */
export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  for (const config of ROUTE_NAMESPACE_CONFIG) {
    if (pathname.startsWith(config.namespace)) {
      return config.allowedRoles.includes(role);
    }
  }
  // Route not in any protected namespace - allow access
  return true;
}

/**
 * Get the correct redirect destination for unauthorized access
 */
export function getRedirectForUnauthorizedAccess(
  attemptedPath: string,
  userRole: UserRole
): string {
  for (const config of ROUTE_NAMESPACE_CONFIG) {
    if (attemptedPath.startsWith(config.namespace)) {
      return config.redirectTo[userRole];
    }
  }
  return getNamespaceForRole(userRole);
}

/**
 * Get the default namespace for a role
 */
export function getNamespaceForRole(role: UserRole): string {
  const config = ROUTE_NAMESPACE_CONFIG.find(c => c.allowedRoles.includes(role));
  return config?.namespace ?? '/';
}

/**
 * Get all protected namespaces
 */
export function getProtectedNamespaces(): string[] {
  return ROUTE_NAMESPACE_CONFIG.map(config => config.namespace);
}

function sanitizePath(inputPath: string): string {
  const base = (inputPath || '/').trim();
  if (!base) return '/';

  if (/^https?:\/\//i.test(base)) {
    try {
      const url = new URL(base);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return '/';
    }
  }

  return base.startsWith('/') ? base : `/${base}`;
}

function splitPathParts(path: string): { pathname: string; search: string; hash: string } {
  const hashIndex = path.indexOf('#');
  const searchIndex = path.indexOf('?');

  const endOfPath = [searchIndex, hashIndex].filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? path.length;
  const pathname = path.slice(0, endOfPath) || '/';

  const search =
    searchIndex >= 0
      ? path.slice(searchIndex, hashIndex >= 0 && hashIndex > searchIndex ? hashIndex : path.length)
      : '';
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';

  return { pathname, search, hash };
}

/**
 * Returns the safest default homepage for a role.
 */
export function getHomeRouteForRole(role: UserRole): string {
  switch (role) {
    case 'platform_admin':
      return getLink(RouteKeys.PLATFORM_DASHBOARD);
    case 'org_admin':
    case 'coach':
      return getLink(RouteKeys.ADMIN_DASHBOARD);
    case 'fan':
      return getLink(RouteKeys.FAN_HOME);
    case 'athlete':
    case 'parent':
    default:
      return getLink(RouteKeys.PORTAL_DASHBOARD);
  }
}

/**
 * Evaluate whether a user context can access a path using the same route + feature systems.
 */
export async function canAccessPath(
  context: PathAccessContext,
  path: string,
): Promise<boolean> {
  if (!context.isAuthenticated) {
    return false;
  }

  const normalized = sanitizePath(path);
  const { pathname } = splitPathParts(normalized);

  if (!isRouteAllowedForRole(pathname, context.role)) {
    return false;
  }

  const routeKey = findRouteKeyByPath(pathname);
  if (!routeKey) {
    return true;
  }

  if (requiresOrganization(routeKey) && !context.hasOrganization && !context.isPlatformAdmin) {
    return false;
  }

  const featureKey = getFeatureKeyForRoute(routeKey);
  if (!featureKey || context.isPlatformAdmin) {
    return true;
  }

  if (!context.userId) {
    return false;
  }

  const featureAllowed = await canAccessFeature(featureKey, {
    org_id: context.orgId ?? null,
    user_id: context.userId,
    role:
      context.role === 'org_admin'
        ? 'org_admin'
        : context.role === 'coach'
          ? 'coach'
          : 'parent',
    license_tier: null,
    is_platform_admin: context.isPlatformAdmin,
  });

  return featureAllowed;
}