import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MegaMenu from '../common/MegaMenu'
import ThemeToggle from './ThemeToggle'
import UserContextDropdown from '../common/UserContextDropdown'
import NotificationBell from '../common/NotificationBell'
import MobileMenu from '../common/MobileMenu'
import { DemoModeBadge } from '../demo/DemoModeBadge'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useUserContext } from '../../hooks/useUserContext'
import { useTheme } from '../../hooks/useTheme'
import { useT } from '../../i18n/useI18n'
import { useMobile } from '@/hooks/useMobile'
import { getLink } from '../../utils/routes'
import { useFilteredNavigation } from '@/hooks/useFilteredNavigation'
import { athleteNavSections } from '../../utils/routes/navigation'
import { TeamSwitcher } from './TeamSwitcher'
import { useCoachTeamSelection } from '../../hooks/useCoachTeamSelection'

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


type PortalRole = 'org_admin' | 'coach' | 'parent' | 'athlete'

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
  const { context } = useUserContext()
  const { currentOrganization, isLoading: isOrgLoading } = useOrganization()
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
            { routeKey: 'admin.dashboard', text: 'Admin Dashboard', icon: 'dashboard', path: getLink('admin.dashboard'), description: 'Organization overview' },
          ],
        },
      ],
    },
    {
      label: 'Organization',
      route: getLink('admin.organization.base'),
      groups: [
        {
          label: 'Configuration',
          items: [
            { routeKey: 'admin.organization.base', text: 'Organization Settings', icon: 'settings', path: getLink('admin.organization.base'), description: 'Organization info' },
            { routeKey: 'admin.organization.users', text: 'Users', icon: 'admin_panel_settings', path: getLink('admin.organization.users'), description: 'Access and roles' },
            { routeKey: 'admin.organization.bulkInvite', text: 'Bulk Invites', icon: 'upload', path: getLink('admin.organization.bulkInvite'), description: 'Onboard multiple users' },
            { routeKey: 'admin.organization.billing', text: 'Billing', icon: 'credit_card', path: getLink('admin.organization.billing'), description: 'Plan and billing' },
          ],
        },
      ],
    },
    {
      label: 'Operations',
      route: getLink('admin.teams.list'),
      groups: [
        {
          label: 'Core',
          items: [
            { routeKey: 'admin.teams.list', text: 'Teams', icon: 'groups', path: getLink('admin.teams.list'), description: 'Teams and rosters' },
            { routeKey: 'admin.events.list', text: 'Events', icon: 'event', path: getLink('admin.events.list'), description: 'Schedule and calendar' },
            { routeKey: 'admin.payments.list', text: 'Payments', icon: 'receipt_long', path: getLink('admin.payments.list'), description: 'Fees and collections' },
            { routeKey: 'admin.travel.list', text: 'Travel', icon: 'flight', path: getLink('admin.travel.list'), description: 'Trip planning' },
          ],
        },
        {
          label: 'Programs',
          items: [
            { routeKey: 'admin.tryouts.list', text: 'Tryouts', icon: 'emoji_events', path: getLink('admin.tryouts.list'), description: 'Registration and evaluation' },
            { routeKey: 'admin.uniforms.list', text: 'Uniforms', icon: 'checkroom', path: getLink('admin.uniforms.list'), description: 'Kits and gear' },
          ],
        },
      ],
    },
  ], [t])

  const coachNavSections = useMemo(() => [
    {
      label: 'Dashboard',
      route: getLink('portal.dashboard'),
      groups: [
        {
          label: '',
          items: [
            { routeKey: 'portal.dashboard', text: 'Dashboard', icon: 'dashboard', path: getLink('portal.dashboard'), description: 'Today\'s overview' },
          ],
        },
      ],
    },
    {
      label: 'My Athletes',
      route: getLink('portal.athletes'),
      groups: [
            {
              label: 'My Athletes',
              items: [
                { routeKey: 'portal.athletes', text: 'My Athletes', icon: 'groups', path: getLink('portal.athletes'), description: 'Athlete profiles and information' },
                { routeKey: 'portal.requestAttachment', text: 'Request Athlete Attachment', icon: 'person_add', path: getLink('portal.requestAttachment'), description: 'Request to attach to an existing athlete' },
              ],
            },
      ],
    },
    {
      label: 'Schedule',
      route: getLink('portal.calendar'),
      groups: [
        {
          label: 'Schedule',
          items: [
            { routeKey: 'portal.calendar', text: 'Calendar', icon: 'calendar_month', path: getLink('portal.calendar'), description: 'View schedule' },
          ],
        },
      ],
    },
    {
      label: 'Attendance',
      route: getLink('portal.calendar'),
      groups: [
        {
          label: 'Tracking',
          items: [
            { routeKey: 'portal.calendar', text: 'Take Attendance', icon: 'how_to_reg', path: getLink('portal.calendar'), description: 'Use events to manage attendance', disabled: true },
            { routeKey: 'portal.calendar', text: 'Attendance History', icon: 'history', path: getLink('portal.calendar'), description: 'Use events to review attendance', disabled: true },
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
            { routeKey: 'portal.tryouts', text: 'Tryouts', icon: 'emoji_events', path: getLink('portal.tryouts'), description: 'Tryout sessions' },
            { routeKey: 'portal.travel', text: 'Travel', icon: 'flight', path: getLink('portal.travel'), description: 'Trip details' },
            { routeKey: 'portal.messages', text: 'Messages', icon: 'mail', path: getLink('portal.messages'), description: 'Communications' },
            { routeKey: 'portal.photos', text: 'Photos', icon: 'photo_library', path: getLink('portal.photos'), description: 'Team photos' },
            { routeKey: 'portal.videos', text: 'Videos', icon: 'smart_display', path: getLink('portal.videos'), description: 'Video library & feedback' },
            { routeKey: 'portal.settings', text: 'Settings', icon: 'settings', path: getLink('portal.settings'), description: 'Preferences' },
          ],
        },
      ],
    },
  ], [t])

  const parentNavSections = useMemo(() => [
    {
      label: 'Dashboard',
      route: getLink('portal.dashboard'),
      groups: [
        {
          label: '',
          items: [
            { routeKey: 'portal.dashboard', text: 'Dashboard', icon: 'dashboard', path: getLink('portal.dashboard'), description: 'Daily overview' },
          ],
        },
      ],
    },
    {
      label: 'My Events',
      route: getLink('portal.calendar'),
      groups: [
        {
          label: 'My Events',
          items: [
            { routeKey: 'portal.calendar', text: 'Events I\'m Attending', icon: 'calendar_month', path: getLink('portal.calendar'), description: 'View upcoming events' },
            { routeKey: 'portal.myTickets', text: 'My Tickets', icon: 'confirmation_number', path: getLink('portal.myTickets'), description: 'Event tickets' },
            { routeKey: 'portal.bookmarkedEvents', text: 'My Bookmarks', icon: 'bookmark', path: getLink('portal.bookmarkedEvents'), description: 'Saved events' },
          ],
        },
      ],
    },
    {
      label: 'My Teams',
      route: getLink('portal.athletes'),
      groups: [
        {
          label: 'My Teams',
          items: [
            { routeKey: 'portal.athletes', text: 'My Athletes', icon: 'groups', path: getLink('portal.athletes'), description: 'Athletes and teams I follow' },
            { routeKey: 'portal.requestAttachment', text: 'Request Athlete Attachment', icon: 'person_add', path: getLink('portal.requestAttachment'), description: 'Attach to an existing athlete' },
            { routeKey: 'portal.uniforms', text: 'Uniform Orders', icon: 'checkroom', path: getLink('portal.uniforms'), description: 'Gear and uniforms' },
          ],
        },
      ],
    },
    {
      label: 'Fees',
      route: getLink('portal.payments'),
      groups: [
        {
          label: '',
          items: [
            { routeKey: 'portal.payments', text: 'Fees', icon: 'receipt_long', path: getLink('portal.payments'), description: 'Outstanding fees and payment history' },
          ],
        },
      ],
    },
    {
      label: 'Messages',
      route: getLink('portal.messages'),
      groups: [
        {
          label: 'Messages',
          items: [
            { routeKey: 'portal.messages', text: 'Huddles', icon: 'forum', path: getLink('portal.messages'), description: 'Team chat and announcements' },
          ],
        },
      ],
    },
    {
      label: 'Organizations',
      route: getLink('portal.following'),
      groups: [
        {
          label: 'Organizations',
          items: [
            { routeKey: 'portal.following', text: 'Followed Organizations', icon: 'favorite', path: getLink('portal.following'), description: 'Organizations I follow' },
            { routeKey: 'portal.discoverOrgs', text: 'Browse Organizations', icon: 'explore', path: getLink('portal.discoverOrgs'), description: 'Discover new teams' },
            { routeKey: 'portal.join', text: 'Join a Team', icon: 'group_add', path: getLink('portal.join'), description: 'Enter an invite code' },
          ],
        },
      ],
    },
    {
      label: 'More',
      groups: [
        {
          label: 'Media & Programs',
          items: [
            { routeKey: 'portal.photos', text: 'Photos', icon: 'photo_library', path: getLink('portal.photos'), description: 'Team galleries' },
            { routeKey: 'portal.videos', text: 'Video Library', icon: 'smart_display', path: getLink('portal.videos'), description: 'Watch team and athlete videos' },
            { routeKey: 'portal.tryouts', text: 'Tryouts', icon: 'emoji_events', path: getLink('portal.tryouts'), description: 'Tryout sessions' },
          ],
        },
        {
          label: 'Account',
          items: [
            { routeKey: 'portal.settings', text: 'Settings', icon: 'settings', path: getLink('portal.settings'), description: 'Account preferences' },
            { routeKey: 'portal.help', text: 'Help & Support', icon: 'help', path: getLink('portal.help'), description: 'Get assistance' },
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
  const isMobile = useMobile()

  // Determine user role for navigation
  const determineRole = useCallback((): PortalRole => {
    if (forceRole) return forceRole
    
    // Check roles in priority order: org_admin > coach > parent > athlete
    if (isOrgAdmin()) return 'org_admin'
    if (hasAnyRole('coach')) return 'coach'
    if (hasAnyRole('parent')) return 'parent'
    if (hasAnyRole('athlete')) return 'athlete'
    return 'parent' // Default fallback
  }, [forceRole, isOrgAdmin, hasAnyRole])

  const currentRole = determineRole()

  // Select navigation based on role
  const rawNavSections = currentRole === 'org_admin' 
    ? orgAdminNavSections 
    : currentRole === 'coach' 
      ? coachNavSections 
      : currentRole === 'athlete'
        ? athleteNavSections
        : parentNavSections

  // Apply feature gate filtering - wait for org context to avoid warnings
  const { filteredSections: navSections } = useFilteredNavigation(
    isOrgLoading ? [] : rawNavSections
  )

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

  // Close mobile menu handler
  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

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
    athlete: 'Athlete',
  }

  return (
    <>
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

        {/* Mobile toggle - only show on mobile */}
        {isMobile && (
          <button
            className="gn-util-btn gn-mobile-toggle"
            onClick={() => {
              setMobileMenuOpen(prev => !prev)
            }}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            type="button"
          >
            <span className="material-symbols-outlined">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        )}

        {/* Navigation items - only show on desktop */}
        {!isMobile && (
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
                    groups={section.groups as any}
                    wide={isWide}
                  />
                </div>
              </li>
            )
          })}
          </ul>
        )}
      </div>

      {/* Right section */}
      <div className="gn-right">
        {/* Demo Mode Badge */}
        <DemoModeBadge />

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

        {/* Team Switcher for coaches */}
        {currentRole === 'coach' && context && (
          <CoachTeamSwitcher context={context} />
        )}

        {/* Notifications */}
        <NotificationBell viewAllPath="/portal/notifications" />

        <div className="gn-divider" />

        {/* Theme toggle */}
        <ThemeToggle variant="icon-only" />

        <div className="gn-divider" />

        {/* User context */}
        <UserContextDropdown />
      </div>
    </nav>

    {/* Mobile Menu */}
    <MobileMenu
      isOpen={mobileMenuOpen}
      onClose={handleMobileMenuClose}
      sections={navSections as any}
      brandName="Youth Sports"
      brandSubtitle="Team Hub"
    />
    </>
  )
}

/**
 * CoachTeamSwitcher - Wrapper component that loads teams and manages team selection
 */
function CoachTeamSwitcher({ context: _context }: { context: any }) {
  const { selectedTeamId, teams, isLoading, updateTeamSelection, hasTeams } = useCoachTeamSelection()

  if (isLoading) {
    return null // Don't show anything while loading
  }

  if (!hasTeams) {
    return null // Don't show switcher if no teams (empty state handled in pages)
  }

  return (
    <TeamSwitcher
      selectedTeamId={selectedTeamId}
      onTeamChange={updateTeamSelection}
      teams={teams}
    />
  )
}
