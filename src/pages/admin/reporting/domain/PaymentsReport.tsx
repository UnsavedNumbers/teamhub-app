/**
 * Payments Report View
 *
 * Reports on fees, payments, and financial metrics.
 */

import { DomainReportView } from './DomainReportView'
import { useRevenueMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { useMemo } from 'react'
import { TimeSeriesChart, PieChart } from '../../../../components/reporting/charts'
import { ExportButton } from '../../../../components/reporting/ExportButton'

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
        <p>{t('common.error.loadFailed')}</p>
      </div>
    )
  }

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Total Revenue</p>
          <p className="oa-kpi-value">{formatCurrency(revenueMetrics.totalRevenue)}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Outstanding Balances</p>
          <p className="oa-kpi-value">{formatCurrency(revenueMetrics.outstandingBalances)}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Average Payment</p>
          <p className="oa-kpi-value">{formatCurrency(revenueMetrics.averagePaymentAmount)}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Payments Completed</p>
          <p className="oa-kpi-value">{revenueMetrics.paymentsCompleted}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Payments Failed</p>
          <p className="oa-kpi-value">{revenueMetrics.paymentsFailed}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Payment Plans On Track</p>
          <p className="oa-kpi-value">{revenueMetrics.paymentPlansOnTrack}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Payment Plans Overdue</p>
          <p className="oa-kpi-value">{revenueMetrics.paymentPlansOverdue}</p>
        </div>
      </div>

      {/* Revenue Over Time */}
      {revenueMetrics.revenueOverTime && revenueMetrics.revenueOverTime.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Total Revenue Over Time</h3>
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
          <div style={{ background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Revenue by Season</h3>
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
          <div style={{ background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Revenue by Team</h3>
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
        <div style={{ background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Payments Completed vs Failed</h3>
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
        <div style={{ background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Payment Plans Status</h3>
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
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Refunds Issued Over Time</h3>
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
