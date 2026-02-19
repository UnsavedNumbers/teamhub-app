import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import {
  AdminPageHeader,
  Card,
  Button,
} from '../../components/admin'
import { showError } from '../../utils/toast'
import {
  getNotificationMetrics,
  getNotificationTrends,
  getNotificationDeliveryStats,
  type NotificationMetrics,
  type NotificationTrend,
  type NotificationDeliveryStats,
} from '../../data/services/notificationAnalytics'
import { getNotificationErrorStats } from '../../data/services/notificationErrorTracking'
import '../../styles/orgAdmin.css'

export default function AdminNotificationAnalytics() {
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null)
  const [trends, setTrends] = useState<NotificationTrend[]>([])
  const [deliveryStats, setDeliveryStats] = useState<NotificationDeliveryStats | null>(null)
  const [errorStats, setErrorStats] = useState<any>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (!isReady || !context?.orgId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [metricsResult, trendsResult, deliveryResult, errorResult] = await Promise.all([
          getNotificationMetrics(context.orgId!, days),
          getNotificationTrends(context.orgId!, days),
          getNotificationDeliveryStats(context.orgId!, days),
          getNotificationErrorStats(context.orgId!, days),
        ])

        if (metricsResult.error) {
          showError('Failed to load notification metrics')
          console.error(metricsResult.error)
        } else {
          setMetrics(metricsResult.data)
        }

        if (trendsResult.error) {
          console.error('Failed to load trends:', trendsResult.error)
        } else {
          setTrends(trendsResult.data || [])
        }

        if (deliveryResult.error) {
          console.error('Failed to load delivery stats:', deliveryResult.error)
        } else {
          setDeliveryStats(deliveryResult.data)
        }

        if (errorResult.error) {
          console.error('Failed to load error stats:', errorResult.error)
        } else {
          setErrorStats(errorResult.data)
        }
      } catch (err) {
        showError('Failed to load analytics data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isReady, context?.orgId, days])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  if (!isReady || !context?.orgId) {
    return <div className="oa-page-container">Loading...</div>
  }

  return (
    <div className="oa-page-container">
      <AdminPageHeader
        title="Notification Analytics"
        breadcrumbs={[
          { label: 'Home', path: '/admin' },
          { label: 'Notifications', path: '/admin/notifications' },
          { label: 'Analytics' },
        ]}
      />

      {/* Time Range Selector */}
      <div className="mt-6 mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Time Range:
        </label>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'primary' : 'secondary'}
              onClick={() => setDays(d)}
            >
              {d} days
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading analytics...</div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="p-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Total Notifications
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(metrics?.totalNotifications || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {metrics?.notificationsToday || 0} today
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Success Rate
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatPercentage(metrics?.successRate || 100)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {formatNumber(metrics?.totalSent || 0)} sent
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Failed
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatNumber(metrics?.totalFailed || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {formatNumber(metrics?.retryCount || 0)} retries
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Pending
                </div>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatNumber(metrics?.totalPending || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  In queue
                </div>
              </div>
            </Card>
          </div>

          {/* Channel Breakdown */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Channel Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">In-App</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(metrics?.inAppCount || 0)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(metrics?.emailCount || 0)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Digest</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(metrics?.digestCount || 0)}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Delivery Statistics */}
          {deliveryStats && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Delivery Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Email Success Rate</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPercentage(deliveryStats.emailSuccessRate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">In-App Success Rate</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPercentage(deliveryStats.inAppSuccessRate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Delivered</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(deliveryStats.totalDelivered)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Avg Delivery Time</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatTime(deliveryStats.averageDeliveryTime)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Error Statistics */}
          {errorStats && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Error Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total Failed</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatNumber(errorStats.totalFailed)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatNumber(errorStats.totalRetries)} total retries
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Failures by Type</div>
                    <div className="space-y-1">
                      {Object.entries(errorStats.failuresByType || {})
                        .slice(0, 5)
                        .map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{type}</span>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Notification Types */}
          {metrics && Object.keys(metrics.notificationsByType).length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Notifications by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(metrics.notificationsByType)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([type, count]) => (
                      <div key={type} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatNumber(count as number)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          )}

          {/* Trends Chart (Simple) */}
          {trends.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Notification Trends</h3>
                <div className="space-y-2">
                  {trends.slice(-14).map((trend) => {
                    const max = Math.max(trend.sent, trend.failed, trend.inApp, trend.email)
                    return (
                      <div key={trend.date} className="flex items-center gap-4">
                        <div className="w-24 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(trend.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="flex-1 flex gap-1">
                          {trend.sent > 0 && (
                            <div
                              className="bg-green-500 h-6 rounded"
                              style={{ width: `${(trend.sent / max) * 100}%` }}
                              title={`Sent: ${trend.sent}`}
                            />
                          )}
                          {trend.failed > 0 && (
                            <div
                              className="bg-red-500 h-6 rounded"
                              style={{ width: `${(trend.failed / max) * 100}%` }}
                              title={`Failed: ${trend.failed}`}
                            />
                          )}
                          {trend.inApp > 0 && (
                            <div
                              className="bg-blue-500 h-6 rounded"
                              style={{ width: `${(trend.inApp / max) * 100}%` }}
                              title={`In-App: ${trend.inApp}`}
                            />
                          )}
                          {trend.email > 0 && (
                            <div
                              className="bg-purple-500 h-6 rounded"
                              style={{ width: `${(trend.email / max) * 100}%` }}
                              title={`Email: ${trend.email}`}
                            />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                          {trend.sent + trend.inApp} total
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Sent</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span>Failed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span>In-App</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-500 rounded" />
                    <span>Email</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
