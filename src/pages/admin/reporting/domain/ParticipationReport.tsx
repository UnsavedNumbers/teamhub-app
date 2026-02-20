/**
 * Participation Report View
 *
 * Reports on rosters, participation, and athlete engagement.
 */

import { DomainReportView } from './DomainReportView'
import { KPICard } from '../../../../components/reporting/KPICard'
import { BarChart } from '../../../../components/reporting/charts'
import { VirtualizedTable } from '../../../../components/reporting/VirtualizedTable'
import { ExportButton } from '../../../../components/reporting/ExportButton'
import { useParticipationMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

function ParticipationReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useParticipationMetrics(filters)

  const kpiData = useMemo(() => {
    if (!metrics) return []
    return [
      {
        title: t('admin.reporting.participation.activeAthletes'),
        value: {
          value: metrics.activeAthletesByTeam.reduce((sum, item) => sum + item.count, 0),
          label: 'Total',
        },
        tooltip: t('admin.reporting.participation.activeAthletesTooltip'),
      },
      {
        title: t('admin.reporting.participation.rosterAdds'),
        value: {
          value: metrics.rosterChurn.adds,
          label: 'Added',
        },
      },
      {
        title: t('admin.reporting.participation.rosterRemoves'),
        value: {
          value: metrics.rosterChurn.removes,
          label: 'Removed',
        },
      },
      {
        title: t('admin.reporting.participation.multiTeamAthletes'),
        value: {
          value: metrics.multiTeamAthletes,
          label: 'Athletes',
        },
      },
    ]
  }, [metrics, t])

  const chartData = useMemo(() => {
    if (!metrics) return null
    return {
      data: metrics.activeAthletesByTeam.map((item) => ({
        category: item.teamName,
        series: 'Active Athletes',
        value: item.count,
      })),
    }
  }, [metrics])

  const tableColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'teamName',
        header: t('admin.reporting.participation.team'),
      },
      {
        accessorKey: 'count',
        header: t('admin.reporting.participation.activeAthletes'),
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {kpiData.map((kpi, index) => (
          <div key={index} className="oa-kpi-card" title={kpi.tooltip}>
            <p className="oa-kpi-label">{kpi.title}</p>
            <p className="oa-kpi-value">{kpi.value.value}</p>
            {kpi.value.label && <p className="oa-kpi-meta">{kpi.value.label}</p>}
          </div>
        ))}
      </div>

      {/* Charts */}
      {chartData && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>{t('admin.reporting.participation.activeAthletesByTeam')}</h3>
          <BarChart data={chartData} height={300} />
        </div>
      )}

      {/* Table */}
      <div style={{ marginBottom: '24px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>{t('admin.reporting.participation.activeAthletesByTeam')}</h3>
          <ExportButton data={metrics.activeAthletesByTeam} filename="participation-report" />
        </div>
        <VirtualizedTable
          data={metrics.activeAthletesByTeam}
          columns={tableColumns}
          height={400}
          enablePagination={false}
        />
      </div>
    </>
  )
}

export default function ParticipationReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="participation"
      title={t('admin.reporting.participation.title')}
      description={t('admin.reporting.participation.description')}
    >
      <ParticipationReportContent />
    </DomainReportView>
  )
}
