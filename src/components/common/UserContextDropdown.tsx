import { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { OrganizationContext } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { getLink, RouteKeys, useCurrentRouteKey } from '@/utils/routes'
import { formatRoleName, hasRole } from '@/utils/roleHelpers'
import { USE_FAKE_DATA } from '@/data/config'
import { useOffline } from '@/hooks/useOffline'
import { useMobile } from '@/hooks/useMobile'
import MobileBottomSheet from './MobileBottomSheet'
import type { OrgMemberRole } from '@/contexts/OrganizationContext'

export default function UserContextDropdown() {
  const { user, profile, signOut } = useAuth()
  const orgContext = useContext(OrganizationContext)
  const currentOrganization = orgContext?.currentOrganization ?? null
  const organizations = orgContext?.organizations ?? []
  const setCurrentOrganization = orgContext?.setCurrentOrganization ?? (() => {})
  const { isOffline } = useOffline()
  const navigate = useNavigate()
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  // Infer active role from current route
  // Admin routes (starting with /admin) indicate org_admin or coach role
  // Portal routes indicate parent role
  const currentRouteKey = useCurrentRouteKey()
  const inferredActiveRole = useMemo((): OrgMemberRole | null => {
    if (!currentOrganization) return null
    const isAdminRoute = currentRouteKey != null && currentRouteKey.startsWith('admin.')
    if (isAdminRoute) {
      // Prefer org_admin if available, otherwise coach
      if (hasRole(currentOrganization, 'org_admin')) return 'org_admin'
      if (hasRole(currentOrganization, 'coach')) return 'coach'
    } else {
      // Portal route - prefer parent role
      if (hasRole(currentOrganization, 'parent')) return 'parent'
    }
    // Fallback to first available role
    return currentOrganization.roles?.[0] || null
  }, [currentRouteKey, currentOrganization])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate(getLink(RouteKeys.AUTH_LOGIN))
  }

  // Handle role switching using the same logic as RoleSelection
  const handleSwitchRole = useCallback(async (orgId: string, role: OrgMemberRole) => {
    if (switching) return

    if (!profile) {
      console.error('No profile available for role switch')
      return
    }

    // Check offline mode
    if (isOffline) {
      console.error('Cannot switch roles while offline')
      return
    }

    // Check demo mode
    if (USE_FAKE_DATA) {
      console.error('Demo mode: Role selection is not available')
      return
    }

    // Find the organization
    const org = profile.organizations?.find(o => o.id === orgId)
    
    if (!org) {
      console.error('Organization not found:', orgId)
      return
    }

    // Verify user has this role in this org
    if (!hasRole(org, role)) {
      console.error('User does not have role', role, 'in organization', orgId)
      return
    }

    setSwitching(true)
    setIsOpen(false)

    try {
      // Set the current organization
      setCurrentOrganization(org)
      
      // Determine navigation destination (same logic as RoleSelection)
      let destination: string
      if (role === 'org_admin' || role === 'coach') {
        destination = getLink(RouteKeys.ADMIN_DASHBOARD)
      } else {
        destination = getLink(RouteKeys.PORTAL_DASHBOARD)
      }

      // Navigate to destination
      navigate(destination, { replace: true })
    } catch (err: any) {
      console.error('Error during role switch:', err)
      setSwitching(false)
    }
  }, [switching, profile, isOffline, navigate, setCurrentOrganization])

  // Close handler
  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Early return after all hooks are called
  if (orgContext === undefined) return null

  const initials = profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const displayName = profile?.display_name || user?.email || 'User'
  const email = user?.email || ''

  // Roles in current org
  const currentRoles = currentOrganization?.roles || []
  
  // Role-based links configuration
  const roleLinks = [
    { role: 'parent', label: t('portal.navigation.myChildren'), path: getLink(RouteKeys.PORTAL_ATHLETES), icon: 'family_restroom' as const },
    { role: 'parent', label: 'Payments', path: getLink(RouteKeys.PORTAL_PAYMENTS), icon: 'receipt_long' as const },
    { role: 'coach', label: 'My Athletes', path: getLink(RouteKeys.PORTAL_ATHLETES), icon: 'sports_soccer' as const },
    { role: 'org_admin', label: 'Organization Settings', path: getLink(RouteKeys.ADMIN_ORGANIZATION), icon: 'admin_panel_settings' as const },
  ]

  // Filter links based on current roles
  const visibleRoleLinks = roleLinks.filter(link => currentRoles.includes(link.role as any))

  const hasAnyOrgs = organizations.length > 0

  const isPlatformAdminContext =
    currentRouteKey != null && currentRouteKey.startsWith('platformAdmin.')
  const isOrgAdminContext =
    (currentRouteKey != null && currentRouteKey.startsWith('admin.')) ||
    inferredActiveRole === 'org_admin' ||
    inferredActiveRole === 'coach'
  const settingsPath = isPlatformAdminContext
    ? getLink(RouteKeys.PLATFORM_SETTINGS)
    : isOrgAdminContext
      ? getLink(RouteKeys.ADMIN_SETTINGS)
      : getLink(RouteKeys.PORTAL_SETTINGS)

  // Menu content component (reused for both desktop dropdown and mobile sheet)
  const menuContent = (
    <>
      {/* 1. User Identity */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={displayName}>{displayName}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={email}>{email}</p>
        {currentOrganization && (
          <span 
            className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--org-badge-primary-bg, rgba(19, 127, 236, 0.1))',
              color: 'var(--org-badge-primary-text, var(--org-btn-primary-bg, #137fec))'
            }}
          >
            {currentOrganization.name}
          </span>
        )}
      </div>

      {/* 2. Organization Context - Role Switcher */}
      <div className="py-1 border-b border-slate-100 dark:border-slate-700">
        <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Organization
        </div>
        {hasAnyOrgs ? (
          organizations.flatMap(org => 
            org.roles?.map(role => {
              const isActive = currentOrganization?.id === org.id && role === inferredActiveRole
              return (
                <button
                  key={`${org.id}-${role}`}
                  onClick={() => handleSwitchRole(org.id, role)}
                  disabled={switching}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group transition-colors min-h-[44px] ${
                    isActive 
                      ? 'font-medium' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={isActive ? {
                    backgroundColor: 'var(--org-highlight-bg, var(--org-surface-accent, rgba(19, 127, 236, 0.15)))',
                    color: 'var(--org-btn-primary-bg, #137fec)'
                  } : undefined}
                >
                  <div className="flex flex-col">
                    <span>{org.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                      {formatRoleName(role)}
                    </span>
                  </div>
                  {isActive && (
                    <span 
                      className="material-symbols-outlined text-lg"
                      style={{ color: 'var(--org-btn-primary-bg, #137fec)' }}
                    >
                      check
                    </span>
                  )}
                </button>
              )
            }) || []
          )
        ) : (
          <div className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300" title="You are not a member of any organization">
            No Organization
          </div>
        )}
      </div>

      {/* 3. Personal Settings */}
      <div className="py-1 border-b border-slate-100 dark:border-slate-700">
        <Link 
          to={settingsPath}
          onClick={handleClose}
          className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px] no-underline hover:no-underline"
        >
          <span className="material-symbols-outlined mr-3 text-lg text-slate-400 dark:text-slate-500">settings</span>
          My Settings
        </Link>
      </div>

      {/* 4. Role-Specific Links */}
      {visibleRoleLinks.length > 0 && (
        <div className="py-1 border-b border-slate-100 dark:border-slate-700">
          {visibleRoleLinks.map(link => (
            <Link 
              key={link.path}
              to={link.path} 
              onClick={handleClose} 
              className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px] no-underline hover:no-underline"
            >
              <span className="material-symbols-outlined mr-3 text-lg text-slate-400 dark:text-slate-500">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* 5. Support */}
      <div className="py-1 border-b border-slate-100 dark:border-slate-700">
        <Link 
          to={getLink(RouteKeys.PORTAL_HELP)} 
          onClick={handleClose} 
          className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px] no-underline hover:no-underline"
        >
          <span className="material-symbols-outlined mr-3 text-lg text-slate-400 dark:text-slate-500">help</span>
          Help & Support
        </Link>
      </div>

      {/* 6. Logout */}
      <div className="py-1">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px]"
        >
          <span className="material-symbols-outlined mr-3 text-lg text-red-500">logout</span>
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center p-0 border-none bg-transparent cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            '--tw-ring-color': 'var(--org-focus-ring, rgba(19, 127, 236, 0.5))',
            outlineColor: 'var(--org-focus-ring, rgba(19, 127, 236, 0.5))'
          } as React.CSSProperties}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold transition-transform hover:scale-105 active:scale-95">
            {initials}
          </div>
        </button>

        {/* Desktop Menu - absolute dropdown */}
        {!isMobile && isOpen && (
          <div 
            className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl overflow-hidden z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
          >
            {menuContent}
          </div>
        )}
      </div>

      {/* Mobile Menu - bottom sheet */}
      {isMobile && (
        <MobileBottomSheet
          isOpen={isOpen}
          onClose={handleClose}
          title="Account"
        >
          {menuContent}
        </MobileBottomSheet>
      )}
    </>
  )
}
