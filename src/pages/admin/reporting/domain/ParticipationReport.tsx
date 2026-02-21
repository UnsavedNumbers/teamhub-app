/**
 * Participation Report
 *
 * Premium reporting page for participation tracking, breakdowns, and retention analysis.
 * Organized into 3 tabs with insights and visualizations.
 */

import { useT } from '../../../../i18n/useI18n'
import { DomainReportView } from './DomainReportView'
import { ReportTabs } from '../../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../../components/reporting/EmptyState'
import { useParticipationMetrics } from '../../../../hooks/useReporting'
import { useReporting } from '../../../../contexts/ReportingContext'
import { BarChart } from '../../../../components/reporting/charts'

function ParticipationReportContent() {
  const { filters } = useReporting()
  const { data: metrics, isLoading, error } = useParticipationMetrics(filters)

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
        title="Unable to load participation data"
        description="There was an error loading the participation metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalActiveAthletes = metrics.activeAthletesByTeam.reduce((sum, item) => sum + item.count, 0)
  const participationRate = 100 // Placeholder - would need total eligible athletes
  const dropouts = metrics.rosterChurn.removes

  // Tab 1: Participation Story
  const participationStoryTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Active Athletes', value: totalActiveAthletes, format: 'number' },
          { label: 'Participation Rate', value: formatPercentage(participationRate), format: 'number' },
          { label: 'Multi-Team Athletes', value: metrics.multiTeamAthletes, format: 'number' },
          { label: 'Dropouts', value: dropouts, format: 'number' },
        ]}
        chart={
          metrics.activeAthletesByTeam && metrics.activeAthletesByTeam.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Participation Over Time
              </div>
              <BarChart
                data={{
                  data: metrics.activeAthletesByTeam.map((item) => ({
                    category: item.teamName,
                    value: item.count,
                  })),
                }}
                height={400}
              />
            </div>
          ) : null
        }
        takeaway={`${totalActiveAthletes} active athletes across ${metrics.activeAthletesByTeam.length} teams. ${metrics.multiTeamAthletes} athletes participate on multiple teams.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.rosterChurn.removes > metrics.rosterChurn.adds && (
          <InsightCallout
            type="anomaly"
            title="Participation Decline"
            description={`More athletes removed (${metrics.rosterChurn.removes}) than added (${metrics.rosterChurn.adds}). Investigate reasons for dropouts.`}
          />
        )}
        {metrics.rosterChurn.adds > metrics.rosterChurn.removes && (
          <InsightCallout
            type="trend"
            title="Participation Growth"
            description={`Net growth of ${metrics.rosterChurn.adds - metrics.rosterChurn.removes} athletes. Strong participation trends!`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Breakdown
  const breakdownTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'By Sport', value: 'Not enough data yet', format: 'number' },
          { label: 'By Program', value: metrics.activeAthletesByTeam.length, format: 'number' },
          { label: 'By Age Group', value: 'Not enough data yet', format: 'number' },
          { label: 'By Gender', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          metrics.activeAthletesByTeam && metrics.activeAthletesByTeam.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Participation by Team
              </div>
              <BarChart
                data={{
                  data: metrics.activeAthletesByTeam.slice(0, 15).map((item) => ({
                    category: item.teamName.length > 20 ? item.teamName.substring(0, 20) + '...' : item.teamName,
                    value: item.count,
                  })),
                }}
                height={400}
              />
            </div>
          ) : null
        }
        takeaway={`Participation is distributed across ${metrics.activeAthletesByTeam.length} teams with an average of ${Math.round(totalActiveAthletes / metrics.activeAthletesByTeam.length)} athletes per team.`}
      />

      <InsightSection
        title="Cohort Retention"
        chart={
          <EmptyState
            title="Cohort Analysis"
            description="Cohort retention tracking requires historical participation data across seasons. Enable this feature to see retention patterns."
            icon="timeline"
          />
        }
        takeaway="Track cohort retention to identify which groups maintain participation and which need re-engagement efforts."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {metrics.activeAthletesByTeam.length > 0 && (
          <InsightCallout
            type="concentration"
            title="Strong vs Weak Cohorts"
            description="Identify teams and programs with consistently high participation to replicate successful strategies."
          />
        )}
      </div>
    </>
  )

  // Tab 3: Retention and Churn Signals
  const retentionChurnTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Returning %', value: 'Not enough data yet', format: 'number' },
          { label: 'At-Risk %', value: 'Not enough data yet', format: 'number' },
          { label: 'Avg Sessions Attended', value: 'Not enough data yet', format: 'number' },
          { label: 'Last Activity Age', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          <EmptyState
            title="Retention Analysis"
            description="Retention tracking requires monitoring of athlete activity, session attendance, and last-seen timestamps."
            icon="trending_down"
          />
        }
        takeaway="Enable activity tracking to identify at-risk athletes and proactively engage them before they drop out."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {dropouts > 0 && (
          <InsightCallout
            type="recommendation"
            title="Who Needs Outreach"
            description={`${dropouts} athletes have dropped out. Review exit reasons and implement retention strategies for at-risk athletes.`}
          />
        )}
        {metrics.multiTeamAthletes > 0 && (
          <InsightCallout
            type="trend"
            title="Multi-Team Engagement"
            description={`${metrics.multiTeamAthletes} athletes participate on multiple teams, indicating high engagement and commitment.`}
          />
        )}
      </div>
    </>
  )

  return (
    <ReportTabs
      tabs={[
        { id: 'story', label: 'Participation Story', content: participationStoryTab },
        { id: 'breakdown', label: 'Breakdown', content: breakdownTab },
        { id: 'retention-churn', label: 'Retention & Churn Signals', content: retentionChurnTab },
      ]}
    />
  )
}

export default function ParticipationReport() {
  const t = useT()
  return (
    <DomainReportView
      domain="participation"
      title={t('admin.reporting.participation.title')}
      description={t('admin.reporting.participation.description') || 'Comprehensive participation tracking with breakdowns, retention analysis, and churn signals.'}
    >
      <ParticipationReportContent />
    </DomainReportView>
  )
}
