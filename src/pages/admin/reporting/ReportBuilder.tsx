/**
 * Report Builder Page
 *
 * Custom report builder interface for creating reports.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ScopeControls } from '../../../components/reporting/ScopeControls'
import { AdminPageHeader } from '../../../components/admin'
import { useT } from '../../../i18n/useI18n'
import '../../../styles/orgAdmin.css'

export default function ReportBuilder() {
  const t = useT()

  return (
    <ReportingProvider>
      <div className="oa-page">
        <AdminPageHeader
          title={t('admin.reporting.builder.title')}
          subtitle={t('admin.reporting.builder.description')}
        />

        <ScopeControls />

        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--org-text-secondary)' }}>
            <p>{t('admin.reporting.builder.comingSoon')}</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              {t('admin.reporting.builder.comingSoonDescription')}
            </p>
          </div>
        </div>
      </div>
    </ReportingProvider>
  )
}
