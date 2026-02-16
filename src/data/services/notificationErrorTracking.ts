/**
 * Notification Error Tracking
 * 
 * Provides utilities for tracking notification failures and generating
 * error reports for monitoring and debugging.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'

export interface NotificationErrorStats {
  totalFailed: number
  totalRetries: number
  failuresByType: Record<string, number>
  failuresByError: Record<string, number>
  recentFailures: Array<{
    id: string
    type: string
    error: string
    retry_count: number
    created_at: string
  }>
}

/**
 * Get error statistics for failed notifications
 */
export async function getNotificationErrorStats(
  orgId?: string,
  days: number = 7
): Promise<{ data: NotificationErrorStats | null; error: Error | null }> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    let query = supabase
      .from('notification_jobs')
      .select('id, type, error, retry_count, created_at, status')
      .eq('status', 'failed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    const { data: failedJobs, error } = await query

    if (error) {
      debug.error('NotificationErrorTracking.getNotificationErrorStats', 'Failed to fetch error stats', { error })
      return { data: null, error }
    }

    if (!failedJobs) {
      return { data: null, error: new Error('No data returned') }
    }

    const jobs = (failedJobs as unknown) as Array<{
      id: string
      type: string
      error: string | null
      retry_count: number | null
      created_at: string
      status: string
    }>

    const stats: NotificationErrorStats = {
      totalFailed: jobs.length,
      totalRetries: jobs.reduce((sum, job) => sum + (job.retry_count || 0), 0),
      failuresByType: {},
      failuresByError: {},
      recentFailures: [],
    }

    // Aggregate by type and error
    for (const job of jobs) {
      const type = job.type || 'unknown'
      stats.failuresByType[type] = (stats.failuresByType[type] || 0) + 1

      const errorMsg = job.error || 'Unknown error'
      const errorKey = typeof errorMsg === 'string' ? errorMsg.substring(0, 100) : 'Unknown error' // Truncate long errors
      stats.failuresByError[errorKey] = (stats.failuresByError[errorKey] || 0) + 1

      stats.recentFailures.push({
        id: job.id,
        type,
        error: typeof errorMsg === 'string' ? errorMsg : 'Unknown error',
        retry_count: job.retry_count || 0,
        created_at: job.created_at,
      })
    }

    return { data: stats, error: null }
  } catch (err) {
    debug.error('NotificationErrorTracking.getNotificationErrorStats', 'Exception getting error stats', { error: err })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get jobs that are pending retry
 */
export async function getPendingRetryJobs(
  orgId?: string
): Promise<{ data: Array<{ id: string; type: string; retry_count: number; next_retry_at: string }> | null; error: Error | null }> {
  try {
    const now = new Date().toISOString()
    
    let query = supabase
      .from('notification_jobs')
      .select('id, type, retry_count, next_retry_at')
      .eq('status', 'queued')
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', now)

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    const { data, error } = await query
      .order('next_retry_at', { ascending: true })
      .limit(50)

    if (error) {
      debug.error('NotificationErrorTracking.getPendingRetryJobs', 'Failed to fetch pending retries', { error })
      return { data: null, error }
    }

    if (!data) {
      return { data: [], error: null }
    }

    const jobs = (data as unknown) as Array<{
      id: string
      type: string
      retry_count: number | null
      next_retry_at: string | null
    }>

    return { 
      data: jobs.map(job => ({
        id: job.id,
        type: job.type,
        retry_count: job.retry_count || 0,
        next_retry_at: job.next_retry_at || '',
      })), 
      error: null 
    }
  } catch (err) {
    debug.error('NotificationErrorTracking.getPendingRetryJobs', 'Exception getting pending retries', { error: err })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
