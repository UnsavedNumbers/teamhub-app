/**
 * Reports Overview Page
 *
 * Executive dashboard with KPIs and trend charts for the reporting console.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ScopeControls } from '../../../components/reporting/ScopeControls'
import { AdminPageHeader } from '../../../components/admin'
import { useT } from '../../../i18n/useI18n'
import '../../../../styles/orgAdmin.css'

export default function ReportsOverview() {
  const t = useT()

  return (
    <ReportingProvider>
      <div className="oa-page">
        <AdminPageHeader
          title={t('admin.reporting.overview.title')}
          description={t('admin.reporting.overview.description')}
        />

        <ScopeControls />

        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--org-text-secondary)' }}>
            <p>{t('admin.reporting.overview.comingSoon')}</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              {t('admin.reporting.overview.comingSoonDescription')}
            </p>
          </div>
        </div>
      </div>
    </ReportingProvider>
  )
}
