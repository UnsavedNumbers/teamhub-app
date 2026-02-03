// deno-lint-ignore-file no-explicit-any
/**
 * Public Ticket Order Access
 * 
 * Allows guests to view their order and tickets without authentication.
 * The order ID serves as the access token (UUID is unguessable).
 * Expires the day after the event.
 */

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

  // Use service role to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  // Parse payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const orderId = payload?.order_id as string | undefined
  const orgId = payload?.org_id as string | undefined

  if (!orderId) {
    return json(req, { error: "Missing order_id" }, 400)
  }

  try {
    // Fetch order with related data
    let query = supabase
      .from("ticket_orders")
      .select(`
        id,
        status,
        total_cents,
        purchaser_name,
        purchaser_email,
        created_at,
        ticket_order_items (
          id,
          quantity,
          unit_price_cents,
          subtotal_cents,
          ticket_types (
            id,
            name,
            description
          )
        ),
        ticketed_events (
          id,
          title,
          starts_at,
          ends_at,
          venue_name,
          venue_city,
          venue_state
        )
      `)
      .eq("id", orderId)

    // Optionally scope to org for extra security
    if (orgId) {
      query = query.eq("org_id", orgId)
    }

    const { data: order, error: orderError } = await query.single()

    if (orderError || !order) {
      return json(req, { error: "Order not found" }, 404)
    }

    // Check if link is expired (day after event ends)
    const event = order.ticketed_events as any
    if (event?.ends_at || event?.starts_at) {
      const eventEndDate = new Date(event.ends_at || event.starts_at)
      // Set expiration to end of day after event
      const expirationDate = new Date(eventEndDate)
      expirationDate.setDate(expirationDate.getDate() + 1)
      expirationDate.setHours(23, 59, 59, 999)
      
      if (Date.now() > expirationDate.getTime()) {
        return json(req, { error: "Access expired - event has passed" }, 410)
      }
    }

    // Fetch tickets for this order
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        entry_code,
        status,
        used_at,
        ticket_types (
          id,
          name,
          description
        ),
        ticketed_events (
          id,
          title,
          starts_at,
          ends_at,
          venue_name,
          venue_city,
          venue_state
        )
      `)
      .eq("order_id", orderId)

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError)
    }

    return json(req, {
      order: {
        id: order.id,
        status: order.status,
        total_cents: order.total_cents,
        purchaser_name: order.purchaser_name,
        purchaser_email: order.purchaser_email,
        created_at: order.created_at,
        items: order.ticket_order_items,
        event: order.ticketed_events,
      },
      tickets: (tickets || []).map((t: any) => ({
        id: t.id,
        entry_code: t.entry_code,
        status: t.status,
        used_at: t.used_at,
        ticket_type: t.ticket_types,
        event: t.ticketed_events,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching order:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
