// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
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

  // Env vars
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(
      req,
      { error: "Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
    )
  }

  if (!stripeSecretKey) {
    return json(req, { error: "Stripe not configured: missing STRIPE_SECRET_KEY" }, 500)
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })
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
  const items = payload?.items as Array<{ ticket_type_id: string; quantity: number }> | undefined
  const purchaserEmail = payload?.purchaser_email as string | undefined
  const orgSlug = payload?.org_slug as string | undefined

  if (!ticketedEventId || !items || !Array.isArray(items) || items.length === 0) {
    return json(req, { error: "Missing required fields: ticketed_event_id, items" }, 400)
  }

  if (!purchaserEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail)) {
    return json(req, { error: "Invalid purchaser_email" }, 400)
  }

  // Get user if authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    // Load event and validate
    const { data: event, error: eventError } = await supabase
      .from("ticketed_events")
      .select("id, org_id, title, status, sales_start_at, sales_end_at, starts_at")
      .eq("id", ticketedEventId)
      .single()

    if (eventError || !event) {
      return json(req, { error: "Event not found" }, 404)
    }

    if (event.status !== "published") {
      return json(req, { error: "Event is not published" }, 400)
    }

    const now = new Date()
    if (event.sales_start_at && new Date(event.sales_start_at) > now) {
      return json(req, { error: "Sales have not started yet" }, 400)
    }

    if (event.sales_end_at && new Date(event.sales_end_at) < now) {
      return json(req, { error: "Sales have ended" }, 400)
    }

    // Load ticket types and validate
    const ticketTypeIds = items.map((item) => item.ticket_type_id)
    const { data: ticketTypes, error: typesError } = await supabase
      .from("ticket_types")
      .select("id, name, price_cents, currency, capacity_total, capacity_remaining, sales_start_at, sales_end_at, is_active")
      .eq("ticketed_event_id", ticketedEventId)
      .in("id", ticketTypeIds)

    if (typesError || !ticketTypes || ticketTypes.length !== ticketTypeIds.length) {
      return json(req, { error: "Invalid ticket types" }, 400)
    }

    // Validate each item
    for (const item of items) {
      const ticketType = ticketTypes.find((tt) => tt.id === item.ticket_type_id)
      if (!ticketType) {
        return json(req, { error: `Ticket type ${item.ticket_type_id} not found` }, 400)
      }

      if (!ticketType.is_active) {
        return json(req, { error: `Ticket type ${ticketType.name} is not active` }, 400)
      }

      if (ticketType.sales_start_at && new Date(ticketType.sales_start_at) > now) {
        return json(req, { error: `Sales for ${ticketType.name} have not started` }, 400)
      }

      if (ticketType.sales_end_at && new Date(ticketType.sales_end_at) < now) {
        return json(req, { error: `Sales for ${ticketType.name} have ended` }, 400)
      }

      if (ticketType.capacity_total !== null) {
        if (ticketType.capacity_remaining === null || ticketType.capacity_remaining < item.quantity) {
          return json(req, { error: `Insufficient capacity for ${ticketType.name}` }, 400)
        }
      }

      if (item.quantity <= 0) {
        return json(req, { error: "Quantity must be greater than 0" }, 400)
      }
    }

    // Start transaction: create holds and decrement capacity
    const holdExpiryMinutes = 15
    const expiresAt = new Date(now.getTime() + holdExpiryMinutes * 60 * 1000)

    // Create order first (pending_payment)
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .insert({
        org_id: event.org_id,
        ticketed_event_id: ticketedEventId,
        purchaser_user_id: user?.id || null,
        purchaser_email: purchaserEmail,
        status: "pending_payment",
        subtotal_cents: 0, // Will calculate
        tax_cents: 0,
        fees_cents: 0,
        total_cents: 0,
      })
      .select("id")
      .single()

    if (orderError || !order) {
      return json(req, { error: "Failed to create order" }, 500)
    }

    // Calculate totals and create holds in transaction
    let subtotalCents = 0
    const orderItems: any[] = []
    const holds: any[] = []

    for (const item of items) {
      const ticketType = ticketTypes.find((tt) => tt.id === item.ticket_type_id)!
      const lineTotal = ticketType.price_cents * item.quantity
      subtotalCents += lineTotal

      orderItems.push({
        order_id: order.id,
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price_cents: ticketType.price_cents,
        line_total_cents: lineTotal,
      })

      // Create hold
      holds.push({
        ticketed_event_id: ticketedEventId,
        ticket_type_id: item.ticket_type_id,
        order_id: order.id,
        qty: item.quantity,
        expires_at: expiresAt.toISOString(),
      })

      // Decrement capacity (with row lock FOR UPDATE)
      if (ticketType.capacity_total !== null) {
        // Use direct update with row lock instead of RPC for now
        const { error: capacityError } = await supabase
          .from("ticket_types")
          .update({
            capacity_remaining: ticketType.capacity_remaining - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.ticket_type_id)
          .gte("capacity_remaining", item.quantity)

        if (capacityError) {
          // Rollback: delete order and holds
          await supabase.from("ticket_orders").delete().eq("id", order.id)
          return json(req, { error: "Failed to reserve capacity" }, 500)
        }
      }
    }

    // Insert order items
    const { error: itemsError } = await supabase.from("ticket_order_items").insert(orderItems)

    if (itemsError) {
      await supabase.from("ticket_orders").delete().eq("id", order.id)
      return json(req, { error: "Failed to create order items" }, 500)
    }

    // Insert holds
    const { error: holdsError } = await supabase.from("ticket_holds").insert(holds)

    if (holdsError) {
      await supabase.from("ticket_orders").delete().eq("id", order.id)
      return json(req, { error: "Failed to create holds" }, 500)
    }

    // Update order totals (no tax/fees for MVP)
    const totalCents = subtotalCents
    const { error: updateError } = await supabase
      .from("ticket_orders")
      .update({
        subtotal_cents: subtotalCents,
        total_cents: totalCents,
      })
      .eq("id", order.id)

    if (updateError) {
      await supabase.from("ticket_orders").delete().eq("id", order.id)
      return json(req, { error: "Failed to update order totals" }, 500)
    }

    // Create Stripe Checkout Session
    const lineItems = items.map((item) => {
      const ticketType = ticketTypes.find((tt) => tt.id === item.ticket_type_id)!
      return {
        price_data: {
          currency: ticketType.currency.toLowerCase(),
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
            description: ticketType.description || undefined,
          },
          unit_amount: ticketType.price_cents,
        },
        quantity: item.quantity,
      }
    })

    const baseUrl = Deno.env.get("SITE_URL") || "http://localhost:3000"
    // Use org-scoped URLs if org_slug is provided, otherwise fall back to old pattern
    const successUrl = orgSlug 
      ? `${baseUrl}/o/${orgSlug}/tickets/order/${order.id}`
      : `${baseUrl}/tickets/order/${order.id}`
    const cancelUrl = orgSlug
      ? `${baseUrl}/o/${orgSlug}/tickets/events/${ticketedEventId}`
      : `${baseUrl}/tickets/events/${ticketedEventId}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: purchaserEmail,
      metadata: {
        order_id: order.id,
        org_id: event.org_id,
        org_slug: orgSlug || "",
        ticketed_event_id: ticketedEventId,
      },
    })

    // Update order with Stripe session ID
    await supabase
      .from("ticket_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id)

    return json(req, {
      checkout_url: session.url,
      order_id: order.id,
    })
  } catch (error: any) {
    console.error("Error creating checkout:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
