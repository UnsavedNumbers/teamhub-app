import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MegaMenu, { type NavGroup } from '../common/MegaMenu'
import ThemeToggle from './ThemeToggle'
import UserContextDropdown from '../common/UserContextDropdown'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../hooks/useTheme'

// ============================================================================
// ORGANIZATION ADMIN MENU STRUCTURE
// Design goal: Run the entire organization without spreadsheets.
// ============================================================================
const orgAdminNavSections: { label: string; route?: string; groups: NavGroup[] }[] = [
  {
    label: 'Dashboard',
    route: '/portal/org',
    groups: [
      {
        label: '',
        items: [
          { text: 'Organization Health', icon: 'monitoring', path: '/portal/org', description: 'Active teams, unpaid fees, alerts' },
        ],
      },
    ],
  },
  {
    label: 'Organization',
    route: '/portal/org/settings',
    groups: [
      {
        label: 'Configuration',
        items: [
          { text: 'Organization Settings', icon: 'settings', path: '/portal/org/settings', description: 'Basic organization info' },
          { text: 'Sports & Programs', icon: 'sports_soccer', path: '/portal/org/programs', description: 'Manage sports offerings' },
          { text: 'Seasons', icon: 'event_note', path: '/portal/org/seasons', description: 'Season configuration' },
          { text: 'Integrations', icon: 'extension', path: '/portal/org/integrations', description: 'Third-party connections' },
          { text: 'Feature Availability', icon: 'toggle_on', path: '/portal/org/features', description: 'View enabled features' },
        ],
      },
    ],
  },
  {
    label: 'People',
    route: '/portal/org/people',
    groups: [
      {
        label: 'Manage People',
        items: [
          { text: 'Parents', icon: 'family_restroom', path: '/portal/org/parents', description: 'Parent management' },
          { text: 'Players', icon: 'child_care', path: '/portal/org/players', description: 'Player registry' },
          { text: 'Coaches', icon: 'sports', path: '/portal/org/coaches', description: 'Coach management' },
          { text: 'Users & Roles', icon: 'admin_panel_settings', path: '/portal/org/users', description: 'Access control' },
        ],
      },
    ],
  },
  {
    label: 'Operations',
    route: '/portal/org/operations',
    groups: [
      {
        label: 'Day-to-Day',
        items: [
          { text: 'Teams', icon: 'groups', path: '/portal/org/teams', description: 'Team management' },
          { text: 'Schedule', icon: 'calendar_month', path: '/portal/org/schedule', description: 'Organization calendar' },
          { text: 'Tryouts', icon: 'emoji_events', path: '/portal/org/tryouts', description: 'Registration & evaluation' },
        ],
      },
      {
        label: 'Logistics',
        items: [
          { text: 'Travel', icon: 'flight', path: '/portal/org/travel', description: 'Trip planning' },
          { text: 'Uniforms', icon: 'checkroom', path: '/portal/org/uniforms', description: 'Kit & gear orders' },
        ],
      },
    ],
  },
  {
    label: 'Finance',
    route: '/portal/org/payments',
    groups: [
      {
        label: 'Money Management',
        items: [
          { text: 'Fees', icon: 'receipt_long', path: '/portal/org/fees', description: 'Fee structures' },
          { text: 'Payments', icon: 'credit_card', path: '/portal/org/payments', description: 'Payment tracking' },
          { text: 'Offline Payments', icon: 'payments', path: '/portal/org/offline-payments', description: 'Cash & check tracking' },
          { text: 'Reports', icon: 'bar_chart', path: '/portal/org/finance-reports', description: 'Financial reports' },
        ],
      },
    ],
  },
  {
    label: 'More',
    groups: [
      {
        label: 'Oversight',
        items: [
          { text: 'Communications', icon: 'mail', path: '/portal/org/communications', description: 'Announcements & messages' },
          { text: 'Reports & Exports', icon: 'download', path: '/portal/org/reports', description: 'Data exports' },
          { text: 'Audit Log', icon: 'history', path: '/portal/org/audit', description: 'Activity history' },
        ],
      },
    ],
  },
]

// ============================================================================
// COACH MENU STRUCTURE
// Design goal: Help me run practices, games, and rosters efficiently.
// ============================================================================
const coachNavSections: { label: string; route?: string; groups: NavGroup[] }[] = [
  {
    label: 'Dashboard',
    route: '/portal/coach',
    groups: [
      {
        label: '',
        items: [
          { text: 'Coach Overview', icon: 'dashboard', path: '/portal/coach', description: 'Today\'s events & alerts' },
        ],
      },
    ],
  },
  {
    label: 'Teams',
    route: '/portal/teams',
    groups: [
      {
        label: 'Team Operations',
        items: [
          { text: 'My Teams', icon: 'groups', path: '/portal/teams', description: 'Your assigned teams' },
          { text: 'Rosters', icon: 'list_alt', path: '/portal/teams/rosters', description: 'Player lists' },
          { text: 'Player Info', icon: 'person', path: '/portal/teams/players', description: 'Player details' },
          { text: 'Uniform Status', icon: 'checkroom', path: '/portal/teams/uniforms', description: 'Kit assignments' },
        ],
      },
    ],
  },
  {
    label: 'Schedule',
    route: '/portal/schedule',
    groups: [
      {
        label: 'Calendar',
        items: [
          { text: 'Calendar', icon: 'calendar_month', path: '/portal/calendar', description: 'View schedule' },
          { text: 'Create Event', icon: 'add_circle', path: '/portal/schedule/new', description: 'Add practice or game' },
          { text: 'Manage Events', icon: 'edit_calendar', path: '/portal/schedule/manage', description: 'Edit existing events' },
        ],
      },
    ],
  },
  {
    label: 'Attendance',
    route: '/portal/attendance',
    groups: [
      {
        label: 'Tracking',
        items: [
          { text: 'Take Attendance', icon: 'how_to_reg', path: '/portal/attendance/take', description: 'Record attendance' },
          { text: 'Attendance History', icon: 'history', path: '/portal/attendance/history', description: 'Past records' },
        ],
      },
    ],
  },
  {
    label: 'More',
    groups: [
      {
        label: 'Additional',
        items: [
          { text: 'Tryouts', icon: 'emoji_events', path: '/portal/tryouts', description: 'Tryout sessions' },
          { text: 'Travel', icon: 'flight', path: '/portal/travel', description: 'Trip details' },
          { text: 'Messages', icon: 'mail', path: '/portal/messages', description: 'Communications' },
          { text: 'Documents', icon: 'folder', path: '/portal/documents', description: 'Team documents' },
        ],
      },
    ],
  },
]

// ============================================================================
// PARENT MENU STRUCTURE
// Design goal: Tell me where my kid needs to be, what I owe, and what I need to do.
// ============================================================================
const parentNavSections: { label: string; route?: string; groups: NavGroup[] }[] = [
  {
    label: 'Dashboard',
    route: '/portal/parent',
    groups: [
      {
        label: '',
        items: [
          { text: 'Family Dashboard', icon: 'dashboard', path: '/portal/dashboard', description: 'Daily overview' },
        ],
      },
    ],
  },
  {
    label: 'Schedule',
    route: '/portal/schedule',
    groups: [
      {
        label: 'Calendar',
        items: [
          { text: 'Calendar', icon: 'calendar_month', path: '/portal/calendar', description: 'View all events' },
          { text: 'Upcoming Events', icon: 'event', path: '/portal/calendar?view=upcoming', description: 'What\'s next' },
          { text: 'Past Events', icon: 'history', path: '/portal/calendar?view=past', description: 'Event history' },
        ],
      },
    ],
  },
  {
    label: 'Teams',
    route: '/portal/teams',
    groups: [
      {
        label: 'Team Info',
        items: [
          { text: 'My Teams', icon: 'groups', path: '/portal/children', description: 'Your children\'s teams' },
          { text: 'Rosters', icon: 'list_alt', path: '/portal/teams/rosters', description: 'Team rosters' },
          { text: 'Coaches', icon: 'sports', path: '/portal/teams/coaches', description: 'Coach contacts' },
          { text: 'Team Info', icon: 'info', path: '/portal/teams/info', description: 'Team details' },
        ],
      },
    ],
  },
  {
    label: 'Payments',
    route: '/portal/payments',
    groups: [
      {
        label: 'Payments',
        items: [
          { text: 'Fees Due', icon: 'receipt_long', path: '/portal/payments', description: 'Outstanding fees' },
          { text: 'Payment History', icon: 'history', path: '/portal/payments/history', description: 'Past payments' },
          { text: 'Receipts', icon: 'description', path: '/portal/payments/receipts', description: 'Download receipts' },
        ],
      },
    ],
  },
  {
    label: 'More',
    groups: [
      {
        label: 'Additional',
        items: [
          { text: 'Uniforms', icon: 'checkroom', path: '/portal/uniforms', description: 'Uniform orders' },
          { text: 'Travel', icon: 'flight', path: '/portal/travel', description: 'Trip information' },
          { text: 'Messages', icon: 'mail', path: '/portal/messages', description: 'Announcements' },
          { text: 'Documents', icon: 'folder', path: '/portal/documents', description: 'Forms & files' },
        ],
      },
    ],
  },
]

type PortalRole = 'org_admin' | 'coach' | 'parent'

interface PortalNavProps {
  /**
   * Override the auto-detected role for navigation display.
   * If not provided, the role is determined from the user's organization memberships.
   */
  forceRole?: PortalRole
}

/**
 * PortalNav - Main navigation bar for the portal with mega-menu functionality
 * 
 * Features:
 * - Role-based navigation (Organization Admin, Coach, Parent)
 * - Glass-style background with backdrop blur
 * - Mega-menu dropdowns for navigation sections
 * - Theme toggle and user context
 * - Fully accessible with keyboard navigation and ARIA roles
 * - Responsive with mobile hamburger menu
 */
export default function PortalNav({ forceRole }: PortalNavProps) {
  const { profile, hasAnyRole, isOrgAdmin } = useAuth()
  const { currentOrganization } = useOrganization()
  const { resolvedTheme } = useTheme()
  const location = useLocation()
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Determine user role for navigation
  const determineRole = useCallback((): PortalRole => {
    if (forceRole) return forceRole
    
    // Check roles in priority order: org_admin > coach > parent
    if (isOrgAdmin()) return 'org_admin'
    if (hasAnyRole('coach')) return 'coach'
    return 'parent'
  }, [forceRole, isOrgAdmin, hasAnyRole])

  const currentRole = determineRole()

  // Select navigation based on role
  const navSections = currentRole === 'org_admin' 
    ? orgAdminNavSections 
    : currentRole === 'coach' 
      ? coachNavSections 
      : parentNavSections

  // Logo based on theme
  const logoSrc = resolvedTheme === 'dark' 
    ? '/images/logo-dark.png' 
    : '/images/logo-light.png'

  // Reset logo error when theme changes
  useEffect(() => {
    setLogoError(false)
  }, [resolvedTheme])

  const handleMenuOpen = (menuId: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setOpenMenuId(menuId)
  }

  const handleMenuClose = () => {
    setOpenMenuId(null)
  }

  const handleTriggerMouseEnter = (menuId: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    hoverTimeoutRef.current = setTimeout(() => {
      handleMenuOpen(menuId)
    }, 100) // 100ms delay before opening
  }

  const handleTriggerMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    closeTimeoutRef.current = setTimeout(() => {
      handleMenuClose()
    }, 150) // 150ms delay before closing
  }

  const handleMenuMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const handleMenuMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      handleMenuClose()
    }, 150)
  }

  const handleTriggerClick = (menuId: string) => {
    if (openMenuId === menuId) {
      handleMenuClose()
    } else {
      handleMenuOpen(menuId)
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Close menus on route change
  useEffect(() => {
    handleMenuClose()
    setMobileMenuOpen(false)
  }, [location.pathname])

  const brandPath = '/portal/dashboard'
  const brandIcon = 'sports'

  // Role label for display
  const roleLabels: Record<PortalRole, string> = {
    org_admin: 'Admin',
    coach: 'Coach',
    parent: 'Parent',
  }

  return (
    <nav className="gn-root" role="navigation" aria-label="Main navigation">
      {/* Left section */}
      <div className="gn-left">
        {/* Brand */}
        <Link to={brandPath} className="gn-brand">
          {!logoError ? (
            <img 
              key={logoSrc}
              src={logoSrc} 
              alt="AthleticPortal" 
              className="h-8 w-auto transition-opacity duration-200"
              onError={() => {
                console.error('Failed to load logo:', logoSrc)
                setLogoError(true)
              }}
            />
          ) : (
            <>
              <div className="gn-logo">
                <span className="material-symbols-outlined">{brandIcon}</span>
              </div>
              <span className="gn-brand-text">TEAMHUB</span>
            </>
          )}
        </Link>

        {/* Mobile toggle */}
        <button
          className="gn-util-btn gn-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* Navigation items */}
        <ul className="gn-nav" role="menubar">
          {navSections.map((section) => {
            const menuId = `menu-${section.label.toLowerCase().replace(/\s+/g, '-')}`
            const isOpen = openMenuId === menuId
            const isWide = section.groups.length > 1 || 
                          section.groups.some(g => g.items.length > 3)

            return (
              <li 
                key={section.label} 
                className="gn-nav-item"
                onMouseEnter={() => handleTriggerMouseEnter(menuId)}
                onMouseLeave={handleTriggerMouseLeave}
              >
                <button
                  className="gn-nav-trigger"
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  aria-controls={menuId}
                  onClick={() => handleTriggerClick(menuId)}
                >
                  {section.label}
                  <span className="material-symbols-outlined gn-chevron">
                    expand_more
                  </span>
                </button>
                <div
                  onMouseEnter={handleMenuMouseEnter}
                  onMouseLeave={handleMenuMouseLeave}
                >
                  <MegaMenu
                    id={menuId}
                    isOpen={isOpen}
                    onClose={handleMenuClose}
                    groups={section.groups}
                    wide={isWide}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Right section */}
      <div className="gn-right">
        {/* Role indicator */}
        {currentOrganization && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/50">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {currentOrganization.name}
            </span>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
              {roleLabels[currentRole]}
            </span>
          </div>
        )}

        {/* Notifications */}
        <button
          className="gn-util-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <div className="gn-divider" />

        {/* Theme toggle */}
        <ThemeToggle variant="icon-only" />

        <div className="gn-divider" />

        {/* User context */}
        <UserContextDropdown />
      </div>
    </nav>
  )
}
