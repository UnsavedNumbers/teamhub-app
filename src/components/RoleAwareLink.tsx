/**
 * RoleAwareLink Component
 *
 * Link component that validates destinations against role permissions.
 * In development, warns about incorrect links. In production, can hide or correct them.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isRouteAllowedForRole, getNamespaceForRole, mapAuthRoleToStandardRole } from '@/lib/routeGuard';

interface RoleAwareLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  // ... other Link props
}

export function RoleAwareLink({ to, children, ...props }: RoleAwareLinkProps) {
  const { user, profile } = useAuth();

  // In development, warn about mismatched links
  if (process.env.NODE_ENV === 'development' && user && profile) {
    const userRole = mapAuthRoleToStandardRole(
      profile.role,
      profile.isPlatformAdmin,
      profile.organizations
    );

    if (!isRouteAllowedForRole(to, userRole)) {
      console.error(
        `[LINK VIOLATION] Rendering link to ${to} for user with role ${userRole}. ` +
        `This user should only access ${getNamespaceForRole(userRole)}/* routes.`
      );
    }
  }

  // In production, either hide the link or redirect to correct namespace
  if (user && profile) {
    const userRole = mapAuthRoleToStandardRole(
      profile.role,
      profile.isPlatformAdmin,
      profile.organizations
    );

    if (!isRouteAllowedForRole(to, userRole)) {
      // Option 1: Hide the link entirely
      return null;

      // Option 2: Correct the href (use with caution)
      // const correctedHref = to.replace(/^\/(portal|admin|platform-admin|fan)/, getNamespaceForRole(userRole));
      // return <Link to={correctedHref} {...props}>{children}</Link>;
    }
  }

  return <Link to={to} {...props}>{children}</Link>;
}