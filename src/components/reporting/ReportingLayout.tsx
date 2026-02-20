/**
 * Reporting Layout Component
 *
 * Standard wrapper for all reporting pages with sidebar navigation.
 * Provides consistent structure, navigation, and styling across reporting views.
 */

import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useT } from '../../i18n/useI18n'
import { getLink } from '../../utils/routes'
import { RouteKeys } from '../../utils/routes'
import '../../styles/reporting.css'

interface ReportingNavItem {
  key: string
  label: string
  path: string
  icon: string
  children?: ReportingNavItem[]
}

interface ReportingLayoutProps {
  children: React.ReactNode
}

export function ReportingLayout({ children }: ReportingLayoutProps) {
  const t = useT()
  const location = useLocation()

  const navItems: ReportingNavItem[] = useMemo(() => [
    {
      key: 'overview',
      label: t('admin.reporting.overview.title'),
      path: getLink(RouteKeys.ADMIN_REPORTS_OVERVIEW),
      icon: 'dashboard',
    },
    {
      key: 'revenue',
      label: 'Revenue & Payments',
      path: '/admin/reports/domain/payments',
      icon: 'payments',
    },
    {
      key: 'ticketing',
      label: 'Ticketing & Gate',
      path: '/admin/reports/ticketing',
      icon: 'confirmation_number',
    },
    {
      key: 'registration',
      label: 'Registration',
      path: '/admin/reports/registration',
      icon: 'how_to_reg',
    },
    {
      key: 'participation',
      label: t('admin.reporting.participation.title'),
      path: '/admin/reports/domain/participation',
      icon: 'groups',
    },
    {
      key: 'scheduling',
      label: t('admin.reporting.scheduling.title'),
      path: '/admin/reports/domain/scheduling',
      icon: 'event',
    },
    {
      key: 'video',
      label: 'Video',
      path: '/admin/reports/video',
      icon: 'videocam',
    },
    {
      key: 'events',
      label: 'Events & Attendance',
      path: '/admin/reports/events',
      icon: 'event_available',
    },
    {
      key: 'communications',
      label: t('admin.reporting.communications.title'),
      path: '/admin/reports/domain/communications',
      icon: 'chat',
    },
    {
      key: 'travel',
      label: t('admin.reporting.travel.title'),
      path: '/admin/reports/domain/travel',
      icon: 'flight',
    },
    {
      key: 'uniforms',
      label: t('admin.reporting.uniforms.title'),
      path: '/admin/reports/domain/uniforms',
      icon: 'checkroom',
    },
    {
      key: 'operations',
      label: t('admin.reporting.operations.title'),
      path: '/admin/reports/domain/operations',
      icon: 'settings',
    },
  ], [t])

  const isActive = (path: string) => {
    if (path === getLink(RouteKeys.ADMIN_REPORTS_OVERVIEW)) {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="reporting-layout">
      {/* Sidebar Navigation */}
      <aside className="reporting-sidebar">
        <div className="reporting-sidebar-header">
          <h2 className="reporting-sidebar-title">Reports</h2>
        </div>

        <nav className="reporting-sidebar-nav">
          <ul className="reporting-nav-list">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <li key={item.key} className="reporting-nav-item">
                  <Link
                    to={item.path}
                    className={`reporting-nav-link ${active ? 'active' : ''}`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="reporting-nav-text">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="reporting-main">
        {children}
      </main>
    </div>
  )
}
