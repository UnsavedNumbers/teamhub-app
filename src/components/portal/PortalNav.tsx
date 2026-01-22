import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MegaMenu from '../common/MegaMenu'
import ThemeToggle from './ThemeToggle'
import UserContextDropdown from '../common/UserContextDropdown'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../hooks/useTheme'
import { useT } from '../../i18n/useI18n'

// ============================================================================
// ORGANIZATION ADMIN MENU STRUCTURE
// Design goal: Run the entire organization without spreadsheets.
// ============================================================================


// ============================================================================
// COACH MENU STRUCTURE
// Design goal: Help me run practices, games, and rosters efficiently.
// ============================================================================


// ============================================================================
// PARENT MENU STRUCTURE
// Design goal: Tell me where my kid needs to be, what I owe, and what I need to do.
// ============================================================================


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
  const { hasAnyRole, isOrgAdmin } = useAuth()
  const { currentOrganization } = useOrganization()
  const { resolvedTheme } = useTheme()
  const t = useT()
  const location = useLocation()

  // ============================================================================
  // NAVIGATION STRUCTURES (Memoized with t support)
  // ============================================================================
  
  const orgAdminNavSections = useMemo(() => [
    {
      label: 'Dashboard',
      route: '/admin',
      groups: [
        {
          label: '',
          items: [
            { text: 'Admin Dashboard', icon: 'dashboard', path: '/admin', description: 'Organization overview' },
          ],
        },
      ],
    },
    {
      label: 'Organization',
      route: '/admin/organization',
      groups: [
        {
          label: 'Configuration',
          items: [
            { text: 'Organization Settings', icon: 'settings', path: '/admin/organization', description: 'Organization info' },
            { text: 'Users', icon: 'admin_panel_settings', path: '/admin/organization/users', description: 'Access and roles' },
            { text: 'Billing', icon: 'credit_card', path: '/admin/organization/billing', description: 'Plan and billing' },
          ],
        },
      ],
    },
    {
      label: 'Operations',
      route: '/admin/teams',
      groups: [
        {
          label: 'Core',
          items: [
            { text: 'Teams', icon: 'groups', path: '/admin/teams', description: 'Teams and rosters' },
            { text: 'Events', icon: 'event', path: '/admin/events', description: 'Schedule and calendar' },
            { text: 'Payments', icon: 'receipt_long', path: '/admin/payments', description: 'Fees and collections' },
          ],
        },
        {
          label: 'Programs',
          items: [
            { text: 'Tryouts', icon: 'emoji_events', path: '/admin/tryouts', description: 'Registration and evaluation' },
            { text: 'Travel', icon: 'flight', path: '/admin/travel', description: 'Trip planning' },
            { text: 'Uniforms', icon: 'checkroom', path: '/admin/uniforms', description: 'Kits and gear' },
          ],
        },
      ],
    },
  ], [t])

  const coachNavSections = useMemo(() => [
    {
      label: 'Dashboard',
      route: '/portal/dashboard',
      groups: [
        {
          label: '',
          items: [
            { text: 'Dashboard', icon: 'dashboard', path: '/portal/dashboard', description: 'Today\'s overview' },
          ],
        },
      ],
    },
    {
      label: 'Teams',
      route: '/portal/children',
      groups: [
        {
          label: 'Teams',
          items: [
            { text: 'Teams', icon: 'groups', path: '/portal/children', description: 'Teams and roster access' },
          ],
        },
      ],
    },
    {
      label: 'Schedule',
      route: '/portal/calendar',
      groups: [
        {
          label: 'Schedule',
          items: [
            { text: 'Calendar', icon: 'calendar_month', path: '/portal/calendar', description: 'View schedule' },
          ],
        },
      ],
    },
    {
      label: 'Attendance',
      route: '/portal/calendar',
      groups: [
        {
          label: 'Tracking',
          items: [
            { text: 'Take Attendance', icon: 'how_to_reg', path: '/portal/calendar', description: 'Use events to manage attendance', disabled: true },
            { text: 'Attendance History', icon: 'history', path: '/portal/calendar', description: 'Use events to review attendance', disabled: true },
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
            { text: 'Settings', icon: 'settings', path: '/portal/settings', description: 'Preferences' },
          ],
        },
      ],
    },
  ], [t])

  const parentNavSections = useMemo(() => [
    {
      label: 'Dashboard',
      route: '/portal/dashboard',
      groups: [
        {
          label: '',
          items: [
            { text: 'Dashboard', icon: 'dashboard', path: '/portal/dashboard', description: 'Daily overview' },
          ],
        },
      ],
    },
    {
      label: 'Schedule',
      route: '/portal/calendar',
      groups: [
        {
          label: 'Schedule',
          items: [
            { text: 'Schedule', icon: 'calendar_month', path: '/portal/calendar', description: 'View all events' },
          ],
        },
      ],
    },
    {
      label: 'Travel',
      route: '/portal/travel',
      groups: [
        {
          label: 'Travel',
          items: [
            { text: 'Travel', icon: 'flight', path: '/portal/travel', description: 'Trip information' },
          ],
        },
      ],
    },
    {
      label: 'Messages',
      route: '/portal/messages',
      groups: [
        {
          label: 'Messages',
          items: [
            { text: 'Messages', icon: 'mail', path: '/portal/messages', description: 'Announcements and chat' },
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
          ],
        },
      ],
    },
    {
      label: 'More',
      groups: [
        {
          label: 'Programs',
          items: [
            { text: 'My Teams', icon: 'groups', path: '/portal/children', description: t('portal.navigation.yourChildrenTeams') },
            { text: 'Join a Team', icon: 'group_add', path: '/portal/join', description: 'Enter an invite code' },
            { text: 'Tryouts', icon: 'emoji_events', path: '/portal/tryouts', description: 'Tryout sessions' },
          ],
        },
        {
          label: 'Additional',
          items: [
            { text: 'Uniforms', icon: 'checkroom', path: '/portal/uniforms', description: 'Uniform orders' },
            { text: 'Settings', icon: 'settings', path: '/portal/settings', description: 'Preferences' },
          ],
        },
      ],
    },
  ], [t])
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)
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
  // Light mode needs dark text logo, dark mode needs light text logo
  // Note: If logo appears white in light mode, the files may be misnamed
  const logoSrc = resolvedTheme === 'dark' 
    ? '/images/logo-dark.png' 
    : '/images/logo-light.png'

  // Add cache-busting query parameter to force reload on theme change
  const logoSrcWithCacheBust = `${logoSrc}?theme=${resolvedTheme}&v=${logoVersion}`

  // Reset logo error and increment version when theme changes to force reload
  useEffect(() => {
    setLogoError(false)
    setLogoVersion(prev => prev + 1)
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

  // Close menus immediately on mount
  useEffect(() => {
    // Clear any pending timeouts that might open menus
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    // Close menus immediately on mount
    setOpenMenuId(null)
    setMobileMenuOpen(false)
  }, [])

  // Close menus on route change
  useEffect(() => {
    // Clear any pending timeouts that might open menus
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    // Close menus immediately on route change
    setOpenMenuId(null)
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

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
              src={logoSrcWithCacheBust} 
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
              <span className="gn-brand-text">YOUTH SPORTS</span>
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

            const isDirectLink = section.groups.length === 1 && 
                                section.groups[0].items.length === 1 && 
                                section.groups[0].items[0].text === section.label &&
                                section.route

            if (isDirectLink) {
              return (
                <li key={section.label} className="gn-nav-item">
                  <Link
                    to={section.route!}
                    className="gn-nav-trigger"
                  >
                    {section.label}
                  </Link>
                </li>
              )
            }

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
