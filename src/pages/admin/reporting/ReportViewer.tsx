/**
 * Report Viewer Page
 *
 * View a saved report with drilldown support.
 */

import { useParams } from 'react-router-dom'
import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ScopeControls } from '../../../components/reporting/ScopeControls'
import { AdminPageHeader } from '../../../components/admin'
import { useSavedReport } from '../../../hooks/useReporting'
import { useT } from '../../../i18n/useI18n'
import '../../../styles/orgAdmin.css'

export default function ReportViewer() {
  const t = useT()
  const { reportId } = useParams<{ reportId: string }>()
  const { data: report, isLoading, error } = useSavedReport(reportId || null)

  if (isLoading) {
    return (
      <ReportingProvider>
        <div className="oa-page">
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </ReportingProvider>
    )
  }

  if (error || !report) {
    return (
      <ReportingProvider>
        <div className="oa-page">
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p>{t('common.error.notFound')}</p>
          </div>
        </div>
      </ReportingProvider>
    )
  }

  return (
    <ReportingProvider>
      <div className="oa-page">
        <AdminPageHeader
          title={report.name}
          subtitle={report.description || undefined}
        />

        <ScopeControls />

        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--org-text-secondary)' }}>
            <p>{t('admin.reporting.viewer.comingSoon')}</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              {t('admin.reporting.viewer.comingSoonDescription')}
            </p>
          </div>
        </div>
      </div>
    </ReportingProvider>
  )
}
