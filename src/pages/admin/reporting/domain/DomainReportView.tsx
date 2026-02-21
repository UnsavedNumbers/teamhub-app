/**
 * Domain Report View Component
 *
 * Base component for domain-specific report views.
 * Handles loading metrics, displaying KPIs, charts, and tables.
 * Uses ReportingLayout for consistent navigation and structure.
 */

import { ReportingProvider, useReporting } from '../../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../../components/reporting/ReportingLayout'
import { ScopeControls } from '../../../../components/reporting/ScopeControls'
import { BreadcrumbNav } from '../../../../components/reporting/BreadcrumbNav'
import type { ReportDomain } from '../../../../types/reporting'
import '../../../../styles/reporting.css'
import '../../../../styles/orgAdmin.css'

interface DomainReportViewProps {
  domain: ReportDomain
  title: string
  description: string
  children: React.ReactNode
}

function DomainReportContent({ title, description, children }: Omit<DomainReportViewProps, 'domain'>) {
  useReporting()

  return (
    <ReportingLayout>
      <div className="reporting-content">
        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            className="oa-page-title"
            style={{
              fontSize: '28px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="oa-page-subtitle"
              style={{
                fontSize: '16px',
                margin: 0,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Scope Controls */}
        <div style={{ marginBottom: '24px' }}>
          <ScopeControls />
          <BreadcrumbNav />
        </div>

        {/* Content */}
        {children}
      </div>
    </ReportingLayout>
  )
}

export function DomainReportView({ domain: _domain, title, description, children }: DomainReportViewProps) {
  return (
    <ReportingProvider>
      <DomainReportContent title={title} description={description}>
        {children}
      </DomainReportContent>
    </ReportingProvider>
  )
}
