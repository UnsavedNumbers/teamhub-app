/**
 * Scheduling Report View
 *
 * Reports on events, RSVPs, attendance, and scheduling conflicts.
 */

import { DomainReportView } from './DomainReportView'
import { KPICard } from '../../../../components/reporting/KPICard'
import { PieChart } from '../../../../components/reporting/charts'
import { VirtualizedTable } from '../../../../components/reporting/VirtualizedTable'
import { ExportButton } from '../../../../components/reporting/ExportButton'
import { useSchedulingMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

function SchedulingReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useSchedulingMetrics(filters)

  const kpiData = useMemo(() => {
    if (!metrics) return []
    const totalEvents = metrics.eventsByType.reduce((sum, item) => sum + item.count, 0)
    const avgRsvpRate = metrics.rsvpRates.reduce((sum, item) => sum + item.rate, 0) / metrics.rsvpRates.length || 0
    const avgAttendanceRate = metrics.attendanceRates.reduce((sum, item) => sum + item.rate, 0) / metrics.attendanceRates.length || 0
    const totalConflicts = metrics.conflicts.reduce((sum, item) => sum + item.conflictCount, 0)
    
    return [
      {
        title: t('admin.reporting.scheduling.totalEvents'),
        value: {
          value: totalEvents,
          label: 'Events',
        },
      },
      {
        title: t('admin.reporting.scheduling.avgRsvpRate'),
        value: {
          value: Math.round(avgRsvpRate),
          label: '%',
        },
      },
      {
        title: t('admin.reporting.scheduling.avgAttendanceRate'),
        value: {
          value: Math.round(avgAttendanceRate),
          label: '%',
        },
      },
      {
        title: t('admin.reporting.scheduling.totalConflicts'),
        value: {
          value: totalConflicts,
          label: 'Conflicts',
        },
      },
    ]
  }, [metrics, t])

  const chartData = useMemo(() => {
    if (!metrics) return null
    return {
      data: metrics.eventsByType.map((item) => ({
        category: item.type,
        series: 'Events',
        value: item.count,
      })),
    }
  }, [metrics])

  const tableColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'teamName',
        header: t('admin.reporting.scheduling.team'),
      },
      {
        accessorKey: 'rsvpRate',
        header: t('admin.reporting.scheduling.rsvpRate'),
        cell: ({ getValue }) => `${Math.round(getValue() as number)}%`,
      },
      {
        accessorKey: 'attendanceRate',
        header: t('admin.reporting.scheduling.attendanceRate'),
        cell: ({ getValue }) => `${Math.round(getValue() as number)}%`,
      },
      {
        accessorKey: 'conflictCount',
        header: t('admin.reporting.scheduling.conflicts'),
      },
    ],
    [t]
  )

  const tableData = useMemo(() => {
    if (!metrics) return []
    return metrics.rsvpRates.map((rsvp) => {
      const attendance = metrics.attendanceRates.find((a) => a.teamId === rsvp.teamId)
      const conflict = metrics.conflicts.find((c) => c.teamId === rsvp.teamId)
      return {
        teamName: rsvp.teamName,
        rsvpRate: rsvp.rate,
        attendanceRate: attendance?.rate || 0,
        conflictCount: conflict?.conflictCount || 0,
      }
    })
  }, [metrics])

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
          <PieChart data={chartData} title={t('admin.reporting.scheduling.eventsByType')} height={300} />
        </div>
      )}

      {/* Table */}
      <div style={{ marginBottom: '24px', background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>{t('admin.reporting.scheduling.teamMetrics')}</h3>
          <ExportButton data={tableData} filename="scheduling-report" />
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

export default function SchedulingReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="scheduling"
      title={t('admin.reporting.scheduling.title')}
      description={t('admin.reporting.scheduling.description')}
    >
      <SchedulingReportContent />
    </DomainReportView>
  )
}
