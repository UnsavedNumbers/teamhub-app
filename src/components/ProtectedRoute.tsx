import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { NoOrganizationEmptyState } from './admin/NoOrganizationEmptyState'

type OrgMemberRole = 'parent' | 'coach' | 'org_admin'

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAdminRoute && !isPlatformAdmin && licenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />
  }

  // Wait for profile to load
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Check organization setup requirement flag
  // Platform admins bypass this check
  // Allow access to onboarding route even with flag set
  const isOnboardingRoute = location.pathname === '/admin/onboarding'
  if (!profile.isPlatformAdmin && profile.requiresOrgSetup && !isOnboardingRoute) {
    return <Navigate to="/admin/onboarding" replace />
  }

  // Global no-org gate for /admin/* routes
  // Show empty state when org_admin has no organizations
  // This prevents pages from rendering skeleton loops when currentOrganization is null
  // Allow-list: onboarding, billing, and organization routes (user needs these to get started)
  const adminRouteAllowList = [
    '/admin/onboarding',
    '/admin/organization/billing',
    '/admin/organization',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="max-w-md text-center p-8">
          <span className="material-symbols-rounded text-6xl text-slate-500 mb-4 block">
            group_off
          </span>
          <h2 className="text-xl font-semibold text-white mb-2">No Organization</h2>
          <p className="text-slate-400 mb-6">
            You need to join an organization to access this page. 
            Contact your team administrator for an invite.
          </p>
          <a 
            href="/portal/dashboard"
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
    
    // Check if user has any of the allowed roles in any organization
    const hasAllowedRole = profile.organizations.some(org => 
      normalizedRoles.includes(org.role as OrgMemberRole)
    )
    
    // Also check legacy role for backward compatibility
    const hasLegacyRole = profile.role && allowedRoles.includes(
      profile.role === 'admin' ? 'org_admin' : profile.role as 'parent' | 'coach'
    )
    
    if (!hasAllowedRole && !hasLegacyRole) {
      return <Navigate to="/portal/unauthorized" replace />
    }
  }

  // License gating for admin routes (platform admins bypass)
  if (isAdminRoute && !profile.isPlatformAdmin) {
    if (!licenseActive && isPastGracePeriod) {
      return <Navigate to="/admin/organization/billing" state={{ from: location }} replace />
    }
  }

  // All checks passed - render children
  return <>{children}</>
}
