// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required environment configuration")
}

// This function enqueues reminder outbox rows for kits whose deadline is approaching.
// Suggested cron: hourly or daily.
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const { data: kits, error } = await supabase
    .from("uniform_kits")
    .select("id, team_id, season_id, name, deadline_at, locked_at")
    .is("locked_at", null)
    .not("deadline_at", "is", null)
    .lte("deadline_at", in48h.toISOString())
    .gte("deadline_at", now.toISOString())

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  let enqueued = 0
  for (const k of (kits || []) as any[]) {
    const dedupeKey = `uniform:kit:${k.id}:deadline:${k.deadline_at}`
    const { error: insErr } = await supabase.from("uniform_notification_outbox").insert({
      event_type: "uniform_kit_deadline_reminder",
      dedupe_key: dedupeKey,
      kit_id: k.id,
      team_id: k.team_id,
      season_id: k.season_id,
      payload: { kit_name: k.name, deadline_at: k.deadline_at },
    })
    if (!insErr) enqueued++
  }

  return new Response(JSON.stringify({ enqueued }), { status: 200 })
})

