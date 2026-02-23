/**
 * FeatureGateRoute Component
 * 
 * Route wrapper that enforces feature gate checks.
 * Use inside ProtectedRoute (after auth/org/license checks).
 * 
 * Improvements:
 *  - Safe redirect logic: never redirects to another gated route
 *  - Redirect-loop detection via sessionStorage (max 2 consecutive redirects)
 *  - Context-aware safe targets (admin → admin dashboard, portal → portal dashboard)
 */

import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { 
  useFeatureGate, 
  getFeatureKeyForRoute, 
  isRouteUngated, 
  getReasonMessage,
  getReasonIcon,
  shouldShowUpgradePrompt,
} from '@/lib/featureGate';
import { getLink, RouteKeys } from '@/utils/routes';
import { USE_FAKE_DATA } from '@/data/config';
import FeatureUpgradePaywallContent from './admin/FeatureUpgradePaywallContent';

/** sessionStorage key for redirect-loop detection */
const REDIRECT_COUNTER_KEY = '__fg_redirect_count';
/** Max consecutive gate redirects before we bail to a hard-safe target */
const MAX_REDIRECTS = 2;

interface FeatureGateRouteProps {
  children: React.ReactNode;
  /** Route key from definitions.ts */
  routeKey: string;
  /** Override route mapping with explicit feature key */
  featureKey?: string;
  /** Custom fallback component instead of default overlay */
  fallback?: React.ReactNode;
}

/**
 * Determine a safe redirect target based on the current route context.
 * Admin routes go to admin dashboard, everything else goes to portal dashboard.
 */
function getSafeRedirectTarget(pathname: string): string {
  if (pathname.startsWith('/admin')) {
    return getLink(RouteKeys.ADMIN_DASHBOARD);
  }
  return getLink(RouteKeys.PORTAL_DASHBOARD);
}

/**
 * Detects and guards against redirect loops.
 * Returns the safe target if under the limit, or null to signal "stop redirecting".
 */
function getLoopSafeRedirect(pathname: string): string | null {
  try {
    const raw = sessionStorage.getItem(REDIRECT_COUNTER_KEY);
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= MAX_REDIRECTS) {
      // Too many consecutive redirects — reset counter and render overlay instead
      sessionStorage.removeItem(REDIRECT_COUNTER_KEY);
      return null;
    }

    sessionStorage.setItem(REDIRECT_COUNTER_KEY, String(count + 1));
    return getSafeRedirectTarget(pathname);
  } catch {
    // sessionStorage unavailable (e.g. private browsing edge case)
    return getSafeRedirectTarget(pathname);
  }
}

/**
 * Reset the redirect counter — call on successful page render.
 */
function clearRedirectCounter() {
  try {
    sessionStorage.removeItem(REDIRECT_COUNTER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Route wrapper that enforces feature gate checks
 */
export function FeatureGateRoute({
  children,
  routeKey,
  featureKey: explicitFeatureKey,
  fallback,
}: FeatureGateRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const featureKey = explicitFeatureKey ?? getFeatureKeyForRoute(routeKey);
  
  // IMPORTANT: Call all hooks before any conditional returns (Rules of Hooks)
  // Pass empty string to useFeatureGate if no feature key (it will handle gracefully)
  const { allowed, gate_action, reason_code, loading } = useFeatureGate(featureKey || '');

  // Update URL with feature key for paywall when needed
  useEffect(() => {
    if (gate_action === 'paywall' && featureKey) {
      const currentSearch = new URLSearchParams(location.search);
      if (!currentSearch.has('referrer')) {
        currentSearch.set('referrer', featureKey);
        navigate({ search: currentSearch.toString() }, { replace: true });
      }
    }
  }, [gate_action, featureKey, location.search, navigate]);

  // Ungated routes pass through
  if (!featureKey || isRouteUngated(routeKey)) {
    clearRedirectCounter();
    return <>{children}</>;
  }

  // While loading, render nothing (ProtectedRoute handles loading state)
  if (loading) {
    return null;
  }

  // Access granted — clear the redirect counter so future loops start fresh
  if (allowed) {
    clearRedirectCounter();
    return <>{children}</>;
  }

  // In fake data mode, allow portal payments without an organization so demo shows the payments page
  if (USE_FAKE_DATA && reason_code === 'no_organization' && (routeKey === 'portal.payments' || routeKey === 'portal.payments.detail')) {
    clearRedirectCounter();
    return <>{children}</>;
  }

  // Custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Handle gate actions
  switch (gate_action) {
    case 'paywall':
      // Render paywall content within AdminLayout
      clearRedirectCounter();
      return (
        <FeatureUpgradePaywallContent />
      );

    case 'hide': {
      // Redirect to dashboard (404-like behavior) with loop protection
      const target = getLoopSafeRedirect(location.pathname);
      if (target === null) {
        // Loop detected — render overlay instead of redirecting again
        return (
          <FeatureGateOverlay
            reasonCode={reason_code}
            featureKey={featureKey}
            showUpgrade={false}
          />
        );
      }
      return <Navigate to={target} replace />;
    }

    case 'modal':
      // Render children but with modal context
      // The page should check for this and show modal
      clearRedirectCounter();
      return (
        <>
          {children}
        </>
      );

    case 'overlay':
    case 'disable':
    default:
      // Show upgrade overlay
      clearRedirectCounter();
      return (
        <FeatureGateOverlay
          reasonCode={reason_code}
          featureKey={featureKey}
          showUpgrade={shouldShowUpgradePrompt(reason_code)}
        />
      );
  }
}

/**
 * Default overlay shown when feature is gated
 */
interface FeatureGateOverlayProps {
  reasonCode: string;
  featureKey: string;
  showUpgrade?: boolean;
}

function FeatureGateOverlay({ reasonCode, showUpgrade }: FeatureGateOverlayProps) {
  const icon = getReasonIcon(reasonCode as any);
  const message = getReasonMessage(reasonCode as any);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md p-8 text-center">
        <span className="material-symbols-rounded text-6xl text-amber-500 mb-4 block">
          {icon}
        </span>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Feature Unavailable
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>
        {showUpgrade && (
          <a
            href={getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <span className="material-symbols-rounded text-xl">workspace_premium</span>
            Upgrade Plan
          </a>
        )}
      </div>
    </div>
  );
}

export default FeatureGateRoute;
