/**
 * Uniforms Report
 *
 * Premium reporting page for orders snapshot, fulfillment/issues, and inventory tracking.
 * Organized into 3 tabs with insights and visualizations.
 */

import { ReportingProvider } from '../../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../../components/reporting/EmptyState'
import { useUniformMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { BarChart } from '../../../../components/reporting/charts'
import { TimeSeriesChart } from '../../../../components/reporting/charts'

function UniformsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useUniformMetrics(filters)

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

  if (error || !metrics) {
    return (
      <EmptyState
        title="Unable to load uniforms data"
        description="There was an error loading the uniforms metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalOrders = metrics.ordersByItem.reduce((sum, item) => sum + item.count, 0)
  const totalItems = totalOrders // Simplified - would need item count tracking
  const revenue = 0 // Placeholder - would need revenue data
  const fulfillmentRate = 100 - (metrics.missingSizes.reduce((sum, item) => sum + item.missingCount, 0) / totalOrders * 100)
  const refundRate = 0 // Placeholder - would need refund data

  // Tab 1: Orders Snapshot
  const ordersSnapshotTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Orders', value: totalOrders, format: 'number' },
          { label: 'Items', value: totalItems, format: 'number' },
          { label: 'Revenue', value: revenue || 'Not enough data yet', format: 'currency' },
          { label: 'Fulfillment %', value: formatPercentage(fulfillmentRate), format: 'number' },
          { label: 'Refund %', value: formatPercentage(refundRate), format: 'number' },
        ]}
        chart={
          metrics.ordersByItem && metrics.ordersByItem.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Orders Over Time
              </div>
              <BarChart
                data={{
                  data: metrics.ordersByItem.map((item) => ({
                    category: item.item,
                    value: item.count,
                  })),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No order data available"
              description="Order data will appear here once uniform orders are placed."
              icon="shopping_bag"
            />
          )
        }
        takeaway={`${totalOrders} orders placed. Monitor ordering patterns to identify peak ordering windows and optimize inventory.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.ordersByItem.length > 0 && (
          <InsightCallout
            type="trend"
            title="Peak Ordering Windows"
            description="Identify peak ordering periods to ensure adequate inventory and staffing during high-demand times."
          />
        )}
      </div>
    </>
  )

  // Tab 2: Fulfillment and Issues
  const fulfillmentIssuesTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Late Orders', value: 'Not enough data yet', format: 'number' },
          { label: 'Size Exchange Rate', value: 'Not enough data yet', format: 'number' },
          { label: 'Backorder Rate', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          metrics.missingSizes && metrics.missingSizes.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Fulfillment Pipeline
              </div>
              <BarChart
                data={{
                  data: metrics.missingSizes.map((item) => ({
                    category: item.teamName,
                    value: item.missingCount,
                  })),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No fulfillment data"
              description="Fulfillment tracking requires monitoring of order status, exchanges, and backorders."
              icon="inventory"
            />
          )
        }
        takeaway={`${metrics.missingSizes.reduce((sum, item) => sum + item.missingCount, 0)} missing sizes across ${metrics.missingSizes.length} teams. Address size gaps to improve fulfillment rates.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.missingSizes.length > 0 && (
          <InsightCallout
            type="anomaly"
            title="Top Issue Reasons"
            description="Review common fulfillment issues to identify supplier or process improvements needed."
          />
        )}
        <InsightCallout
          type="recommendation"
          title="Supplier/Process Suggestions"
          description="Use fulfillment data to optimize supplier relationships and streamline ordering processes."
        />
      </div>
    </>
  )

  // Tab 3: Inventory
  const inventoryTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Stockouts', value: 'Not enough data yet', format: 'number' },
          { label: 'Popular Sizes', value: 'Not enough data yet', format: 'number' },
          { label: 'Waste Rate', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          <EmptyState
            title="Inventory Tracking"
            description="Inventory tracking requires monitoring of stock levels, size distribution, and waste metrics."
            icon="warehouse"
          />
        }
        takeaway="Enable inventory tracking to optimize ordering, reduce stockouts, and minimize waste."
      />

      {metrics.ordersByItem.length > 0 && (
        <InsightSection
          title="Size Distribution"
          chart={
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Orders by Item Type
              </div>
              <BarChart
                data={{
                  data: metrics.ordersByItem.map((item) => ({
                    category: item.item,
                    value: item.count,
                  })),
                }}
                height={350}
              />
            </div>
          }
          takeaway="Analyze size and item distribution to optimize inventory ordering and reduce stockouts."
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="Ordering Optimization"
          description="Use historical order patterns and size distribution to improve inventory planning and reduce waste."
        />
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title={t('admin.reporting.uniforms.title')}
      description={t('admin.reporting.uniforms.description') || 'Comprehensive uniforms analytics with order tracking, fulfillment monitoring, and inventory insights.'}
    >
      <ReportTabs
        tabs={[
          { id: 'orders-snapshot', label: 'Orders Snapshot', content: ordersSnapshotTab },
          { id: 'fulfillment-issues', label: 'Fulfillment & Issues', content: fulfillmentIssuesTab },
          { id: 'inventory', label: 'Inventory', content: inventoryTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function UniformsReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <UniformsReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
