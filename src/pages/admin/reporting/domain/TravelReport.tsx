/**
 * Travel Report
 *
 * Premium reporting page for travel summary, distance/time breakdown, and equity/load analysis.
 * Organized into 3 tabs with insights and visualizations.
 */

import { DomainReportView } from './DomainReportView'
import { ReportTabs } from '../../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../../components/reporting/EmptyState'
import { useTravelMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { useT } from '../../../../i18n/useI18n'
import { TimeSeriesChart, BarChart } from '../../../../components/reporting/charts'

function TravelReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useTravelMetrics(filters)

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
        title="Unable to load travel data"
        description="There was an error loading the travel metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalTrips = metrics.tripsPerMonth.reduce((sum, item) => sum + item.count, 0)
  const avgDistance = 0 // Placeholder - would need distance data
  const totalMiles = 0 // Placeholder - would need distance data
  const totalTime = 0 // Placeholder - would need time data
  const mostTraveledTeam = metrics.overlappingTravel.length > 0 ? metrics.overlappingTravel[0].teamName : 'N/A'

  // Tab 1: Travel Summary
  const travelSummaryTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Trips', value: totalTrips, format: 'number' },
          { label: 'Avg Distance', value: avgDistance || 'Not enough data yet', format: 'number' },
          { label: 'Total Miles', value: totalMiles || 'Not enough data yet', format: 'number' },
          { label: 'Total Time', value: totalTime || 'Not enough data yet', format: 'number' },
          { label: 'Most Traveled Team', value: mostTraveledTeam, format: 'number' },
        ]}
        chart={
          metrics.tripsPerMonth && metrics.tripsPerMonth.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Travel Over Time
              </div>
              <TimeSeriesChart
                data={{
                  series: [
                    {
                      name: 'Trips',
                      data: metrics.tripsPerMonth.map((item) => ({
                        date: item.month + '-01',
                        value: item.count,
                      })),
                    },
                  ],
                }}
                height={400}
                type="area"
              />
            </div>
          ) : (
            <EmptyState
              title="No travel data available"
              description="Travel data will appear here once trips are planned and tracked."
              icon="flight"
            />
          )
        }
        takeaway={`${totalTrips} trips scheduled. Monitor travel patterns to identify burden hotspots and optimize scheduling.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.overlappingTravel.length > 0 && (
          <InsightCallout
            type="anomaly"
            title="Travel Burden and Hotspots"
            description={`${metrics.overlappingTravel.reduce((sum, t) => sum + t.overlapCount, 0)} overlapping trips detected. Review scheduling to reduce travel conflicts.`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Distance and Time Breakdown
  const distanceTimeTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Median Distance', value: avgDistance || 'Not enough data yet', format: 'number' },
          { label: 'Long Trip Count', value: 'Not enough data yet', format: 'number' },
          { label: 'Peak Travel Weeks', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          <EmptyState
            title="Distance Distribution"
            description="Distance and time breakdown requires tracking of trip distances, durations, and travel patterns."
            icon="straighten"
          />
        }
        takeaway="Analyze distance and time patterns to identify opportunities for scheduling improvements and route optimization."
      />

      {metrics.missingDetails.length > 0 && (
        <InsightSection
          title="Trips Missing Details"
          chart={
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Trips Requiring Information
              </div>
              <BarChart
                data={{
                  data: metrics.missingDetails.slice(0, 10).map((item) => ({
                    category: item.tripName.length > 25 ? item.tripName.substring(0, 25) + '...' : item.tripName,
                    value: item.missingFields.length,
                  })),
                }}
                height={300}
              />
            </div>
          }
          takeaway={`${metrics.missingDetails.length} trips are missing critical details. Complete trip information for better planning.`}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="Scheduling Improvements"
          description="Use distance and time data to optimize travel schedules, reduce long trips, and balance travel burden across teams."
        />
      </div>
    </>
  )

  // Tab 3: Equity and Load
  const equityLoadTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Variance Across Teams', value: 'Not enough data yet', format: 'number' },
          { label: 'Worst-Case Travel', value: 'Not enough data yet', format: 'number' },
          { label: 'Balanced Schedule Score', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          metrics.overlappingTravel && metrics.overlappingTravel.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Team Travel Comparison
              </div>
              <BarChart
                data={{
                  data: metrics.overlappingTravel.map((item) => ({
                    category: item.teamName,
                    value: item.overlapCount,
                  })),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="Equity Analysis"
              description="Equity analysis requires tracking of travel distances and times across all teams to identify fairness risks."
              icon="balance"
            />
          )
        }
        takeaway="Monitor travel equity to ensure fair distribution of travel burden across teams and prevent scheduling imbalances."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.overlappingTravel.length > 0 && (
          <InsightCallout
            type="concentration"
            title="Fairness Risks"
            description="Review travel distribution to identify teams with disproportionate travel burden and adjust schedules for equity."
          />
        )}
      </div>
    </>
  )

  return (
    <ReportTabs
      tabs={[
        { id: 'travel-summary', label: 'Travel Summary', content: travelSummaryTab },
        { id: 'distance-time', label: 'Distance & Time Breakdown', content: distanceTimeTab },
        { id: 'equity-load', label: 'Equity & Load', content: equityLoadTab },
      ]}
    />
  )
}

export default function TravelReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="travel"
      title={t('admin.reporting.travel.title')}
      description={t('admin.reporting.travel.description') || 'Comprehensive travel analytics with summary metrics, distance/time breakdowns, and equity analysis.'}
    >
      <TravelReportContent />
    </DomainReportView>
  )
}
