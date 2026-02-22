import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendNotificationEmail, type NotificationJob } from './emailService.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationJobRow {
  id: string
  org_id: string
  user_id: string | null
  email: string
  type: string
  payload: Record<string, any>
  status: 'queued' | 'sent' | 'failed'
  error: string | null
  created_at: string
  sent_at: string | null
  retry_count: number | null
  next_retry_at: string | null
  updated_at: string
}

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 60000 // 1 minute
const MAX_RETRY_DELAY_MS = 3600000 // 1 hour

// Calculate next retry time with exponential backoff
function calculateNextRetry(retryCount: number): Date {
  const delayMs = Math.min(
    INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
    MAX_RETRY_DELAY_MS
  )
  return new Date(Date.now() + delayMs)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body to get appBaseUrl and job_ids if provided
    let appBaseUrl: string | null = null
    let jobIds: string[] | null = null
    try {
      const body = await req.json()
      appBaseUrl = body?.appBaseUrl || null
      // Validate job_ids is an array of strings (T8)
      if (body?.job_ids && Array.isArray(body.job_ids) && body.job_ids.every((id: any) => typeof id === 'string')) {
        jobIds = body.job_ids
        console.log('Received job_ids from client:', jobIds)
      }
      console.log('Received appBaseUrl from client:', appBaseUrl)
    } catch {
      // No body or invalid JSON - that's fine
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Remove queued payment_receipt jobs as requested
    const { error: cleanupError } = await supabase
      .from('notification_jobs')
      .delete()
      .eq('type', 'payment_receipt')
      .eq('status', 'queued')

    if (cleanupError) {
      console.error('Failed to remove payment_receipt jobs:', cleanupError)
    }

    // Fetch notification jobs: either specific job_ids or queued jobs (T8)
    let jobs: NotificationJobRow[] | null = null
    let fetchError: any = null
    
    if (jobIds && jobIds.length > 0) {
      // Fetch specific jobs by id
      const { data, error } = await supabase
        .from('notification_jobs')
        .select('*')
        .in('id', jobIds)
        .order('created_at', { ascending: true })
      
      jobs = data as NotificationJobRow[] | null
      fetchError = error
    } else {
      // Fetch queued notification jobs that are ready to process (newest first so client-triggered invites are processed)
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('notification_jobs')
        .select('*')
        .eq('status', 'queued')
        .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(10)
      
      jobs = data as NotificationJobRow[] | null
      fetchError = error
    }

    if (fetchError) {
      console.error('Failed to fetch notification jobs:', fetchError)
      throw fetchError
    }

    const notificationJobs = (jobs ?? []) as NotificationJobRow[]
    const results: any[] = []

    // Use appBaseUrl from client if provided, otherwise fall back to env vars
    const platformBaseUrl =
      appBaseUrl ||
      Deno.env.get('PLATFORM_APP_URL') ||
      Deno.env.get('APP_URL') ||
      'https://platform.youthsports.team'
    console.log('Using platformBaseUrl for email links:', platformBaseUrl)
    const guardianInvitePath = '/portal/accept-invite'

    for (const job of notificationJobs) {
      try {
        // Check user/org notification preferences
        const shouldSend = await checkNotificationPreferences(supabase, job)
        if (!shouldSend) {
          // Mark as sent (effectively skip)
          await supabase
            .from('notification_jobs')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)
          continue
        }

        // Convert to our interface
        const payload = { ...(job.payload ?? {}) }
        if (job.type === 'guardian_invite') {
          const token = payload.invite_token
          if (token) {
            payload.invite_url = `${platformBaseUrl}${guardianInvitePath}?token=${token}&type=guardian`
          }
        }
        
        if (job.type === 'athlete_invite') {
          const token = payload.invite_token
          if (token) {
            payload.invite_url = `${platformBaseUrl}${guardianInvitePath}?token=${token}&type=athlete`
          }
        }

        const notificationJob: NotificationJob = {
          id: job.id,
          org_id: job.org_id,
          user_id: job.user_id || undefined,
          email: job.email,
          type: job.type as NotificationJob['type'],
          payload,
          status: job.status,
          error: job.error || undefined,
          created_at: job.created_at,
          sent_at: job.sent_at || undefined
        }

        // Send the email (pass supabase for branding)
        const result = await sendNotificationEmail(notificationJob, supabase)

        if (result.success) {
          // Mark as sent
          await supabase
            .from('notification_jobs')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              next_retry_at: null, // Clear retry schedule
            })
            .eq('id', job.id)

          results.push({ id: job.id, status: 'sent', emailId: result.emailId })
        } else {
          // Retry logic with exponential backoff
          const currentRetryCount = job.retry_count || 0
          
          if (currentRetryCount < MAX_RETRIES) {
            // Schedule retry with exponential backoff
            const nextRetryAt = calculateNextRetry(currentRetryCount)
            await supabase
              .from('notification_jobs')
              .update({
                status: 'queued', // Keep as queued for retry
                error: result.error,
                retry_count: currentRetryCount + 1,
                next_retry_at: nextRetryAt.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id)

            results.push({ 
              id: job.id, 
              status: 'retry_scheduled', 
              error: result.error,
              retry_count: currentRetryCount + 1,
              next_retry_at: nextRetryAt.toISOString()
            })
          } else {
            // Max retries exceeded - mark as permanently failed
            await supabase
              .from('notification_jobs')
              .update({
                status: 'failed',
                error: result.error || 'Max retries exceeded',
                updated_at: new Date().toISOString(),
                next_retry_at: null,
              })
              .eq('id', job.id)

            results.push({ 
              id: job.id, 
              status: 'failed', 
              error: result.error || 'Max retries exceeded',
              retry_count: currentRetryCount
            })
          }
        }

      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error)

        // Retry logic for exceptions
        const currentRetryCount = job.retry_count || 0
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        if (currentRetryCount < MAX_RETRIES) {
          // Schedule retry with exponential backoff
          const nextRetryAt = calculateNextRetry(currentRetryCount)
          await supabase
            .from('notification_jobs')
            .update({
              status: 'queued', // Keep as queued for retry
              error: errorMessage,
              retry_count: currentRetryCount + 1,
              next_retry_at: nextRetryAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({
            id: job.id,
            status: 'retry_scheduled',
            error: errorMessage,
            retry_count: currentRetryCount + 1,
            next_retry_at: nextRetryAt.toISOString()
          })
        } else {
          // Max retries exceeded - mark as permanently failed
          await supabase
            .from('notification_jobs')
            .update({
              status: 'failed',
              error: errorMessage,
              updated_at: new Date().toISOString(),
              next_retry_at: null,
            })
            .eq('id', job.id)

          results.push({
            id: job.id,
            status: 'failed',
            error: errorMessage,
            retry_count: currentRetryCount
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Notification worker error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/**
 * Check if user/org wants to receive this type of notification
 * Uses notifications_v2 if available, falls back to legacy preferences
 */
async function checkNotificationPreferences(
  supabase: any,
  job: NotificationJobRow
): Promise<boolean> {
  try {
    if (!job.user_id || !job.org_id) {
      // No user_id means org-wide or system notification - allow by default
      return true
    }

    // Try notifications_v2 first
    const { data: user } = await supabase
      .from('users')
      .select('preferences, id')
      .eq('id', job.user_id)
      .single()

    if (user?.preferences) {
      const prefs = user.preferences as any
      const notifications_v2 = prefs?.notifications_v2

      // Extract action from payload (we store it there)
      const action = job.payload?.action as string | undefined

      if (notifications_v2 && action && job.org_id) {
        // Determine user's role in this org
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('role')
          .eq('org_id', job.org_id)
          .eq('user_id', job.user_id)
          .single()

        if (orgMember?.role) {
          // Normalize 'parent' to 'guardian', all other roles pass through unchanged
          // Note: team_manager and platform_admin are not in organization_members,
          // so they won't be handled by this path. They may need special handling
          // if email preferences are needed for those roles.
          const role = orgMember.role === 'parent' ? 'guardian' : orgMember.role
          const orgPrefs = notifications_v2[job.org_id]
          const rolePrefs = orgPrefs?.[role]

          if (rolePrefs && Array.isArray(rolePrefs)) {
            // Find the group that contains this action
            for (const group of rolePrefs) {
              const actionToggle = group.actions?.find((a: any) => a.id === action)
              if (actionToggle) {
                // Check if action is enabled
                const actionEnabled = group.allEnabled || actionToggle.enabled
                if (!actionEnabled) {
                  return false
                }

                // Check if email channel is enabled
                const channels = group.channels || []
                if (!channels.includes('email')) {
                  return false
                }

                // Action is enabled and email channel is on
                return true
              }
            }
          }
        }
      }
    }

    // Fallback to legacy preferences
    if (job.user_id) {
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('email_notifications')
        .eq('user_id', job.user_id)
        .single()

      if (userPrefs?.email_notifications === false) {
        return false
      }

      // Check specific notification type preferences
      const typeKey = `${job.type}_enabled`
      if (userPrefs?.email_notifications?.[typeKey] === false) {
        return false
      }
    }

    // Check organization preferences
    const { data: orgPrefs } = await supabase
      .from('organization_settings')
      .select('email_notifications_enabled')
      .eq('organization_id', job.org_id)
      .single()

    if (orgPrefs?.email_notifications_enabled === false) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking notification preferences:', error)
    // Default to sending if we can't check preferences
    return true
  }
}