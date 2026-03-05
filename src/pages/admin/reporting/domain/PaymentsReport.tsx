/**
 * Payments Report View
 *
 * Reports on fees, payments, and financial metrics.
 */

import { DomainReportView } from './DomainReportView'
import { useRevenueMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { TimeSeriesChart, BarChart, PieChart } from '../../../../components/reporting/charts'
import { ExportButton } from '../../../../components/reporting/ExportButton'
import { TopLevelStats } from '../../../../components/common/TopLevelStats'

function PaymentsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: revenueMetrics, isLoading, error } = useRevenueMetrics(filters)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !revenueMetrics) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{error?.message || t('common.error.loadFailed')}</p>
      </div>
    )
  }

  return (
    <>
      {/* KPI Cards */}
      <TopLevelStats
        className="oa-mb-8"
        ariaLabel="Payments report summary metrics"
        items={[
          { id: 'revenue', label: 'Total Revenue', value: formatCurrency(revenueMetrics.totalRevenue), tone: 'success' },
          { id: 'outstanding', label: 'Outstanding Balances', value: formatCurrency(revenueMetrics.outstandingBalances), tone: revenueMetrics.outstandingBalances > 0 ? 'warning' : 'default' },
          { id: 'average-payment', label: 'Average Payment', value: formatCurrency(revenueMetrics.averagePaymentAmount) },
          { id: 'completed', label: 'Payments Completed', value: revenueMetrics.paymentsCompleted, tone: 'success' },
          { id: 'failed', label: 'Payments Failed', value: revenueMetrics.paymentsFailed, tone: revenueMetrics.paymentsFailed > 0 ? 'danger' : 'default' },
          { id: 'plans-on-track', label: 'Payment Plans On Track', value: revenueMetrics.paymentPlansOnTrack, tone: 'success' },
          { id: 'plans-overdue', label: 'Payment Plans Overdue', value: revenueMetrics.paymentPlansOverdue, tone: revenueMetrics.paymentPlansOverdue > 0 ? 'warning' : 'default' },
        ]}
      />

      {/* Revenue Over Time */}
      {revenueMetrics.revenueOverTime && revenueMetrics.revenueOverTime.length > 0 && (
        <div style={{ marginBottom: '32px' }} className="reporting-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="reporting-section-title" style={{ margin: 0 }}>Total Revenue Over Time</h3>
            <ExportButton data={revenueMetrics.revenueOverTime} filename="revenue-over-time" />
          </div>
          <TimeSeriesChart
            data={{
              series: [
                {
                  name: 'Total Revenue',
                  data: revenueMetrics.revenueOverTime,
                },
              ],
            }}
            height={300}
            type="line"
          />
        </div>
      )}

      {/* Revenue Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {revenueMetrics.revenueBySeason && revenueMetrics.revenueBySeason.length > 0 && (
          <div className="reporting-section-card">
            <h3 className="reporting-section-title" style={{ margin: '0 0 16px 0' }}>Revenue by Season</h3>
            <BarChart
              data={{
                data: revenueMetrics.revenueBySeason.map((item) => ({
                  category: item.seasonName,
                  value: item.revenue,
                })),
              }}
              height={300}
            />
          </div>
        )}
        {revenueMetrics.revenueByTeam && revenueMetrics.revenueByTeam.length > 0 && (
          <div className="reporting-section-card">
            <h3 className="reporting-section-title" style={{ margin: '0 0 16px 0' }}>Revenue by Team</h3>
            <BarChart
              data={{
                data: revenueMetrics.revenueByTeam.map((item) => ({
                  category: item.teamName,
                  value: item.revenue,
                })),
              }}
              height={300}
            />
          </div>
        )}
      </div>

      {/* Payment Status Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="reporting-section-card">
          <h3 className="reporting-section-title" style={{ margin: '0 0 16px 0' }}>Payments Completed vs Failed</h3>
          <PieChart
            data={{
              data: [
                { category: 'Completed', value: revenueMetrics.paymentsCompleted },
                { category: 'Failed', value: revenueMetrics.paymentsFailed },
              ],
            }}
            height={250}
          />
        </div>
        <div className="reporting-section-card">
          <h3 className="reporting-section-title" style={{ margin: '0 0 16px 0' }}>Payment Plans Status</h3>
          <PieChart
            data={{
              data: [
                { category: 'On Track', value: revenueMetrics.paymentPlansOnTrack },
                { category: 'Overdue', value: revenueMetrics.paymentPlansOverdue },
              ],
            }}
            height={250}
          />
        </div>
      </div>

      {/* Refunds Over Time */}
      {revenueMetrics.refundsOverTime && revenueMetrics.refundsOverTime.length > 0 && (
        <div style={{ marginBottom: '32px' }} className="reporting-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="reporting-section-title" style={{ margin: 0 }}>Refunds Issued Over Time</h3>
            <ExportButton data={revenueMetrics.refundsOverTime} filename="refunds-over-time" />
          </div>
          <TimeSeriesChart
            data={{
              series: [
                {
                  name: 'Refunds Issued',
                  data: revenueMetrics.refundsOverTime,
                },
              ],
            }}
            height={300}
            type="line"
          />
        </div>
      )}
    </>
  )
}

export default function PaymentsReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="payments"
      title={t('admin.reporting.payments.title')}
      description={t('admin.reporting.payments.description')}
    >
      <PaymentsReportContent />
    </DomainReportView>
  )
}
