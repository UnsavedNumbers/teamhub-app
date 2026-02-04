/**
 * Route Access Control Utilities
 *
 * Centralized utilities for enforcing role-based route access control.
 * Implements strict namespace restrictions as defined in the audit requirements.
 */

type UserRole = 'parent' | 'org_admin' | 'coach' | 'platform_admin' | 'fan';

interface RouteNamespaceConfig {
  namespace: string;
  allowedRoles: UserRole[];
  redirectTo: Record<UserRole, string>;
}

const ROUTE_NAMESPACE_CONFIG: RouteNamespaceConfig[] = [
  {
    namespace: '/portal',
    allowedRoles: ['parent'],
    redirectTo: {
      parent: '/portal',
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
      org_admin: '/admin',
      coach: '/admin',
      platform_admin: '/platform-admin',
      fan: '/fan',
    },
  },
];

/**
 * Maps user roles from the auth system to our standardized roles
 */
export function mapAuthRoleToStandardRole(authRole: string | undefined, isPlatformAdmin: boolean, organizations: any[]): UserRole {
  if (isPlatformAdmin) return 'platform_admin';

  // Check for admin/coach roles in organizations
  const hasOrgAdmin = organizations.some(org => org.roles?.includes('org_admin'));
  const hasCoach = organizations.some(org => org.roles?.includes('coach'));
  const hasParent = organizations.some(org => org.roles?.includes('parent'));

  if (hasOrgAdmin) return 'org_admin';
  if (hasCoach) return 'coach';
  if (hasParent) return 'parent';

  // Check legacy role field
  if (authRole === 'admin') return 'org_admin';
  if (authRole === 'parent') return 'parent';

  // If no organizations, assume fan
  if (organizations.length === 0) return 'fan';

  // Default fallback
  return 'fan';
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