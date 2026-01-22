import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  canPerformAction,
  ROLE_LABELS,
  type PlatformAdminAction,
} from '../utils/platformAdminPermissions'
import type { PlatformAdminRole } from '../types/platformAdmin.types'
import { usePlatformAdminTheme } from '../hooks/usePlatformAdminTheme'
import GlobalNav from '../components/common/GlobalNav'
import { getLink, getPath, RouteKeys } from '@/utils/routes'

// Navigation structure per design spec
type NavSection = {
  label: string
  items: {
    text: string
    icon: string
    path: string
    requiredAction: PlatformAdminAction
  }[]
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { text: 'Dashboard', icon: 'dashboard', path: getPath(RouteKeys.PLATFORM_DASHBOARD), requiredAction: 'view_dashboard' },
    ],
  },
  {
    label: 'Organizations',
    items: [
      { text: 'Organizations', icon: 'apartment', path: getPath(RouteKeys.PLATFORM_ORGANIZATIONS), requiredAction: 'view_organizations' },
    ],
  },
  {
    label: 'Users',
    items: [
      { text: 'Users', icon: 'group', path: getPath(RouteKeys.PLATFORM_USERS), requiredAction: 'view_users' },
      { text: 'Platform Admins', icon: 'admin_panel_settings', path: getPath(RouteKeys.PLATFORM_ADMINS), requiredAction: 'view_platform_admins' },
    ],
  },
  {
    label: 'Payments',
    items: [
      { text: 'Payments', icon: 'credit_card', path: getPath(RouteKeys.PLATFORM_PAYMENTS), requiredAction: 'view_payments' },
      { text: 'Fees', icon: 'receipt_long', path: getPath(RouteKeys.PLATFORM_FEES), requiredAction: 'view_fees' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { text: 'Event Log', icon: 'history', path: getPath(RouteKeys.PLATFORM_AUDIT), requiredAction: 'view_audit_log' },
      { text: 'Feature Flags', icon: 'flag', path: getPath(RouteKeys.PLATFORM_FEATURE_FLAGS), requiredAction: 'view_feature_flags' },
    ],
  },
  {
    label: 'Licenses & Entitlements',
    items: [
      { text: 'Overview', icon: 'dashboard', path: getPath(RouteKeys.PLATFORM_LICENSES), requiredAction: 'view_licenses' },
      { text: 'License Tiers', icon: 'workspace_premium', path: getLink('platformAdmin.licenses.tiers'), requiredAction: 'manage_license_tiers' },
      { text: 'Feature Catalog', icon: 'inventory_2', path: getLink('platformAdmin.licenses.features'), requiredAction: 'manage_features' },
      { text: 'Rules & Overrides', icon: 'rule', path: getLink('platformAdmin.licenses.overrides'), requiredAction: 'manage_overrides' },
      { text: 'Audit & History', icon: 'history', path: getLink('platformAdmin.licenses.audit'), requiredAction: 'view_licenses_audit' },
    ],
  },
  {
    label: 'System',
    items: [
      { text: 'Structure', icon: 'account_tree', path: getLink('platformAdmin.structure'), requiredAction: 'view_structure' },
    ],
  },
]

// Loading spinner using our design system
function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#FAFAFA',
    }}>
      <div className="pa-spinner" style={{
        width: '32px',
        height: '32px',
        border: '3px solid #E9ECEF',
        borderTopColor: '#1A73E8',
        borderRadius: '50%',
        animation: 'pa-spin 0.8s linear infinite',
      }} />
      <style>{`
        @keyframes pa-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function PlatformAdminLayout() {
  const { loaded: themeLoaded } = usePlatformAdminTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminRole, setAdminRole] = useState<PlatformAdminRole | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  // Fetch the admin's role
  useEffect(() => {
    if (profile?.isPlatformAdmin) {
      // Default to super_admin for backwards compatibility
      // TODO: Fetch actual role from platform_admins table after migration
      setAdminRole('super_admin')
    }
  }, [profile])

  const handleSignOut = async () => {
    await signOut()
    navigate(getLink(RouteKeys.AUTH_LOGIN))
  }

  const platformDashboardPath = getPath(RouteKeys.PLATFORM_DASHBOARD)
  const isActive = (path: string) => {
    if (path === platformDashboardPath) {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  // Show loading while theme loads
  if (!themeLoaded) {
    return <LoadingSpinner />
  }

  return (
    <div className="pa-root pa-app">
      {/* Sidebar */}
      <aside className={`pa-sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="pa-sidebar-header">
          <Link to={getLink(RouteKeys.PLATFORM_DASHBOARD)} className="pa-sidebar-brand" onClick={() => setMobileOpen(false)}>
            <img 
              src="/images/logo-dark.png" 
              alt="Youth Sports" 
              className="pa-sidebar-logo-img"
              style={{ height: '32px', width: 'auto' }}
            />
          </Link>
          {adminRole && (
            <span className="pa-badge pa-badge--info pa-mt-2" style={{ fontSize: '10px' }}>
              {ROLE_LABELS[adminRole]}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="pa-sidebar-nav">
          {navSections.map((section) => {
            // Filter items based on permissions
            const visibleItems = section.items.filter((item) =>
              canPerformAction(adminRole, item.requiredAction)
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={section.label} className="pa-nav-section">
                <div className="pa-nav-label">{section.label}</div>
                <ul className="pa-nav-list">
                  {visibleItems.map((item) => (
                    <li key={item.path} className="pa-nav-item">
                      <Link
                        to={item.path}
                        className={`pa-nav-link ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span>{item.text}</span>
                      </Link>
                    </li>
                  ))}
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
        {/* Global Navigation */}
        <GlobalNav variant="platform-admin" />

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
