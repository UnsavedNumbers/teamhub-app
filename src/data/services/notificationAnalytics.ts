/**
 * Notification Analytics Service
 * 
 * Provides comprehensive analytics and metrics for notification delivery,
 * success rates, channel breakdowns, and trends.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'

export interface NotificationMetrics {
  // Overall stats
  totalNotifications: number
  totalSent: number
  totalFailed: number
  totalPending: number
  successRate: number
  
  // Channel breakdown
  inAppCount: number
  emailCount: number
  digestCount: number
  
  // Status breakdown
  queuedCount: number
  sentCount: number
  failedCount: number
  
  // Type breakdown
  notificationsByType: Record<string, number>
  
  // Time-based stats
  notificationsToday: number
  notificationsThisWeek: number
  notificationsThisMonth: number
  
  // Error stats
  retryCount: number
  averageRetries: number
  maxRetries: number
}

export interface NotificationTrend {
  date: string
  sent: number
  failed: number
  inApp: number
  email: number
}

export interface NotificationDeliveryStats {
  totalDelivered: number
  inAppDelivered: number
  emailDelivered: number
  emailSuccessRate: number
  inAppSuccessRate: number
  averageDeliveryTime: number // milliseconds
}

/**
 * Get comprehensive notification metrics for an organization
 */
export async function getNotificationMetrics(
  orgId: string,
  days: number = 30
): Promise<{ data: NotificationMetrics | null; error: Error | null }> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get notification jobs stats
    const { data: jobs, error: jobsError } = await supabase
      .from('notification_jobs')
      .select('id, type, status, created_at, sent_at, retry_count')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())

    if (jobsError) {
      debug.error('NotificationAnalytics.getNotificationMetrics', 'Failed to fetch jobs', { error: jobsError })
      return { data: null, error: jobsError }
    }

    // Get in-app notifications stats
    const { data: inAppNotifs, error: inAppError } = await supabase
      .from('user_notifications')
      .select('id, action, created_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())

    if (inAppError) {
      debug.error('NotificationAnalytics.getNotificationMetrics', 'Failed to fetch in-app notifications', { error: inAppError })
      return { data: null, error: inAppError }
    }

    // Get digest buffer stats (if table exists in types)
    let digestList: Array<{ id: string; created_at: string; processed_at: string | null }> = []
    try {
      const { data: digests } = await (supabase as any)
        .from('notification_digest_buffer')
        .select('id, created_at, processed_at')
        .eq('org_id', orgId)
        .gte('created_at', startDate.toISOString())
      digestList = digests || []
    } catch {
      // Table might not be in types yet, ignore
    }

    const jobsList = (jobs as unknown) as Array<{
      id: string
      type: string
      status: string
      created_at: string
      sent_at: string | null
      retry_count: number | null
    }>

    const inAppList = inAppNotifs || []

    // Calculate metrics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const metrics: NotificationMetrics = {
      totalNotifications: inAppList.length,
      totalSent: jobsList.filter(j => j.status === 'sent').length,
      totalFailed: jobsList.filter(j => j.status === 'failed').length,
      totalPending: jobsList.filter(j => j.status === 'queued').length,
      successRate: jobsList.length > 0 
        ? (jobsList.filter(j => j.status === 'sent').length / jobsList.length) * 100 
        : 100,
      
      inAppCount: inAppList.length,
      emailCount: jobsList.length,
      digestCount: digestList.filter(d => d.processed_at).length,
      
      queuedCount: jobsList.filter(j => j.status === 'queued').length,
      sentCount: jobsList.filter(j => j.status === 'sent').length,
      failedCount: jobsList.filter(j => j.status === 'failed').length,
      
      notificationsByType: {},
      
      notificationsToday: inAppList.filter(n => new Date(n.created_at) >= today).length,
      notificationsThisWeek: inAppList.filter(n => new Date(n.created_at) >= weekAgo).length,
      notificationsThisMonth: inAppList.filter(n => new Date(n.created_at) >= monthAgo).length,
      
      retryCount: jobsList.reduce((sum, j) => sum + (j.retry_count || 0), 0),
      averageRetries: jobsList.length > 0
        ? jobsList.reduce((sum, j) => sum + (j.retry_count || 0), 0) / jobsList.length
        : 0,
      maxRetries: Math.max(...jobsList.map(j => j.retry_count || 0), 0),
    }

    // Aggregate by type
    for (const job of jobsList) {
      const type = job.type || 'unknown'
      metrics.notificationsByType[type] = (metrics.notificationsByType[type] || 0) + 1
    }

    for (const notif of inAppList) {
      const action = (notif as any).action || 'unknown'
      const actionType = action.split('_')[0] || 'general'
      metrics.notificationsByType[actionType] = (metrics.notificationsByType[actionType] || 0) + 1
    }

    return { data: metrics, error: null }
  } catch (err) {
    debug.error('NotificationAnalytics.getNotificationMetrics', 'Exception getting metrics', { error: err })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get notification trends over time
 */
export async function getNotificationTrends(
  orgId: string,
  days: number = 30
): Promise<{ data: NotificationTrend[] | null; error: Error | null }> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('notification_jobs')
      .select('id, status, created_at, sent_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (jobsError) {
      debug.error('NotificationAnalytics.getNotificationTrends', 'Failed to fetch jobs', { error: jobsError })
      return { data: null, error: jobsError }
    }

    // Get in-app notifications
    const { data: inAppNotifs, error: inAppError } = await supabase
      .from('user_notifications')
      .select('id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (inAppError) {
      debug.error('NotificationAnalytics.getNotificationTrends', 'Failed to fetch in-app notifications', { error: inAppError })
      return { data: null, error: inAppError }
    }

    const jobsList = (jobs as unknown) as Array<{
      id: string
      status: string
      created_at: string
      sent_at: string | null
    }>

    const inAppList = inAppNotifs || []

    // Group by date
    const trendsMap = new Map<string, NotificationTrend>()

    // Process jobs
    for (const job of jobsList) {
      const date = new Date(job.created_at).toISOString().split('T')[0]
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          date,
          sent: 0,
          failed: 0,
          inApp: 0,
          email: 0,
        })
      }
      const trend = trendsMap.get(date)!
      if (job.status === 'sent') {
        trend.sent++
        trend.email++
      } else if (job.status === 'failed') {
        trend.failed++
      }
    }

    // Process in-app notifications
    for (const notif of inAppList) {
      const date = new Date(notif.created_at).toISOString().split('T')[0]
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          date,
          sent: 0,
          failed: 0,
          inApp: 0,
          email: 0,
        })
      }
      trendsMap.get(date)!.inApp++
    }

    // Convert to array and sort by date
    const trends = Array.from(trendsMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    )

    return { data: trends, error: null }
  } catch (err) {
    debug.error('NotificationAnalytics.getNotificationTrends', 'Exception getting trends', { error: err })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get delivery statistics
 */
export async function getNotificationDeliveryStats(
  orgId: string,
  days: number = 30
): Promise<{ data: NotificationDeliveryStats | null; error: Error | null }> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get jobs with sent_at timestamps
    const { data: jobs, error: jobsError } = await supabase
      .from('notification_jobs')
      .select('id, status, created_at, sent_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())
      .not('sent_at', 'is', null)

    if (jobsError) {
      debug.error('NotificationAnalytics.getNotificationDeliveryStats', 'Failed to fetch jobs', { error: jobsError })
      return { data: null, error: jobsError }
    }

    // Get in-app notifications
    const { data: inAppNotifs, error: inAppError } = await supabase
      .from('user_notifications')
      .select('id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())

    if (inAppError) {
      debug.error('NotificationAnalytics.getNotificationDeliveryStats', 'Failed to fetch in-app notifications', { error: inAppError })
      return { data: null, error: inAppError }
    }

    const jobsList = (jobs as unknown) as Array<{
      id: string
      status: string
      created_at: string
      sent_at: string | null
    }>

    const inAppList = inAppNotifs || []

    // Calculate delivery times
    const deliveryTimes: number[] = []
    for (const job of jobsList) {
      if (job.sent_at) {
        const created = new Date(job.created_at).getTime()
        const sent = new Date(job.sent_at).getTime()
        deliveryTimes.push(sent - created)
      }
    }

    const totalJobs = jobsList.length
    const sentJobs = jobsList.filter(j => j.status === 'sent').length
    const emailSuccessRate = totalJobs > 0 ? (sentJobs / totalJobs) * 100 : 100
    const inAppSuccessRate = 100 // In-app notifications are always "delivered" immediately

    const stats: NotificationDeliveryStats = {
      totalDelivered: sentJobs + inAppList.length,
      inAppDelivered: inAppList.length,
      emailDelivered: sentJobs,
      emailSuccessRate,
      inAppSuccessRate,
      averageDeliveryTime: deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
        : 0,
    }

    return { data: stats, error: null }
  } catch (err) {
    debug.error('NotificationAnalytics.getNotificationDeliveryStats', 'Exception getting delivery stats', { error: err })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
