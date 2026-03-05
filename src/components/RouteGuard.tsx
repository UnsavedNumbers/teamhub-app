/**
 * RouteGuard Component
 *
 * Client-side route protection that enforces namespace restrictions.
 * Works as a secondary layer to server-side protection.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDemoSession } from '@/contexts/DemoSessionContext';
import { isFirstDemoLogin } from '@/utils/demoMode';
import { isRouteAllowedForRole, getRedirectForUnauthorizedAccess, mapAuthRoleToStandardRole } from '@/lib/routeGuard';
import { getLink, RouteKeys } from '@/utils/routes';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const { session, loading: demoLoading } = useDemoSession();

  // Demo welcome redirect - check if first demo login
  useEffect(() => {
    if (loading || demoLoading || !user) return;
    if (!session.is_demo_session) return;

    // Don't redirect if already on welcome page or auth pages
    if (
      location.pathname === getLink(RouteKeys.DEMO_WELCOME) ||
      location.pathname.startsWith('/portal/auth/') ||
      location.pathname === '/demo' ||
      location.pathname === '/demo-request'
    ) {
      return;
    }

    // Redirect to welcome if first demo login
    if (isFirstDemoLogin()) {
      navigate(getLink(RouteKeys.DEMO_WELCOME), { replace: true });
    }
  }, [loading, demoLoading, user, session.is_demo_session, location.pathname, navigate]);

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