// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required environment configuration")
}

function buildMessage(eventType: string, payload: any) {
  switch (eventType) {
    case "uniform_kit_created":
      return {
        title: "New uniform kit available",
        body: `A new uniform kit is available: ${payload?.kit_name ?? "Uniform Kit"}.`,
        subject: `New uniform kit: ${payload?.kit_name ?? "Uniform Kit"}`,
      }
    case "uniform_kit_locked":
      return {
        title: "Uniform submissions locked",
        body: `Uniform submissions have been locked for: ${payload?.kit_name ?? "Uniform Kit"}.`,
        subject: `Uniforms locked: ${payload?.kit_name ?? "Uniform Kit"}`,
      }
    case "uniform_kit_deadline_reminder":
      return {
        title: "Uniform deadline reminder",
        body: `Reminder: please submit uniform sizes for ${payload?.kit_name ?? "Uniform Kit"}.`,
        subject: `Uniform deadline reminder: ${payload?.kit_name ?? "Uniform Kit"}`,
      }
    default:
      return {
        title: "Uniform update",
        body: "There is an update to uniforms.",
        subject: "Uniform update",
      }
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: outboxRows, error: outboxError } = await supabase
    .from("uniform_notification_outbox")
    .select("id, event_type, dedupe_key, kit_id, team_id, season_id, payload, attempt_count")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25)

  if (outboxError) return new Response(JSON.stringify({ error: outboxError.message }), { status: 500 })
  if (!outboxRows || outboxRows.length === 0) return new Response(JSON.stringify({ processed: 0 }), { status: 200 })

  let processed = 0

  for (const row of outboxRows as any[]) {
    try {
      // Resolve org_id via team
      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .select("org_id")
        .eq("id", row.team_id)
        .maybeSingle()
      if (teamErr || !team?.org_id) throw new Error("Unable to resolve team org_id")

      // Active roster children for team+season
      const { data: memberships, error: memErr } = await supabase
        .from("team_memberships")
        .select("child_id")
        .eq("team_id", row.team_id)
        .eq("season_id", row.season_id)
        .eq("status", "active")
      if (memErr) throw new Error(memErr.message)

      const childIds = Array.from(new Set((memberships || []).map((m: any) => m.child_id).filter(Boolean)))
      if (childIds.length === 0) {
        await supabase
          .from("uniform_notification_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id)
        processed++
        continue
      }

      const { data: kids, error: kidsErr } = await supabase
        .from("children")
        .select("id, family_id")
        .in("id", childIds)
      if (kidsErr) throw new Error(kidsErr.message)

      const familyIds = Array.from(new Set((kids || []).map((c: any) => c.family_id).filter(Boolean)))
      if (familyIds.length === 0) throw new Error("No families found for roster")

      const { data: users, error: usersErr } = await supabase
        .from("users")
        .select("id, email, display_name, family_id")
        .in("family_id", familyIds)
      if (usersErr) throw new Error(usersErr.message)

      const msg = buildMessage(row.event_type, row.payload)

      for (const u of (users || []) as any[]) {
        const userDedupe = `${row.dedupe_key}:${u.id}`
        await supabase.from("user_notifications").insert({
          user_id: u.id,
          org_id: team.org_id,
          team_id: row.team_id,
          type: row.event_type,
          kit_id: row.kit_id,
          title: msg.title,
          body: msg.body,
          payload: row.payload,
          dedupe_key: userDedupe,
        }).throwOnError()

        if (u.email) {
          await supabase.from("notification_jobs").insert({
            org_id: team.org_id,
            user_id: u.id,
            email: u.email,
            type: "uniform_notification",
            payload: {
              subject: msg.subject,
              title: msg.title,
              body: msg.body,
            },
            status: "queued",
          })
        }
      }

      await supabase
        .from("uniform_notification_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", row.id)

      processed++
    } catch (err: any) {
      await supabase
        .from("uniform_notification_outbox")
        .update({
          status: "failed",
          attempt_count: (row.attempt_count ?? 0) + 1,
          last_error: err?.message ?? String(err),
        })
        .eq("id", row.id)
    }
  }

  return new Response(JSON.stringify({ processed }), { status: 200 })
})

