/**
 * Fan Layout Component
 * 
 * Shared layout wrapper for all fan portal pages.
 * Includes header, navigation, and bottom tab bar (mobile).
 * 
 * Design: FanConnect Minimalist Light
 */

import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/fan.css'

interface NavItem {
  key: string
  routeKey: typeof RouteKeys[keyof typeof RouteKeys]
  label: string
  icon: string
  iconFilled: string
  badge?: number
}

const navItems: NavItem[] = [
  { key: 'home', routeKey: RouteKeys.FAN_HOME, label: 'Home', icon: 'home', iconFilled: 'home' },
  { key: 'schedule', routeKey: RouteKeys.FAN_SCHEDULE, label: 'Schedule', icon: 'calendar_month', iconFilled: 'calendar_month' },
  { key: 'tickets', routeKey: RouteKeys.FAN_TICKETS, label: 'Tickets', icon: 'confirmation_number', iconFilled: 'confirmation_number' },
  { key: 'photos', routeKey: RouteKeys.FAN_PHOTOS, label: 'Photos', icon: 'photo_library', iconFilled: 'photo_library' },
  { key: 'following', routeKey: RouteKeys.FAN_FOLLOWING, label: 'Following', icon: 'favorite_border', iconFilled: 'favorite' },
  { key: 'profile', routeKey: RouteKeys.FAN_PROFILE, label: 'Profile', icon: 'account_circle', iconFilled: 'account_circle' },
]

export default function FanLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  
  const [notificationCount] = useState(0)

  // Determine active nav item
  const getActiveKey = (): string => {
    const path = location.pathname
    if (path.startsWith('/fan/schedule')) return 'schedule'
    if (path.startsWith('/fan/tickets')) return 'tickets'
    if (path.startsWith('/fan/photos')) return 'photos'
    if (path.startsWith('/fan/following') || path.startsWith('/fan/discover')) return 'following'
    if (path.startsWith('/fan/profile')) return 'profile'
    if (path.startsWith('/fan/org') || path.startsWith('/fan/team') || path.startsWith('/fan/athlete')) return 'following'
    return 'home'
  }

  const activeKey = getActiveKey()

  const handleNavClick = (item: NavItem) => {
    navigate(getLink(item.routeKey))
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!profile) return 'U'
    const first = profile.first_name?.[0] || ''
    const last = profile.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'U'
  }

  return (
    <div className="fan-page">
      {/* Desktop Header */}
      <header className="fan-header">
        <div className="fan-header-inner">
          <div className="fan-header-left">
            <div className="fan-logo" onClick={() => navigate(getLink(RouteKeys.FAN_HOME))} style={{ cursor: 'pointer' }}>
              <div className="fan-logo-mark"></div>
              <h1 className="fan-logo-text">FanConnect</h1>
            </div>
            <nav className="fan-nav fan-nav-desktop">
              {navItems.slice(0, 5).map((item) => (
                <a
                  key={item.key}
                  href="#"
                  className={`fan-nav-link ${activeKey === item.key ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleNavClick(item) }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="fan-header-right">
            <button 
              className="fan-header-icon"
              onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE_NOTIFICATIONS))}
            >
              <span className="material-symbols-outlined">notifications</span>
              {notificationCount > 0 && (
                <span className="fan-badge-count">{notificationCount > 9 ? '9+' : notificationCount}</span>
              )}
            </button>
            <div 
              className="fan-avatar fan-avatar-header"
              onClick={() => navigate(getLink(RouteKeys.FAN_PROFILE))}
              style={{ cursor: 'pointer' }}
              title={profile?.first_name || 'Profile'}
            >
              {getInitials()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="fan-container fan-main">
        <Outlet />
      </main>



      {/* Footer - Desktop only */}
      <footer className="fan-footer fan-footer-desktop">
        <div className="fan-footer-inner">
          <div className="fan-footer-logo">
            <div className="fan-footer-logo-mark"></div>
            <span className="fan-footer-logo-text">FanConnect</span>
          </div>
          <div className="fan-footer-links">
            <a href="#" className="fan-footer-link">Privacy</a>
            <a href="#" className="fan-footer-link">Terms</a>
            <a href="#" className="fan-footer-link">Support</a>
            <a href="#" className="fan-footer-link">Press</a>
          </div>
          <p className="fan-footer-copy">© {new Date().getFullYear()} YouthSports.team</p>
        </div>
      </footer>
    </div>
  )
}
