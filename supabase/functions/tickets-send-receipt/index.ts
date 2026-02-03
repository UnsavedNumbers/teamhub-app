// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"
import { qrcode } from "https://deno.land/x/qrcode/mod.ts"

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

// Generate magic link token
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
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

  if (!orderId) {
    return json(req, { error: "Missing order_id" }, 400)
  }

  try {
    // Load order with event, org, and items (T4: check status and idempotency)
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .select(
        `
        id,
        org_id,
        purchaser_email,
        purchaser_name,
        purchaser_user_id,
        status,
        receipt_email_sent_at,
        total_cents,
        ticketed_events (
          id,
          title,
          starts_at,
          venue_name,
          venue_city,
          venue_state
        ),
        organizations!ticket_orders_org_id_fkey (
          slug
        )
      `,
      )
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return json(req, { error: "Order not found" }, 404)
    }

    // Guard: order must be paid and tickets must exist (T4)
    if (order.status !== "paid") {
      return json(req, { error: "Order is not paid" }, 400)
    }

    // Check idempotency: if receipt already sent, return success (T4)
    if (order.receipt_email_sent_at) {
      return json(req, { success: true, email_sent: true, skipped: true })
    }

    // Load tickets to verify they exist and get entry_code for QR
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("id, entry_code")
      .eq("order_id", orderId)
      .limit(1)

    if (ticketsError || !tickets || tickets.length === 0) {
      return json(req, { error: "No tickets found for order" }, 400)
    }

    // Load order items
    const { data: orderItems } = await supabase
      .from("ticket_order_items")
      .select(
        `
        quantity,
        unit_price_cents,
        line_total_cents,
        ticket_types (
          name
        )
      `,
      )
      .eq("order_id", orderId)

    // Create magic link token for guest access (T10: handle conflict)
    let token: string | null = null
    const { data: existingLink } = await supabase
      .from("ticket_access_links")
      .select("id")
      .eq("order_id", orderId)
      .eq("email", order.purchaser_email)
      .single()

    if (!existingLink) {
      // Create new access link
      token = generateToken()
      const tokenHash = await hashToken(token)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

      const { error: linkError } = await supabase.from("ticket_access_links").insert({
        order_id: orderId,
        email: order.purchaser_email,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })

      if (linkError) {
        // Conflict or other error - link may have been created concurrently
        console.error("Failed to create access link (may already exist):", linkError)
        // Continue - if link exists, user can access via other means
      }
    } else {
      // Link already exists (T10: idempotent) - we can't get the raw token from hash
      // For guest users, we'll use a generic message or they can request access
      console.log("Access link already exists for this order")
    }

    // Build ticket URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://platform.youthsports.team"
    const orgSlug = (order.organizations as any)?.slug
    // Use org-scoped URL if slug exists, otherwise fall back to legacy pattern
    // For guest users, if token is null (link already exists), use org tickets page
    let ticketUrl: string
    if (order.purchaser_user_id) {
      ticketUrl = `${baseUrl}/account/tickets` // Logged-in user
    } else if (token && orgSlug) {
      ticketUrl = `${baseUrl}/o/${orgSlug}/tickets/access/${token}` // Guest magic link with org context
    } else if (token) {
      ticketUrl = `${baseUrl}/tickets/access/${token}` // Legacy guest magic link
    } else if (orgSlug) {
      // Link already exists, direct to org tickets page
      ticketUrl = `${baseUrl}/o/${orgSlug}/tickets`
    } else {
      ticketUrl = `${baseUrl}/tickets`
    }

    const event = order.ticketed_events as any
    const eventDate = event?.starts_at ? new Date(event.starts_at).toLocaleDateString() : "TBD"
    const eventLocation = event?.venue_name
      ? `${event.venue_name}, ${event.venue_city || ""} ${event.venue_state || ""}`.trim()
      : "Location TBD"

    // Build items_html (pre-rendered HTML for template)
    const itemsHtml = (orderItems || [])
      .map(
        (item: any) =>
          `<tr>
            <td style="padding: 10px; border: 1px solid #d1d5db;">${item.ticket_types?.name || "Ticket"}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #d1d5db;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">$${(item.unit_price_cents / 100).toFixed(2)}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">$${(item.line_total_cents / 100).toFixed(2)}</td>
          </tr>`,
      )
      .join("")

    // Generate QR code from first ticket's entry_code (T7: exact entry_code, no transformation)
    let qrImageDataUrl = ""
    const firstTicket = tickets[0]
    if (firstTicket?.entry_code) {
      try {
        // Generate QR code as base64 (T7: encode exactly entry_code)
        const qrBase64 = await qrcode(firstTicket.entry_code, { size: 250 })
        qrImageDataUrl = `data:image/png;base64,${qrBase64}`
      } catch (qrError) {
        console.error("Failed to generate QR code:", qrError)
        // Continue without QR - email will still send with link only
      }
    }

    // Build payload for notification_jobs
    const notificationPayload = {
      ticket_url: ticketUrl,
      event_title: event?.title || "Event",
      event_date: eventDate,
      event_location: eventLocation,
      items_html: itemsHtml,
      total: `$${(order.total_cents / 100).toFixed(2)}`,
      qr_image_data_url: qrImageDataUrl,
    }

    // Insert notification job
    const { data: notificationJob, error: jobError } = await supabase
      .from("notification_jobs")
      .insert({
        org_id: order.org_id,
        email: order.purchaser_email,
        user_id: order.purchaser_user_id || null,
        type: "ticket_receipt",
        payload: notificationPayload,
        status: "queued",
      })
      .select("id")
      .single()

    if (jobError || !notificationJob) {
      console.error("Failed to create notification job:", jobError)
      return json(req, { error: "Failed to enqueue receipt email" }, 500)
    }

    // Invoke notification-worker with job_id (T5: handle failure gracefully)
    const functionsUrl = supabaseUrl.replace("/rest/v1", "")
    try {
      const workerResponse = await fetch(`${functionsUrl}/functions/v1/notification-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
        body: JSON.stringify({
          job_ids: [notificationJob.id],
        }),
      })

      if (!workerResponse.ok) {
        const errorText = await workerResponse.text()
        console.error("Failed to invoke notification-worker:", errorText)
        // Don't fail - job is queued and will be processed later
      }
    } catch (invokeError) {
      console.error("Error invoking notification-worker:", invokeError)
      // Don't fail - job is queued and will be processed later (T5)
    }

    // Update order receipt sent timestamp (set after worker is invoked)
    await supabase
      .from("ticket_orders")
      .update({ receipt_email_sent_at: new Date().toISOString() })
      .eq("id", orderId)

    return json(req, { success: true, email_sent: true, job_id: notificationJob.id })
  } catch (error: any) {
    console.error("Error sending receipt:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
