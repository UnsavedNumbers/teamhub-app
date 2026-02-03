// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

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

// Base64URL decode
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(padding)
  const binary = atob(padded)
  return new Uint8Array([...binary].map(char => char.charCodeAt(0)))
}

// Decrypt access payload
async function decryptAccessPayload(encrypted: string): Promise<{ ticket_id: string; qr_token: string; issued_at: number }> {
  const secret = Deno.env.get("TICKET_LINK_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  if (!secret) {
    throw new Error("TICKET_LINK_SECRET not configured")
  }

  // Decode base64URL
  const combined = base64UrlDecode(encrypted)
  
  // Extract IV (first 12 bytes) and encrypted data
  const iv = combined.slice(0, 12)
  const encryptedData = combined.slice(12)

  // Derive key from secret
  const encoder = new TextEncoder()
  const secretKey = encoder.encode(secret)
  const keyData = await crypto.subtle.digest("SHA-256", secretKey)
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  )

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  )

  // Parse JSON payload
  const decoder = new TextDecoder()
  const payloadJson = decoder.decode(decrypted)
  return JSON.parse(payloadJson)
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

  const encryptedPayload = payload?.payload as string | undefined

  if (!encryptedPayload) {
    return json(req, { error: "Missing payload" }, 400)
  }

  try {
    // Decrypt payload
    const decrypted = await decryptAccessPayload(encryptedPayload)

    // Validate payload structure
    if (!decrypted.ticket_id || !decrypted.qr_token) {
      return json(req, { error: "Invalid payload structure" }, 400)
    }

    // Optional: Check if link is expired (e.g., 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    if (decrypted.issued_at < thirtyDaysAgo) {
      return json(req, { error: "Link expired" }, 410)
    }

    // Fetch ticket details from DB
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        id,
        entry_code,
        status,
        ticket_types (
          name
        ),
        ticketed_events (
          id,
          title,
          starts_at,
          venue_name,
          venue_city,
          venue_state
        ),
        ticket_orders (
          purchaser_name,
          purchaser_email
        )
      `)
      .eq("id", decrypted.ticket_id)
      .single()

    if (ticketError || !ticket) {
      return json(req, { error: "Ticket not found" }, 404)
    }

    // Verify token hash matches (security check)
    const encoder = new TextEncoder()
    const tokenData = encoder.encode(decrypted.qr_token)
    const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const expectedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    const { data: ticketHash } = await supabase
      .from("tickets")
      .select("qr_token_hash")
      .eq("id", decrypted.ticket_id)
      .single()

    if (!ticketHash || ticketHash.qr_token_hash !== expectedHash) {
      return json(req, { error: "Invalid token" }, 403)
    }

    const event = ticket.ticketed_events as any
    const order = ticket.ticket_orders as any
    const ticketType = ticket.ticket_types as any

    return json(req, {
      id: ticket.id,
      entry_code: ticket.entry_code,
      qr_token: decrypted.qr_token,
      status: ticket.status,
      ticket_type_name: ticketType?.name || "Ticket",
      event_id: event?.id,
      event_name: event?.title || "Event",
      event_date: event?.starts_at,
      event_location: event?.venue_name
        ? `${event.venue_name}${event.venue_city ? `, ${event.venue_city}` : ""}${event.venue_state ? ` ${event.venue_state}` : ""}`.trim()
        : "Location TBD",
      purchaser_name: order?.purchaser_name || "Guest",
      purchaser_email: order?.purchaser_email || "",
    })
  } catch (error: any) {
    console.error("Error decrypting access link:", error)
    return json(req, { error: error.message || "Invalid or corrupted link" }, 400)
  }
})
