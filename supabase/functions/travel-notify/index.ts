// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const resendApiKey = Deno.env.get("RESEND_API_KEY")
const emailFrom = Deno.env.get("TRAVEL_EMAIL_FROM") // e.g. "Youth Sports <no-reply@yourdomain.com>"
const notifySecret = Deno.env.get("TRAVEL_NOTIFY_SECRET")

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase env vars missing")
}

type OutboxRow = {
  id: string
  event_type: string
  travel_plan_id: string
  team_id: string
  season_id: string
  attempt_count: number
  payload: any
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function subjectFor(eventType: string, title: string) {
  switch (eventType) {
    case "travel_published":
      return `New trip published: ${title}`
    case "travel_updated":
      return `Trip updated: ${title}`
    case "travel_cancelled":
      return `Trip cancelled: ${title}`
    default:
      return `Travel update: ${title}`
  }
}

function formatDateRange(start: string, end: string) {
  return `${start} → ${end}`
}

function buildEmailHtml(row: OutboxRow) {
  const title = row.payload?.title ?? "Travel plan"
  const location = row.payload?.location ?? ""
  const start = row.payload?.start_date ?? ""
  const end = row.payload?.end_date ?? ""
  const status = row.payload?.status ?? ""

  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 8px 0;">${title}</h2>
      <p style="margin:0 0 12px 0;color:#334155;">
        <strong>${location}</strong><br/>
        ${formatDateRange(start, end)}<br/>
        Status: ${status}
      </p>
      <p style="margin:0;color:#334155;">
        Open the Youth Sports app to view full details, maps, and the itinerary.
      </p>
    </div>
  `
}

async function sendResendEmail(to: string[], subject: string, html: string) {
  if (!resendApiKey || !emailFrom) {
    throw new Error("Email provider not configured (RESEND_API_KEY / TRAVEL_EMAIL_FROM)")
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to,
      subject,
      html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    throw new Error(`Resend error: ${resp.status} ${text}`)
  }
}

async function getParentEmails(supabase: any, teamId: string) {
  const { data: rows, error: qErr } = await supabase.rpc("travel_recipient_emails", { team_id_in: teamId })
  if (qErr) throw qErr
  return (rows as any[] | null)?.map((r) => r.email).filter(Boolean) ?? []
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" })

  if (notifySecret) {
    const provided = req.headers.get("x-travel-notify-secret")
    if (provided !== notifySecret) return json(401, { error: "Unauthorized" })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  const { data: pending, error } = await supabase
    .from("notification_outbox")
    .select("id, event_type, travel_plan_id, team_id, season_id, attempt_count, payload")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25)

  if (error) return json(400, { error: error.message })

  const rows = (pending ?? []) as OutboxRow[]
  const results: any[] = []

  for (const row of rows) {
    try {
      const title = row.payload?.title ?? "Travel plan"
      const recipients = await getParentEmails(supabase, row.team_id)
      if (recipients.length === 0) {
        await supabase.from("notification_outbox").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id)
        results.push({ id: row.id, status: "skipped_no_recipients" })
        continue
      }

      const subject = subjectFor(row.event_type, title)
      const html = buildEmailHtml(row)

      await sendResendEmail(recipients, subject, html)

      await supabase.from("notification_outbox").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id)
      results.push({ id: row.id, status: "sent", recipients: recipients.length })
    } catch (err: any) {
      await supabase
        .from("notification_outbox")
        .update({
          status: "failed",
          attempt_count: row.attempt_count + 1,
          last_error: String(err?.message ?? err),
        })
        .eq("id", row.id)

      results.push({ id: row.id, status: "failed", error: String(err?.message ?? err) })
    }
  }

  return json(200, { processed: rows.length, results })
})

