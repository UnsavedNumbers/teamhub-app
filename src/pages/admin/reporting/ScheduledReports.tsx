/**
 * Scheduled Reports Page
 *
 * Manage scheduled reports.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ScopeControls } from '../../../components/reporting/ScopeControls'
import { AdminPageHeader } from '../../../components/admin'
import { useScheduledReports, useDeleteScheduledReport } from '../../../hooks/useReporting'
import { useT } from '../../../i18n/useI18n'
import '../../../../styles/orgAdmin.css'

export default function ScheduledReports() {
  const t = useT()
  const { data: reports, isLoading } = useScheduledReports()
  const deleteReport = useDeleteScheduledReport()

  const handleDelete = async (reportId: string) => {
    if (window.confirm(t('admin.reporting.scheduledReports.confirmDelete'))) {
      try {
        await deleteReport.mutateAsync(reportId)
      } catch (error) {
        console.error('Failed to delete scheduled report:', error)
      }
    }
  }

  return (
    <ReportingProvider>
      <div className="oa-page">
        <AdminPageHeader
          title={t('admin.reporting.scheduledReports.title')}
          description={t('admin.reporting.scheduledReports.description')}
        />

        <ScopeControls />

        <div style={{ padding: '24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p>{t('common.loading')}</p>
            </div>
          ) : reports && reports.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {reports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--org-border-color)',
                    borderRadius: '8px',
                  }}
                >
                  <h3 style={{ margin: '0 0 8px 0' }}>{report.name}</h3>
                  <p style={{ margin: '0 0 8px 0', color: 'var(--org-text-secondary)' }}>
                    {report.schedule.frequency} - {report.format.toUpperCase()}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDelete(report.id)}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid var(--org-border-color)',
                        borderRadius: '4px',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--org-text-secondary)' }}>
              <p>{t('admin.reporting.scheduledReports.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </ReportingProvider>
  )
}
