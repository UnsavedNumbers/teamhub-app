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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Fetch queued notification jobs (limit to prevent timeout)
    const { data: jobs, error: fetchError } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Failed to fetch notification jobs:', fetchError)
      throw fetchError
    }

    const notificationJobs = (jobs ?? []) as NotificationJobRow[]
    const results: any[] = []

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
        const notificationJob: NotificationJob = {
          id: job.id,
          org_id: job.org_id,
          user_id: job.user_id || undefined,
          email: job.email,
          type: job.type as NotificationJob['type'],
          payload: job.payload,
          status: job.status,
          error: job.error || undefined,
          created_at: job.created_at,
          sent_at: job.sent_at || undefined
        }

        // Send the email
        const result = await sendNotificationEmail(notificationJob)

        if (result.success) {
          // Mark as sent
          await supabase
            .from('notification_jobs')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({ id: job.id, status: 'sent', emailId: result.emailId })
        } else {
          // Mark as failed
          await supabase
            .from('notification_jobs')
            .update({
              status: 'failed',
              error: result.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({ id: job.id, status: 'failed', error: result.error })
        }

      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error)

        // Mark as failed
        await supabase
          .from('notification_jobs')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        results.push({
          id: job.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
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
 */
async function checkNotificationPreferences(
  supabase: any,
  job: NotificationJobRow
): Promise<boolean> {
  try {
    // Check user preferences first
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