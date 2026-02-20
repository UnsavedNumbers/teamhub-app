/**
 * Communications Report View
 *
 * Reports on announcements, huddles, engagement, and flagged messages.
 */

import { DomainReportView } from './DomainReportView'
import { KPICard } from '../../../../components/reporting/KPICard'
import { BarChart } from '../../../../components/reporting/charts'
import { VirtualizedTable } from '../../../../components/reporting/VirtualizedTable'
import { ExportButton } from '../../../../components/reporting/ExportButton'
import { useCommunicationMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

function CommunicationsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useCommunicationMetrics(filters)

  const kpiData = useMemo(() => {
    if (!metrics) return []
    
    return [
      {
        title: t('admin.reporting.communications.announcementsVolume'),
        value: {
          value: metrics.announcementsVolume ?? 0,
          label: 'Announcements',
        },
      },
      {
        title: t('admin.reporting.communications.huddlesVolume'),
        value: {
          value: metrics.huddlesVolume ?? 0,
          label: 'Messages',
        },
      },
      {
        title: t('admin.reporting.communications.engagementRate'),
        value: {
          value: Math.round(metrics.engagementRate ?? 0),
          label: '%',
        },
      },
      {
        title: t('admin.reporting.communications.flaggedMessages'),
        value: {
          value: metrics.flaggedMessages ?? 0,
          label: 'Flagged',
        },
      },
    ]
  }, [metrics, t])

  const chartData = useMemo(() => {
    if (!metrics) return null
    return {
      data: metrics.announcementsByTeam.map((item) => ({
        category: item.teamName,
        series: 'Announcements',
        value: item.count,
      })),
    }
  }, [metrics])

  const tableColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'teamName',
        header: t('admin.reporting.communications.team'),
      },
      {
        accessorKey: 'announcements',
        header: t('admin.reporting.communications.announcements'),
      },
      {
        accessorKey: 'huddles',
        header: t('admin.reporting.communications.huddles'),
      },
    ],
    [t]
  )

  const tableData = useMemo(() => {
    if (!metrics) return []
    return metrics.announcementsByTeam.map((announcement) => {
      const huddle = metrics.huddlesByTeam.find((h) => h.teamId === announcement.teamId)
      return {
        teamName: announcement.teamName,
        announcements: announcement.count,
        huddles: huddle?.count || 0,
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
          <BarChart data={chartData} title={t('admin.reporting.communications.announcementsByTeam')} height={300} />
        </div>
      )}

      {/* Table */}
      <div style={{ marginBottom: '24px', background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>{t('admin.reporting.communications.communicationByTeam')}</h3>
          <ExportButton data={tableData} filename="communications-report" />
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

export default function CommunicationsReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="communications"
      title={t('admin.reporting.communications.title')}
      description={t('admin.reporting.communications.description')}
    >
      <CommunicationsReportContent />
    </DomainReportView>
  )
}
