/**
 * Operations Report View
 *
 * Reports on admin activity, permission blocks, and notification delivery.
 */

import { DomainReportView } from './DomainReportView'
import { KPICard } from '../../../../components/reporting/KPICard'
import { PieChart, SingleNumber } from '../../../../components/reporting/charts'
import { VirtualizedTable } from '../../../../components/reporting/VirtualizedTable'
import { ExportButton } from '../../../../components/reporting/ExportButton'
import { useOperationsMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

function OperationsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useOperationsMetrics(filters)

  const kpiData = useMemo(() => {
    if (!metrics) return []
    const totalActivity = metrics.adminActivity.creates + metrics.adminActivity.updates + metrics.adminActivity.deletes
    const deliveryRate = metrics.notificationDeliveryStats && metrics.notificationDeliveryStats.sent > 0
      ? (metrics.notificationDeliveryStats.delivered / metrics.notificationDeliveryStats.sent) * 100
      : 0
    
    return [
      {
        title: t('admin.reporting.operations.totalActivity'),
        value: {
          value: totalActivity,
          label: 'Actions',
        },
      },
      {
        title: t('admin.reporting.operations.permissionBlocks'),
        value: {
          value: metrics.permissionBlocks,
          label: 'Blocks',
        },
      },
      {
        title: t('admin.reporting.operations.notificationsSent'),
        value: {
          value: metrics.notificationDeliveryStats?.sent ?? 0,
          label: 'Sent',
        },
      },
      {
        title: t('admin.reporting.operations.deliveryRate'),
        value: {
          value: Math.round(deliveryRate),
          label: '%',
        },
      },
    ]
  }, [metrics, t])

  const chartData = useMemo(() => {
    if (!metrics) return null
    return {
      data: [
        { category: 'Creates', series: 'Activity', value: metrics.adminActivity.creates },
        { category: 'Updates', series: 'Activity', value: metrics.adminActivity.updates },
        { category: 'Deletes', series: 'Activity', value: metrics.adminActivity.deletes },
      ],
    }
  }, [metrics])

  const tableColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'metric',
        header: t('admin.reporting.operations.metric'),
      },
      {
        accessorKey: 'value',
        header: t('admin.reporting.operations.value'),
      },
    ],
    [t]
  )

  const tableData = useMemo(() => {
    if (!metrics) return []
    return [
      { metric: t('admin.reporting.operations.creates'), value: metrics.adminActivity.creates },
      { metric: t('admin.reporting.operations.updates'), value: metrics.adminActivity.updates },
      { metric: t('admin.reporting.operations.deletes'), value: metrics.adminActivity.deletes },
      { metric: t('admin.reporting.operations.notificationsDelivered'), value: metrics.notificationDeliveryStats?.delivered ?? 0 },
      { metric: t('admin.reporting.operations.notificationsFailed'), value: metrics.notificationDeliveryStats?.failed ?? 0 },
    ]
  }, [metrics, t])

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.error.loadFailed')}</p>
      </div>
    )
  }

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {kpiData.map((kpi, index) => (
          <KPICard key={index} title={kpi.title} value={kpi.value} />
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Admin Activity - Pie Chart */}
        {chartData && (
          <div style={{ background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <PieChart data={chartData} title={t('admin.reporting.operations.adminActivity')} height={300} />
          </div>
        )}
        
        {/* Delivery Rate - Single Number */}
        <div style={{ background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <SingleNumber
            value={metrics.notificationDeliveryStats && metrics.notificationDeliveryStats.sent > 0 ? Math.round((metrics.notificationDeliveryStats.delivered / metrics.notificationDeliveryStats.sent) * 100) : 0}
            label={t('admin.reporting.operations.deliveryRate')}
            format="percentage"
            size="large"
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ marginBottom: '24px', background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>{t('admin.reporting.operations.operationsMetrics')}</h3>
          <ExportButton data={tableData} filename="operations-report" />
        </div>
        <VirtualizedTable
          data={tableData}
          columns={tableColumns}
          height={400}
          enablePagination={false}
        />
      </div>
    </>
  )
}

export default function OperationsReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="operations"
      title={t('admin.reporting.operations.title')}
      description={t('admin.reporting.operations.description')}
    >
      <OperationsReportContent />
    </DomainReportView>
  )
}
