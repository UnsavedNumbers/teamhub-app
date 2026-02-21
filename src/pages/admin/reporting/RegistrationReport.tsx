/**
 * Registration Report
 *
 * Premium reporting page for registration funnel, volume, payments, and form health.
 * Organized into 4 tabs with insights and visualizations.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../components/reporting/EmptyState'
import { useRegistrationMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { TimeSeriesChart, BarChart, PieChart, FunnelChart } from '../../../components/reporting/charts'

function RegistrationReportContent() {
  const { filters } = useReporting()
  const { data: registrationMetrics, isLoading, error } = useRegistrationMetrics(filters)

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

  if (error || !registrationMetrics) {
    return (
      <EmptyState
        title="Unable to load registration data"
        description="There was an error loading the registration metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalRegistrations = registrationMetrics.registrationsOverTime.reduce((sum, d) => sum + d.value, 0)
  const completionRate = Math.round(registrationMetrics.registrationCompletionRate * 100)
  const dropOffRate = 100 - completionRate

  // Tab 1: Registration Funnel
  const funnelTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Started', value: totalRegistrations + registrationMetrics.incompleteRegistrations, format: 'number' },
          { label: 'Completed', value: totalRegistrations, format: 'number' },
          { label: 'Completion %', value: formatPercentage(completionRate), format: 'number' },
          { label: 'Drop-off Stage', value: registrationMetrics.dropOffPoints.length > 0 ? registrationMetrics.dropOffPoints[0].step : 'N/A', format: 'number' },
          { label: 'Avg Time to Complete', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          registrationMetrics.dropOffPoints && registrationMetrics.dropOffPoints.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Registration Funnel
              </div>
              <FunnelChart
                data={registrationMetrics.dropOffPoints.map((item) => ({
                  name: item.step,
                  value: item.count,
                }))}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No funnel data available"
              description="Registration funnel data will appear here once registrations are tracked through the process."
              icon="account_tree"
            />
          )
        }
        takeaway={
          registrationMetrics.dropOffPoints.length > 0
            ? `${registrationMetrics.dropOffPoints[0].step} is the primary drop-off point with ${registrationMetrics.dropOffPoints[0].count} registrations stopping there.`
            : 'Funnel analysis requires step-by-step registration tracking.'
        }
      />

      <InsightSection
        title="Starts vs Completions Over Time"
        chart={
          registrationMetrics.registrationsOverTime && registrationMetrics.registrationsOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Registration Trends
              </div>
              <TimeSeriesChart
                data={{
                  series: [
                    {
                      name: 'Registrations',
                      data: registrationMetrics.registrationsOverTime,
                    },
                  ],
                }}
                height={350}
                type="area"
              />
            </div>
          ) : null
        }
        takeaway={`${totalRegistrations} registrations completed with a ${formatPercentage(completionRate)} completion rate.`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {registrationMetrics.dropOffPoints.length > 0 && (
          <InsightCallout
            type="friction"
            title="Primary Friction Point"
            description={`${registrationMetrics.dropOffPoints[0].step} sees the highest drop-off. Consider simplifying this step or adding helpful guidance.`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Volume and Mix
  const volumeMixTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Total Registrants', value: totalRegistrations, format: 'number' },
          { label: 'New vs Returning', value: 'Not enough data yet', format: 'number' },
          { label: 'Registrants by Sport', value: registrationMetrics.registrationsByProgram.length, format: 'number' },
          { label: 'Registrants by Age Band', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          registrationMetrics.registrationsByProgram && registrationMetrics.registrationsByProgram.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Registrations by Program
              </div>
              <BarChart
                data={{
                  data: registrationMetrics.registrationsByProgram.map((item) => ({
                    category: item.programName,
                    value: item.count,
                  })),
                }}
                height={400}
              />
            </div>
          ) : (
            <EmptyState
              title="No program data available"
              description="Program registration breakdown will appear here once registrations are associated with programs."
              icon="groups"
            />
          )
        }
        takeaway={
          registrationMetrics.registrationsByProgram.length > 0
            ? `${registrationMetrics.registrationsByProgram[0].programName} leads with ${registrationMetrics.registrationsByProgram[0].count} registrations.`
            : 'Program breakdown requires registration-to-program associations.'
        }
      />

      <InsightSection
        title="New vs Returning Over Time"
        chart={
          <EmptyState
            title="New vs Returning Analysis"
            description="This metric requires tracking of returning registrants across seasons. Enable this feature to see growth vs churn insights."
            icon="trending_up"
          />
        }
        takeaway="Track returning registrants to understand retention and identify opportunities for re-engagement campaigns."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {registrationMetrics.registrationsByProgram.length > 1 && (
          <InsightCallout
            type="trend"
            title="Growth vs Churn"
            description="Monitor registration patterns across programs to identify growth opportunities and address declining interest."
          />
        )}
      </div>
    </>
  )

  // Tab 3: Payments and Exceptions
  const paymentsExceptionsTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Paid %', value: 'Not enough data yet', format: 'number' },
          { label: 'Pending %', value: 'Not enough data yet', format: 'number' },
          { label: 'Waivers', value: registrationMetrics.waiversSigned + registrationMetrics.waiversPending, format: 'number' },
          { label: 'Failed Payments', value: 'Not enough data yet', format: 'number' },
          { label: 'Manual Approvals', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          registrationMetrics.waiversSigned !== undefined && registrationMetrics.waiversPending !== undefined ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Waivers Status
              </div>
              <PieChart
                data={{
                  data: [
                    { category: 'Signed', value: registrationMetrics.waiversSigned },
                    { category: 'Pending', value: registrationMetrics.waiversPending },
                  ],
                }}
                height={350}
              />
            </div>
          ) : (
            <EmptyState
              title="No waiver data available"
              description="Waiver status will appear here once waivers are tracked during registration."
              icon="description"
            />
          )
        }
        takeaway={
          registrationMetrics.waiversPending > 0
            ? `${registrationMetrics.waiversPending} waivers are still pending. Consider sending reminders to complete registration.`
            : 'All waivers are signed. Great compliance!'
        }
      />

      <InsightSection
        title="Exceptions Trend Over Time"
        chart={
          <EmptyState
            title="Exception Tracking"
            description="Exception tracking requires monitoring of payment failures, manual approvals, and special cases during registration."
            icon="warning"
          />
        }
        takeaway="Track exceptions to identify where admin intervention is needed and optimize the registration process."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {registrationMetrics.waiversPending > registrationMetrics.waiversSigned && (
          <InsightCallout
            type="timeliness"
            title="Waiver Completion Needed"
            description={`${registrationMetrics.waiversPending} pending waivers require attention. Send reminders to complete registration.`}
          />
        )}
      </div>
    </>
  )

  // Tab 4: Form and Requirement Health
  const formHealthTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Missing Documents %', value: 'Not enough data yet', format: 'number' },
          { label: 'Medical Forms Completeness %', value: 'Not enough data yet', format: 'number' },
          { label: 'Average Missing Fields', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          <EmptyState
            title="Form Health Tracking"
            description="Form health metrics require tracking of document uploads, medical form completion, and field-level completion rates."
            icon="checklist"
          />
        }
        takeaway="Enable form health tracking to identify compliance gaps and improve registration completion rates."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="High-Risk Compliance Gaps"
          description="Monitor missing documents and incomplete medical forms to ensure regulatory compliance and athlete safety."
        />
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title="Registration"
      description="Comprehensive registration analytics with funnel analysis, volume tracking, payment exceptions, and form health insights."
    >
      <ReportTabs
        tabs={[
          { id: 'funnel', label: 'Registration Funnel', content: funnelTab },
          { id: 'volume-mix', label: 'Volume and Mix', content: volumeMixTab },
          { id: 'payments-exceptions', label: 'Payments & Exceptions', content: paymentsExceptionsTab },
          { id: 'form-health', label: 'Form & Requirement Health', content: formHealthTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function RegistrationReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <RegistrationReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
