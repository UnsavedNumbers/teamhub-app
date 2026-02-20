/**
 * Registration Report View
 *
 * Reports on registration completion, drop-offs, and waivers.
 */

import { DomainReportView } from './domain/DomainReportView'
import { useRegistrationMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { useT } from '../../../i18n/useI18n'
import { TimeSeriesChart, BarChart, PieChart, FunnelChart } from '../../../components/reporting/charts'
import { ExportButton } from '../../../components/reporting/ExportButton'

function RegistrationReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: registrationMetrics, isLoading, error } = useRegistrationMetrics(filters)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !registrationMetrics) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.error.loadFailed')}</p>
      </div>
    )
  }

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Registration Completion Rate</p>
          <p className="oa-kpi-value">{Math.round(registrationMetrics.registrationCompletionRate * 100)}%</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Incomplete Registrations</p>
          <p className="oa-kpi-value">{registrationMetrics.incompleteRegistrations}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Waivers Signed</p>
          <p className="oa-kpi-value">{registrationMetrics.waiversSigned}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Waivers Pending</p>
          <p className="oa-kpi-value">{registrationMetrics.waiversPending}</p>
        </div>
      </div>

      {/* Registrations Over Time */}
      {registrationMetrics.registrationsOverTime && registrationMetrics.registrationsOverTime.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Registrations Over Time</h3>
            <ExportButton data={registrationMetrics.registrationsOverTime} filename="registrations-over-time" />
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
            height={300}
            type="line"
          />
        </div>
      )}

      {/* Drop-off Points */}
      {registrationMetrics.dropOffPoints && registrationMetrics.dropOffPoints.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Drop-off Points in Registration Flow</h3>
            <ExportButton data={registrationMetrics.dropOffPoints} filename="drop-off-points" />
          </div>
          <FunnelChart
            data={registrationMetrics.dropOffPoints.map((item) => ({
              name: item.step,
              value: item.count,
            }))}
            height={300}
          />
        </div>
      )}

      {/* Registrations by Program */}
      {registrationMetrics.registrationsByProgram && registrationMetrics.registrationsByProgram.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Registrations by Program</h3>
            <ExportButton data={registrationMetrics.registrationsByProgram} filename="registrations-by-program" />
          </div>
          <BarChart
            data={{
              data: registrationMetrics.registrationsByProgram.map((item) => ({
                category: item.programName,
                value: item.count,
              })),
            }}
            height={300}
          />
        </div>
      )}

      {/* Waivers Status */}
      {registrationMetrics.waiversSigned !== undefined && registrationMetrics.waiversPending !== undefined && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Waivers Signed vs Pending</h3>
          <PieChart
            data={{
              data: [
                { category: 'Signed', value: registrationMetrics.waiversSigned },
                { category: 'Pending', value: registrationMetrics.waiversPending },
              ],
            }}
            height={250}
          />
        </div>
      )}
    </>
  )
}

export default function RegistrationReport() {
  return (
    <DomainReportView
      domain="registration"
      title="Registration"
      description="Analyze registration completion and drop-offs"
    >
      <RegistrationReportContent />
    </DomainReportView>
  )
}
