import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import MegaMenu, { type NavGroup } from './MegaMenu'
import ThemeSwitcher from './ThemeSwitcher'
import UserContextDropdown from './UserContextDropdown'
import MobileNavDrawer from './MobileNavDrawer'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { useMobile } from '@/hooks/useMobile'
import type { NavSection } from '@/types/menu'

interface GlobalNavProps {
  variant: 'admin' | 'platform-admin'
}

export default function GlobalNav({ variant }: GlobalNavProps) {
  const { currentOrganization } = useOrganization()
  const t = useT()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isAdmin = variant === 'admin'
  const hasOrg = !!currentOrganization?.id

  // Navigation configuration for Organization Admin
  const adminNavSections: NavSection[] = useMemo(() => [
    {
      label: 'Overview',
      groups: [
        {
          label: '',
          items: [
            { text: 'Dashboard', icon: 'dashboard', path: '/admin', description: 'Organization overview' },
            { text: 'Organization', icon: 'business', path: '/admin/organization', description: 'Settings & billing' },
          ],
        },
      ],
    },
    {
      label: 'Management',
      groups: [
        {
          label: 'Teams & People',
          items: [
            { text: 'Teams', icon: 'groups', path: '/admin/teams', description: 'Manage teams & rosters' },
            { text: 'Families', icon: 'home', path: '/admin/families', description: 'Family management' },
            { text: t('admin.navigation.children'), icon: 'child_care', path: '/admin/athletes', description: 'Player registry' },
          ],
        },
      ],
    },
  {
    label: 'Operations',
    groups: [
      {
        label: 'Core Operations',
        items: [
          { text: 'Payments', icon: 'credit_card', path: '/admin/payments', description: 'Fees & collections' },
          { text: 'Events', icon: 'event', path: '/admin/events', description: 'Schedule & calendar' },
          { text: 'Attendance', icon: 'how_to_reg', path: '/admin/attendance', description: 'Check-ins & tracking' },
        ],
      },
      {
        label: 'Programs',
        items: [
          { text: 'Uniforms', icon: 'checkroom', path: '/admin/uniforms', description: 'Kit & gear orders' },
          { text: 'Travel', icon: 'flight', path: '/admin/travel', description: 'Trip planning' },
          { text: 'Tryouts', icon: 'emoji_events', path: '/admin/tryouts', description: 'Registration & evaluation' },
        ],
      },
    ],
  },
  {
    label: 'Communication',
    groups: [
      {
        label: '',
        items: [
          { text: 'Messages', icon: 'mail', path: '/admin/messages', description: 'Announcements & inbox' },
          { text: 'Reports', icon: 'bar_chart', path: '/admin/reports', description: 'Analytics & exports' },
        ],
      },
    ],
  },
  ], [t])

  // Navigation configuration for Platform Admin
  const platformAdminNavSections: { label: string; groups: NavGroup[] }[] = [
    {
      label: 'Overview',
      groups: [
        {
          label: '',
          items: [
            { text: 'Dashboard', icon: 'dashboard', path: '/platform-admin', description: 'Platform metrics' },
          ],
        },
      ],
    },
    {
      label: 'Organizations',
      groups: [
        {
          label: '',
          items: [
            { text: 'Organizations', icon: 'apartment', path: '/platform-admin/organizations', description: 'All organizations' },
          ],
        },
      ],
    },
    {
      label: 'Users',
      groups: [
        {
          label: '',
          items: [
            { text: 'Users', icon: 'group', path: '/platform-admin/users', description: 'All platform users' },
            { text: 'Platform Admins', icon: 'admin_panel_settings', path: '/platform-admin/admins', description: 'Admin management' },
          ],
        },
      ],
    },
    {
      label: 'Finance',
      groups: [
        {
          label: '',
          items: [
            { text: 'Payments', icon: 'credit_card', path: '/platform-admin/payments', description: 'Payment transactions' },
            { text: 'Fees', icon: 'receipt_long', path: '/platform-admin/fees', description: 'Fee schedules' },
          ],
        },
      ],
    },
    {
      label: 'System',
      groups: [
        {
          label: '',
          items: [
            { text: 'Event Log', icon: 'history', path: '/platform-admin/audit', description: 'Audit trail' },
            { text: 'Feature Flags', icon: 'flag', path: '/platform-admin/feature-flags', description: 'Feature toggles' },
            { text: 'Structure', icon: 'account_tree', path: '/platform-admin/structure', description: 'Data model' },
          ],
        },
      ],
    },
  ]

  const navSections = isAdmin ? adminNavSections : platformAdminNavSections
  const isMobile = useMobile()

  // Filter nav items based on org requirement (admin variant only)
  const getFilteredGroups = useCallback((groups: NavGroup[]): NavGroup[] => {
    if (!isAdmin) return groups
    
    return groups.map(group => ({
      ...group,
      items: group.items.map(item => {
        // Check if item requires org
        const requiresOrg = [
          '/admin/teams', '/admin/families', '/admin/athletes',
          '/admin/payments', '/admin/events', '/admin/attendance',
          '/admin/uniforms', '/admin/travel', '/admin/tryouts',
          '/admin/messages', '/admin/reports'
        ].includes(item.path)
        
        return {
          ...item,
          disabled: requiresOrg && !hasOrg
        }
      })
    }))
  }, [isAdmin, hasOrg])

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
  }, []) // Empty deps - close on any route change

  // Close mobile menu handler
  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const brandPath = isAdmin ? '/admin' : '/platform-admin'
  const brandIcon = isAdmin ? 'sports' : 'shield_person'
  const brandText = isAdmin ? 'YOUTH SPORTS' : 'ADMIN'

  // Prepare filtered sections for mobile drawer
  const mobileNavSections: NavSection[] = useMemo(() => {
    if (!isAdmin) return []
    return navSections.map(section => ({
      ...section,
      groups: getFilteredGroups(section.groups)
    }))
  }, [isAdmin, navSections, getFilteredGroups])

  return (
    <>
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

          {/* Mobile toggle - only show for admin variant on mobile */}
          {isAdmin && isMobile && (
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

          {/* Navigation items - only show for admin variant on desktop */}
          {isAdmin && !isMobile && (
          <ul className="gn-nav" role="menubar">
            {navSections.map((section) => {
              const menuId = `menu-${section.label.toLowerCase().replace(/\s+/g, '-')}`
              const isOpen = openMenuId === menuId
              const filteredGroups = getFilteredGroups(section.groups)
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
                      groups={filteredGroups}
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
        {/* Notifications (placeholder) */}
        <button
          className="gn-util-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <div className="gn-divider" />

        {/* Theme switcher */}
        <ThemeSwitcher />

        <div className="gn-divider" />

        {/* User context */}
        <UserContextDropdown />
      </div>
    </nav>

    {/* Mobile drawer - only show for admin variant */}
    {isAdmin && (
      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        sections={mobileNavSections}
      />
    )}
    </>
  )
}
