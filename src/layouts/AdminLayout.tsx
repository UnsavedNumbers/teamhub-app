import { useState } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { LicenseWarningBanner } from '../components/admin/LicenseWarningBanner'
import AdminLoadingSpinner from '../components/admin/AdminLoadingSpinner'
import { usePlatformAdminTheme } from '../hooks/usePlatformAdminTheme'

// Navigation menu items - converted to Material Symbols
const menuSections = [
  {
    label: 'Overview',
    items: [
      { text: 'Dashboard', icon: 'dashboard', path: '/admin', requiresOrg: false },
      { text: 'Organization', icon: 'business', path: '/admin/organization', requiresOrg: false },
    ],
  },
  {
    label: 'Management',
    items: [
      { text: 'Teams', icon: 'groups', path: '/admin/teams', requiresOrg: true },
      { text: 'Families', icon: 'home', path: '/admin/families', requiresOrg: true },
      { text: 'Children', icon: 'child_care', path: '/admin/children', requiresOrg: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { text: 'Payments', icon: 'credit_card', path: '/admin/payments', requiresOrg: true },
      { text: 'Events', icon: 'event', path: '/admin/events', requiresOrg: true },
      { text: 'Attendance', icon: 'how_to_reg', path: '/admin/attendance', requiresOrg: true },
      { text: 'Uniforms', icon: 'checkroom', path: '/admin/uniforms', requiresOrg: true },
      { text: 'Travel', icon: 'flight', path: '/admin/travel', requiresOrg: true },
      { text: 'Tryouts', icon: 'emoji_events', path: '/admin/tryouts', requiresOrg: true },
    ],
  },
  {
    label: 'Communication',
    items: [
      { text: 'Messages', icon: 'mail', path: '/admin/messages', requiresOrg: true },
      { text: 'Reports', icon: 'bar_chart', path: '/admin/reports', requiresOrg: true },
    ],
  },
]

export default function AdminLayout() {
  const { loaded: themeLoaded } = usePlatformAdminTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { currentOrganization } = useOrganization()
  const { summary } = useLicense(currentOrganization?.id)

  const hasOrg = !!currentOrganization?.id

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  if (!themeLoaded) {
    return <AdminLoadingSpinner />
  }

  return (
    <div className="pa-root pa-app">
      {/* Sidebar */}
      <aside className={`pa-sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="pa-sidebar-header">
          <Link to="/admin" className="pa-sidebar-brand" onClick={() => setMobileOpen(false)}>
            <div className="pa-sidebar-logo">
              <span className="material-symbols-outlined">sports</span>
            </div>
            <span className="pa-sidebar-title">TEAMHUB</span>
          </Link>
          {currentOrganization && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#7A8794', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {currentOrganization.name}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="pa-sidebar-nav">
          {menuSections.map((section) => {
            const visibleItems = section.items.filter((item) => !item.requiresOrg || hasOrg)
            if (visibleItems.length === 0) return null

            return (
              <div key={section.label} className="pa-nav-section">
                <div className="pa-nav-label">{section.label}</div>
                <ul className="pa-nav-list">
                  {section.items.map((item) => {
                    const isDisabled = item.requiresOrg && !hasOrg
                    const active = isActive(item.path)

                    if (isDisabled) {
                      return (
                        <li key={item.path} className="pa-nav-item">
                          <div
                            className="pa-sidebar pa-nav-link"
                            style={{ opacity: 0.4, cursor: 'not-allowed' }}
                            title="Requires organization setup"
                          >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.text}</span>
                          </div>
                        </li>
                      )
                    }

                    return (
                      <li key={item.path} className="pa-nav-item">
                        <Link
                          to={item.path}
                          className={`pa-nav-link ${active ? 'active' : ''}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="material-symbols-outlined">{item.icon}</span>
                          <span>{item.text}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
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
        {/* Top Bar */}
        <header className="pa-topbar">
          <div className="pa-topbar-left">
            <button
              className="pa-btn pa-btn--ghost pa-btn--dense"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: 'none' }}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="pa-topbar-title">Organization Administration</h1>
          </div>

          <div className="pa-topbar-right">
            {/* User menu */}
            <div className="pa-user-menu">
              <div className="pa-user-avatar">
                <span className="material-symbols-outlined">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* License Warning Banner */}
        {summary && <LicenseWarningBanner summary={summary} />}

        {/* Content */}
        <main className="pa-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 15, 20, 0.5)',
            zIndex: 99,
          }}
        />
      )}
    </div>
  )
}
