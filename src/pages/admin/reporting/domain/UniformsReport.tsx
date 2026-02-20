/**
 * Uniforms Report View
 *
 * Reports on uniform orders, size completion, and deadline compliance.
 */

import { DomainReportView } from './DomainReportView'
import { KPICard } from '../../../../components/reporting/KPICard'
import { BarChart } from '../../../../components/reporting/charts'
import { VirtualizedTable } from '../../../../components/reporting/VirtualizedTable'
import { ExportButton } from '../../../../components/reporting/ExportButton'
import { useUniformMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

function UniformsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useUniformMetrics(filters)

  const kpiData = useMemo(() => {
    if (!metrics) return []
    const totalOrders = metrics.ordersByItem.reduce((sum, item) => sum + item.count, 0)
    const totalMissing = metrics.missingSizes.reduce((sum, item) => sum + item.missingCount, 0)
    
    return [
      {
        title: t('admin.reporting.uniforms.sizeCompletionRate'),
        value: {
          value: Math.round(metrics.sizeCompletionRate),
          label: '%',
        },
      },
      {
        title: t('admin.reporting.uniforms.totalOrders'),
        value: {
          value: totalOrders,
          label: 'Orders',
        },
      },
      {
        title: t('admin.reporting.uniforms.missingSizes'),
        value: {
          value: totalMissing,
          label: 'Missing',
        },
      },
      {
        title: t('admin.reporting.uniforms.deadlineCompliance'),
        value: {
          value: Math.round(metrics.deadlineCompliance),
          label: '%',
        },
      },
    ]
  }, [metrics, t])

  const chartData = useMemo(() => {
    if (!metrics) return null
    return {
      data: metrics.ordersByItem.map((item) => ({
        category: item.item,
        series: 'Orders',
        value: item.count,
      })),
    }
  }, [metrics])

  const tableColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'teamName',
        header: t('admin.reporting.uniforms.team'),
      },
      {
        accessorKey: 'missingCount',
        header: t('admin.reporting.uniforms.missingSizes'),
      },
    ],
    [t]
  )

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

      {/* Charts */}
      {chartData && (
        <div style={{ marginBottom: '32px', background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <BarChart data={chartData} title={t('admin.reporting.uniforms.ordersByItem')} height={300} />
        </div>
      )}

      {/* Table */}
      <div style={{ marginBottom: '24px', background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>{t('admin.reporting.uniforms.missingSizesByTeam')}</h3>
          <ExportButton data={metrics.missingSizes} filename="uniforms-report" />
        </div>
        <VirtualizedTable
          data={metrics.missingSizes}
          columns={tableColumns}
          height={400}
          enablePagination={false}
        />
      </div>
    </>
  )
}

export default function UniformsReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="uniforms"
      title={t('admin.reporting.uniforms.title')}
      description={t('admin.reporting.uniforms.description')}
    >
      <UniformsReportContent />
    </DomainReportView>
  )
}
