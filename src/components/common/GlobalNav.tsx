import { Link } from 'react-router-dom'
import ThemeSwitcher from './ThemeSwitcher'
import UserContextDropdown from './UserContextDropdown'
import NotificationBell from './NotificationBell'
import { DemoModeBadge } from '../demo/DemoModeBadge'

interface GlobalNavProps {
  variant: 'admin' | 'platform-admin'
}

export default function GlobalNav({ variant }: GlobalNavProps) {
  const isAdmin = variant === 'admin'
  const brandPath = isAdmin ? '/admin' : '/platform-admin'
  const brandIcon = isAdmin ? 'sports' : 'shield_person'
  const brandText = isAdmin ? 'YOUTH SPORTS' : 'ADMIN'

  return (
    <nav className="gn-root" role="navigation" aria-label="Main navigation">
      {/* Left section */}
      <div className="gn-left">
        {/* Brand */}
        <Link to={brandPath} className="gn-brand">
          <div className="gn-logo">
            <span className="material-symbols-outlined">{brandIcon}</span>
          </div>
          <span className="gn-brand-text">{brandText}</span>
        </Link>
      </div>

      {/* Right section */}
      <div className="gn-right">
        {/* Demo Mode Badge */}
        <DemoModeBadge />

        {/* Notifications */}
        <NotificationBell viewAllPath={isAdmin ? '/admin/notifications' : '/platform-admin'} />

        <div className="gn-divider" />

        {/* Theme switcher */}
        <ThemeSwitcher />

        <div className="gn-divider" />

        {/* User context */}
        <UserContextDropdown />
      </div>
    </nav>
  )
}
