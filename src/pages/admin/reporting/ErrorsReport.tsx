/**
 * Errors Report View
 *
 * Reports on payment failures, errors, and issues.
 */

import { DomainReportView } from './domain/DomainReportView'
import { useErrorsMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { useT } from '../../../i18n/useI18n'
import { TimeSeriesChart, BarChart, PieChart } from '../../../components/reporting/charts'
import { ExportButton } from '../../../components/reporting/ExportButton'
import { TopLevelStats } from '../../../components/common/TopLevelStats'

function ErrorsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: errorsMetrics, isLoading, error } = useErrorsMetrics(filters)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !errorsMetrics) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.error.loadFailed')}</p>
      </div>
    )
  }

  const totalPaymentFailures = errorsMetrics.paymentFailuresOverTime.reduce((sum, d) => sum + d.value, 0)

  return (
    <>
      {/* KPI Cards */}
      <TopLevelStats
        className="oa-mb-8"
        ariaLabel="Errors summary metrics"
        items={[
          { id: 'payment-failures', label: 'Payment Failures', value: totalPaymentFailures, tone: totalPaymentFailures > 0 ? 'danger' : 'default' },
          { id: 'failed-checkins', label: 'Failed Check-ins', value: errorsMetrics.failedCheckIns, tone: errorsMetrics.failedCheckIns > 0 ? 'warning' : 'default' },
        ]}
      />

      {/* Payment Failures Over Time */}
      {errorsMetrics.paymentFailuresOverTime && errorsMetrics.paymentFailuresOverTime.length > 0 && (
        <div style={{ marginBottom: '32px' }} className="reporting-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="reporting-section-title" style={{ margin: 0 }}>Payment Failures Over Time</h3>
            <ExportButton data={errorsMetrics.paymentFailuresOverTime} filename="payment-failures-over-time" />
          </div>
          <TimeSeriesChart
            data={{
              series: [
                {
                  name: 'Payment Failures',
                  data: errorsMetrics.paymentFailuresOverTime,
                },
              ],
            }}
            height={300}
            type="line"
          />
        </div>
      )}

      {/* Payment Failure Reasons */}
      {errorsMetrics.paymentFailureReasons && errorsMetrics.paymentFailureReasons.length > 0 && (
        <div style={{ marginBottom: '32px' }} className="reporting-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="reporting-section-title" style={{ margin: 0 }}>Payment Failure Reasons</h3>
            <ExportButton data={errorsMetrics.paymentFailureReasons} filename="payment-failure-reasons" />
          </div>
          <PieChart
            data={{
              data: errorsMetrics.paymentFailureReasons.map((item) => ({
                category: item.reason,
                value: item.count,
              })),
            }}
            height={300}
          />
        </div>
      )}

      {/* Error Types Breakdown */}
      {errorsMetrics.errorTypesBreakdown && errorsMetrics.errorTypesBreakdown.length > 0 && (
        <div style={{ marginBottom: '32px' }} className="reporting-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="reporting-section-title" style={{ margin: 0 }}>Error Types Breakdown</h3>
            <ExportButton data={errorsMetrics.errorTypesBreakdown} filename="error-types-breakdown" />
          </div>
          <BarChart
            data={{
              data: errorsMetrics.errorTypesBreakdown.map((item) => ({
                category: item.type,
                value: item.count,
              })),
            }}
            height={300}
          />
        </div>
      )}
    </>
  )
}

export default function ErrorsReport() {
  return (
    <DomainReportView
      domain="errors"
      title="Errors & Issues"
      description="Monitor payment failures and errors"
    >
      <ErrorsReportContent />
    </DomainReportView>
  )
}
