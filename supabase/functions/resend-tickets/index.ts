// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"
import { getOrgTicketAccessUrl, getTicketAccessUrl } from '../shared/url-generator.ts'

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

// Generate QR token (128-bit+ opaque) - returns both raw and hash
async function generateSecureToken(): Promise<{ raw: string; hash: string }> {
  // Generate 64-character token (two UUIDs concatenated)
  const uuid1 = crypto.randomUUID()
  const uuid2 = crypto.randomUUID()
  const raw = uuid1.replace(/-/g, '') + uuid2.replace(/-/g, '')
  
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  
  return { raw, hash }
}

// Base64URL encode (URL-safe base64)
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Encrypt payload for access link
async function encryptAccessPayload(payload: { ticket_id: string; qr_token: string; issued_at: number }): Promise<string> {
  const secret = Deno.env.get("TICKET_LINK_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  if (!secret) {
    throw new Error("TICKET_LINK_SECRET not configured")
  }

  // Use AES-GCM for authenticated encryption
  const encoder = new TextEncoder()
  const payloadJson = JSON.stringify(payload)
  const payloadData = encoder.encode(payloadJson)

  // Derive key from secret using SHA-256
  const secretKey = encoder.encode(secret)
  const keyData = await crypto.subtle.digest("SHA-256", secretKey)
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  )

  // Generate IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    payloadData
  )

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Base64URL encode for URL safety
  return base64UrlEncode(combined)
}

// Generate access link for a ticket
async function generateAccessLink(ticketId: string, qrToken: string, baseUrl: string, orgSlug?: string): Promise<string> {
  const payload = {
    ticket_id: ticketId,
    qr_token: qrToken,
    issued_at: Date.now(),
  }

  const encrypted = await encryptAccessPayload(payload)

  if (orgSlug) {
    return getOrgTicketAccessUrl(orgSlug, encrypted, baseUrl)
  }
  return getTicketAccessUrl(encrypted, baseUrl)
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

  const orderId = payload?.order_id as string | undefined
  const email = payload?.email as string | undefined

  if (!orderId || !email) {
    return json(req, { error: "Missing required fields: order_id, email" }, 400)
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(req, { error: "Invalid email format" }, 400)
  }

  try {
    // Verify requester owns this order
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .select("id, purchaser_email, status, org_id")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return json(req, { error: "Order not found" }, 404)
    }

    // Email must match order (prevents enumeration attacks)
    if (order.purchaser_email.toLowerCase() !== email.toLowerCase()) {
      return json(req, { error: "Email does not match order" }, 403)
    }

    // Only resend for completed orders
    if (order.status !== "paid") {
      return json(req, { error: "Order not eligible for resend" }, 400)
    }

    // Rate limiting: max 3 resends per order per 24 hours
    const { data: recentResends } = await supabase
      .from("ticket_resend_log")
      .select("id")
      .eq("order_id", orderId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (recentResends && recentResends.length >= 3) {
      return json(req, { error: "Too many resend requests. Please try again later." }, 429)
    }

    // Fetch all active tickets for this order
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        entry_code,
        ticket_type_id,
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
        )
      `)
      .eq("order_id", orderId)
      .eq("status", "active")

    if (ticketsError || !tickets || tickets.length === 0) {
      return json(req, { error: "No active tickets found" }, 400)
    }

    // Generate new tokens for each ticket
    const updatedTickets: Array<{ ticket: any; qr_token_raw: string }> = []
    
    for (const ticket of tickets) {
      const { raw, hash } = await generateSecureToken()
      
      // Update hash in DB (invalidates old token)
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ 
          qr_token_hash: hash,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticket.id)
      
      if (updateError) {
        console.error(`Failed to update ticket ${ticket.id}:`, updateError)
        continue // Skip this ticket but continue with others
      }
      
      updatedTickets.push({
        ticket,
        qr_token_raw: raw
      })
    }

    if (updatedTickets.length === 0) {
      return json(req, { error: "Failed to update any tickets" }, 500)
    }

    // Log resend for rate limiting (best effort - don't fail if this fails)
    await supabase
      .from("ticket_resend_log")
      .insert({
        order_id: orderId,
        tickets_count: updatedTickets.length,
        requested_by_ip: req.headers.get("x-forwarded-for") || null,
      })
      .catch(() => {
        // Ignore errors - rate limiting is best effort
      })

    // Get org slug for access links
    const { data: org } = await supabase
      .from("organizations")
      .select("slug")
      .eq("id", order.org_id)
      .single()

    const baseUrl = Deno.env.get("SITE_URL") || "https://platform.youthsports.team"
    const orgSlug = org?.slug

    // Prepare tickets for email
    const ticketsForEmail = updatedTickets.map(({ ticket, qr_token_raw }) => ({
      id: ticket.id,
      qr_token_raw,
      entry_code: ticket.entry_code,
      ticket_type_id: ticket.ticket_type_id,
    }))

    // Send new email via tickets-send-receipt
    const functionsUrl = supabaseUrl.replace("/rest/v1", "")
    try {
      await fetch(`${functionsUrl}/functions/v1/tickets-send-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
        body: JSON.stringify({ 
          order_id: orderId,
          tickets_with_tokens: ticketsForEmail,
        }),
      })
    } catch (receiptError) {
      console.error("Failed to send receipt:", receiptError)
      // Don't fail - tickets are updated, email can be retried
    }

    return json(req, {
      success: true,
      message: `${updatedTickets.length} ticket(s) resent to ${email}`,
      tickets_resent: updatedTickets.length,
    })
  } catch (error: any) {
    console.error("Error resending tickets:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
