/**
 * Notification Digest Processor
 *
 * Processes batched notifications from notification_digest_buffer and sends
 * digest emails. Should be run daily (or weekly) via cron.
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required environment configuration")
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  try {
    const { digestWindow = 'daily' } = await req.json().catch(() => ({ digestWindow: 'daily' }))

    // Calculate date range based on digest window
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0) // Start of today
    
    let startDate: Date
    let endDate: Date
    
    if (digestWindow === 'daily') {
      // Process entries created yesterday (from 00:00:00 yesterday to 23:59:59 yesterday)
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 1) // Yesterday 00:00:00
      endDate = new Date(today) // Today 00:00:00 (exclusive)
    } else if (digestWindow === 'weekly') {
      // Process entries created in the past week (from 7 days ago to today)
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7) // 7 days ago 00:00:00
      endDate = new Date(today) // Today 00:00:00 (exclusive)
    } else {
      throw new Error(`Invalid digest window: ${digestWindow}`)
    }

    // Fetch unprocessed digest entries
    // For daily: process entries created yesterday
    // For weekly: process entries created in the past week
    const { data: digestEntries, error: fetchError } = await supabase
      .from('notification_digest_buffer')
      .select(`
        id,
        user_id,
        org_id,
        team_id,
        group_id,
        role_context,
        notification_ids,
        digest_window,
        created_at
      `)
      .eq('digest_window', digestWindow)
      .is('processed_at', null)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())

    if (fetchError) {
      console.error('Failed to fetch digest entries:', fetchError)
      throw fetchError
    }

    if (!digestEntries || digestEntries.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No digest entries to process' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    const results: any[] = []

    for (const entry of digestEntries) {
      try {
        // Fetch notifications
        const { data: notifications, error: notifError } = await supabase
          .from('user_notifications')
          .select('id, title, body, link_url, action, created_at')
          .in('id', entry.notification_ids)
          .order('created_at', { ascending: false })

        if (notifError || !notifications || notifications.length === 0) {
          console.error(`Failed to fetch notifications for digest ${entry.id}:`, notifError)
          continue
        }

        // Get user email
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('email, preferences')
          .eq('id', entry.user_id)
          .single()

        if (userError || !user?.email) {
          console.error(`Failed to fetch user for digest ${entry.id}:`, userError)
          continue
        }

        // Check user preferences - ensure email is still enabled
        const prefs = user.preferences as any
        const notifications_v2 = prefs?.notifications_v2
        const orgPrefs = notifications_v2?.[entry.org_id]
        const rolePrefs = orgPrefs?.[entry.role_context]
        const group = rolePrefs?.find((g: any) => g.id === entry.group_id)

        if (!group || !group.channels?.includes('email')) {
          // User has disabled email for this group - mark as processed without sending
          await supabase
            .from('notification_digest_buffer')
            .update({ processed_at: new Date().toISOString() })
            .eq('id', entry.id)
          continue
        }

        // Build digest email content
        const groupLabels: Record<string, string> = {
          events: 'Events',
          travel: 'Travel',
          payments: 'Payments',
          athletes: 'Athletes',
          uniforms: 'Uniforms',
          announcements: 'Announcements',
          messages: 'Messages',
          system: 'System',
        }

        const groupLabel = groupLabels[entry.group_id] || entry.group_id
        const subject = `${groupLabel} Digest - ${notifications.length} notification${notifications.length > 1 ? 's' : ''}`

        // Build HTML body
        let htmlBody = `<h2>${groupLabel} Digest</h2>`
        htmlBody += `<p>You have ${notifications.length} unread notification${notifications.length > 1 ? 's' : ''}:</p>`
        htmlBody += '<ul>'
        for (const notif of notifications) {
          htmlBody += `<li><strong>${notif.title}</strong><br/>${notif.body}`
          if (notif.link_url) {
            htmlBody += ` <a href="${notif.link_url}">View →</a>`
          }
          htmlBody += '</li>'
        }
        htmlBody += '</ul>'
        htmlBody += '<p><a href="/portal/notifications">View all notifications →</a></p>'

        // Enqueue digest email job
        const { error: jobError } = await supabase
          .from('notification_jobs')
          .insert({
            org_id: entry.org_id,
            user_id: entry.user_id,
            email: user.email,
            type: 'new_message', // Use generic message type for digests
            payload: {
              action: 'digest',
              title: subject,
              body: htmlBody,
              link_url: '/portal/notifications',
              digest_group: entry.group_id,
              notification_count: notifications.length,
              notification_ids: entry.notification_ids,
            },
            status: 'queued',
            retry_count: 0,
            next_retry_at: null,
          })

        if (jobError) {
          console.error(`Failed to enqueue digest email for ${entry.id}:`, jobError)
          // Don't mark as processed if job enqueueing failed - allow retry
          results.push({ id: entry.id, status: 'failed', error: jobError.message || 'Failed to enqueue email job' })
          continue
        }

        // Mark digest entry as processed
        await supabase
          .from('notification_digest_buffer')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', entry.id)

        processed++
        results.push({ id: entry.id, status: 'sent', notificationCount: notifications.length })
      } catch (err) {
        console.error(`Error processing digest entry ${entry.id}:`, err)
        // Don't mark as processed on error - allows retry on next run
        results.push({ id: entry.id, status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        total: digestEntries.length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Notification digest processor error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
