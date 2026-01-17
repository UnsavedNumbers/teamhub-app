import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OutboxRow {
  id: string
  event_id: string
  team_id: string
  season_id: string
  event_type: string
  payload: {
    rsvp_type?: string
    rsvp_enabled?: boolean
    event_title?: string
    event_start_time?: string
  }
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

    // Get pending notifications
    const { data: pending, error: fetchError } = await supabase
      .from('rsvp_notification_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) throw fetchError

    const rows = (pending ?? []) as OutboxRow[]
    const results: any[] = []

    for (const row of rows) {
      try {
        // Double-check RSVP config (handles race conditions)
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('rsvp_enabled, rsvp_type, title, start_time')
          .eq('id', row.event_id)
          .single()

        if (eventError) throw eventError

        // Validate RSVP is still enabled and type matches
        if (!event?.rsvp_enabled || !event.rsvp_type) {
          // RSVP was disabled, mark as sent (no-op)
          await supabase
            .from('rsvp_notification_outbox')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', row.id)
          results.push({ id: row.id, status: 'skipped_rsvp_disabled' })
          continue
        }

        if (event.rsvp_type !== row.payload?.rsvp_type) {
          // Type changed, skip
          await supabase
            .from('rsvp_notification_outbox')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', row.id)
          results.push({ id: row.id, status: 'skipped_type_mismatch' })
          continue
        }

        // Get recipients based on RSVP type
        let recipients: Array<{ id: string; email: string | null }> = []

        if (event.rsvp_type === 'general') {
          // For general RSVP, get all parent users for the team
          const { data: memberships, error: membershipsError } = await supabase
            .from('team_memberships')
            .select(`
              child:children!inner(
                family_id,
                families!inner(
                  users!inner(id, email, role)
                )
              )
            `)
            .eq('team_id', row.team_id)
            .eq('season_id', row.season_id)
            .eq('status', 'active')

          if (membershipsError) throw membershipsError

          // Extract unique parent users
          const parentMap = new Map<string, { id: string; email: string | null }>()
          memberships?.forEach((m: any) => {
            const users = m.child?.families?.users || []
            users.forEach((u: any) => {
              if (u.role === 'parent' && u.email) {
                parentMap.set(u.id, { id: u.id, email: u.email })
              }
            })
          })
          recipients = Array.from(parentMap.values())
        } else if (event.rsvp_type === 'athlete') {
          // For athlete RSVP, get parent users of children on the team
          const { data: memberships, error: membershipsError } = await supabase
            .from('team_memberships')
            .select(`
              child:children!inner(
                family_id,
                families!inner(
                  users!inner(id, email, role)
                )
              )
            `)
            .eq('team_id', row.team_id)
            .eq('season_id', row.season_id)
            .eq('status', 'active')

          if (membershipsError) throw membershipsError

          // Extract unique parent users
          const parentMap = new Map<string, { id: string; email: string | null }>()
          memberships?.forEach((m: any) => {
            const users = m.child?.families?.users || []
            users.forEach((u: any) => {
              if (u.role === 'parent' && u.email) {
                parentMap.set(u.id, { id: u.id, email: u.email })
              }
            })
          })
          recipients = Array.from(parentMap.values())
        }

        if (recipients.length === 0) {
          await supabase
            .from('rsvp_notification_outbox')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', row.id)
          results.push({ id: row.id, status: 'skipped_no_recipients' })
          continue
        }

        // Build notification message
        const eventTitle = event.title || 'Event'
        const subject = `RSVP Required: ${eventTitle}`
        const body = `Please RSVP for ${eventTitle}. ${event.rsvp_type === 'general' ? 'Respond with your attendance.' : 'Respond for each child.'}`

        // Create in-app notifications with deduplication
        for (const recipient of recipients) {
          const userDedupe = `${row.id}:${recipient.id}`
          await supabase
            .from('user_notifications')
            .insert({
              user_id: recipient.id,
              org_id: (await supabase.from('teams').select('org_id').eq('id', row.team_id).single()).data?.org_id,
              team_id: row.team_id,
              type: row.event_type,
              title: subject,
              body: body,
              payload: row.payload,
              dedupe_key: userDedupe,
            })
            .select()
            .then(({ error: notifError }) => {
              if (notifError && notifError.code !== '23505') { // Ignore duplicate key errors
                console.error('Notification creation error:', notifError)
              }
            })

          // Send email if available (placeholder - implement email sending)
          if (recipient.email) {
            // TODO: Implement email sending via Resend or similar
            console.log(`Would send email to ${recipient.email}: ${subject}`)
          }
        }

        // Mark as sent
        await supabase
          .from('rsvp_notification_outbox')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', row.id)

        results.push({ id: row.id, status: 'sent', recipients: recipients.length })
      } catch (err: any) {
        await supabase
          .from('rsvp_notification_outbox')
          .update({
            status: 'failed',
            attempt_count: (row.attempt_count ?? 0) + 1,
            last_error: err?.message ?? String(err),
          })
          .eq('id', row.id)

        results.push({ id: row.id, status: 'failed', error: err?.message ?? String(err) })
      }
    }

    return new Response(
      JSON.stringify({ processed: rows.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
