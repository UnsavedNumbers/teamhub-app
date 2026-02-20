import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { useLoadingState } from '../contexts/LoadingStateContext'
import { debug } from '../lib/debug'
import { NoOrganizationEmptyState } from './admin/NoOrganizationEmptyState'
import { hasAnyRole } from '@/utils/roleHelpers'
import { getLink, getPath, RouteKeys } from '@/utils/routes'
import { isTrialExpired } from '@/utils/licenseUtils'
import type { OrgMemberRole } from '@/contexts/OrganizationContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  // UX-only role checking - RLS handles actual authorization
  allowedRoles?: ('parent' | 'coach' | 'admin' | 'org_admin' | 'athlete')[]
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
  const { setLoading } = useLoadingState()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isPlatformAdmin = profile?.isPlatformAdmin ?? false

  const { isActive: licenseActive, isPastGracePeriod, loading: licenseLoading, summary } = useLicense(
    isAdminRoute && !isPlatformAdmin ? currentOrganization?.id : undefined,
    { requireOrganization: isAdminRoute && !isPlatformAdmin }
  )
  const hasIdentity = !!user && !!profile

  // Track whether we've set loading to true using a ref (survives through cleanup)
  const hasSetLoadingRef = useRef(false)
  const lastDecisionRef = useRef<string>('')

  const logDecision = (decision: string, extra?: Record<string, unknown>) => {
    const traceId = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('auth_debug_trace_id')
      : null
    const payload = {
      traceId,
      path: location.pathname,
      search: location.search,
      loading,
      hasIdentity,
      hasUser: !!user,
      hasProfile: !!profile,
      userId: user?.id ?? null,
      profileId: profile?.id ?? null,
      orgCount: profile?.organizations.length ?? 0,
      isAdminRoute,
      isPlatformAdmin,
      licenseLoading,
      ...extra,
    }
    const decisionKey = JSON.stringify({ decision, ...payload })
    if (lastDecisionRef.current === decisionKey) return
    lastDecisionRef.current = decisionKey
    debug.flow('ProtectedRoute', decision, payload)
  }

  // Handle all loading states in a single effect to prevent conflicts
  // IMPORTANT: Only call setLoading when state actually changes to avoid counter imbalance
  useEffect(() => {
    // Determine if we should show loading based on all conditions
    const shouldShowLoading = 
      (loading && !hasIdentity) || // Auth is loading (only before identity is ready)
      (isAdminRoute && !isPlatformAdmin && licenseLoading) || // License is loading for admin routes
      (!user || !profile) // Waiting for user/profile

    // Only update if state changed to prevent counter imbalance
    if (shouldShowLoading && !hasSetLoadingRef.current) {
      setLoading(true)
      hasSetLoadingRef.current = true
    } else if (!shouldShowLoading && hasSetLoadingRef.current) {
      setLoading(false)
      hasSetLoadingRef.current = false
    }
  }, [loading, hasIdentity, isAdminRoute, isPlatformAdmin, licenseLoading, user, profile, setLoading])

  // Cleanup loading state on unmount - always decrement if we incremented
  useEffect(() => {
    return () => {
      if (hasSetLoadingRef.current) {
        setLoading(false)
        hasSetLoadingRef.current = false
      }
    }
  }, [setLoading])

  // Always wait for auth loading. Do NOT globally block on orgLoading;
  // platform admins and admin routes must be able to render without an org selected.
  if (loading && !hasIdentity) {
    logDecision('Hold render: auth loading')
    return null
  }

  if (isAdminRoute && !isPlatformAdmin && licenseLoading) {
    logDecision('Hold render: license loading')
    return null
  }

  // Redirect to login if not authenticated
  if (!user) {
    logDecision('Redirect: unauthenticated -> login')
    return <Navigate to={getLink(RouteKeys.AUTH_LOGIN)} state={{ from: location }} replace />
  }

  // Wait for profile to load
  if (!profile) {
    logDecision('Hold render: waiting for profile')
    return null
  }

  // Check organization setup requirement flag
  // Platform admins bypass this check
  // Allow access to onboarding route even with flag set
  const onboardingPath = getPath(RouteKeys.ADMIN_ONBOARDING)
  const isOnboardingRoute = location.pathname === onboardingPath
  if (!profile.isPlatformAdmin && profile.requiresOrgSetup && !isOnboardingRoute) {
    logDecision('Redirect: requires org setup', { onboardingPath })
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
    logDecision('Render: no organization empty state', { isAllowedAdminRoute })
    return <NoOrganizationEmptyState />
  }

  // Check if organization is required but user has no orgs
  if (requireOrganization && !profile.isPlatformAdmin && profile.organizations.length === 0) {
    logDecision('Render: requireOrganization without org')
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
      logDecision('Redirect: role unauthorized', {
        allowedRoles,
        normalizedRoles,
        hasAllowedRole,
        hasLegacyRole,
      })
      return <Navigate to={getLink(RouteKeys.AUTH_UNAUTHORIZED)} replace />
    }
  }

  // License gating for admin routes (platform admins bypass)
  // Allow access to trial expired page, billing overview, and checkout success/cancel
  // Note: plan-selection is NOT in allowlist - it will check license status itself
  if (isAdminRoute && !profile.isPlatformAdmin) {
    const trialExpiredPath = getPath(RouteKeys.ADMIN_TRIAL_EXPIRED)
    const billingPath = getPath(RouteKeys.ADMIN_ORGANIZATION_BILLING)
    const checkoutSuccessPath = getPath(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_SUCCESS)
    const checkoutCancelPath = getPath(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_CANCEL)
    
    const isPaywallAllowedRoute =
      location.pathname === trialExpiredPath ||
      location.pathname === billingPath ||
      location.pathname === checkoutSuccessPath ||
      location.pathname === checkoutCancelPath
    
    // Block access if license is not active AND past grace period (includes expired trials)
    // isPastGracePeriod now includes expired trials via isTrialExpired check
    // Also explicitly check for expired trials - if status is 'trial' but trial has expired
    // This blocks ALL admin routes including /admin (dashboard) when trial is expired
    const trialIsExpired = summary ? isTrialExpired(summary) : false
    // Also check: if status is 'trial' but license is not active, the trial must be expired
    const trialStatusButNotActive = summary?.status === 'trial' && !licenseActive
    // Check if trial has 0 days remaining (treat as expired even if exact time hasn't passed)
    const daysRemaining = summary?.daysRemaining ?? null
    const trialHasZeroDays = summary?.status === 'trial' && daysRemaining !== null && daysRemaining <= 0
    
    // Block if: past grace period OR trial explicitly expired OR trial status but not active OR 0 days remaining
    const shouldBlock = isPastGracePeriod || trialIsExpired || trialStatusButNotActive || trialHasZeroDays
    
    if (shouldBlock && !isPaywallAllowedRoute) {
      logDecision('Redirect: trial/license gating', {
        isPastGracePeriod,
        trialIsExpired,
        trialStatusButNotActive,
        trialHasZeroDays,
        isPaywallAllowedRoute,
      })
      return <Navigate to={getLink(RouteKeys.ADMIN_TRIAL_EXPIRED)} state={{ from: location }} replace />
    }
  }

  // All checks passed - render children
  logDecision('Allow: render protected content')
  return <>{children}</>
}
