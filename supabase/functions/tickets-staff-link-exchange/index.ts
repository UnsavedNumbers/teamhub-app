// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

// CORS helpers
function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type"

  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
  }
}

function json(req: Request, body: unknown, status = 200) {
  const cors = buildCorsHeaders(req)
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

// Hash token
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(req, { error: "Server misconfigured" }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  // Parse payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const token = payload?.token as string | undefined

  if (!token) {
    return json(req, { error: "Missing token" }, 400)
  }

  try {
    // Hash token and lookup staff link
    const tokenHash = await hashToken(token)

    const { data: staffLink, error: linkError } = await supabase
      .from("ticket_staff_links")
      .select("id, org_id, ticketed_event_id, expires_at, max_uses, use_count")
      .eq("token_hash", tokenHash)
      .single()

    if (linkError || !staffLink) {
      return json(req, { error: "Invalid staff link token" }, 401)
    }

    // Check expiry
    const now = new Date()
    if (new Date(staffLink.expires_at) < now) {
      return json(req, { error: "Staff link expired" }, 401)
    }

    // Check max uses
    if (staffLink.max_uses !== null && staffLink.use_count >= staffLink.max_uses) {
      return json(req, { error: "Staff link max uses reached" }, 401)
    }

    // Load event details
    const { data: event } = await supabase
      .from("ticketed_events")
      .select("id, title, starts_at, status")
      .eq("id", staffLink.ticketed_event_id)
      .single()

    if (!event) {
      return json(req, { error: "Event not found" }, 404)
    }

    // Return session context
    return json(req, {
      org_id: staffLink.org_id,
      ticketed_event_id: staffLink.ticketed_event_id,
      event_title: event.title,
      event_starts_at: event.starts_at,
      expires_at: staffLink.expires_at,
      max_uses: staffLink.max_uses,
      use_count: staffLink.use_count,
    })
  } catch (error: any) {
    console.error("Error exchanging staff link:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
