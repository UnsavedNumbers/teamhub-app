import { useState } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { LicenseWarningBanner } from '../components/admin/LicenseWarningBanner'
import AdminLoadingSpinner from '../components/admin/AdminLoadingSpinner'
import { useMaterialDashboardTheme } from '../hooks/useMaterialDashboardTheme'

// Navigation menu items based on ADMIN_PANEL_STRUCTURE.txt
const menuItems = [
  { text: 'Dashboard', icon: 'fas fa-tachometer-alt', path: '/admin', requiresOrg: false },
  { text: 'Organization', icon: 'fas fa-cog', path: '/admin/organization', requiresOrg: false },
  { text: 'Teams', icon: 'fas fa-users', path: '/admin/teams', requiresOrg: true },
  { text: 'Families', icon: 'fas fa-home', path: '/admin/families', requiresOrg: true },
  { text: 'Children', icon: 'fas fa-child', path: '/admin/children', requiresOrg: true },
  { text: 'Payments', icon: 'fas fa-credit-card', path: '/admin/payments', requiresOrg: true },
  { text: 'Events', icon: 'fas fa-calendar-alt', path: '/admin/events', requiresOrg: true },
  { text: 'Attendance', icon: 'fas fa-user-check', path: '/admin/attendance', requiresOrg: true },
  { text: 'Uniforms', icon: 'fas fa-tshirt', path: '/admin/uniforms', requiresOrg: true },
  { text: 'Travel', icon: 'fas fa-plane', path: '/admin/travel', requiresOrg: true },
  { text: 'Tryouts', icon: 'fas fa-trophy', path: '/admin/tryouts', requiresOrg: true },
  { text: 'Messages', icon: 'fas fa-envelope', path: '/admin/messages', requiresOrg: true },
  { text: 'Reports', icon: 'fas fa-chart-bar', path: '/admin/reports', requiresOrg: true },
]

export default function AdminLayout() {
  const { loaded: themeLoaded } = useMaterialDashboardTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const { summary } = useLicense(currentOrganization?.id)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleSidenavToggle = () => {
    setSidenavOpen(!sidenavOpen)
    document.body.classList.toggle('g-sidenav-show')
  }

  // Determine if user has an organization
  const hasOrg = !!currentOrganization?.id

  // Avoid a flash of unstyled content while Material Dashboard CSS loads.
  if (!themeLoaded) {
    return <AdminLoadingSpinner />
  }

  return (
    <div className="g-sidenav-show bg-gray-100">
      {/* Side Navigation */}
      <aside
        className={`sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 ${
          sidenavOpen ? '' : 'sidenav-hidden'
        }`}
        id="sidenav-main"
      >
        <div className="sidenav-header">
          <i
            className="fas fa-times p-3 cursor-pointer text-secondary opacity-5 position-absolute top-0 end-0 d-none d-xl-none"
            id="iconSidenav"
            onClick={handleDrawerToggle}
          />
          <a className="navbar-brand m-0" href="/admin">
            <span className="ms-1 font-weight-bold">Admin Panel</span>
          </a>
        </div>
        <hr className="horizontal dark mt-0" />
        <div className="collapse navbar-collapse w-auto" id="sidenav-collapse-main">
          <ul className="navbar-nav">
            {menuItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path))

              // Determine if this item should be disabled
              const isDisabled = item.requiresOrg && !hasOrg

              return (
                <li key={item.text} className="nav-item">
                  {isDisabled ? (
                    <div className="nav-link" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      <div className="icon icon-shape icon-sm shadow border-radius-md bg-white text-center me-2 d-flex align-items-center justify-content-center">
                        <i className={item.icon} />
                      </div>
                      <span className="nav-link-text ms-1">{item.text}</span>
                    </div>
                  ) : (
                    <Link
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                    >
                      <div className="icon icon-shape icon-sm shadow border-radius-md bg-white text-center me-2 d-flex align-items-center justify-content-center">
                        <i className={item.icon} />
                      </div>
                      <span className="nav-link-text ms-1">{item.text}</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg">
        {/* Navbar */}
        <nav
          className="navbar navbar-main navbar-expand-lg position-sticky mt-4 top-1 px-0 mx-4 shadow-none border-radius-xl z-index-sticky"
          id="navbarBlur"
        >
          <div className="container-fluid py-1 px-3">
            <nav aria-label="breadcrumb">
              <h6 className="font-weight-bolder mb-0">
                {currentOrganization?.name || profile?.display_name || 'Admin'}
              </h6>
            </nav>

            {/* Sidenav toggle button */}
            <div className="sidenav-toggler sidenav-toggler-inner d-xl-block d-none">
              <a
                href="#"
                className="nav-link text-body p-0"
                onClick={(e) => {
                  e.preventDefault()
                  handleSidenavToggle()
                }}
              >
                <div className="sidenav-toggler-inner">
                  <i className="sidenav-toggler-line" />
                  <i className="sidenav-toggler-line" />
                  <i className="sidenav-toggler-line" />
                </div>
              </a>
            </div>

            {/* Mobile menu toggle */}
            <div className="collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4" id="navbar">
              <ul className="navbar-nav justify-content-end">
                <li className="nav-item d-xl-none ps-3 d-flex align-items-center">
                  <a
                    className="nav-link text-body p-0"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDrawerToggle()
                    }}
                  >
                    <div className="sidenav-toggler-inner">
                      <i className="sidenav-toggler-line" />
                      <i className="sidenav-toggler-line" />
                      <i className="sidenav-toggler-line" />
                    </div>
                  </a>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-body p-0" to="/">
                    <span className="text-sm">View Main Site</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <div className="container-fluid py-4">
          {!profile?.isPlatformAdmin &&
            summary &&
            ['trial', 'past_due', 'canceled', 'expired'].includes(summary.status || '') && (
              <LicenseWarningBanner
                status={summary.status}
                trialEndsAt={summary.trialEndsAt}
                graceEndsAt={summary.graceEndsAt}
                currentPeriodEnd={summary.currentPeriodEnd}
                onAction={() => navigate('/admin/organization/billing')}
              />
            )}
          <Outlet />
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed-plugin"
          onClick={handleDrawerToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1030,
          }}
        />
      )}
    </div>
  )
}
