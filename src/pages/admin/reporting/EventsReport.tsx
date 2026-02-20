/**
 * Events Report View
 *
 * Reports on events and attendance metrics.
 */

import { DomainReportView } from './domain/DomainReportView'
import { useEventsMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { useT } from '../../../i18n/useI18n'
import { TimeSeriesChart, BarChart } from '../../../components/reporting/charts'
import { ExportButton } from '../../../components/reporting/ExportButton'

function EventsReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: eventsMetrics, isLoading, error } = useEventsMetrics(filters)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !eventsMetrics) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.error.loadFailed')}</p>
      </div>
    )
  }

  const avgRsvpRate =
    eventsMetrics.rsvpRateByEvent.length > 0
      ? Math.round(eventsMetrics.rsvpRateByEvent.reduce((sum, e) => sum + e.rsvpRate, 0) / eventsMetrics.rsvpRateByEvent.length)
      : 0

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Upcoming Events</p>
          <p className="oa-kpi-value">{eventsMetrics.upcomingEventsCount}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Average RSVP Rate</p>
          <p className="oa-kpi-value">{avgRsvpRate}%</p>
        </div>
      </div>

      {/* Events Cancelled Over Time */}
      {eventsMetrics.eventsCancelledOverTime && eventsMetrics.eventsCancelledOverTime.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Events Cancelled Over Time</h3>
            <ExportButton data={eventsMetrics.eventsCancelledOverTime} filename="events-cancelled-over-time" />
          </div>
          <TimeSeriesChart
            data={{
              series: [
                {
                  name: 'Events Cancelled',
                  data: eventsMetrics.eventsCancelledOverTime,
                },
              ],
            }}
            height={300}
            type="line"
          />
        </div>
      )}

      {/* RSVP Rate by Event */}
      {eventsMetrics.rsvpRateByEvent && eventsMetrics.rsvpRateByEvent.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>RSVP Rate per Event</h3>
            <ExportButton data={eventsMetrics.rsvpRateByEvent} filename="rsvp-rate-by-event" />
          </div>
          <BarChart
            data={{
              data: eventsMetrics.rsvpRateByEvent.map((item) => ({
                category: item.eventName,
                value: item.rsvpRate,
              })),
            }}
            height={300}
          />
        </div>
      )}
    </>
  )
}

export default function EventsReport() {
  return (
    <DomainReportView
      domain="events"
      title="Events & Attendance"
      description="Monitor events and RSVP rates"
    >
      <EventsReportContent />
    </DomainReportView>
  )
}
