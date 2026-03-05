/**
 * Events & Attendance Report
 *
 * Premium reporting page for events overview, attendance drivers, and engagement.
 * Organized into 3 tabs with insights and visualizations.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../components/reporting/EmptyState'
import { useEventsMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { TimeSeriesChart, BarChart } from '../../../components/reporting/charts'

function EventsReportContent() {
  const { filters } = useReporting()
  const { data: eventsMetrics, isLoading, error } = useEventsMetrics(filters)

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

  if (error || !eventsMetrics) {
    return (
      <EmptyState
        title="Unable to load events data"
        description="There was an error loading the events metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const avgRsvpRate = eventsMetrics.rsvpRateByEvent.length > 0
    ? Math.round(eventsMetrics.rsvpRateByEvent.reduce((sum, e) => sum + e.rsvpRate, 0) / eventsMetrics.rsvpRateByEvent.length)
    : 0
  const pastEvents = 0 // Placeholder - would need event status tracking
  const avgAttendance = 0 // Placeholder - would need attendance data

  // Tab 1: Events Overview
  const eventsOverviewTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Total Events', value: eventsMetrics.upcomingEventsCount + pastEvents, format: 'number' },
          { label: 'Upcoming', value: eventsMetrics.upcomingEventsCount, format: 'number' },
          { label: 'Past', value: pastEvents, format: 'number' },
          { label: 'Avg Attendance', value: avgAttendance || 'Not enough data yet', format: 'number' },
          { label: 'Attendance Trend', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          eventsMetrics.eventsCancelledOverTime && eventsMetrics.eventsCancelledOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Events Over Time
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
                height={400}
                type="line"
              />
            </div>
          ) : (
            <EmptyState
              title="No event timeline data"
              description="Event timeline data will appear here once events are created and tracked over time."
              icon="event"
            />
          )
        }
        takeaway={`${eventsMetrics.upcomingEventsCount} upcoming events scheduled. Monitor cancellation trends to identify scheduling issues.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {eventsMetrics.eventsCancelledOverTime.length > 0 && eventsMetrics.eventsCancelledOverTime.reduce((sum, e) => sum + e.value, 0) > 0 && (
          <InsightCallout
            type="anomaly"
            title="Peak Months and Event Density"
            description="Review cancellation patterns to identify peak months and optimize event scheduling."
          />
        )}
      </div>
    </>
  )

  // Tab 2: Attendance Drivers
  const attendanceDriversTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Attendance by Sport', value: 'Not enough data yet', format: 'number' },
          { label: 'Attendance by Venue', value: 'Not enough data yet', format: 'number' },
          { label: 'Weather Proxy', value: 'Not enough data yet', format: 'number' },
          { label: 'Day/Time Effect', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          eventsMetrics.rsvpRateByEvent && eventsMetrics.rsvpRateByEvent.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                RSVP Rate by Event
              </div>
              <BarChart
                data={{
                  data: eventsMetrics.rsvpRateByEvent.slice(0, 15).map((item) => ({
                    category: item.eventName.length > 25 ? item.eventName.substring(0, 25) + '...' : item.eventName,
                    value: item.rsvpRate,
                  })),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No attendance driver data"
              description="Attendance driver analysis requires tracking of venue, weather, day/time, and sport associations."
              icon="trending_up"
            />
          )
        }
        takeaway="Analyze attendance patterns by sport, venue, day of week, and time to optimize event scheduling."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {eventsMetrics.rsvpRateByEvent.length > 0 && (
          <InsightCallout
            type="recommendation"
            title="Scheduling Recommendations"
            description="Use attendance patterns to schedule high-priority events at optimal times and venues for maximum participation."
          />
        )}
      </div>
    </>
  )

  // Tab 3: Engagement
  const engagementTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'RSVPs', value: eventsMetrics.rsvpRateByEvent.length, format: 'number' },
          { label: 'Comments/Engagement', value: 'Not enough data yet', format: 'number' },
          { label: 'Shares', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          eventsMetrics.rsvpRateByEvent && eventsMetrics.rsvpRateByEvent.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                RSVP Conversion Timeline
              </div>
              <BarChart
                data={{
                  data: eventsMetrics.rsvpRateByEvent.map((item) => ({
                    category: item.eventName.length > 20 ? item.eventName.substring(0, 20) + '...' : item.eventName,
                    value: item.rsvpRate,
                  })),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No engagement data"
              description="Engagement metrics require tracking of comments, shares, and social interactions around events."
              icon="thumb_up"
            />
          )
        }
        takeaway={`Average RSVP rate of ${formatPercentage(avgRsvpRate)}. Track engagement metrics to understand what event types drive participation.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {avgRsvpRate > 80 && (
          <InsightCallout
            type="trend"
            title="High Engagement"
            description={`RSVP rate of ${formatPercentage(avgRsvpRate)} indicates strong event engagement and communication effectiveness.`}
          />
        )}
        {avgRsvpRate < 50 && (
          <InsightCallout
            type="friction"
            title="Low RSVP Engagement"
            description={`RSVP rate of ${formatPercentage(avgRsvpRate)} suggests room for improvement in event communication and promotion.`}
          />
        )}
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title="Events & Attendance"
      description="Comprehensive events analytics with overview metrics, attendance drivers, and engagement insights."
    >
      <ReportTabs
        tabs={[
          { id: 'events-overview', label: 'Events Overview', content: eventsOverviewTab },
          { id: 'attendance-drivers', label: 'Attendance Drivers', content: attendanceDriversTab },
          { id: 'engagement', label: 'Engagement', content: engagementTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function EventsReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <EventsReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
