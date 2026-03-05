// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { getOrgTicketOrderUrl, getOrgTicketEventUrl, getFullUrl } from '../shared/url-generator.ts'

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

function toSeatSortValue(seatIdentifier: string): number | null {
  if (/^\d+$/.test(seatIdentifier)) {
    return Number(seatIdentifier)
  }

  if (/^[A-Za-z]+$/.test(seatIdentifier)) {
    return seatIdentifier
      .toUpperCase()
      .split("")
      .reduce((total, character) => total * 26 + (character.charCodeAt(0) - 64), 0)
  }

  return null
}

function areSeatsAdjacent(seatIdentifiers: string[]): boolean {
  if (seatIdentifiers.length <= 1) {
    return true
  }

  const normalizedValues = seatIdentifiers
    .map((seatIdentifier) => toSeatSortValue(seatIdentifier))
    .filter((value): value is number => value !== null)

  if (normalizedValues.length !== seatIdentifiers.length) {
    return false
  }

  normalizedValues.sort((left, right) => left - right)

  for (let seatIndex = 1; seatIndex < normalizedValues.length; seatIndex += 1) {
    if (normalizedValues[seatIndex] - normalizedValues[seatIndex - 1] !== 1) {
      return false
    }
  }

  return true
}

type CheckoutRole = "fan" | "guardian"

function normalizeCheckoutRole(role: unknown): CheckoutRole | null {
  if (typeof role !== "string") return null
  const normalized = role.trim().toLowerCase()
  if (normalized === "fan") return "fan"
  if (normalized === "guardian" || normalized === "parent") return "guardian"
  return null
}

function appendRoleParam(url: string, role: CheckoutRole | null): string {
  if (!role) return url
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("role", role)
    return parsed.toString()
  } catch {
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}role=${encodeURIComponent(role)}`
  }
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
  // Service role client without user auth for RLS-protected tables
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
  let pendingOrderId: string | null = null
  const decrementedCapacities: Array<{ ticket_type_id: string; quantity: number }> = []
  let rollbackAttempted = false

  const rollbackPendingOrder = async () => {
    if (!pendingOrderId || rollbackAttempted) return
    rollbackAttempted = true

    for (const entry of decrementedCapacities) {
      await supabaseAdmin.rpc("increment_ticket_capacity", {
        p_ticket_type_id: entry.ticket_type_id,
        p_quantity: entry.quantity,
      })
    }
    await supabaseAdmin.from("seat_holds").delete().eq("order_id", pendingOrderId)
    await supabaseAdmin.from("ticket_holds").delete().eq("order_id", pendingOrderId)
    await supabaseAdmin.from("ticket_orders").delete().eq("id", pendingOrderId)
  }

  // Parse payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const ticketedEventId = payload?.ticketed_event_id as string | undefined
  const items = payload?.items as Array<{ ticket_type_id: string; quantity: number }> | undefined
  const seatSelections = payload?.seat_selections as Array<{ ticket_type_id: string; seat_map_section_ids: string[] }> | undefined
  const purchaserEmail = payload?.purchaser_email as string | undefined
  const purchaserRole = normalizeCheckoutRole(payload?.purchaser_role)
  const orgSlug = payload?.org_slug as string | undefined
  const returnBaseUrl = payload?.return_base_url as string | undefined

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
      .select(
        `
        id,
        org_id,
        title,
        status,
        sales_start_at,
        sales_end_at,
        starts_at
      `.trim().replace(/\s+/g, " ")
      )
      .eq("id", ticketedEventId)
      .single()

    if (eventError || !event) {
      return json(req, { error: "Event not found" }, 400)
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

    // Fetch organization using admin client to bypass RLS
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, payout_account_id, payouts_enabled, slug")
      .eq("id", event.org_id)
      .single()

    if (orgError || !org) {
      return json(req, { error: "Organization not found" }, 400)
    }

    if (!org.payout_account_id || !org.payouts_enabled) {
      return json(req, { error: "Organization payment processing not available" }, 400)
    }

    // Validate Connect account ID format
    if (!org.payout_account_id.startsWith("acct_")) {
      return json(req, { error: "Invalid Connect account" }, 400)
    }

    // Verify Connect account exists in Stripe
    try {
      await stripe.accounts.retrieve(org.payout_account_id)
    } catch (stripeError: any) {
      console.error("Stripe Connect account validation failed:", {
        account_id: org.payout_account_id,
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
      })
      return json(
        req,
        {
          error: "Organization payment account is not properly configured",
          details: stripeError.message,
        },
        400
      )
    }

    // Load ticket types and validate
    const ticketTypeIds = items.map((item) => item.ticket_type_id)
    const { data: ticketTypes, error: typesError } = await supabase
      .from("ticket_types")
      .select("id, name, description, price_cents, currency, capacity_total, capacity_remaining, sales_start_at, sales_end_at, is_active, seating_mode, seat_map_id")
      .eq("ticketed_event_id", ticketedEventId)
      .in("id", ticketTypeIds)

    if (typesError || !ticketTypes || ticketTypes.length !== ticketTypeIds.length) {
      return json(req, { error: "Invalid ticket types" }, 400)
    }

    const seatSelectionsByType = new Map<string, string[]>()
    for (const selection of seatSelections ?? []) {
      if (!selection?.ticket_type_id) {
        continue
      }
      seatSelectionsByType.set(selection.ticket_type_id, selection.seat_map_section_ids ?? [])
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

      if (item.quantity <= 0) {
        return json(req, { error: "Quantity must be greater than 0" }, 400)
      }

      if (ticketType.seating_mode === "reserved_seating") {
        if (!ticketType.seat_map_id) {
          return json(req, { error: `Reserved seating is not configured for ${ticketType.name}` }, 400)
        }

        const selectedSeatIds = seatSelectionsByType.get(item.ticket_type_id) ?? []
        if (selectedSeatIds.length !== item.quantity) {
          return json(req, { error: `Please select ${item.quantity} seat(s) for ${ticketType.name}` }, 400)
        }

        if (item.quantity > 1) {
          const { data: selectedSeats, error: selectedSeatsError } = await supabase
            .from("seat_map_sections")
            .select("id, seat_map_id, section_name, row_identifier, seat_identifier")
            .in("id", selectedSeatIds)

          if (selectedSeatsError || !selectedSeats || selectedSeats.length !== item.quantity) {
            return json(req, { error: "Selected seats are invalid" }, 400)
          }

          const allSameSeatMap = selectedSeats.every((seat) => seat.seat_map_id === ticketType.seat_map_id)
          if (!allSameSeatMap) {
            return json(req, { error: "Selected seats must belong to the same seat map" }, 400)
          }

          const firstSeat = selectedSeats[0]
          const allSameRow = selectedSeats.every(
            (seat) => seat.section_name === firstSeat.section_name && seat.row_identifier === firstSeat.row_identifier,
          )
          if (!allSameRow) {
            return json(req, { error: "Selected seats must be in the same section and row" }, 400)
          }

          if (!areSeatsAdjacent(selectedSeats.map((seat) => seat.seat_identifier))) {
            return json(req, { error: "Selected seats must be adjacent" }, 400)
          }
        }
      } else if (ticketType.capacity_total !== null) {
        if (ticketType.capacity_remaining === null || ticketType.capacity_remaining < item.quantity) {
          return json(req, { error: `Insufficient capacity for ${ticketType.name}` }, 400)
        }
      }
    }

    // Start transaction: create holds and decrement capacity
    const holdExpiryMinutes = 15
    const expiresAt = new Date(now.getTime() + holdExpiryMinutes * 60 * 1000)

    // Create order first (pending_payment)
    const { data: order, error: orderError } = await supabaseAdmin
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
    pendingOrderId = order.id

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

      if (ticketType.seating_mode === "reserved_seating") {
        const seatIds = seatSelectionsByType.get(item.ticket_type_id) ?? []
        const { error: holdError } = await supabaseAdmin.rpc("lock_and_hold_reserved_seats", {
          p_order_id: order.id,
          p_seat_ids: seatIds,
          p_expires_at: expiresAt.toISOString(),
        })

        if (holdError) {
          await rollbackPendingOrder()
          return json(req, { error: holdError.message || "Seats no longer available" }, 400)
        }
      } else {
        holds.push({
          ticketed_event_id: ticketedEventId,
          ticket_type_id: item.ticket_type_id,
          order_id: order.id,
          qty: item.quantity,
          expires_at: expiresAt.toISOString(),
        })

        if (ticketType.capacity_total !== null) {
          const { error: capacityError } = await supabaseAdmin
            .from("ticket_types")
            .update({
              capacity_remaining: ticketType.capacity_remaining - item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.ticket_type_id)
            .gte("capacity_remaining", item.quantity)

          if (capacityError) {
            await rollbackPendingOrder()
            return json(req, { error: "Failed to reserve capacity" }, 500)
          }

          decrementedCapacities.push({
            ticket_type_id: item.ticket_type_id,
            quantity: item.quantity,
          })
        }
      }
    }

    // Insert order items
    const { error: itemsError } = await supabaseAdmin.from("ticket_order_items").insert(orderItems)

    if (itemsError) {
      await rollbackPendingOrder()
      return json(req, { error: "Failed to create order items" }, 500)
    }

    // Insert holds
    if (holds.length > 0) {
      const { error: holdsError } = await supabaseAdmin.from("ticket_holds").insert(holds)

      if (holdsError) {
        await rollbackPendingOrder()
        return json(req, { error: "Failed to create holds" }, 500)
      }
    }

    // Calculate platform fee ($1 per ticket) and org revenue
    const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0)
    const platformFeePerTicket = 100 // $1 in cents
    const platformFeeCents = totalTickets * platformFeePerTicket
    const totalCents = subtotalCents
    const orgRevenueCents = totalCents - platformFeeCents

    // Update order totals (no tax/fees for MVP)
    const { error: updateError } = await supabaseAdmin
      .from("ticket_orders")
      .update({
        subtotal_cents: subtotalCents,
        total_cents: totalCents,
      })
      .eq("id", order.id)

    if (updateError) {
      await rollbackPendingOrder()
      return json(req, { error: "Failed to update order totals" }, 500)
    }

    // Create Stripe Checkout Session with destination charges
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

    // Validate and normalize return_base_url (T1, T2, T9)
    let validatedBaseUrl: string | null = null
    if (returnBaseUrl) {
      try {
        const url = new URL(returnBaseUrl)
        // Require http or https protocol
        if ((url.protocol === "http:" || url.protocol === "https:") && 
            (url.pathname === "" || url.pathname === "/")) {
          // Normalize: trim and remove trailing slash
          validatedBaseUrl = url.origin.trim().replace(/\/$/, "")
        }
      } catch {
        // Invalid URL, ignore and use fallback
      }
    }
    
    // Use validated return_base_url or fallback to SITE_URL
    const baseUrl = validatedBaseUrl || Deno.env.get("SITE_URL") || "http://localhost:3000"
    // Normalize baseUrl: trim and ensure no trailing slash (T9)
    const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, "")

    // Use org-scoped URLs if org_slug is provided, otherwise fall back to old pattern
    const derivedOrgSlug = orgSlug || org.slug || ""
    const successUrl = derivedOrgSlug
      ? getOrgTicketOrderUrl(derivedOrgSlug, order.id, normalizedBaseUrl)
      : getFullUrl('portal.ticketOrderSuccess', normalizedBaseUrl, { orderId: order.id })
    const cancelUrl = derivedOrgSlug
      ? getOrgTicketEventUrl(derivedOrgSlug, ticketedEventId, normalizedBaseUrl)
      : getFullUrl('portal.ticketEventDetail', normalizedBaseUrl, { eventId: ticketedEventId })
    const successUrlWithRole = appendRoleParam(successUrl, purchaserRole)
    const cancelUrlWithRole = appendRoleParam(cancelUrl, purchaserRole)

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrlWithRole,
      cancel_url: cancelUrlWithRole,
      customer_email: purchaserEmail,
      metadata: {
        order_id: order.id,
        org_id: event.org_id,
        org_slug: orgSlug || "",
        ticketed_event_id: ticketedEventId,
        purchaser_role: purchaserRole || "",
        stripe_connect_account_id: org.payout_account_id,
        platform_fee_cents: platformFeeCents.toString(),
        org_revenue_cents: orgRevenueCents.toString(),
        total_tickets: totalTickets.toString(),
      },
    }

    // Add destination charge configuration
    sessionParams.payment_intent_data = {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: org.payout_account_id,
      },
    }

    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch {
      await rollbackPendingOrder()
      return json(req, { error: "Payment setup failed, please try again" }, 500)
    }

    // Update order with Stripe session ID and Connect fields
    await supabaseAdmin
      .from("ticket_orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_connect_account_id: org.payout_account_id,
        platform_fee_cents: platformFeeCents,
        org_revenue_cents: orgRevenueCents,
      })
      .eq("id", order.id)

    return json(req, {
      checkout_url: session.url,
      order_id: order.id,
    })
  } catch (error: any) {
    await rollbackPendingOrder()
    console.error("Error creating checkout:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
