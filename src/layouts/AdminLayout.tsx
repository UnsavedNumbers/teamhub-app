import { useMemo } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { LicenseWarningBanner } from '../components/admin/LicenseWarningBanner'
import AdminLoadingSpinner from '../components/admin/AdminLoadingSpinner'
import { usePlatformAdminTheme } from '../hooks/usePlatformAdminTheme'
import { useT } from '../i18n/useI18n'
import { useSidebar } from '../contexts/SidebarContext'
import { getLink, getPath, RouteKeys } from '@/utils/routes'

export default function AdminLayout() {
  const { loaded: themeLoaded } = usePlatformAdminTheme()
  const t = useT()
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { currentOrganization } = useOrganization()
  const { summary } = useLicense(currentOrganization?.id)
  const { expandedSections, toggleSection } = useSidebar()

  const hasOrg = !!currentOrganization?.id

  // Navigation menu items - four top-level items
  const menuItems = useMemo(() => [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      path: getPath(RouteKeys.ADMIN_DASHBOARD),
      requiresOrg: false,
      children: null,
    },
    {
      label: 'Organization',
      icon: 'business',
      path: getPath(RouteKeys.ADMIN_ORGANIZATION),
      requiresOrg: false,
      children: [
        { text: 'Overview', icon: 'info', path: getPath(RouteKeys.ADMIN_ORGANIZATION_STRUCTURE), requiresOrg: true },
        { text: 'Sports & Programs', icon: 'sports', path: getLink('admin.organization.sportsPrograms'), requiresOrg: true },
        { text: 'Levels', icon: 'grade', path: getLink('admin.organization.levels'), requiresOrg: true },
        { text: 'Teams', icon: 'groups', path: getLink('admin.organization.teamsManagement'), requiresOrg: true },
        { text: 'Seasons', icon: 'calendar_month', path: getLink('admin.organization.seasons'), requiresOrg: true },
        { text: 'People', icon: 'person', path: getPath(RouteKeys.ADMIN_ORGANIZATION_USERS), requiresOrg: true },
      ],
    },
    {
      label: 'Management',
      icon: 'groups',
      path: getPath(RouteKeys.ADMIN_FAMILIES),
      requiresOrg: true,
      children: [
        { text: 'Families', icon: 'home', path: getPath(RouteKeys.ADMIN_FAMILIES), requiresOrg: true },
        { text: 'Athletes', icon: 'child_care', path: getPath(RouteKeys.ADMIN_ATHLETES), requiresOrg: true },
      ],
    },
    {
      label: 'Operations',
      icon: 'settings',
      path: getPath(RouteKeys.ADMIN_PAYMENTS),
      requiresOrg: true,
      children: [
        { text: 'Payments', icon: 'credit_card', path: getPath(RouteKeys.ADMIN_PAYMENTS), requiresOrg: true },
        { text: 'Events', icon: 'event', path: getPath(RouteKeys.ADMIN_EVENTS), requiresOrg: true },
        { text: 'Attendance', icon: 'how_to_reg', path: getLink('admin.attendance'), requiresOrg: true },
        { text: 'Uniforms', icon: 'checkroom', path: getPath(RouteKeys.ADMIN_UNIFORMS), requiresOrg: true },
      ],
    },
    {
      label: 'Account',
      icon: 'account_circle',
      path: getPath(RouteKeys.ADMIN_SETTINGS),
      requiresOrg: false,
      children: [
        { text: 'Settings', icon: 'settings', path: getPath(RouteKeys.ADMIN_SETTINGS), requiresOrg: false },
      ],
    },
  ], [t])



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

  if (!themeLoaded) {
    return <AdminLoadingSpinner />
  }

  return (
    <div className="pa-root pa-app">
      {/* Sidebar */}
      <aside className="pa-sidebar">
        {/* Brand */}
        <div className="pa-sidebar-header">
          <Link to={getLink(RouteKeys.ADMIN_DASHBOARD)} className="pa-sidebar-brand">
            <img 
              src="/images/logo-dark.png" 
              alt="Youth Sports" 
              className="pa-sidebar-logo-img"
              style={{ height: '32px', width: 'auto' }}
            />
          </Link>
          {currentOrganization && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--pa-n500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {currentOrganization.name}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="pa-sidebar-nav">
          {menuItems.map((item) => {
            const isDisabled = item.requiresOrg && !hasOrg
            const active = isActive(item.path)
            const hasChildren = item.children && item.children.length > 0
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
                    to={item.path}
                    className={`pa-nav-link-top ${shouldShowActive ? 'active' : ''} ${isDashboard ? 'pa-nav-dashboard' : ''}`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </div>
              )
            }

            // Item has children - render as expandable section
            const visibleChildren = item.children.filter((child) => !child.requiresOrg || hasOrg)
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
                    {item.children.map((child) => {
                      const childDisabled = child.requiresOrg && !hasOrg
                      const childActive = isActive(child.path)

                      if (childDisabled) {
                        return (
                          <li key={child.path} className="pa-nav-item">
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
                        <li key={child.path} className="pa-nav-item">
                          <Link
                            to={child.path}
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

      {/* Main */}
      <div className="pa-main">
        {/* License Warning Banner */}
        {summary && <LicenseWarningBanner summary={summary} />}

        {/* Content */}
        <main className="pa-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

