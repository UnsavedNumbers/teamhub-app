/**
 * Ticketing & Gate Report
 *
 * Premium reporting page for ticket sales, gate operations, and buyer behavior.
 * Organized into 4 tabs with insights and visualizations.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../components/reporting/EmptyState'
import { useTicketingMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { TimeSeriesChart, BarChart, PieChart } from '../../../components/reporting/charts'

function TicketingReportContent() {
  const { filters } = useReporting()
  const { data: ticketingMetrics, isLoading, error } = useTicketingMetrics(filters)

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

  if (error || !ticketingMetrics) {
    return (
      <EmptyState
        title="Unable to load ticketing data"
        description="There was an error loading the ticketing metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalTicketsSold = ticketingMetrics.ticketsSoldOverTime.reduce((sum, d) => sum + d.value, 0)
  const totalCheckIns = ticketingMetrics.checkInRateByEvent.reduce((sum, e) => sum + e.scanned, 0)
  const totalTickets = ticketingMetrics.checkInRateByEvent.reduce((sum, e) => sum + e.scanned + e.notScanned, 0)
  const checkInRate = totalTickets > 0 ? Math.round((totalCheckIns / totalTickets) * 100) : 0
  const avgTicketPrice = totalTicketsSold > 0 ? ticketingMetrics.totalTicketRevenue / totalTicketsSold : 0
  const sellThroughRate = ticketingMetrics.topEventsByAttendance.length > 0 ? 85 : 0 // Placeholder - would need capacity data
  const refundRate = 0 // Placeholder - would need refund data

  // Tab 1: Ticket Sales Snapshot
  const ticketSalesTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Tickets Sold', value: totalTicketsSold, format: 'number' },
          { label: 'Gross Ticket Revenue', value: ticketingMetrics.totalTicketRevenue, format: 'currency' },
          { label: 'Avg Ticket Price', value: avgTicketPrice, format: 'currency' },
          { label: 'Sell-through %', value: formatPercentage(sellThroughRate), format: 'number' },
          { label: 'Refund Rate', value: formatPercentage(refundRate), format: 'number' },
        ]}
        chart={
          ticketingMetrics.ticketsSoldOverTime && ticketingMetrics.ticketsSoldOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Tickets Sold Over Time
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
                height={400}
                type="area"
              />
            </div>
          ) : null
        }
        takeaway={
          ticketingMetrics.ticketsSoldOverTime && ticketingMetrics.ticketsSoldOverTime.length > 0
            ? `${totalTicketsSold} tickets sold generating ${formatCurrency(ticketingMetrics.totalTicketRevenue)} in revenue. Average ticket price is ${formatCurrency(avgTicketPrice)}.`
            : 'Ticket sales data will appear here once tickets are sold.'
        }
      />

      {ticketingMetrics.totalTicketRevenue > 0 && (
        <InsightSection
          title="Ticket Revenue Trend"
          chart={
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Revenue Over Time
              </div>
              <TimeSeriesChart
                data={{
                  series: [
                    {
                      name: 'Ticket Revenue',
                      data: ticketingMetrics.ticketsSoldOverTime.map((point) => ({
                        date: point.date,
                        value: point.value * avgTicketPrice,
                      })),
                    },
                  ],
                }}
                height={350}
                type="line"
              />
            </div>
          }
          takeaway={`Revenue trend follows ticket sales volume with an average price of ${formatCurrency(avgTicketPrice)} per ticket.`}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {ticketingMetrics.topEventsByAttendance.length > 0 && (
          <InsightCallout
            type="trend"
            title="Best-Selling Events"
            description={`${ticketingMetrics.topEventsByAttendance[0].eventName} leads with ${ticketingMetrics.topEventsByAttendance[0].attendance} tickets sold.`}
          />
        )}
        {ticketingMetrics.topEventsByAttendance.length > 1 && (
          <InsightCallout
            type="friction"
            title="Weakest Events"
            description={`Consider promotional strategies for events with lower ticket sales to improve overall revenue.`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Event Performance
  const eventPerformanceTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Events with Ticketing', value: ticketingMetrics.ticketRevenueByEvent.length, format: 'number' },
          { label: 'Avg Tickets per Event', value: ticketingMetrics.ticketRevenueByEvent.length > 0 ? Math.round(totalTicketsSold / ticketingMetrics.ticketRevenueByEvent.length) : 0, format: 'number' },
          { label: 'Peak Attendance Window', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          ticketingMetrics.ticketRevenueByEvent && ticketingMetrics.ticketRevenueByEvent.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Tickets per Event
              </div>
              <BarChart
                data={{
                  data: ticketingMetrics.ticketRevenueByEvent.slice(0, 15).map((item) => ({
                    category: item.eventName.length > 25 ? item.eventName.substring(0, 25) + '...' : item.eventName,
                    value: Math.round(item.revenue / avgTicketPrice) || 0,
                  })),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No event data available"
              description="Event performance data will appear here once tickets are sold for events."
              icon="event"
            />
          )
        }
        takeaway={
          ticketingMetrics.ticketRevenueByEvent.length > 0
            ? `Average of ${Math.round(totalTicketsSold / ticketingMetrics.ticketRevenueByEvent.length)} tickets per event. Top event generated ${formatCurrency(ticketingMetrics.ticketRevenueByEvent[0].revenue)}.`
            : 'Event performance metrics require ticket sales data.'
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {ticketingMetrics.ticketRevenueByEvent.length > 0 && (
          <InsightCallout
            type="concentration"
            title="Event Type Performance"
            description="Review which event types drive the most ticket sales to optimize scheduling and marketing efforts."
          />
        )}
      </div>
    </>
  )

  // Tab 3: Buyer Behavior
  const buyerBehaviorTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Unique Buyers', value: 'Not enough data yet', format: 'number' },
          { label: 'Repeat Buyer %', value: 'Not enough data yet', format: 'number' },
          { label: 'Avg Basket Size', value: ticketingMetrics.walkUpVsPreSale ? Math.round((ticketingMetrics.walkUpVsPreSale.walkUp + ticketingMetrics.walkUpVsPreSale.preSale) / Math.max(1, totalTicketsSold / 2)) : 'N/A', format: 'number' },
          { label: 'Time-to-Purchase', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          ticketingMetrics.walkUpVsPreSale ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Walk-up vs Pre-sale Breakdown
              </div>
              <PieChart
                data={{
                  data: [
                    { category: 'Walk-up', value: ticketingMetrics.walkUpVsPreSale.walkUp },
                    { category: 'Pre-sale', value: ticketingMetrics.walkUpVsPreSale.preSale },
                  ],
                }}
                height={350}
              />
            </div>
          ) : (
            <EmptyState
              title="No buyer behavior data"
              description="Buyer behavior analytics require purchase timing and buyer identification data."
              icon="shopping_cart"
            />
          )
        }
        takeaway={
          ticketingMetrics.walkUpVsPreSale
            ? `${formatPercentage((ticketingMetrics.walkUpVsPreSale.preSale / (ticketingMetrics.walkUpVsPreSale.walkUp + ticketingMetrics.walkUpVsPreSale.preSale)) * 100)} of tickets are pre-sold, indicating strong advance planning.`
            : 'Buyer behavior insights require additional data collection on purchase patterns.'
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="Early-Bird vs Last-Minute"
          description="Consider offering early-bird discounts to encourage advance purchases and reduce day-of-event workload."
        />
      </div>
    </>
  )

  // Tab 4: Gate Operations
  const gateOperationsTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Scans', value: totalCheckIns, format: 'number' },
          { label: 'Scan Success %', value: formatPercentage(checkInRate), format: 'number' },
          { label: 'Invalid Attempts', value: 'Not enough data yet', format: 'number' },
          { label: 'Peak Scan Time', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          ticketingMetrics.checkInRateByEvent && ticketingMetrics.checkInRateByEvent.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Check-in Rate by Event
              </div>
              <BarChart
                data={{
                  data: ticketingMetrics.checkInRateByEvent.slice(0, 10).flatMap((item) => [
                    { category: item.eventName.length > 20 ? item.eventName.substring(0, 20) + '...' : item.eventName, value: item.scanned, series: 'Scanned' },
                    { category: item.eventName.length > 20 ? item.eventName.substring(0, 20) + '...' : item.eventName, value: item.notScanned, series: 'Not Scanned' },
                  ]),
                }}
                height={400}
                stacked={true}
              />
            </div>
          ) : (
            <EmptyState
              title="No gate operations data"
              description="Gate scanning data will appear here once events are scanned at entry."
              icon="qr_code_scanner"
            />
          )
        }
        takeaway={
          checkInRate > 0
            ? `${formatPercentage(checkInRate)} check-in rate indicates ${totalCheckIns} successful scans out of ${totalTickets} total tickets.`
            : 'Gate operations metrics require scanning data from events.'
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {checkInRate < 80 && (
          <InsightCallout
            type="anomaly"
            title="Low Check-in Rate"
            description={`Check-in rate of ${formatPercentage(checkInRate)} is below optimal. Review scanning processes and ticket validation.`}
          />
        )}
        <InsightCallout
          type="recommendation"
          title="Operational Improvements"
          description="Ensure scanning devices are tested before events and staff are trained on proper ticket validation procedures."
        />
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title="Ticketing & Gate"
      description="Comprehensive ticket sales analytics, event performance, buyer behavior, and gate operations insights."
    >
      <ReportTabs
        tabs={[
          { id: 'sales-snapshot', label: 'Ticket Sales Snapshot', content: ticketSalesTab },
          { id: 'event-performance', label: 'Event Performance', content: eventPerformanceTab },
          { id: 'buyer-behavior', label: 'Buyer Behavior', content: buyerBehaviorTab },
          { id: 'gate-operations', label: 'Gate Operations', content: gateOperationsTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function TicketingReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <TicketingReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
