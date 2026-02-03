import { useState, useMemo, useCallback, useEffect } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { LicenseWarningBanner } from '../components/admin/LicenseWarningBanner'
import AdminLoadingSpinner from '../components/admin/AdminLoadingSpinner'
import { useOrgAdminTheme } from '../hooks/useOrgAdminTheme'
import { usePlatformAdminTheme } from '../hooks/usePlatformAdminTheme'
import { useOrganizationTheme } from '../hooks/useOrganizationTheme'
import { useTheme } from '../hooks/useTheme'
import { useT } from '../i18n/useI18n'
import { useSidebar } from '../contexts/SidebarContext'
import { useScrollLock } from '@/hooks/useScrollLock'
import { ADMIN_LAYOUT_MOBILE_NAV_QUERY } from '@/config/breakpoints'
import { getLink, getPath, RouteKeys } from '@/utils/routes'
import SidebarOrganizationSwitcher from '../components/admin/SidebarOrganizationSwitcher'
import MobileMenu from '../components/common/MobileMenu'
import GlobalNav from '../components/common/GlobalNav'
import type { NavSection } from '@/types/menu'
import { useFilteredNavigation } from '@/hooks/useFilteredNavigation'

export default function AdminLayout() {
  const { loaded: platformThemeLoaded } = usePlatformAdminTheme()
  const { loaded: orgThemeLoaded } = useOrgAdminTheme()
  const { ready: orgThemeReady } = useOrganizationTheme()
  const { resolvedTheme } = useTheme()
  const t = useT()
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { currentOrganization } = useOrganization()
  const { summary } = useLicense(currentOrganization?.id)
  const { expandedSections, toggleSection } = useSidebar()
  const [showMobileNav, setShowMobileNav] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(ADMIN_LAYOUT_MOBILE_NAV_QUERY).matches : false
  )
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(ADMIN_LAYOUT_MOBILE_NAV_QUERY)
    const handleChange = (e: MediaQueryListEvent) => setShowMobileNav(e.matches)
    setShowMobileNav(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const hasOrg = !!currentOrganization?.id

  const handleMobileSidebarClose = useCallback(() => {
    setMobileSidebarOpen(false)
  }, [])

  useScrollLock(mobileSidebarOpen && showMobileNav)

  // Navigation menu items - four top-level items
  const rawMenuItems = useMemo(() => [
    {
      label: t('admin.navigation.dashboard'),
      icon: 'dashboard',
      path: getPath(RouteKeys.ADMIN_DASHBOARD),
      requiresOrg: false,
      children: null,
    },
    {
      label: t('admin.navigation.organization'),
      icon: 'business',
      path: getPath(RouteKeys.ADMIN_ORGANIZATION),
      requiresOrg: false,
      children: [
        { routeKey: 'admin.organization.overview', text: t('admin.navigation.organizationOverview'), icon: 'info', path: getPath(RouteKeys.ADMIN_ORGANIZATION_STRUCTURE), requiresOrg: true },
        { routeKey: 'admin.sports.list', text: t('admin.navigation.organizationSports'), icon: 'sports', path: getLink('admin.sports.list'), requiresOrg: true },
        { routeKey: 'admin.programs.list', text: t('admin.navigation.organizationPrograms'), icon: 'category', path: getLink('admin.programs.list'), requiresOrg: true },
        { routeKey: 'admin.levels.list', text: t('admin.navigation.organizationLevels'), icon: 'grade', path: getLink('admin.levels.list'), requiresOrg: true },
        { routeKey: 'admin.teams.list', text: t('admin.navigation.organizationTeams'), icon: 'groups', path: getLink('admin.teams.list'), requiresOrg: true },
        { routeKey: 'admin.seasons.list', text: t('admin.navigation.organizationSeasons'), icon: 'calendar_month', path: getLink('admin.seasons.list'), requiresOrg: true },
        { routeKey: 'admin.organization.users', text: t('admin.navigation.organizationStaff'), icon: 'person', path: getPath(RouteKeys.ADMIN_ORGANIZATION_USERS), requiresOrg: true },
      ],
    },
    {
        label: t('admin.navigation.athletes'),
        icon: 'groups',
        path: getPath(RouteKeys.ADMIN_ATHLETES),
        requiresOrg: true,
        children: [
            { routeKey: 'admin.athletes.list', text: t('admin.navigation.athletesList'), icon: 'child_care', path: getPath(RouteKeys.ADMIN_ATHLETES), requiresOrg: true },
            { routeKey: 'admin.guardians.list', text: t('admin.navigation.guardians'), icon: 'home', path: getLink('admin.guardians.list'), requiresOrg: true },
            { routeKey: 'admin.guardianRequests', text: t('admin.navigation.guardianRequests'), icon: 'person_add', path: getLink('admin.guardianRequests'), requiresOrg: true },
        ],
    },
    {
      label: t('admin.navigation.ticketing'),
      icon: 'confirmation_number',
      path: getLink('admin.ticketingEvents.list'),
      requiresOrg: true,
      children: [
        { routeKey: 'admin.ticketingEvents.list', text: t('admin.navigation.ticketedEvents'), icon: 'event', path: getLink('admin.ticketingEvents.list'), requiresOrg: true },
        { routeKey: 'admin.ticketingOrders', text: t('admin.navigation.ticketingOrders'), icon: 'receipt_long', path: getLink('admin.ticketingOrders'), requiresOrg: true },
        { routeKey: 'admin.ticketingScanner', text: t('admin.navigation.gateEntry'), icon: 'qr_code_scanner', path: getLink('admin.ticketingScanner'), requiresOrg: true },
      ],
    },
    {
      label: t('admin.navigation.operations'),
      icon: 'settings',
      path: getPath(RouteKeys.ADMIN_PAYMENTS),
      requiresOrg: true,
      children: [
        { routeKey: 'admin.payments.list', text: t('admin.navigation.payments'), icon: 'credit_card', path: getPath(RouteKeys.ADMIN_PAYMENTS), requiresOrg: true },
        { routeKey: 'admin.events.list', text: t('admin.navigation.events'), icon: 'event', path: getPath(RouteKeys.ADMIN_EVENTS), requiresOrg: true },
        { routeKey: 'admin.attendance', text: t('admin.navigation.attendance'), icon: 'how_to_reg', path: getLink('admin.attendance'), requiresOrg: true },
        { routeKey: 'admin.notifications', text: t('admin.navigation.notifications'), icon: 'notifications', path: '/admin/notifications', requiresOrg: true },
        { routeKey: 'admin.announcements.list', text: t('admin.navigation.announcements'), icon: 'campaign', path: getPath(RouteKeys.ADMIN_ANNOUNCEMENTS), requiresOrg: true },
        { routeKey: 'admin.travel.list', text: t('admin.navigation.travel'), icon: 'flight', path: '/admin/travel', requiresOrg: true },
        { routeKey: 'admin.uniforms.list', text: t('admin.navigation.uniforms'), icon: 'checkroom', path: getPath(RouteKeys.ADMIN_UNIFORMS), requiresOrg: true },
      ],
    },
    {
      label: t('admin.navigation.photos'),
      icon: 'photo_library',
      path: getLink('admin.photos.list'),
      requiresOrg: true,
      children: [
        { routeKey: 'admin.photos.list', text: t('admin.navigation.allGalleries'), icon: 'collections', path: getLink('admin.photos.list'), requiresOrg: true },
        { routeKey: 'admin.photos.list', text: t('admin.navigation.newGallery'), icon: 'add_photo_alternate', path: getLink('admin.photos.list') + '?new=1', requiresOrg: true },
      ],
    },
    {
      label: t('admin.navigation.videos'),
      icon: 'smart_display',
      path: '/admin/videos',
      requiresOrg: true,
      children: [
        { routeKey: 'admin.videos.list', text: t('admin.navigation.videoLibrary'), icon: 'video_library', path: '/admin/videos', requiresOrg: true },
        { routeKey: 'admin.videos.upload', text: t('admin.navigation.uploadVideo'), icon: 'upload', path: '/admin/videos?upload=1', requiresOrg: true },
      ],
    },
    {
      label: 'Account',
      icon: 'account_circle',
      path: getPath(RouteKeys.ADMIN_SETTINGS),
      requiresOrg: false,
      children: [
        { routeKey: 'admin.organization.billing', text: t('admin.navigation.billing'), icon: 'credit_card', path: getPath(RouteKeys.ADMIN_ORGANIZATION_BILLING), requiresOrg: false },
        { routeKey: 'admin.settings', text: t('admin.navigation.settings'), icon: 'settings', path: getPath(RouteKeys.ADMIN_SETTINGS), requiresOrg: false },
      ],
    },
  ], [t])

  // Convert to NavigationSection format for feature gate filtering
  const navSections = useMemo(() => {
    return rawMenuItems.map(item => ({
      label: item.label,
      route: item.path,
      groups: item.children ? [
        {
          label: '',
          items: item.children.map(child => ({
            routeKey: child.routeKey,
            text: child.text,
            icon: child.icon,
            path: child.path,
            disabled: child.requiresOrg && !hasOrg,
          }))
        }
      ] : [
        {
          label: '',
          items: [{
            routeKey: 'admin.dashboard', // Dashboard route key
            text: item.label,
            icon: item.icon,
            path: item.path,
            disabled: item.requiresOrg && !hasOrg,
          }]
        }
      ]
    }))
  }, [rawMenuItems, hasOrg])

  // Apply feature gate filtering
  const { filteredSections } = useFilteredNavigation(navSections)

  // Convert filtered sections back to menu item format
  const menuItems = useMemo(() => {
    return filteredSections.map((section, index) => {
      const originalItem = rawMenuItems[index]
      if (!section.groups[0]?.items.length) return null

      const firstItem = section.groups[0].items[0]
      
      return {
        label: section.label,
        icon: originalItem.icon,
        path: firstItem.path ?? '',
        requiresOrg: originalItem.requiresOrg,
        children: section.groups[0].items.length > 1 || section.groups[0].items[0].text !== section.label
          ? section.groups[0].items.map(item => ({
              text: item.text ?? '',
              icon: item.icon,
              path: item.path ?? '',
              requiresOrg: originalItem.requiresOrg,
              disabled: item.disabled || (item as any).isGated,
              gateMessage: (item as any).gateMessage,
            }))
          : null,
        disabled: firstItem.disabled || (firstItem as any).isGated,
        gateMessage: (firstItem as any).gateMessage,
      }
    }).filter(Boolean) as any[]
  }, [filteredSections, rawMenuItems])



  const handleSignOut = async () => {
    await signOut()
    navigate(getLink(RouteKeys.AUTH_LOGIN))
  }

  const adminDashboardPath = getPath(RouteKeys.ADMIN_DASHBOARD)
  const isActive = (path: string) => {
    if (path === adminDashboardPath) {
      return location.pathname === adminDashboardPath
    }
    return location.pathname.startsWith(path)
  }

  // Mobile nav sections already filtered by useFilteredNavigation
  const mobileNavSections: NavSection[] = filteredSections as NavSection[]

  // Close mobile sidebar only when the route changes (not when mobileSidebarOpen changes)
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  if (!platformThemeLoaded || !orgThemeLoaded || !orgThemeReady) {
    return <AdminLoadingSpinner />
  }

  return (
    <div className="pa-root pa-app oa-theme-active">
      {/* Mobile header - shown when viewport ≤1023px (matches CSS) */}
      {showMobileNav && (
        <header className="pa-mobile-header">
          <Link to={getLink(RouteKeys.ADMIN_DASHBOARD)} className="pa-mobile-brand">
            <img 
              src={resolvedTheme === 'dark' ? '/images/logo-light.png' : '/images/logo-dark.png'} 
              alt={currentOrganization?.name || 'Organization'}
              className="pa-mobile-logo"
              style={{ height: '28px', width: 'auto' }}
            />
          </Link>
          <button
            className="pa-mobile-menu-toggle"
            onClick={() => setMobileSidebarOpen(prev => !prev)}
            aria-expanded={mobileSidebarOpen}
            aria-label="Toggle navigation menu"
            type="button"
          >
            <span className="material-symbols-outlined">
              {mobileSidebarOpen ? 'close' : 'menu'}
            </span>
          </button>
        </header>
      )}

      {/* Sidebar - hidden when viewport ≤1023px */}
      {!showMobileNav && (
        <aside className="pa-sidebar">
        {/* Brand */}
        <div className="pa-sidebar-header">
          <Link to={getLink(RouteKeys.ADMIN_DASHBOARD)} className="pa-sidebar-brand">
            <img 
              src={resolvedTheme === 'dark' ? '/images/logo-light.png' : '/images/logo-dark.png'} 
              alt="Youth Sports" 
              className="pa-sidebar-logo-img"
              style={{ height: '32px', width: 'auto' }}
            />
          </Link>
          <SidebarOrganizationSwitcher />
        </div>

        {/* Navigation */}
        <nav className="pa-sidebar-nav">
          {menuItems.map((item) => {
            const isDisabled = item.requiresOrg && !hasOrg
            const active = isActive(item.path ?? '')
            const children = item.children ?? []
            const hasChildren = children.length > 0
            const isExpanded = expandedSections.has(item.label)

            // If item has no children, render as direct link
            if (!hasChildren) {
              if (isDisabled) {
                return (
                  <div key={item.label} className="pa-nav-item-top">
                    <div
                      className="pa-nav-link-top"
                      style={{ opacity: 0.4, cursor: 'not-allowed' }}
                      title="Requires organization setup"
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </div>
                )
              }

              // Dashboard should never show as active (always white like unselected items)
              const isDashboard = item.label === 'Dashboard'
              const shouldShowActive = !isDashboard && active

              return (
                <div key={item.label} className="pa-nav-item-top">
                  <Link
                    to={item.path ?? ''}
                    className={`pa-nav-link-top ${shouldShowActive ? 'active' : ''} ${isDashboard ? 'pa-nav-dashboard' : ''}`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </div>
              )
            }

            // Item has children - render as expandable section
            const visibleChildren = children.filter((child: any) => !child.requiresOrg || hasOrg)
            if (visibleChildren.length === 0 && isDisabled) return null

            return (
              <div key={item.label} className="pa-nav-section">
                <button
                  onClick={() => toggleSection(item.label)}
                  className={`pa-nav-link-top ${isExpanded ? 'expanded' : ''}`}
                  aria-expanded={isExpanded}
                  disabled={isDisabled}
                  style={{ opacity: isDisabled ? 0.4 : 1 }}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="material-symbols-outlined pa-nav-toggle-icon">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isExpanded && visibleChildren.length > 0 && (
                  <ul className="pa-nav-list">
                    {children.map((child: any) => {
                      const childDisabled = child.requiresOrg && !hasOrg
                      const childActive = isActive(child.path ?? '')

                      if (childDisabled) {
                        return (
                          <li key={child.path ?? child.text} className="pa-nav-item">
                            <div
                              className="pa-nav-link"
                              style={{ opacity: 0.4, cursor: 'not-allowed' }}
                              title="Requires organization setup"
                            >
                              <span className="material-symbols-outlined">{child.icon}</span>
                              <span>{child.text}</span>
                            </div>
                          </li>
                        )
                      }

                      return (
                        <li key={child.path ?? child.text} className="pa-nav-item">
                          <Link
                            to={child.path ?? ''}
                            className={`pa-nav-link ${childActive ? 'active' : ''}`}
                          >
                            <span className="material-symbols-outlined">{child.icon}</span>
                            <span>{child.text}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="pa-sidebar-footer">
          <div className="pa-sidebar-user">
            <span className="pa-sidebar-email">{profile?.email || 'Unknown'}</span>
            <button
              className="pa-btn pa-btn--secondary pa-btn--compact"
              onClick={handleSignOut}
              style={{
                width: '100%',
                borderColor: 'rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              Sign Out
            </button>
          </div>
        </div>
        </aside>
      )}

      {/* Main */}
      <div className="pa-main">
        {/* Global Navigation Header */}
        <GlobalNav variant="admin" />

        {/* License Warning Banner */}
        {summary && <LicenseWarningBanner summary={summary} />}

        {/* Content */}
        <main className="pa-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      {showMobileNav && (
        <MobileMenu
          isOpen={mobileSidebarOpen}
          onClose={handleMobileSidebarClose}
          sections={mobileNavSections}
          brandName={currentOrganization?.name || 'Organization'}
          brandSubtitle="Admin Portal"
        />
      )}
    </div>
  )
}

