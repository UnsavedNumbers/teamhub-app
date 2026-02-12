// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { qrcode } from "https://deno.land/x/qrcode/mod.ts"
import { getFullUrl } from "../shared/url-generator.ts"

const TEMPLATE = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Ticket Receipt</title></head><body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;"><tr><td style="padding:20px 20px 8px 20px;"><div style="font-size:24px;font-weight:700;">Ticket Receipt</div><div style="font-size:12px;color:#6b7280;">Receipt ID: {{RECEIPT_ID}}</div></td></tr><tr><td style="padding:0 20px 12px 20px;"><div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;"><div style="font-size:18px;font-weight:700;">{{EVENT_NAME}}</div><div style="margin-top:8px;font-size:14px;line-height:1.5;"><strong>Organization:</strong> {{ORGANIZATION_NAME}}<br/><strong>Date:</strong> {{EVENT_DATE}}<br/><strong>Time:</strong> {{EVENT_TIME}}<br/><strong>Venue:</strong> {{VENUE_ADDRESS}}</div></div></td></tr><tr><td style="padding:0 20px 12px 20px;"><div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;"><div style="font-size:16px;font-weight:700;margin-bottom:8px;">Order Summary</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr><th style="padding:8px;border:1px solid #d1d5db;background:#f3f4f6;text-align:left;font-size:12px;">Ticket Type</th><th style="padding:8px;border:1px solid #d1d5db;background:#f3f4f6;text-align:right;font-size:12px;">Qty</th><th style="padding:8px;border:1px solid #d1d5db;background:#f3f4f6;text-align:right;font-size:12px;">Unit</th><th style="padding:8px;border:1px solid #d1d5db;background:#f3f4f6;text-align:right;font-size:12px;">Subtotal</th></tr>{{LINE_ITEMS_ROWS}}{{FEES_TAX_ROWS}}</table><div style="margin-top:10px;padding:12px;border-radius:8px;background:#111827;color:#fff;text-align:center;font-size:18px;font-weight:700;">Total Paid: {{TOTAL_PAID}}</div><div style="margin-top:10px;font-size:14px;line-height:1.5;"><strong>Purchase Time:</strong> {{PURCHASE_DATE_TIME}}<br/><strong>Buyer Email:</strong> {{BUYER_EMAIL}}<br/><strong>Order ID:</strong> {{ORDER_ID}}<br/><strong>Stripe Ref:</strong> {{STRIPE_REFERENCE}}</div></div></td></tr><tr><td style="padding:0 20px 12px 20px;"><div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;"><div style="font-size:16px;font-weight:700;margin-bottom:8px;">Ticket Codes</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">{{TICKET_CODES_ROWS}}</table>{{PRIMARY_QR_BLOCK}}</div></td></tr><tr><td style="padding:0 20px 22px 20px;text-align:center;"><a href="{{MY_TICKETS_URL}}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">View My Tickets</a><div style="margin-top:8px;font-size:12px;color:#6b7280;">This link requires sign-in.</div></td></tr></table></td></tr></table></body></html>`

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders = req.headers.get("Access-Control-Request-Headers") ?? "authorization, x-client-info, apikey, content-type"
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
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
    .select("id, entry_code, ticket_type_id, ticket_types (name)")
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
      .map((ticket: any) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><div style="font-size:12px;color:#6b7280;">${escapeHtml(ticket.ticket_types?.name ?? "Ticket")}</div><div style="font-size:16px;font-weight:700;letter-spacing:.08em;">${escapeHtml(ticket.entry_code ?? "N/A")}</div></td></tr>`)
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

  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    await supabase.from("email_receipts").update({ status: "failed", error_message: "RESEND_API_KEY missing" }).eq("order_id", orderId)
    return json(req, { error: "Server misconfigured" }, 500)
  }

  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "notifications@youthsports.team",
      to: order.purchaser_email,
      subject: `Ticket Receipt - ${event?.title ?? "Event"}`,
      html,
      text,
    }),
  })

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text()
    await supabase.from("email_receipts").update({ status: "failed", error_message: `Resend error: ${resendResponse.status} ${errorBody}` }).eq("order_id", orderId)
    return json(req, { error: "Failed to send receipt email" }, 500)
  }

  const resendData = await resendResponse.json()
  const sentAt = new Date().toISOString()
  await supabase.from("email_receipts").update({ status: "sent", sent_at: sentAt, provider_message_id: resendData?.id ?? null, error_message: null }).eq("order_id", orderId)
  await supabase.from("ticket_orders").update({ receipt_email_sent_at: sentAt }).eq("id", orderId)
  return json(req, { success: true, email_sent: true, provider_message_id: resendData?.id ?? null })
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) return json(req, { error: "Server misconfigured" }, 500)
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceRoleKey}`) return json(req, { error: "Unauthorized" }, 401)

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }
  const orderId = payload?.order_id as string | undefined
  const ticketsWithTokens = payload?.tickets_with_tokens as Array<{ id?: string; qr_token_raw: string; entry_code: string; ticket_type_id: string }> | undefined
  if (!orderId) return json(req, { error: "Missing order_id" }, 400)

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  return await sendTicketReceiptEmail(req, supabase, orderId, ticketsWithTokens)
})
