/**
 * RouteGuard Component
 *
 * Client-side route protection that enforces namespace restrictions.
 * Works as a secondary layer to server-side protection.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isRouteAllowedForRole, getRedirectForUnauthorizedAccess, mapAuthRoleToStandardRole } from '@/lib/routeGuard';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/portal/login', { replace: true });
      return;
    }

    if (!profile) return;

    const userRole = mapAuthRoleToStandardRole(
      profile.role,
      profile.isPlatformAdmin,
      profile.organizations
    );

    if (!isRouteAllowedForRole(location.pathname, userRole)) {
      console.warn(`[CLIENT ROUTE VIOLATION] User ${user.id} (${userRole}) attempted to access ${location.pathname}`);
      const redirectPath = getRedirectForUnauthorizedAccess(location.pathname, userRole);
      navigate(redirectPath, { replace: true });
    }
  }, [location.pathname, user, profile, loading, navigate]);

  if (loading || !user || !profile) {
    return null; // Don't render anything during loading or redirect
  }

  const userRole = mapAuthRoleToStandardRole(
    profile.role,
    profile.isPlatformAdmin,
    profile.organizations
  );

  if (!isRouteAllowedForRole(location.pathname, userRole)) {
    return null; // Don't render during redirect
  }

  return <>{children}</>;
}