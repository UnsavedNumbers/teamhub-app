/**
 * Ticketing Report View
 *
 * Reports on ticket sales, gate entry, and ticketing metrics.
 */

import { DomainReportView } from './domain/DomainReportView'
import { useTicketingMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { useT } from '../../../i18n/useI18n'
import { TimeSeriesChart, BarChart, PieChart } from '../../../components/reporting/charts'
import { ExportButton } from '../../../components/reporting/ExportButton'

function TicketingReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: ticketingMetrics, isLoading, error } = useTicketingMetrics(filters)

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

  if (error || !ticketingMetrics) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.error.loadFailed')}</p>
      </div>
    )
  }

  const totalTicketsSold = ticketingMetrics.ticketsSoldOverTime.reduce((sum, d) => sum + d.value, 0)
  const totalCheckIns = ticketingMetrics.checkInRateByEvent.reduce((sum, e) => sum + e.scanned, 0)
  const totalTickets = ticketingMetrics.checkInRateByEvent.reduce((sum, e) => sum + e.scanned + e.notScanned, 0)
  const checkInRate = totalTickets > 0 ? Math.round((totalCheckIns / totalTickets) * 100) : 0

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Total Ticket Revenue</p>
          <p className="oa-kpi-value">{formatCurrency(ticketingMetrics.totalTicketRevenue)}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Tickets Sold</p>
          <p className="oa-kpi-value">{totalTicketsSold}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Check-in Rate</p>
          <p className="oa-kpi-value">{checkInRate}%</p>
        </div>
      </div>

      {/* Tickets Sold Over Time */}
      {ticketingMetrics.ticketsSoldOverTime && ticketingMetrics.ticketsSoldOverTime.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Tickets Sold Over Time</h3>
            <ExportButton data={ticketingMetrics.ticketsSoldOverTime} filename="tickets-sold-over-time" />
          </div>
          <TimeSeriesChart
            data={{
              series: [
                {
                  name: 'Tickets Sold',
                  data: ticketingMetrics.ticketsSoldOverTime,
                },
              ],
            }}
            height={300}
            type="line"
          />
        </div>
      )}

      {/* Ticket Revenue by Event */}
      {ticketingMetrics.ticketRevenueByEvent && ticketingMetrics.ticketRevenueByEvent.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Ticket Revenue by Event</h3>
            <ExportButton data={ticketingMetrics.ticketRevenueByEvent} filename="ticket-revenue-by-event" />
          </div>
          <BarChart
            data={{
              data: ticketingMetrics.ticketRevenueByEvent.map((item) => ({
                category: item.eventName,
                value: item.revenue,
              })),
            }}
            height={300}
          />
        </div>
      )}

      {/* Check-in Rate by Event */}
      {ticketingMetrics.checkInRateByEvent && ticketingMetrics.checkInRateByEvent.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Check-in Rate per Event</h3>
            <ExportButton data={ticketingMetrics.checkInRateByEvent} filename="check-in-rate-by-event" />
          </div>
          <BarChart
            data={{
              data: ticketingMetrics.checkInRateByEvent.flatMap((item) => [
                { category: item.eventName, value: item.scanned, series: 'Scanned' },
                { category: item.eventName, value: item.notScanned, series: 'Not Scanned' },
              ]),
            }}
            height={300}
            stacked={true}
          />
        </div>
      )}

      {/* Walk-up vs Pre-sale */}
      {ticketingMetrics.walkUpVsPreSale && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Walk-up vs Pre-sale Breakdown</h3>
          <PieChart
            data={{
              data: [
                { category: 'Walk-up', value: ticketingMetrics.walkUpVsPreSale.walkUp },
                { category: 'Pre-sale', value: ticketingMetrics.walkUpVsPreSale.preSale },
              ],
            }}
            height={250}
          />
        </div>
      )}
    </>
  )
}

export default function TicketingReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="ticketing"
      title="Ticketing & Gate"
      description="Monitor ticket sales and gate entry"
    >
      <TicketingReportContent />
    </DomainReportView>
  )
}
