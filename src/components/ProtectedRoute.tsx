import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { NoOrganizationEmptyState } from './admin/NoOrganizationEmptyState'
import { hasAnyRole } from '@/utils/roleHelpers'
import { getLink, getPath, RouteKeys } from '@/utils/routes'
import type { OrgMemberRole } from '@/contexts/OrganizationContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  // UX-only role checking - RLS handles actual authorization
  allowedRoles?: ('parent' | 'coach' | 'admin' | 'org_admin')[]
  // Optional: require specific organization (for org-scoped routes)
  requireOrganization?: boolean
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireOrganization = false 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const { isLoading: _orgLoading, currentOrganization } = useOrganization()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isPlatformAdmin = profile?.isPlatformAdmin ?? false

  const { isActive: licenseActive, isPastGracePeriod, loading: licenseLoading } = useLicense(
    isAdminRoute && !isPlatformAdmin ? currentOrganization?.id : undefined,
    { requireOrganization: isAdminRoute && !isPlatformAdmin }
  )

  // Always wait for auth loading. Do NOT globally block on orgLoading;
  // platform admins and admin routes must be able to render without an org selected.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAdminRoute && !isPlatformAdmin && licenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={getLink(RouteKeys.AUTH_LOGIN)} state={{ from: location }} replace />
  }

  // Wait for profile to load
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Check organization setup requirement flag
  // Platform admins bypass this check
  // Allow access to onboarding route even with flag set
  const onboardingPath = getPath(RouteKeys.ADMIN_ONBOARDING)
  const isOnboardingRoute = location.pathname === onboardingPath
  if (!profile.isPlatformAdmin && profile.requiresOrgSetup && !isOnboardingRoute) {
    return <Navigate to={getLink(RouteKeys.ADMIN_ONBOARDING)} replace />
  }

  // Global no-org gate for /admin/* routes
  // Show empty state when org_admin has no organizations
  // This prevents pages from rendering skeleton loops when currentOrganization is null
  // Allow-list: onboarding, billing, trial expired, and organization routes (user needs these to get started)
  const adminRouteAllowList = [
    getPath(RouteKeys.ADMIN_ONBOARDING),
    getPath(RouteKeys.ADMIN_ORGANIZATION_BILLING),
    getPath(RouteKeys.ADMIN_ORGANIZATION),
    getPath(RouteKeys.ADMIN_TRIAL_EXPIRED),
  ]
  const isAllowedAdminRoute = adminRouteAllowList.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  )
  
  if (
    isAdminRoute && 
    !isPlatformAdmin && 
    profile.organizations.length === 0 && 
    !isAllowedAdminRoute
  ) {
    return <NoOrganizationEmptyState />
  }

  // Check if organization is required but user has no orgs
  if (requireOrganization && !profile.isPlatformAdmin && profile.organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="max-w-md text-center p-8">
          <span className="material-symbols-rounded text-6xl text-slate-400 dark:text-slate-500 mb-4 block">
            group_off
          </span>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Organization</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You need to join an organization to access this page. 
            Contact your team administrator for an invite.
          </p>
          <a 
            href={getLink(RouteKeys.PORTAL_DASHBOARD)}
            className="inline-block btn-primary"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // UX-only role check - actual authorization happens via RLS
  // Platform admins bypass role checks
  if (allowedRoles && !profile.isPlatformAdmin) {
    // Map legacy 'admin' to 'org_admin' for backward compatibility
    const normalizedRoles = allowedRoles.map(role => 
      role === 'admin' ? 'org_admin' : role
    ) as OrgMemberRole[]
    
    // Check if user has any of the allowed roles in any organization (using multi-role support)
    const hasAllowedRole = profile.organizations.some(org => 
      hasAnyRole(org, normalizedRoles)
    )
    
    // Also check legacy role for backward compatibility
    const hasLegacyRole = profile.role && allowedRoles.includes(
      profile.role === 'admin' ? 'org_admin' : profile.role as 'parent' | 'coach'
    )
    
    if (!hasAllowedRole && !hasLegacyRole) {
      return <Navigate to={getLink(RouteKeys.AUTH_UNAUTHORIZED)} replace />
    }
  }

  // License gating for admin routes (platform admins bypass)
  // Allow access to trial expired page, billing routes, and checkout success/cancel
  if (isAdminRoute && !profile.isPlatformAdmin) {
    const trialExpiredPath = getPath(RouteKeys.ADMIN_TRIAL_EXPIRED)
    const billingPath = getPath(RouteKeys.ADMIN_ORGANIZATION_BILLING)
    const planSelectionPath = '/admin/organization/billing/plan-selection'
    const checkoutSuccessPath = '/admin/organization/billing/checkout/success'
    const checkoutCancelPath = '/admin/organization/billing/checkout/cancel'
    
    const isPaywallAllowedRoute = 
      location.pathname === trialExpiredPath ||
      location.pathname === billingPath ||
      location.pathname === planSelectionPath ||
      location.pathname === checkoutSuccessPath ||
      location.pathname === checkoutCancelPath ||
      location.pathname.startsWith(billingPath + '/')
    
    // Block access if license is not active AND past grace period (includes expired trials)
    // isPastGracePeriod now includes expired trials via isTrialExpired check
    if (!licenseActive && isPastGracePeriod && !isPaywallAllowedRoute) {
      return <Navigate to={getLink(RouteKeys.ADMIN_TRIAL_EXPIRED)} state={{ from: location }} replace />
    }
  }

  // All checks passed - render children
  return <>{children}</>
}
