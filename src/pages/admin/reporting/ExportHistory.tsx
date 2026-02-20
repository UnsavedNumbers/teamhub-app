/**
 * Export History Page
 *
 * View export history and re-download exports.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ScopeControls } from '../../../components/reporting/ScopeControls'
import { AdminPageHeader } from '../../../components/admin'
import { useExportHistory } from '../../../hooks/useReporting'
import { useT } from '../../../i18n/useI18n'
import '../../../../styles/orgAdmin.css'

export default function ExportHistory() {
  const t = useT()
  const { data: history, isLoading } = useExportHistory(50)

  return (
    <ReportingProvider>
      <div className="oa-page">
        <AdminPageHeader
          title={t('admin.reporting.exportHistory.title')}
          description={t('admin.reporting.exportHistory.description')}
        />

        <ScopeControls />

        <div style={{ padding: '24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p>{t('common.loading')}</p>
            </div>
          ) : history && history.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--org-border-color)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      <p style={{ margin: '0', color: 'var(--org-text-secondary)', fontSize: '14px' }}>
                        {item.format.toUpperCase()} - {item.status}
                      </p>
                    </div>
                    {item.file_url && (
                      <a
                        href={item.file_url}
                        download
                        style={{
                          padding: '8px 16px',
                          border: '1px solid var(--org-border-color)',
                          borderRadius: '4px',
                          textDecoration: 'none',
                        }}
                      >
                        {t('common.download')}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--org-text-secondary)' }}>
              <p>{t('admin.reporting.exportHistory.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </ReportingProvider>
  )
}
