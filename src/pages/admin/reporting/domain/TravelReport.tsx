/**
 * Travel Report View
 *
 * Reports on travel plans, overlapping trips, and missing details.
 */

import { DomainReportView } from './DomainReportView'
import { KPICard } from '../../../../components/reporting/KPICard'
import { TimeSeriesChart, SingleNumber } from '../../../../components/reporting/charts'
import { VirtualizedTable } from '../../../../components/reporting/VirtualizedTable'
import { ExportButton } from '../../../../components/reporting/ExportButton'
import { useTravelMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

function TravelReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useTravelMetrics(filters)

  const kpiData = useMemo(() => {
    if (!metrics) return []
    const totalTrips = metrics.tripsPerMonth.reduce((sum, item) => sum + item.count, 0)
    const totalOverlaps = metrics.overlappingTravel.reduce((sum, item) => sum + item.overlapCount, 0)
    const missingDetailsCount = metrics.missingDetails.length
    
    return [
      {
        title: t('admin.reporting.travel.totalTrips'),
        value: {
          value: totalTrips,
          label: 'Trips',
        },
      },
      {
        title: t('admin.reporting.travel.overlappingTrips'),
        value: {
          value: totalOverlaps,
          label: 'Overlaps',
        },
      },
      {
        title: t('admin.reporting.travel.missingDetails'),
        value: {
          value: missingDetailsCount,
          label: 'Trips',
        },
      },
    ]
  }, [metrics, t])

  const _chartData = useMemo(() => {
    if (!metrics) return null
    return {
      data: metrics.tripsPerMonth.map((item) => ({
        category: item.month,
        series: 'Trips',
        value: item.count,
      })),
    }
  }, [metrics])

  const timeSeriesData = useMemo(() => {
    if (!metrics) return null
    return {
      series: [
        {
          name: 'Trips',
          data: metrics.tripsPerMonth.map((item) => ({
            date: item.month + '-01', // Convert to full date for time series
            value: item.count,
          })),
        },
      ],
    }
  }, [metrics])

  const tableColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'tripName',
        header: t('admin.reporting.travel.tripName'),
      },
      {
        accessorKey: 'missingFields',
        header: t('admin.reporting.travel.missingFields'),
        cell: ({ getValue }) => (getValue() as string[]).join(', '),
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

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Trips Over Time - Line Chart */}
        {timeSeriesData && (
          <div style={{ background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <TimeSeriesChart data={timeSeriesData} title={t('admin.reporting.travel.tripsPerMonth')} height={300} type="line" />
          </div>
        )}
        
        {/* Total Trips - Single Number */}
        <div style={{ background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <SingleNumber
            value={metrics.tripsPerMonth.reduce((sum, item) => sum + item.count, 0)}
            label={t('admin.reporting.travel.totalTrips')}
            format="number"
            size="large"
          />
        </div>
      </div>

      {/* Table */}
      {metrics.missingDetails.length > 0 && (
        <div style={{ marginBottom: '24px', background: 'var(--org-bg-primary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--org-border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>{t('admin.reporting.travel.missingDetails')}</h3>
            <ExportButton data={metrics.missingDetails} filename="travel-report" />
          </div>
          <VirtualizedTable
            data={metrics.missingDetails}
            columns={tableColumns}
            height={400}
            enablePagination={false}
          />
        </div>
      )}
    </>
  )
}

export default function TravelReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="travel"
      title={t('admin.reporting.travel.title')}
      description={t('admin.reporting.travel.description')}
    >
      <TravelReportContent />
    </DomainReportView>
  )
}
