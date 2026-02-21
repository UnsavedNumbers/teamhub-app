/**
 * Reports Overview Page
 *
 * Simple overview page with links to individual report pages.
 */

import { ReportingProvider, useReporting } from '../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../components/reporting/ReportingLayout'
import { ScopeControls } from '../../../components/reporting/ScopeControls'
import { BreadcrumbNav } from '../../../components/reporting/BreadcrumbNav'
import { useOrgHealthMetrics } from '../../../hooks/useReporting'
import { useT } from '../../../i18n/useI18n'
import { Link } from 'react-router-dom'
import { getLink } from '../../../utils/routes'
import '../../../styles/reporting.css'
import '../../../styles/orgAdmin.css'

function ReportsOverviewContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading } = useOrgHealthMetrics(filters)

  if (isLoading) {
    return (
      <ReportingLayout>
        <div className="reporting-content">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </ReportingLayout>
    )
  }

  const reportLinks = [
    {
      title: 'Revenue & Payments',
      description: 'Track revenue, payments, and outstanding balances',
      icon: 'payments',
      path: getLink('admin.reports.domain.payments'),
    },
    {
      title: 'Ticketing & Gate',
      description: 'Monitor ticket sales and gate entry',
      icon: 'confirmation_number',
      path: '/admin/reports/ticketing',
    },
    {
      title: 'Registration',
      description: 'Analyze registration completion and drop-offs',
      icon: 'how_to_reg',
      path: '/admin/reports/registration',
    },
    {
      title: 'Participation',
      description: 'View athlete participation and roster changes',
      icon: 'groups',
      path: getLink('admin.reports.domain.participation'),
    },
    {
      title: 'Scheduling',
      description: 'Review scheduling metrics and conflicts',
      icon: 'event',
      path: getLink('admin.reports.domain.scheduling'),
    },
    {
      title: 'Video',
      description: 'Track video views and engagement',
      icon: 'videocam',
      path: '/admin/reports/video',
    },
    {
      title: 'Events & Attendance',
      description: 'Monitor events and RSVP rates',
      icon: 'event_available',
      path: '/admin/reports/events',
    },
    {
      title: 'Communication',
      description: 'View message and email metrics',
      icon: 'chat',
      path: getLink('admin.reports.domain.communications'),
    },
    {
      title: 'Travel',
      description: 'Analyze travel plans and overlaps',
      icon: 'flight',
      path: getLink('admin.reports.domain.travel'),
    },
    {
      title: 'Uniforms',
      description: 'Track uniform orders and inventory',
      icon: 'checkroom',
      path: getLink('admin.reports.domain.uniforms'),
    },
    {
      title: 'Operations',
      description: 'View operations metrics',
      icon: 'settings',
      path: getLink('admin.reports.domain.operations'),
    },
    {
      title: 'Errors & Issues',
      description: 'Monitor payment failures and errors',
      icon: 'error',
      path: '/admin/reports/errors',
    },
  ]

  return (
    <ReportingLayout>
      <div className="reporting-content">
        <ScopeControls />
        <BreadcrumbNav />

        {/* Overview KPIs */}
        {metrics && (
          <div className="org-stats-section" style={{ marginBottom: '32px' }}>
            <div className="org-stats-grid">
              <div className="org-stat-box">
                <span className="org-stat-label">{t('admin.reporting.overview.totalSubOrgs')}</span>
                <span className="org-stat-value">{metrics.totalSubOrgs}</span>
              </div>
              <div className="org-stat-box">
                <span className="org-stat-label">{t('admin.reporting.overview.activeSubOrgs')}</span>
                <span className="org-stat-value">{metrics.activeSubOrgs}</span>
              </div>
              <div className="org-stat-box">
                <span className="org-stat-label">{t('admin.reporting.overview.totalTeams')}</span>
                <span className="org-stat-value">
                  {metrics.teamsPerSubOrg.reduce((sum, item) => sum + item.teamCount, 0)}
                </span>
              </div>
              <div className="org-stat-box">
                <span className="org-stat-label">{t('admin.reporting.overview.totalAthletes')}</span>
                <span className="org-stat-value">
                  {metrics.athletesPerSubOrg.reduce((sum, item) => sum + item.athleteCount, 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Report Links Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {reportLinks.map((report) => (
            <Link
              key={report.path}
              to={report.path}
              style={{
                display: 'block',
                padding: '24px',
                background: 'var(--pa-surface, #ffffff)',
                border: '1px solid var(--pa-n100, #e2e8f0)',
                borderRadius: 'var(--pa-radius-m, 8px)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all var(--pa-motion-normal, 0.2s) var(--pa-ease-out, ease)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--pa-shadow-1, 0 1px 3px rgba(0,0,0,0.1))'
                e.currentTarget.style.borderColor = 'var(--pa-n200, #cbd5e1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'var(--pa-n100, #e2e8f0)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '32px', color: 'var(--org-color-primary, #3b82f6)', flexShrink: 0 }}
                >
                  {report.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900, #0b0f14)' }}>
                    {report.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--pa-n500, #6b7280)', lineHeight: '1.5' }}>
                    {report.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </ReportingLayout>
  )
}

export default function ReportsOverview() {
  return (
    <ReportingProvider>
      <ReportsOverviewContent />
    </ReportingProvider>
  )
}
