/**
 * Video Report View
 *
 * Reports on video views and engagement.
 */

import { DomainReportView } from './domain/DomainReportView'
import { useVideoMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { useT } from '../../../i18n/useI18n'
import { TimeSeriesChart, BarChart } from '../../../components/reporting/charts'
import { ExportButton } from '../../../components/reporting/ExportButton'

function VideoReportContent() {
  const t = useT()
  const { filters } = useReporting()
  const { data: videoMetrics, isLoading, error } = useVideoMetrics(filters)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !videoMetrics) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>{t('common.error.loadFailed')}</p>
      </div>
    )
  }

  const totalViews = videoMetrics.videoViewsOverTime.reduce((sum, d) => sum + d.value, 0)
  const zeroViewVideos = videoMetrics.videosWithZeroViews.length

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Total Video Views</p>
          <p className="oa-kpi-value">{totalViews}</p>
        </div>
        <div className="oa-kpi-card">
          <p className="oa-kpi-label">Videos with Zero Views</p>
          <p className="oa-kpi-value">{zeroViewVideos}</p>
        </div>
      </div>

      {/* Video Views Over Time */}
      {videoMetrics.videoViewsOverTime && videoMetrics.videoViewsOverTime.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Video Views Over Time</h3>
            <ExportButton data={videoMetrics.videoViewsOverTime} filename="video-views-over-time" />
          </div>
          <TimeSeriesChart
            data={{
              series: [
                {
                  name: 'Video Views',
                  data: videoMetrics.videoViewsOverTime,
                },
              ],
            }}
            height={300}
            type="line"
          />
        </div>
      )}

      {/* Views by Team */}
      {videoMetrics.viewsByTeam && videoMetrics.viewsByTeam.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--pa-surface)', border: '1px solid var(--pa-n100)', borderRadius: 'var(--pa-radius-m)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--pa-n900)' }}>Views by Team</h3>
            <ExportButton data={videoMetrics.viewsByTeam} filename="views-by-team" />
          </div>
          <BarChart
            data={{
              data: videoMetrics.viewsByTeam.map((item) => ({
                category: item.teamName,
                value: item.views,
              })),
            }}
            height={300}
          />
        </div>
      )}
    </>
  )
}

export default function VideoReport() {
  return (
    <DomainReportView
      domain="video"
      title="Video"
      description="Track video views and engagement"
    >
      <VideoReportContent />
    </DomainReportView>
  )
}
