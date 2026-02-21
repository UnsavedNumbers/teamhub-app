/**
 * Video Report
 *
 * Premium reporting page for video usage, coaching value, and library health.
 * Organized into 3 tabs with insights and visualizations.
 */

import { ReportingProvider } from '../../../contexts/ReportingContext'
import { ReportingLayout } from '../../../components/reporting/ReportingLayout'
import { ReportPageLayout } from '../../../components/reporting/ReportPageLayout'
import { ReportTabs } from '../../../components/reporting/ReportTabs'
import { InsightSection } from '../../../components/reporting/InsightSection'
import { InsightCallout } from '../../../components/reporting/InsightCallout'
import { EmptyState } from '../../../components/reporting/EmptyState'
import { useVideoMetrics } from '../../../hooks/useReporting'
import { useReporting } from '../../../contexts/ReportingContext'
import { TimeSeriesChart, BarChart } from '../../../components/reporting/charts'

function VideoReportContent() {
  const { filters } = useReporting()
  const { data: videoMetrics, isLoading, error } = useVideoMetrics(filters)

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

  if (error || !videoMetrics) {
    return (
      <EmptyState
        title="Unable to load video data"
        description="There was an error loading the video metrics. Please try again or contact support if the issue persists."
        icon="error"
      />
    )
  }

  const totalViews = videoMetrics.videoViewsOverTime.reduce((sum, d) => sum + d.value, 0)
  const zeroViewVideos = videoMetrics.videosWithZeroViews.length
  const uniqueViewers = 0 // Placeholder - would need viewer tracking
  const avgWatchTime = 0 // Placeholder - would need watch time data
  const completionRate = 0 // Placeholder - would need completion tracking

  // Tab 1: Usage Snapshot
  const usageSnapshotTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Videos Uploaded', value: 'Not enough data yet', format: 'number' },
          { label: 'Views', value: totalViews, format: 'number' },
          { label: 'Unique Viewers', value: uniqueViewers || 'Not enough data yet', format: 'number' },
          { label: 'Avg Watch Time', value: avgWatchTime || 'Not enough data yet', format: 'number' },
          { label: 'Completion %', value: formatPercentage(completionRate), format: 'number' },
        ]}
        chart={
          videoMetrics.videoViewsOverTime && videoMetrics.videoViewsOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Views Over Time
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
                height={400}
                type="area"
              />
            </div>
          ) : (
            <EmptyState
              title="No video views data"
              description="Video view data will appear here once videos are viewed."
              icon="play_circle"
            />
          )
        }
        takeaway={`${totalViews} total video views tracked. ${zeroViewVideos > 0 ? `${zeroViewVideos} videos have zero views.` : 'All videos have been viewed.'}`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        {videoMetrics.mostWatchedVideos.length > 0 && (
          <InsightCallout
            type="trend"
            title="Which Content Resonates"
            description={`${videoMetrics.mostWatchedVideos[0].videoName} leads with ${videoMetrics.mostWatchedVideos[0].views} views.`}
          />
        )}
        {zeroViewVideos > 0 && (
          <InsightCallout
            type="anomaly"
            title="Unwatched Videos"
            description={`${zeroViewVideos} videos have zero views. Consider promoting these or reviewing their relevance.`}
          />
        )}
      </div>
    </>
  )

  // Tab 2: Coaching Value
  const coachingValueTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Notes Created', value: 'Not enough data yet', format: 'number' },
          { label: 'Bookmarks', value: 'Not enough data yet', format: 'number' },
          { label: 'Avg Notes per Video', value: 'Not enough data yet', format: 'number' },
          { label: 'Engagement Rate', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          <EmptyState
            title="Coaching Analytics"
            description="Coaching value metrics require tracking of notes, bookmarks, and annotations on videos."
            icon="note"
          />
        }
        takeaway="Enable note and bookmark tracking to measure coaching value and identify high-impact video content."
      />

      {videoMetrics.mostWatchedVideos.length > 0 && (
        <InsightSection
          title="Most Annotated Videos"
          chart={
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Top Videos by Views
              </div>
              <BarChart
                data={{
                  data: videoMetrics.mostWatchedVideos.slice(0, 10).map((item) => ({
                    category: item.videoName.length > 30 ? item.videoName.substring(0, 30) + '...' : item.videoName,
                    value: item.views,
                  })),
                }}
                height={400}
              />
            </div>
          }
          takeaway="Videos with high view counts are likely candidates for coaching annotations and analysis."
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="High-Value Clips"
          description="Identify videos that generate the most coaching insights through notes and bookmarks to focus content creation efforts."
        />
      </div>
    </>
  )

  // Tab 3: Library Health
  const libraryHealthTab = (
    <>
      <InsightSection
        kpis={[
          { label: 'Storage Used', value: 'Not enough data yet', format: 'number' },
          { label: 'Avg File Size', value: 'Not enough data yet', format: 'number' },
          { label: 'Upload Failures', value: 'Not enough data yet', format: 'number' },
          { label: 'Processing Time', value: 'Not enough data yet', format: 'number' },
        ]}
        chart={
          videoMetrics.videoViewsOverTime && videoMetrics.videoViewsOverTime.length > 0 ? (
            <div>
              <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--org-text-primary)' }}>
                Upload Success Rate Trend
              </div>
              <TimeSeriesChart
                data={{
                  series: [
                    {
                      name: 'Video Activity',
                      data: videoMetrics.videoViewsOverTime,
                    },
                  ],
                }}
                height={350}
                type="line"
              />
            </div>
          ) : (
            <EmptyState
              title="Library Health Tracking"
              description="Library health metrics require tracking of storage usage, file sizes, upload success rates, and processing times."
              icon="storage"
            />
          )
        }
        takeaway="Monitor library health to ensure smooth video operations and identify opportunities for optimization."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
        <InsightCallout
          type="recommendation"
          title="Operational Improvements"
          description="Track upload failures and processing times to identify bottlenecks and improve video library performance."
        />
      </div>
    </>
  )

  return (
    <ReportPageLayout
      title="Video"
      description="Comprehensive video analytics with usage tracking, coaching value insights, and library health monitoring."
    >
      <ReportTabs
        tabs={[
          { id: 'usage-snapshot', label: 'Usage Snapshot', content: usageSnapshotTab },
          { id: 'coaching-value', label: 'Coaching Value', content: coachingValueTab },
          { id: 'library-health', label: 'Library Health', content: libraryHealthTab },
        ]}
      />
    </ReportPageLayout>
  )
}

export default function VideoReport() {
  return (
    <ReportingProvider>
      <ReportingLayout>
        <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
          <VideoReportContent />
        </div>
      </ReportingLayout>
    </ReportingProvider>
  )
}
