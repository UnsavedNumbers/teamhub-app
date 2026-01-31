/**
 * FeatureGateRoute Component
 * 
 * Route wrapper that enforces feature gate checks.
 * Use inside ProtectedRoute (after auth/org/license checks).
 * 
 * @example
 * ```tsx
 * <Route
 *   path="/admin/travel"
 *   element={
 *     <ProtectedRoute allowedRoles={['admin', 'coach']}>
 *       <FeatureGateRoute routeKey="admin.travel.list">
 *         <AdminTravel />
 *       </FeatureGateRoute>
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */

import { Navigate, useLocation } from 'react-router-dom';
import { 
  useFeatureGate, 
  getFeatureKeyForRoute, 
  isRouteUngated, 
  getReasonMessage,
  getReasonIcon,
  shouldShowUpgradePrompt,
} from '@/lib/featureGate';
import { getLink, RouteKeys } from '@/utils/routes';

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
 * Route wrapper that enforces feature gate checks
 */
export function FeatureGateRoute({
  children,
  routeKey,
  featureKey: explicitFeatureKey,
  fallback,
}: FeatureGateRouteProps) {
  const location = useLocation();
  const featureKey = explicitFeatureKey ?? getFeatureKeyForRoute(routeKey);
  
  // IMPORTANT: Call all hooks before any conditional returns (Rules of Hooks)
  // Pass empty string to useFeatureGate if no feature key (it will handle gracefully)
  const { allowed, gate_action, reason_code, loading } = useFeatureGate(featureKey || '');

  // Ungated routes pass through
  if (!featureKey || isRouteUngated(routeKey)) {
    return <>{children}</>;
  }

  // While loading, render nothing (ProtectedRoute handles loading state)
  if (loading) {
    return null;
  }

  // Access granted
  if (allowed) {
    return <>{children}</>;
  }

  // Custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Handle gate actions
  switch (gate_action) {
    case 'paywall':
      // Redirect to billing/plan selection
      return (
        <Navigate
          to={getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING)}
          state={{ from: location, reason: 'feature_gate', feature: featureKey }}
          replace
        />
      );

    case 'hide':
      // Redirect to dashboard (404-like behavior)
      return (
        <Navigate
          to={getLink(RouteKeys.PORTAL_DASHBOARD)}
          replace
        />
      );

    case 'modal':
      // Render children but with modal context
      // The page should check for this and show modal
      return (
        <>
          {children}
        </>
      );

    case 'overlay':
    case 'disable':
    default:
      // Show upgrade overlay
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
