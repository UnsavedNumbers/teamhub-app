// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

// CORS helpers
function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type, x-staff-link-token"

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

// Hash token/code
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Normalize entry code
function normalizeEntryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "")
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

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  // Parse payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const ticketedEventId = payload?.ticketed_event_id as string | undefined
  const selectedEventId = payload?.selected_event_id as string | undefined // For event mismatch detection
  const qrTokenRaw = payload?.qr_token_raw as string | undefined
  const entryCode = payload?.entry_code as string | undefined
  const clientDeviceId = payload?.client_device_id as string | undefined
  const forceValidate = payload?.force_validate as boolean | undefined // Skip event check
  const crossEventAdmission = payload?.cross_event_admission as boolean | undefined // Log cross-event

  if (!ticketedEventId) {
    return json(req, { error: "Missing ticketed_event_id" }, 400)
  }

  if (!qrTokenRaw && !entryCode) {
    return json(req, { error: "Missing qr_token_raw or entry_code" }, 400)
  }

  // Auth: Either logged-in user or staff link token
  const authHeader = req.headers.get("Authorization")
  const staffLinkToken = req.headers.get("X-Staff-Link-Token")

  let scannerUserId: string | null = null
  let orgId: string | null = null
  let authorizedEventId: string | null = null

  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return json(req, { error: "Unauthorized" }, 401)
    }

    // Check if user is admin/coach for this org
    const { data: userData } = await supabase
      .from("users")
      .select("id, org_id, role")
      .eq("id", user.id)
      .single()

    if (!userData || userData.role !== "admin") {
      return json(req, { error: "Unauthorized: admin access required" }, 403)
    }

    scannerUserId = user.id
    orgId = userData.org_id
  } else if (staffLinkToken) {
    // Staff link token
    const tokenHash = await hashToken(staffLinkToken)

    const { data: staffLink } = await supabase
      .from("ticket_staff_links")
      .select("org_id, ticketed_event_id, expires_at, max_uses, use_count")
      .eq("token_hash", tokenHash)
      .single()

    if (!staffLink) {
      return json(req, { error: "Invalid staff link token" }, 401)
    }

    const now = new Date()
    if (new Date(staffLink.expires_at) < now) {
      return json(req, { error: "Staff link expired" }, 401)
    }

    if (staffLink.max_uses !== null && staffLink.use_count >= staffLink.max_uses) {
      return json(req, { error: "Staff link max uses reached" }, 401)
    }

    if (staffLink.ticketed_event_id !== ticketedEventId) {
      return json(req, { error: "Staff link not valid for this event" }, 403)
    }

    orgId = staffLink.org_id
    authorizedEventId = staffLink.ticketed_event_id

    // Increment use count
    await supabase
      .from("ticket_staff_links")
      .update({ use_count: staffLink.use_count + 1 })
      .eq("token_hash", tokenHash)
  } else {
    return json(req, { error: "Unauthorized: missing auth or staff link token" }, 401)
  }

  // Load event to verify org
  const { data: event } = await supabase
    .from("ticketed_events")
    .select("id, org_id")
    .eq("id", ticketedEventId)
    .single()

  if (!event) {
    return json(req, { error: "Event not found" }, 404)
  }

  if (event.org_id !== orgId) {
    return json(req, { error: "Unauthorized: wrong organization" }, 403)
  }

  // Find ticket by QR hash or entry code
  let ticket: any = null

  if (entryCode) {
    const normalized = normalizeEntryCode(entryCode)
    // For manual entry, require event match for scoping (unless force_validate)
    let query = supabase
      .from("tickets")
      .select("id, org_id, ticketed_event_id, order_id, ticket_type_id, status, used_at, used_by_user_id")
      .eq("entry_code", normalized)
    
    // Scope to event if provided and not forcing
    if (ticketedEventId && !forceValidate) {
      query = query.eq("ticketed_event_id", ticketedEventId)
    }
    
    const { data } = await query.single()
    ticket = data
  } else if (qrTokenRaw) {
    const qrTokenHash = await hashToken(qrTokenRaw)
    const { data } = await supabase
      .from("tickets")
      .select("id, org_id, ticketed_event_id, order_id, ticket_type_id, status, used_at, used_by_user_id")
      .eq("qr_token_hash", qrTokenHash)
      .single()
    ticket = data
  }

  if (!ticket) {
    // Record scan attempt
    await supabase.from("ticket_scans").insert({
      org_id: orgId!,
      ticketed_event_id: ticketedEventId,
      scanner_user_id: scannerUserId,
      scan_result: "not_found",
      client_device_id: clientDeviceId || null,
      raw_payload_hash: entryCode ? await hashToken(entryCode) : await hashToken(qrTokenRaw!),
      scan_method: entryCode ? "manual" : "qr",
    })

    return json(req, {
      result: "invalid",
      reason: "not_found",
      message: "Ticket not found",
    })
  }

  // Validate event match (unless force_validate)
  if (!forceValidate && ticket.ticketed_event_id !== ticketedEventId) {
    // Load event names for mismatch message
    const { data: ticketEvent } = await supabase
      .from("ticketed_events")
      .select("id, title")
      .eq("id", ticket.ticketed_event_id)
      .single()
    
    const { data: selectedEvent } = await supabase
      .from("ticketed_events")
      .select("id, title")
      .eq("id", ticketedEventId)
      .single()

    // Load ticket type for context
    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("name")
      .eq("id", ticket.ticket_type_id)
      .single()

    await supabase.from("ticket_scans").insert({
      org_id: orgId!,
      ticketed_event_id: ticketedEventId,
      ticket_id: ticket.id,
      scanner_user_id: scannerUserId,
      scan_result: "wrong_event",
      client_device_id: clientDeviceId || null,
      raw_payload_hash: entryCode ? await hashToken(entryCode) : await hashToken(qrTokenRaw!),
      scan_method: entryCode ? "manual" : "qr",
    })

    return json(req, {
      result: "wrong_event",
      reason: "wrong_event",
      event_mismatch: true,
      ticket_event_id: ticket.ticketed_event_id,
      ticket_event_name: ticketEvent?.title || "Unknown Event",
      selected_event_id: ticketedEventId,
      selected_event_name: selectedEvent?.title || "Unknown Event",
      ticket_type_name: ticketType?.name || null,
      qr_token_raw: qrTokenRaw || undefined, // Pass back for force_validate
      message: `This ticket is for "${ticketEvent?.title || "a different event"}". Currently validating for "${selectedEvent?.title || "this event"}".`,
    })
  }

  // Check status
  if (ticket.status === "refunded") {
    await supabase.from("ticket_scans").insert({
      org_id: orgId!,
      ticketed_event_id: ticketedEventId,
      ticket_id: ticket.id,
      scanner_user_id: scannerUserId,
      scan_result: "refunded",
      client_device_id: clientDeviceId || null,
      raw_payload_hash: entryCode ? await hashToken(entryCode) : await hashToken(qrTokenRaw!),
      scan_method: entryCode ? "manual" : "qr",
    })

    return json(req, {
      result: "invalid",
      reason: "refunded",
      message: "This ticket has been refunded",
    })
  }

  if (ticket.status === "voided") {
    await supabase.from("ticket_scans").insert({
      org_id: orgId!,
      ticketed_event_id: ticketedEventId,
      ticket_id: ticket.id,
      scanner_user_id: scannerUserId,
      scan_result: "voided",
      client_device_id: clientDeviceId || null,
      raw_payload_hash: entryCode ? await hashToken(entryCode) : await hashToken(qrTokenRaw!),
      scan_method: entryCode ? "manual" : "qr",
    })

    return json(req, {
      result: "invalid",
      reason: "voided",
      message: "This ticket has been voided",
    })
  }

  if (ticket.status === "used") {
    // Load original scan info
    const { data: originalScan } = await supabase
      .from("ticket_scans")
      .select("scanned_at, client_device_id")
      .eq("ticket_id", ticket.id)
      .eq("scan_result", "valid")
      .order("scanned_at", { ascending: true })
      .limit(1)
      .single()

    await supabase.from("ticket_scans").insert({
      org_id: orgId!,
      ticketed_event_id: ticketedEventId,
      ticket_id: ticket.id,
      scanner_user_id: scannerUserId,
      scan_result: "already_used",
      client_device_id: clientDeviceId || null,
      raw_payload_hash: entryCode ? await hashToken(entryCode) : await hashToken(qrTokenRaw!),
      scan_method: entryCode ? "manual" : "qr",
    })

    return json(req, {
      result: "already_used",
      used_at: ticket.used_at,
      original_scanned_at: originalScan?.scanned_at || null,
      original_device_id: originalScan?.client_device_id || null,
    })
  }

  // Valid ticket - mark as used in transaction
  if (ticket.status !== "active") {
    return json(req, {
      result: "invalid",
      reason: "invalid_status",
      message: "Ticket is not active",
    })
  }

  // Atomic update: set ticket used and insert scan
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      status: "used",
      used_at: now,
      used_by_user_id: scannerUserId,
    })
    .eq("id", ticket.id)
    .eq("status", "active") // Only update if still active (prevents race)

  if (updateError) {
    // Race condition - ticket was used between check and update
    const { data: updatedTicket } = await supabase
      .from("tickets")
      .select("used_at")
      .eq("id", ticket.id)
      .single()

    await supabase.from("ticket_scans").insert({
      org_id: orgId!,
      ticketed_event_id: ticketedEventId,
      ticket_id: ticket.id,
      scanner_user_id: scannerUserId,
      scan_result: "already_used",
      client_device_id: clientDeviceId || null,
      raw_payload_hash: entryCode ? await hashToken(entryCode) : await hashToken(qrTokenRaw!),
      scan_method: entryCode ? "manual" : "qr",
    })

    return json(req, {
      result: "already_used",
      used_at: updatedTicket?.used_at || null,
    })
  }

  // Log cross-event admission if applicable
  if (crossEventAdmission && ticket.ticketed_event_id !== ticketedEventId) {
    await supabase.from("cross_event_admissions").insert({
      ticket_id: ticket.id,
      ticket_event_id: ticket.ticketed_event_id,
      admitted_at_event_id: ticketedEventId,
      admitted_at: now,
      admitted_by: scannerUserId,
    }).catch(() => {
      // Ignore if table doesn't exist yet
    })
  }

  // Insert scan record
  await supabase.from("ticket_scans").insert({
    org_id: orgId!,
    ticketed_event_id: ticketedEventId,
    ticket_id: ticket.id,
    scanner_user_id: scannerUserId,
    scan_result: "valid",
    client_device_id: clientDeviceId || null,
    raw_payload_hash: entryCode ? await hashToken(entryCode) : await hashToken(qrTokenRaw!),
    scan_method: entryCode ? "manual" : "qr",
  })

  // Update first_scan_at on event if this is first scan
  await supabase
    .from("ticketed_events")
    .update({ first_scan_at: now })
    .eq("id", ticketedEventId)
    .is("first_scan_at", null)

  // Load ticket type name
  const { data: ticketType } = await supabase
    .from("ticket_types")
    .select("name")
    .eq("id", ticket.ticket_type_id)
    .single()

  // Get counts (validated this session, remaining capacity)
  const { count: validatedCount } = await supabase
    .from("ticket_scans")
    .select("*", { count: "exact", head: true })
    .eq("ticketed_event_id", ticketedEventId)
    .eq("scan_result", "valid")
    .gte("scanned_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h

  const { data: ticketTypeData } = await supabase
    .from("ticket_types")
    .select("capacity_total, capacity_remaining")
    .eq("id", ticket.ticket_type_id)
    .single()

  // Get order context for multi-ticket orders
  const { data: orderTickets } = await supabase
    .from("tickets")
    .select(`
      id,
      status,
      ticket_types (
        name
      )
    `)
    .eq("order_id", ticket.order_id)

  let orderContext: any = null
  if (orderTickets && orderTickets.length > 0) {
    const total = orderTickets.length
    const byStatus = {
      active: orderTickets.filter((t: any) => t.status === "active"),
      used: orderTickets.filter((t: any) => t.status === "used"),
      refunded: orderTickets.filter((t: any) => t.status === "refunded"),
    }
    
    // Find next ticket to validate (first active one, excluding current)
    const nextTicket = byStatus.active.find((t: any) => t.id !== ticket.id) || byStatus.active[0] || null
    
    // Group by ticket type
    const ticketsByType: Record<string, { total: number; active: number; used: number; refunded: number }> = {}
    orderTickets.forEach((t: any) => {
      const typeName = (t.ticket_types as any)?.name || "Unknown"
      if (!ticketsByType[typeName]) {
        ticketsByType[typeName] = { total: 0, active: 0, used: 0, refunded: 0 }
      }
      ticketsByType[typeName].total++
      const statusKey = t.status as string
      if (statusKey === 'active' || statusKey === 'used' || statusKey === 'refunded') {
        ticketsByType[typeName][statusKey]++
      }
    })

    orderContext = {
      order_id: ticket.order_id,
      total_tickets: total,
      active_count: byStatus.active.length,
      used_count: byStatus.used.length,
      refunded_count: byStatus.refunded.length,
      remaining_active: byStatus.active.length - 1, // Exclude current ticket
      next_ticket_id: nextTicket?.id || null,
      next_ticket_type: (nextTicket as any)?.ticket_types?.name || null,
      tickets_by_type: ticketsByType,
    }
  }

  // Load purchaser name for response
  const { data: order } = await supabase
    .from("ticket_orders")
    .select("purchaser_name")
    .eq("id", ticket.order_id)
    .single()

  return json(req, {
    result: "valid",
    ticket_type_name: ticketType?.name || null,
    event_confirmation: `Valid for ${ticketedEventId}`,
    validated_count: validatedCount || 0,
    remaining_capacity: ticketTypeData?.capacity_remaining ?? null,
    order_context: orderContext,
    purchaser_name: order?.purchaser_name || null,
  })
})
