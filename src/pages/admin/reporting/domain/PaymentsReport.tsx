/**
 * Revenue & Payments Report
 *
 * Premium reporting page with Prezi-style narrative flow.
 * Organized into 5 tabs (chapters) with insights and visualizations.
 */

import { ReportingProvider } from '../../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../../components/reporting/EmptyState'
import { useRevenueMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { TimeSeriesChart, BarChart, PieChart } from '../../../../components/reporting/charts'

function PaymentsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: revenueMetrics, isLoading, error } = useRevenueMetrics(filters)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <p style={{ fontSize: '16px', color: 'var(--org-text-secondary)' }}>Loading...</p>
      </div>
    )
  }

  if (error || !revenueMetrics) {
    return (
      <EmptyState
        title="Unable to load revenue data"
        description="There was an error loading the revenue metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  // Calculate derived metrics
  const collectedPercentage = revenueMetrics.totalRevenue > 0
    ? ((revenueMetrics.totalRevenue - revenueMetrics.outstandingBalances) / revenueMetrics.totalRevenue) * 100
    : 0

  const refundRate = revenueMetrics.totalRevenue > 0 && revenueMetrics.refundsOverTime?.length > 0
    ? (revenueMetrics.refundsOverTime.reduce((sum, point) => sum + point.value, 0) / revenueMetrics.totalRevenue) * 100
    : 0

  // Tab 1: Financial Story (Executive Summary)
  const financialStoryTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Total Revenue', value: revenueMetrics.totalRevenue, format: 'currency' },
          { label: 'Collected', value: formatPercentage(collectedPercentage), format: 'number' },
          { label: 'Outstanding', value: revenueMetrics.outstandingBalances, format: 'currency' },
          { label: 'Avg Fee per Athlete', value: revenueMetrics.averagePaymentAmount, format: 'currency' },
          { label: 'Refund Rate', value: formatPercentage(refundRate), format: 'number' },
        ]}
        chart={
          revenueMetrics.revenueOverTime && revenueMetrics.revenueOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Revenue Over Time
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
                height={400}
                type="area"
              />
            </div>
          ) : null
        }
        takeaway={
          revenueMetrics.revenueOverTime && revenueMetrics.revenueOverTime.length > 0
            ? `Revenue has ${revenueMetrics.revenueOverTime[revenueMetrics.revenueOverTime.length - 1].value > revenueMetrics.revenueOverTime[0].value ? 'increased' : 'decreased'} by ${formatCurrency(Math.abs(revenueMetrics.revenueOverTime[revenueMetrics.revenueOverTime.length - 1].value - revenueMetrics.revenueOverTime[0].value))} over the selected period.`
            : 'Revenue data is being collected and will appear here once available.'
        }
      />

      {/* Revenue Composition Chart */}
      {revenueMetrics.revenueByTeam && revenueMetrics.revenueByTeam.length > 0 && (
        <InsightSection
          title="Revenue Composition"
          chart={
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Revenue by Team
              </div>
              <BarChart
                data={{
                  data: revenueMetrics.revenueByTeam.slice(0, 10).map((item) => ({
                    category: item.teamName,
                    value: item.revenue,
                  })),
                }}
                height={400}
              />
            </div>
          }
          takeaway={`Top team accounts for ${revenueMetrics.revenueByTeam.length > 0 ? formatPercentage((revenueMetrics.revenueByTeam[0].revenue / revenueMetrics.totalRevenue) * 100) : '0%'} of total revenue.`}
        />
      )}

      {/* Insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {revenueMetrics.revenueByTeam && revenueMetrics.revenueByTeam.length > 0 && (
          <InsightCallout
            type="concentration"
            title="Biggest Revenue Driver"
            description={`${revenueMetrics.revenueByTeam[0].teamName} generates ${formatCurrency(revenueMetrics.revenueByTeam[0].revenue)}, representing the largest share of revenue.`}
          />
        )}
        {revenueMetrics.outstandingBalances > 0 && (
          <InsightCallout
            type="timeliness"
            title="Outstanding Collections"
            description={`${formatCurrency(revenueMetrics.outstandingBalances)} in outstanding balances requires attention. Consider sending payment reminders.`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Collections and Aging
  const collectionsTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Outstanding', value: revenueMetrics.outstandingBalances, format: 'currency' },
          { label: 'Past Due', value: revenueMetrics.paymentPlansOverdue > 0 ? formatCurrency(revenueMetrics.paymentPlansOverdue * revenueMetrics.averagePaymentAmount) : formatCurrency(0), format: 'currency' },
          { label: 'Past Due %', value: revenueMetrics.paymentPlansOverdue > 0 ? formatPercentage((revenueMetrics.paymentPlansOverdue / (revenueMetrics.paymentPlansOnTrack + revenueMetrics.paymentPlansOverdue)) * 100) : '0%', format: 'number' },
          { label: 'Median Days to Pay', value: 'N/A', format: 'number' },
          { label: 'Failed Payment Rate', value: revenueMetrics.paymentsCompleted + revenueMetrics.paymentsFailed > 0 ? formatPercentage((revenueMetrics.paymentsFailed / (revenueMetrics.paymentsCompleted + revenueMetrics.paymentsFailed)) * 100) : '0%', format: 'number' },
        ]}
        chart={
          <div>
            <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
              Payment Plans Status
            </div>
            <PieChart
              data={{
                data: [
                  { category: 'On Track', value: revenueMetrics.paymentPlansOnTrack },
                  { category: 'Overdue', value: revenueMetrics.paymentPlansOverdue },
                ],
              }}
              height={350}
            />
          </div>
        }
        takeaway={
          revenueMetrics.paymentPlansOverdue > 0
            ? `${revenueMetrics.paymentPlansOverdue} payment plans are overdue. Consider implementing automated reminders or payment plan adjustments.`
            : 'All payment plans are on track. Great job managing collections!'
        }
      />

      {/* Payment Status Funnel */}
      <InsightSection
        title="Payment Status Breakdown"
        chart={
          <div>
            <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
              Completed vs Failed Payments
            </div>
            <BarChart
              data={{
                data: [
                  { category: 'Completed', value: revenueMetrics.paymentsCompleted },
                  { category: 'Failed', value: revenueMetrics.paymentsFailed },
                ],
              }}
              height={300}
            />
          </div>
        }
        takeaway={`${formatPercentage((revenueMetrics.paymentsCompleted / (revenueMetrics.paymentsCompleted + revenueMetrics.paymentsFailed)) * 100)} of payment attempts succeed.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {revenueMetrics.paymentPlansOverdue > 0 && (
          <InsightCallout
            type="recommendation"
            title="Suggested Actions"
            description="Send payment reminders to overdue accounts and consider offering payment plan adjustments for struggling families."
          />
        )}
      </div>
    </>
  )

  // Tab 3: Revenue Breakdown
  const revenueBreakdownTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Revenue by Sport Leader', value: revenueMetrics.revenueByTeam?.[0]?.teamName || 'N/A', format: 'number' },
          { label: 'Revenue by Team Leader', value: revenueMetrics.revenueByTeam?.[0]?.teamName || 'N/A', format: 'number' },
          { label: 'Concentration Index', value: revenueMetrics.revenueByTeam && revenueMetrics.revenueByTeam.length > 0 ? formatPercentage((revenueMetrics.revenueByTeam[0].revenue / revenueMetrics.totalRevenue) * 100) : '0%', format: 'number' },
        ]}
        chart={
          revenueMetrics.revenueByTeam && revenueMetrics.revenueByTeam.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Revenue by Team
              </div>
              <BarChart
                data={{
                  data: revenueMetrics.revenueByTeam.slice(0, 15).map((item) => ({
                    category: item.teamName.length > 20 ? item.teamName.substring(0, 20) + '...' : item.teamName,
                    value: item.revenue,
                  })),
                }}
                height={400}
              />
            </div>
          ) : null
        }
        takeaway={
          revenueMetrics.revenueByTeam && revenueMetrics.revenueByTeam.length > 0
            ? `Top 3 teams account for ${formatPercentage(
                (revenueMetrics.revenueByTeam.slice(0, 3).reduce((sum, team) => sum + team.revenue, 0) / revenueMetrics.totalRevenue) * 100
              )} of total revenue.`
            : 'Revenue breakdown data will appear here once available.'
        }
      />

      {revenueMetrics.revenueBySeason && revenueMetrics.revenueBySeason.length > 0 && (
        <InsightSection
          title="Revenue by Season"
          chart={
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Seasonal Revenue Comparison
              </div>
              <BarChart
                data={{
                  data: revenueMetrics.revenueBySeason.map((item) => ({
                    category: item.seasonName,
                    value: item.revenue,
                  })),
                }}
                height={350}
              />
            </div>
          }
          takeaway={`${revenueMetrics.revenueBySeason.reduce((max, season) => (season.revenue > max.revenue ? season : max), revenueMetrics.revenueBySeason[0]).seasonName} generated the highest revenue at ${formatCurrency(revenueMetrics.revenueBySeason.reduce((max, season) => (season.revenue > max.revenue ? season : max), revenueMetrics.revenueBySeason[0]).revenue)}.`}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {revenueMetrics.revenueByTeam && revenueMetrics.revenueByTeam.length > 0 && revenueMetrics.revenueByTeam[0].revenue / revenueMetrics.totalRevenue > 0.4 && (
          <InsightCallout
            type="concentration"
            title="Over-Reliance Risk"
            description={`${revenueMetrics.revenueByTeam[0].teamName} accounts for over 40% of revenue. Consider diversifying revenue sources.`}
          />
        )}
      </div>
    </>
  )

  // Tab 4: Discounts, Refunds, Adjustments
  const discountsRefundsTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Discount $', value: 'Not enough data yet', format: 'number' },
          { label: 'Discount %', value: 'N/A', format: 'number' },
          { label: 'Refund $', value: revenueMetrics.refundsOverTime && revenueMetrics.refundsOverTime.length > 0 ? formatCurrency(revenueMetrics.refundsOverTime.reduce((sum, point) => sum + point.value, 0)) : formatCurrency(0), format: 'currency' },
          { label: 'Refund %', value: formatPercentage(refundRate), format: 'number' },
          { label: 'Adjustments Count', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          revenueMetrics.refundsOverTime && revenueMetrics.refundsOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Refunds Over Time
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
                height={400}
                type="line"
              />
            </div>
          ) : (
            <EmptyState
              title="No refund data available"
              description="Refund data will appear here once refunds are processed and recorded."
              icon="receipt_long"
            />
          )
        }
        takeaway={
          revenueMetrics.refundsOverTime && revenueMetrics.refundsOverTime.length > 0
            ? `Total refunds issued: ${formatCurrency(revenueMetrics.refundsOverTime.reduce((sum, point) => sum + point.value, 0))}. Refund rate is ${formatPercentage(refundRate)}.`
            : 'Refund tracking requires additional data collection. This metric will be available once refunds are processed through the system.'
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {refundRate > 5 && (
          <InsightCallout
            type="anomaly"
            title="Elevated Refund Rate"
            description={`Refund rate of ${formatPercentage(refundRate)} is above typical thresholds. Review refund reasons and policies.`}
          />
        )}
      </div>
    </>
  )

  // Tab 5: Forecast and Targets
  const forecastTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Projected Month Revenue', value: 'Not enough data yet', format: 'currency' },
          { label: 'At-Risk Amount', value: revenueMetrics.outstandingBalances, format: 'currency' },
          { label: 'Target Attainment %', value: 'Targets not configured', format: 'number' },
        ]}
        chart={
          revenueMetrics.revenueOverTime && revenueMetrics.revenueOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Revenue Trend (Simple Projection)
              </div>
              <TimeSeriesChart
                data={{
                  series: [
                    {
                      name: 'Actual Revenue',
                      data: revenueMetrics.revenueOverTime,
                    },
                  ],
                }}
                height={400}
                type="area"
              />
            </div>
          ) : null
        }
        takeaway="Revenue forecasting requires target configuration and historical trend analysis. Enable targets in settings to see projections."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="Enable Revenue Targets"
          description="Configure revenue targets in settings to enable forecasting and goal tracking features."
        />
        {revenueMetrics.outstandingBalances > 0 && (
          <InsightCallout
            type="recommendation"
            title="Top Levers for Growth"
            description={`Focus on collecting ${formatCurrency(revenueMetrics.outstandingBalances)} in outstanding balances and increasing registration volume to drive revenue growth.`}
          />
        )}
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title="Revenue & Payments"
      description="Comprehensive financial reporting with revenue trends, collections analysis, and payment insights."
    >
      <ReportTabs
        tabs={[
          { id: 'financial-story', label: 'Financial Story', content: financialStoryTab },
          { id: 'collections', label: 'Collections & Aging', content: collectionsTab },
          { id: 'breakdown', label: 'Revenue Breakdown', content: revenueBreakdownTab },
          { id: 'discounts-refunds', label: 'Discounts, Refunds & Adjustments', content: discountsRefundsTab },
          { id: 'forecast', label: 'Forecast & Targets', content: forecastTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function PaymentsReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <PaymentsReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
