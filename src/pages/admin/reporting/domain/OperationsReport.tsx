/**
 * Operations Report
 *
 * Premium reporting page for org health snapshot, data quality/compliance, and workload/bottlenecks.
 * Organized into 3 tabs with insights and visualizations.
 */

import { ReportingProvider } from '../../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../../components/reporting/EmptyState'
import { useOperationsMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { PieChart } from '../../../../components/reporting/charts'
import { BarChart } from '../../../../components/reporting/charts'

function OperationsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useOperationsMetrics(filters)

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
        title="Unable to load operations data"
        description="There was an error loading the operations metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalActivity = metrics.adminActivity.creates + metrics.adminActivity.updates + metrics.adminActivity.deletes
  const activeTeams = 0 // Placeholder - would need team tracking
  const activeUsers = 0 // Placeholder - would need user tracking
  const supportRequests = 0 // Placeholder - would need support tracking
  const adminWorkload = totalActivity

  // Tab 1: Org Health Snapshot
  const orgHealthTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Active Teams', value: activeTeams || 'Not enough data yet', format: 'number' },
          { label: 'Active Users', value: activeUsers || 'Not enough data yet', format: 'number' },
          { label: 'Support Requests', value: supportRequests || 'Not enough data yet', format: 'number' },
          { label: 'Admin Workload Proxy', value: adminWorkload, format: 'number' },
        ]}
        chart={
          <div>
            <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
              Org Activity Trend
            </div>
            <PieChart
              data={{
                data: [
                  { category: 'Creates', value: metrics.adminActivity.creates },
                  { category: 'Updates', value: metrics.adminActivity.updates },
                  { category: 'Deletes', value: metrics.adminActivity.deletes },
                ],
              }}
              height={350}
            />
          </div>
        }
        takeaway={`${totalActivity} total admin actions tracked. Monitor activity trends to assess organizational health and engagement.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {totalActivity > 0 && (
          <InsightCallout
            type="trend"
            title="Overall Health Rating"
            description={`Active admin engagement with ${totalActivity} actions indicates healthy organizational operations.`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Data Quality and Compliance
  const dataQualityTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Missing Fields %', value: 'Not enough data yet', format: 'number' },
          { label: 'Orphan Records', value: 'Not enough data yet', format: 'number' },
          { label: 'Duplicate Athletes', value: 'Not enough data yet', format: 'number' },
          { label: 'Incomplete Profiles', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          <EmptyState
            title="Data Quality Tracking"
            description="Data quality metrics require tracking of missing fields, orphaned records, duplicates, and incomplete profiles across modules."
            icon="verified"
          />
        }
        takeaway="Enable data quality tracking to identify and fix data issues that impact reporting accuracy and user experience."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="What to Fix First"
          description="Prioritize data quality issues that have the greatest impact on operations and reporting accuracy."
        />
      </div>
    </>
  )

  // Tab 3: Workload and Bottlenecks
  const workloadBottlenecksTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Pending Approvals', value: 'Not enough data yet', format: 'number' },
          { label: 'Pending Payments', value: 'Not enough data yet', format: 'number' },
          { label: 'Pending Invites', value: 'Not enough data yet', format: 'number' },
          { label: 'Aging Tasks', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          metrics.notificationDeliveryStats ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Notification Delivery Status
              </div>
              <BarChart
                data={{
                  data: [
                    { category: 'Delivered', value: metrics.notificationDeliveryStats.delivered || 0 },
                    { category: 'Failed', value: metrics.notificationDeliveryStats.failed || 0 },
                  ],
                }}
                height={300}
              />
            </div>
          ) : (
            <EmptyState
              title="Workload Tracking"
              description="Workload tracking requires monitoring of pending approvals, payments, invites, and aging tasks."
              icon="pending_actions"
            />
          )
        }
        takeaway="Monitor workload bottlenecks to identify where admin time is spent and optimize processes for efficiency."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.permissionBlocks > 0 && (
          <InsightCallout
            type="anomaly"
            title="Permission Blocks"
            description={`${metrics.permissionBlocks} permission blocks detected. Review access controls to ensure proper permissions.`}
          />
        )}
        <InsightCallout
          type="recommendation"
          title="Recommended Admin Actions"
          description="Review pending items and aging tasks to prioritize actions that will have the greatest impact on operations."
        />
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title={t('admin.reporting.operations.title')}
      description={t('admin.reporting.operations.description') || 'Comprehensive operations analytics with org health monitoring, data quality tracking, and workload insights.'}
    >
      <ReportTabs
        tabs={[
          { id: 'org-health', label: 'Org Health Snapshot', content: orgHealthTab },
          { id: 'data-quality', label: 'Data Quality & Compliance', content: dataQualityTab },
          { id: 'workload-bottlenecks', label: 'Workload & Bottlenecks', content: workloadBottlenecksTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function OperationsReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <OperationsReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
