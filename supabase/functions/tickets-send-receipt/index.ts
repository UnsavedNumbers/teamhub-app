// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"
import { qrcode } from "https://deno.land/x/qrcode/mod.ts"
import { getOrgTicketAccessUrl, getTicketAccessUrl, getFullUrl } from '../shared/url-generator.ts'

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
  return new Response(JSON.stringify(body), { status, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } })
}

function escapeHtml(value: string | null | undefined): string {
  const text = value ?? ""
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")
}

function formatMoney(cents: number | null | undefined): string {
  return `$${((Number(cents ?? 0) || 0) / 100).toFixed(2)}`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date)
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(date)
}

function buildVenueAddress(event: any): string {
  const parts = [
    event?.venue_name,
    event?.venue_address_line1,
    event?.venue_address_line2,
    [event?.venue_city, event?.venue_state].filter(Boolean).join(", "),
    event?.venue_postal_code,
    event?.venue_country,
  ]
    .map((part: string | null | undefined) => (part ?? "").trim())
    .filter((part: string) => part.length > 0)
  return parts.length > 0 ? parts.join(", ") : "Venue details available in portal"
}

function renderTemplate(values: Record<string, string>): string {
  let html = TEMPLATE
  for (const [key, value] of Object.entries(values)) html = html.replaceAll(`{{${key}}}`, value)
  return html
}

export async function sendTicketReceiptEmail(req: Request, supabase: any, orderId: string, ticketsWithTokens?: Array<{ id?: string; qr_token_raw: string; entry_code: string; ticket_type_id: string }>) {
  const { data: order, error: orderError } = await supabase
    .from("ticket_orders")
    .select(`
      id, org_id, purchaser_email, purchaser_name, purchaser_user_id, status, created_at, subtotal_cents, tax_cents, fees_cents, total_cents, receipt_email_sent_at, stripe_checkout_session_id, stripe_payment_intent_id,
      ticketed_events (id, title, starts_at, venue_name, venue_address_line1, venue_address_line2, venue_city, venue_state, venue_postal_code, venue_country),
      organizations!ticket_orders_org_id_fkey (name)
    `)
    .eq("id", orderId)
    .single()

  if (orderError || !order) return json(req, { error: "Order not found" }, 404)
  if (order.status !== "paid") return json(req, { error: "Order is not paid" }, 400)
  if (order.receipt_email_sent_at) return json(req, { success: true, skipped: true, reason: "receipt_already_sent" })

  const { data: claimed, error: claimError } = await supabase
    .from("email_receipts")
    .insert({
      order_id: orderId,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
      stripe_session_id: order.stripe_checkout_session_id,
      buyer_email: order.purchaser_email,
      status: "processing",
    })
    .select("id")
    .maybeSingle()

  if (claimError) {
    if (claimError.code !== "23505") return json(req, { error: "Failed to claim receipt send" }, 500)
    const { data: existing } = await supabase.from("email_receipts").select("status, sent_at").eq("order_id", orderId).single()
    if (existing?.status === "sent" || existing?.sent_at) return json(req, { success: true, skipped: true, reason: "receipt_already_sent" })
    if (existing?.status === "processing") return json(req, { success: true, skipped: true, reason: "receipt_processing" })
    await supabase.from("email_receipts").update({ status: "processing", error_message: null, provider_message_id: null }).eq("order_id", orderId)
  } else if (!claimed) {
    return json(req, { success: true, skipped: true, reason: "receipt_already_sent" })
  }

  const { data: orderItems } = await supabase
    .from("ticket_order_items")
    .select("quantity, unit_price_cents, line_total_cents, ticket_types (name)")
    .eq("order_id", orderId)

  const { data: tickets } = await supabase
    .from("tickets")
    .select(`
      id,
      entry_code,
      ticket_type_id,
      ticket_types (name),
      seat_assignments!tickets_seat_assignment_id_fkey (
        seat_map_sections (
          section_name,
          row_identifier,
          seat_identifier
        )
      )
    `)
    .eq("order_id", orderId)

  const tokenById = new Map<string, string>()
  const tokenByCode = new Map<string, string>()
  for (const item of ticketsWithTokens ?? []) {
    if (item.id && item.qr_token_raw) tokenById.set(item.id, item.qr_token_raw)
    if (item.entry_code && item.qr_token_raw) tokenByCode.set(item.entry_code, item.qr_token_raw)
  }

  const lineItemsRows = (orderItems ?? []).length > 0
    ? (orderItems ?? [])
      .map((item: any) => `<tr><td style="padding:8px;border:1px solid #d1d5db;">${escapeHtml(item.ticket_types?.name ?? "Ticket")}</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${item.quantity ?? 0}</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${formatMoney(item.unit_price_cents)}</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${formatMoney(item.line_total_cents)}</td></tr>`)
      .join("")
    : `<tr><td style="padding:8px;border:1px solid #d1d5db;">Ticket</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">1</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${formatMoney(order.total_cents)}</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${formatMoney(order.total_cents)}</td></tr>`

  const feesTaxRows = [
    (order.tax_cents ?? 0) > 0 ? `<tr><td style="padding:8px;border:1px solid #d1d5db;">Tax</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">-</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">-</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${formatMoney(order.tax_cents)}</td></tr>` : "",
    (order.fees_cents ?? 0) > 0 ? `<tr><td style="padding:8px;border:1px solid #d1d5db;">Fees</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">-</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">-</td><td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${formatMoney(order.fees_cents)}</td></tr>` : "",
  ].join("")

  const ticketCodeRows = (tickets ?? []).length > 0
    ? (tickets ?? [])
      .map((ticket: any) => {
        const seat = ticket.seat_assignments?.seat_map_sections
        const seatText = seat
          ? `Section ${seat.section_name}, Row ${seat.row_identifier}, Seat ${seat.seat_identifier}`
          : ""
        return `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><div style="font-size:12px;color:#6b7280;">${escapeHtml(ticket.ticket_types?.name ?? "Ticket")}</div><div style="font-size:16px;font-weight:700;letter-spacing:.08em;">${escapeHtml(ticket.entry_code ?? "N/A")}</div>${seatText ? `<div style="font-size:12px;color:#4b5563;margin-top:4px;">${escapeHtml(seatText)}</div>` : ""}</td></tr>`
      })
      .join("")
    : `<tr><td style="padding:8px 0;color:#6b7280;">Ticket code available in portal.</td></tr>`

  const firstTicket = (tickets ?? [])[0]
  const qrValue = (firstTicket?.id ? tokenById.get(firstTicket.id) : undefined) ?? (firstTicket?.entry_code ? tokenByCode.get(firstTicket.entry_code) : undefined) ?? firstTicket?.entry_code ?? null
  let primaryQrBlock = ""
  if (qrValue) {
    try {
      const qrBase64 = await qrcode(qrValue, { size: 220 })
      primaryQrBlock = `<div style="margin-top:12px;text-align:center;"><div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Primary QR Code</div><img src="data:image/png;base64,${qrBase64}" alt="Ticket QR Code" width="220" height="220" style="border:1px solid #d1d5db;border-radius:8px;padding:8px;background:#fff;"/></div>`
    } catch {
      primaryQrBlock = ""
    }
  }

  const event = order.ticketed_events as any
  const baseUrl = Deno.env.get("SITE_URL") || "https://platform.youthsports.team"
  const html = renderTemplate({
    RECEIPT_ID: escapeHtml(order.id),
    ORGANIZATION_NAME: escapeHtml((order.organizations as any)?.name ?? "Organization"),
    EVENT_NAME: escapeHtml(event?.title ?? "Event"),
    EVENT_DATE: escapeHtml(formatDate(event?.starts_at)),
    EVENT_TIME: escapeHtml(formatTime(event?.starts_at)),
    VENUE_ADDRESS: escapeHtml(buildVenueAddress(event)),
    LINE_ITEMS_ROWS: lineItemsRows,
    FEES_TAX_ROWS: feesTaxRows,
    TOTAL_PAID: escapeHtml(formatMoney(order.total_cents)),
    PURCHASE_DATE_TIME: escapeHtml(formatDateTime(order.created_at)),
    BUYER_EMAIL: escapeHtml(order.purchaser_email),
    ORDER_ID: escapeHtml(order.id),
    STRIPE_REFERENCE: escapeHtml(order.stripe_payment_intent_id || order.stripe_checkout_session_id || "N/A"),
    TICKET_CODES_ROWS: ticketCodeRows,
    PRIMARY_QR_BLOCK: primaryQrBlock,
    MY_TICKETS_URL: escapeHtml(getFullUrl("portal.myTickets", baseUrl)),
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

// Base64URL encode (URL-safe base64)
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Base64URL decode
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(padding)
  const binary = atob(padded)
  return new Uint8Array([...binary].map(char => char.charCodeAt(0)))
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
    return `${baseUrl}/o/${orgSlug}/tickets/access?t=${encrypted}`
  }
  return `${baseUrl}/tickets/access?t=${encrypted}`
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
  const ticketsWithTokens = payload?.tickets_with_tokens as Array<{
    id?: string
    qr_token_raw: string
    entry_code: string
    ticket_type_id: string
  }> | undefined

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

    // Load tickets with ticket types for email
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        entry_code,
        ticket_type_id,
        ticket_types (
          name
        )
      `)
      .eq("order_id", orderId)

    if (ticketsError || !tickets || tickets.length === 0) {
      return json(req, { error: "No tickets found for order" }, 400)
    }

    // If tickets_with_tokens provided, use those; otherwise fall back to loading from DB
    const ticketsForEmail = ticketsWithTokens || tickets.map(t => ({
      id: t.id,
      qr_token_raw: "", // Will use entry_code fallback
      entry_code: t.entry_code,
      ticket_type_id: t.ticket_type_id,
    }))

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
    }

    // Build ticket URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://platform.youthsports.team"
    const orgSlug = (order.organizations as any)?.slug
    // Use org-scoped URL if slug exists, otherwise fall back to legacy pattern
    // For guest users, if token is null (link already exists), use org tickets page
    let ticketUrl: string
    if (order.purchaser_user_id) {
      ticketUrl = getFullUrl('portal.myTickets', baseUrl)
    } else if (token && orgSlug) {
      ticketUrl = getOrgTicketAccessUrl(orgSlug, token, baseUrl) // Guest magic link with org context
    } else if (token) {
      ticketUrl = getTicketAccessUrl(token, baseUrl) // Legacy guest magic link
    } else if (orgSlug) {
      // Link already exists, direct to org tickets page
      ticketUrl = getFullUrl('portal.orgTickets', baseUrl, { orgSlug })
    } else {
      ticketUrl = getFullUrl('portal.tickets', baseUrl)
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

    // Build ticket type lookup from order items
    const ticketTypeNames = new Map<string, string>()
    for (const item of (orderItems || [])) {
      ticketTypeNames.set(item.ticket_types?.id || "", item.ticket_types?.name || "Ticket")
    }

    // Build ticket links with QR tokens and access links
    const ticketLinks: Array<{
      ticket_id: string
      ticket_type_name: string
      entry_code: string
      qr_token_raw: string
      access_link: string
    }> = []

    // Map tickets to links with QR tokens
    for (const ticket of ticketsForEmail) {
      // Get ticket type name from lookup map
      const ticketTypeName = ticketTypeNames.get(ticket.ticket_type_id) || "Ticket"

      // Generate encrypted access link for this ticket
      const accessLink = await generateAccessLink(
        ticket.id!,
        ticket.qr_token_raw || ticket.entry_code,
        baseUrl,
        orgSlug
      )

      ticketLinks.push({
        ticket_id: ticket.id!,
        ticket_type_name: ticketTypeName,
        entry_code: ticket.entry_code,
        qr_token_raw: ticket.qr_token_raw,
        access_link: accessLink,
      })
    }

    // Generate QR codes for tickets (prefer QR token, fallback to entry_code)
    const ticketQRCodes: Array<{ ticket_id: string; qr_data_url: string }> = []
    for (const ticketLink of ticketLinks) {
      try {
        // Use QR token if available, otherwise use entry_code
        const qrValue = ticketLink.qr_token_raw || ticketLink.entry_code
        if (qrValue) {
          const qrBase64 = await qrcode(qrValue, { size: 250 })
          ticketQRCodes.push({
            ticket_id: ticketLink.ticket_id,
            qr_data_url: `data:image/png;base64,${qrBase64}`,
          })
        }
      } catch (qrError) {
        console.error(`Failed to generate QR code for ticket ${ticketLink.ticket_id}:`, qrError)
        // Continue without QR for this ticket
      }
    }
    
    // Legacy: first ticket QR for backward compatibility
    let qrImageDataUrl = ""
    if (ticketQRCodes.length > 0) {
      qrImageDataUrl = ticketQRCodes[0].qr_data_url
    }

    // Build payload for notification_jobs
    const notificationPayload = {
      ticket_url: ticketUrl,
      event_title: event?.title || "Event",
      event_date: eventDate,
      event_location: eventLocation,
      items_html: itemsHtml,
      total: `$${(order.total_cents / 100).toFixed(2)}`,
      qr_image_data_url: qrImageDataUrl, // Legacy: first ticket QR
      ticket_links: ticketLinks.map(link => ({
        ticket_id: link.ticket_id,
        ticket_type_name: link.ticket_type_name,
        entry_code: link.entry_code,
        access_link: link.access_link,
        formatted_entry_code: link.entry_code.length >= 12
          ? `${link.entry_code.slice(0, 4)}-${link.entry_code.slice(4, 8)}-${link.entry_code.slice(8)}`
          : link.entry_code.length >= 8
          ? `${link.entry_code.slice(0, 4)}-${link.entry_code.slice(4)}`
          : link.entry_code,
      })),
      ticket_qr_codes: ticketQRCodes, // QR codes keyed by ticket_id
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
