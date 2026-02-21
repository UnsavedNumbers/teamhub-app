/**
 * Scheduling & Attendance Report
 *
 * Premium reporting page for attendance tracking, team comparisons, RSVP reliability, and schedule load.
 * Organized into 4 tabs with insights and visualizations.
 */

import { ReportingProvider } from '../../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../../components/reporting/EmptyState'
import { useSchedulingMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { BarChart, PieChart } from '../../../../components/reporting/charts'

function SchedulingReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useSchedulingMetrics(filters)

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

  if (error || !metrics) {
    return (
      <EmptyState
        title="Unable to load scheduling data"
        description="There was an error loading the scheduling metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalEvents = metrics.eventsByType.reduce((sum, item) => sum + item.count, 0)
  const avgRsvpRate = metrics.rsvpRates.length > 0 ? metrics.rsvpRates.reduce((sum, item) => sum + item.rate, 0) / metrics.rsvpRates.length : 0
  const avgAttendanceRate = metrics.attendanceRates.length > 0 ? metrics.attendanceRates.reduce((sum, item) => sum + item.rate, 0) / metrics.attendanceRates.length : 0
  const noShowRate = 100 - avgAttendanceRate
  const lateCancelRate = 0 // Placeholder - would need cancellation timing data
  const rsvpRate = metrics.rsvpRates.length > 0 ? metrics.rsvpRates.reduce((sum, item) => sum + item.rate, 0) / metrics.rsvpRates.length : 0

  // Tab 1: Attendance Overview
  const attendanceOverviewTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Sessions Held', value: totalEvents, format: 'number' },
          { label: 'Avg Attendance %', value: formatPercentage(avgAttendanceRate), format: 'number' },
          { label: 'No-Show %', value: formatPercentage(noShowRate), format: 'number' },
          { label: 'Late Cancel %', value: formatPercentage(lateCancelRate), format: 'number' },
          { label: 'RSVP Rate', value: formatPercentage(rsvpRate), format: 'number' },
        ]}
        chart={
          metrics.attendanceRates && metrics.attendanceRates.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Attendance Trend Over Time
              </div>
              <BarChart
                data={{
                  data: metrics.attendanceRates.slice(0, 15).map((item) => ({
                    category: item.teamName.length > 20 ? item.teamName.substring(0, 20) + '...' : item.teamName,
                    value: item.rate,
                  })),
                }}
                height={400}
              />
            </div>
          ) : null
        }
        takeaway={`Average attendance rate of ${formatPercentage(avgAttendanceRate)} across ${totalEvents} sessions. ${formatPercentage(noShowRate)} no-show rate indicates room for improvement.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {noShowRate > 20 && (
          <InsightCallout
            type="anomaly"
            title="High No-Show Rate"
            description={`No-show rate of ${formatPercentage(noShowRate)} is above optimal. Consider implementing reminder systems or attendance incentives.`}
          />
        )}
        {avgAttendanceRate > 85 && (
          <InsightCallout
            type="trend"
            title="Strong Attendance"
            description={`Attendance rate of ${formatPercentage(avgAttendanceRate)} indicates excellent engagement and commitment.`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Team Comparisons
  const teamComparisonsTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Best Team Attendance', value: metrics.attendanceRates.length > 0 ? formatPercentage(Math.max(...metrics.attendanceRates.map(a => a.rate))) : 'N/A', format: 'number' },
          { label: 'Worst Team Attendance', value: metrics.attendanceRates.length > 0 ? formatPercentage(Math.min(...metrics.attendanceRates.map(a => a.rate))) : 'N/A', format: 'number' },
          { label: 'Attendance Variance', value: metrics.attendanceRates.length > 1 ? formatPercentage(Math.max(...metrics.attendanceRates.map(a => a.rate)) - Math.min(...metrics.attendanceRates.map(a => a.rate))) : '0%', format: 'number' },
        ]}
        chart={
          metrics.attendanceRates && metrics.attendanceRates.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Attendance by Team
              </div>
              <BarChart
                data={{
                  data: metrics.attendanceRates.map((item) => ({
                    category: item.teamName.length > 25 ? item.teamName.substring(0, 25) + '...' : item.teamName,
                    value: item.rate,
                  })),
                }}
                height={400}
              />
            </div>
          ) : null
        }
        takeaway={
          metrics.attendanceRates.length > 0
            ? `Top performing team: ${metrics.attendanceRates.reduce((max, team) => (team.rate > max.rate ? team : max), metrics.attendanceRates[0]).teamName} with ${formatPercentage(metrics.attendanceRates.reduce((max, team) => (team.rate > max.rate ? team : max), metrics.attendanceRates[0]).rate)} attendance.`
            : 'Team comparison data will appear here once attendance is tracked.'
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.attendanceRates.length > 0 && (
          <InsightCallout
            type="recommendation"
            title="Teams with Chronic No-Shows"
            description="Review teams with consistently low attendance to identify coaching or scheduling patterns that may need adjustment."
          />
        )}
      </div>
    </>
  )

  // Tab 3: RSVP and Reliability
  const rsvpReliabilityTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'RSVP Completion %', value: formatPercentage(rsvpRate), format: 'number' },
          { label: 'RSVP Accuracy %', value: 'Not enough data yet', format: 'number' },
          { label: 'Last-Minute Changes', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          metrics.rsvpRates && metrics.rsvpRates.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                RSVP vs Actual Attendance
              </div>
              <BarChart
                data={{
                  data: metrics.rsvpRates.slice(0, 10).map((rsvp) => {
                    const attendance = metrics.attendanceRates.find((a) => a.teamId === rsvp.teamId)
                    return {
                      category: rsvp.teamName.length > 20 ? rsvp.teamName.substring(0, 20) + '...' : rsvp.teamName,
                      value: rsvp.rate,
                      series: 'RSVP Rate',
                    }
                  }),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No RSVP data available"
              description="RSVP reliability analysis requires tracking of RSVP responses and actual attendance."
              icon="event_available"
            />
          )
        }
        takeaway={
          metrics.rsvpRates.length > 0
            ? `Average RSVP rate of ${formatPercentage(rsvpRate)}. Compare RSVP rates to actual attendance to identify reliability patterns.`
            : 'RSVP tracking enables better event planning and resource allocation.'
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {rsvpRate < 70 && (
          <InsightCallout
            type="friction"
            title="Low RSVP Completion"
            description={`RSVP rate of ${formatPercentage(rsvpRate)} indicates many athletes aren't responding. Consider simplifying the RSVP process or sending reminders.`}
          />
        )}
        <InsightCallout
          type="recommendation"
          title="Where Communication Helps Attendance"
          description="Teams with high RSVP rates tend to have better attendance. Encourage RSVP completion to improve planning and engagement."
        />
      </div>
    </>
  )

  // Tab 4: Schedule Load and Conflicts
  const scheduleLoadTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Busy Weeks', value: 'Not enough data yet', format: 'number' },
          { label: 'Back-to-Back Rate', value: 'Not enough data yet', format: 'number' },
          { label: 'Travel Burden Indicator', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          metrics.eventsByType && metrics.eventsByType.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Events by Type
              </div>
              <PieChart
                data={{
                  data: metrics.eventsByType.map((item) => ({
                    category: item.type,
                    value: item.count,
                  })),
                }}
                height={350}
              />
            </div>
          ) : null
        }
        takeaway={`${totalEvents} total events scheduled. Monitor schedule density to prevent athlete fatigue and conflicts.`}
      />

      {metrics.conflicts.length > 0 && (
        <InsightSection
          title="Scheduling Conflicts"
          chart={
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Teams with Conflicts
              </div>
              <BarChart
                data={{
                  data: metrics.conflicts.map((item) => ({
                    category: item.teamName,
                    value: item.conflictCount,
                  })),
                }}
                height={300}
              />
            </div>
          }
          takeaway={`${metrics.conflicts.reduce((sum, c) => sum + c.conflictCount, 0)} total conflicts detected. Review overlapping schedules to reduce conflicts.`}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.conflicts.length > 0 && (
          <InsightCallout
            type="anomaly"
            title="Fatigue Risk Windows"
            description="Identify weeks with high event density or back-to-back sessions that may lead to athlete fatigue or burnout."
          />
        )}
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title={t('admin.reporting.scheduling.title')}
      description={t('admin.reporting.scheduling.description') || 'Comprehensive scheduling and attendance analytics with team comparisons, RSVP reliability, and conflict analysis.'}
    >
      <ReportTabs
        tabs={[
          { id: 'attendance-overview', label: 'Attendance Overview', content: attendanceOverviewTab },
          { id: 'team-comparisons', label: 'Team Comparisons', content: teamComparisonsTab },
          { id: 'rsvp-reliability', label: 'RSVP & Reliability', content: rsvpReliabilityTab },
          { id: 'schedule-load', label: 'Schedule Load & Conflicts', content: scheduleLoadTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function SchedulingReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <SchedulingReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
