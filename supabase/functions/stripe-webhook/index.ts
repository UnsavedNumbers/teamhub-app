// deno-lint-ignore-file no-explicit-any
// Single webhook for all Stripe events (billing + ticketing). Secret: STRIPE_WEBHOOK_SECRET.
// Handles: checkout.session.completed, charge.refunded, invoice.paid, invoice.payment_failed,
// customer.subscription.updated, customer.subscription.deleted, payment_intent.succeeded,
// payment_intent.payment_failed, account.updated
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!

const priceStarter = Deno.env.get("STRIPE_PRICE_STARTER_YEAR")
const priceStandard = Deno.env.get("STRIPE_PRICE_STANDARD_YEAR")
const pricePro = Deno.env.get("STRIPE_PRICE_PRO_YEAR")

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Missing required environment configuration")
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

// Payment types for webhook responses
const PAYMENT_TYPES = {
  TICKET_SALE: "ticket_sale",
  GUARDIAN_FEE: "guardian_fee",
  ORG_LICENSE: "org_license",
  UNKNOWN: "unknown",
} as const

type PaymentType = typeof PAYMENT_TYPES[keyof typeof PAYMENT_TYPES]

// Determine payment type from checkout session metadata
function determinePaymentType(session: Stripe.Checkout.Session): PaymentType {
  // Ticket sale: has order_id and ticketed_event_id in metadata
  if (session.metadata?.order_id && session.metadata?.ticketed_event_id) {
    return PAYMENT_TYPES.TICKET_SALE
  }
  // Guardian fee: has checkout_session_id (our internal checkout) in metadata and is payment mode
  if (session.mode === "payment" && session.metadata?.checkout_session_id) {
    return PAYMENT_TYPES.GUARDIAN_FEE
  }
  // Organization license: subscription mode
  if (session.mode === "subscription") {
    return PAYMENT_TYPES.ORG_LICENSE
  }
  return PAYMENT_TYPES.UNKNOWN
}

// Build descriptive response for Stripe
function buildWebhookResponse(options: {
  received: boolean
  payment_type?: PaymentType
  message?: string
  order_id?: string | null
  org_id?: string | null
  amount_cents?: number | null
  tickets_created?: number
  subscription_id?: string | null
  plan?: string | null
  skipped?: string
  error?: string
}): Response {
  const body = {
    received: options.received,
    ...(options.payment_type && { payment_type: options.payment_type }),
    ...(options.message && { message: options.message }),
    ...(options.order_id && { order_id: options.order_id }),
    ...(options.org_id && { org_id: options.org_id }),
    ...(options.amount_cents !== undefined && options.amount_cents !== null && { amount_cents: options.amount_cents }),
    ...(options.tickets_created !== undefined && { tickets_created: options.tickets_created }),
    ...(options.subscription_id && { subscription_id: options.subscription_id }),
    ...(options.plan && { plan: options.plan }),
    ...(options.skipped && { skipped: options.skipped }),
    ...(options.error && { error: options.error }),
    processed_at: new Date().toISOString(),
  }
  return new Response(JSON.stringify(body), {
    status: options.error ? 400 : 200,
    headers: { "Content-Type": "application/json" },
  })
}

// Generate QR token (128-bit+ opaque) - returns both raw and hash
async function generateSecureToken(): Promise<{ raw: string; hash: string }> {
  // Generate 64-character token (two UUIDs concatenated)
  const uuid1 = crypto.randomUUID()
  const uuid2 = crypto.randomUUID()
  const raw = uuid1.replace(/-/g, '') + uuid2.replace(/-/g, '')
  const hash = await hashToken(raw)
  return { raw, hash }
}

// Legacy function for backward compatibility (deprecated)
function generateQrToken(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// Generate entry code (8-10 chars, safe alphabet)
function generateEntryCode(): string {
  const safeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
  const length = 8 + Math.floor(Math.random() * 3) // 8-10 chars
  let code = ""
  for (let i = 0; i < length; i++) {
    code += safeAlphabet[Math.floor(Math.random() * safeAlphabet.length)]
  }
  return code
}

// Hash token/code
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function priceToPlan(priceId: string | null): string | null {
  switch (priceId) {
    case priceStarter:
      return "starter"
    case priceStandard:
      return "standard"
    case pricePro:
      return "pro"
    default:
      return null
  }
}

// Extract org_id robustly from different Stripe object types
function extractOrgIdFromEvent(event: Stripe.Event): string | null {
  const obj: any = event.data.object as any

  // Checkout Session has client_reference_id and metadata
  // Ticketing uses metadata.org_id, billing uses metadata.organization_id
  if (event.type.startsWith("checkout.session.")) {
    return (obj?.metadata?.organization_id ?? obj?.metadata?.org_id ?? null) as string | null
  }

  // Subscription might have metadata if you set it (recommended)
  if (event.type.startsWith("customer.subscription.")) {
    return (obj?.metadata?.organization_id ?? null) as string | null
  }

  // Invoices sometimes contain subscription details; org_id usually not present unless you add metadata upstream
  if (event.type.startsWith("invoice.")) {
    return (obj?.metadata?.organization_id ?? null) as string | null
  }

  // PaymentIntent typically won’t carry org_id unless you attach metadata yourself
  if (event.type.startsWith("payment_intent.")) {
    return (obj?.metadata?.organization_id ?? null) as string | null
  }

  return null
}

async function upsertLicense(
  supabase: any,
  orgId: string,
  payload: {
    status?: string
    plan?: string | null
    current_period_start?: number | null
    current_period_end?: number | null
    cancel_at_period_end?: boolean | null
    trial_end?: number | null
    grace_days?: number | null
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    stripe_price_id?: string | null
    stripe_latest_invoice_id?: string | null
  },
) {
  const graceDays = payload.grace_days ?? 0
  const graceEndsAt =
    payload.current_period_end
      ? new Date(payload.current_period_end * 1000 + graceDays * 24 * 60 * 60 * 1000)
      : null

  // IMPORTANT: use org_id (not organization_id)
  const record = {
    org_id: orgId,
    status: payload.status,
    plan: payload.plan,
    current_period_start: payload.current_period_start ? new Date(payload.current_period_start * 1000).toISOString() : null,
    current_period_end: payload.current_period_end ? new Date(payload.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: payload.cancel_at_period_end ?? false,
    trial_ends_at: payload.trial_end ? new Date(payload.trial_end * 1000).toISOString() : null,
    grace_ends_at: graceEndsAt ? graceEndsAt.toISOString() : null,
    stripe_customer_id: payload.stripe_customer_id,
    stripe_subscription_id: payload.stripe_subscription_id,
    stripe_price_id: payload.stripe_price_id,
    stripe_latest_invoice_id: payload.stripe_latest_invoice_id,
  }

  const { error: upsertErr } = await supabase
    .from("org_licenses")
    .upsert(record, { onConflict: "org_id" })

  if (upsertErr) throw upsertErr

  const { error: rpcErr } = await supabase.rpc("sync_org_license_summary", { org_id: orgId })
  if (rpcErr) throw rpcErr
}

async function markFeeAssignmentPaid(
  supabase: any,
  feeAssignmentId: string,
  amountPaidCents: number,
) {
  // Read current state (needed if you support partial payments / multiple payments)
  const { data: fa, error: faErr } = await supabase
    .from("fee_assignments")
    .select("id, amount_cents, paid_cents_total, balance_cents")
    .eq("id", feeAssignmentId)
    .single()

  if (faErr) throw faErr

  const newPaid = (fa.paid_cents_total ?? 0) + amountPaidCents
  const newBalance = Math.max(fa.amount_cents - newPaid, 0)

  const newStatus =
    newBalance === 0 ? "paid" :
      newPaid > 0 ? "partial" :
        "unpaid"

  const { error: updErr } = await supabase
    .from("fee_assignments")
    .update({
      paid_cents_total: newPaid,
      balance_cents: newBalance,
      status: newStatus,
    })
    .eq("id", feeAssignmentId)

  if (updErr) throw updErr
}

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const signature = req.headers.get("stripe-signature")
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature ?? "", stripeWebhookSecret)
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }

  // Idempotency guard
  const { data: existing, error: existingErr } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle()

  if (existingErr) {
    // If billing_events is misconfigured, you still want webhook processing to proceed,
    // but you should see this in logs.
    console.error("billing_events lookup error:", existingErr.message)
  } else if (existing?.id) {
    return buildWebhookResponse({ received: true, skipped: "already_processed", message: "Event was already processed" })
  }

  const orgId = extractOrgIdFromEvent(event)

  // Best-effort logging (don’t block billing if logging fails)
  // Insert-first idempotency: insert billing_events; if unique constraint violation (already exists), skip processing
  const { data: insertedEvent, error: insertEventErr } = await supabase
    .from("billing_events")
    .insert({
      org_id: orgId,
      event_type: event.type,
      stripe_event_id: event.id,
      stripe_object_id: (event.data.object as any)?.id,
      payload: event,
    })
    .select("id")
    .single()

  // If insert fails with unique constraint (23505), event was already processed
  if (insertEventErr) {
    if (insertEventErr.code === "23505") {
      // Unique constraint violation - event already processed
      return buildWebhookResponse({ received: true, skipped: "already_processed", message: "Event was already processed (duplicate)" })
    }
    // Other DB errors - skip processing (no audit row)
    console.error("billing_events insert error:", insertEventErr.message)
    return buildWebhookResponse({ received: true, skipped: "insert_failed", message: "Failed to log event" })
  }

  // If no row was returned, skip processing
  if (!insertedEvent?.id) {
    return buildWebhookResponse({ received: true, skipped: "already_processed", message: "Event was already processed" })
  }

  // Track the result of processing for the final response
  let webhookResult: {
    payment_type?: PaymentType
    message?: string
    order_id?: string | null
    org_id?: string | null
    amount_cents?: number | null
    tickets_created?: number
    subscription_id?: string | null
    plan?: string | null
  } = {}

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const paymentType = determinePaymentType(session)

        // Ticketing checkout: check for order_id and ticketed_event_id in metadata
        const orderId = session.metadata?.order_id as string | null
        const ticketedEventId = session.metadata?.ticketed_event_id as string | null

        if (session.mode === "payment" && orderId && ticketedEventId) {
          // TICKET SALE - Process ticketing checkout
          webhookResult.payment_type = PAYMENT_TYPES.TICKET_SALE
          const metadataOrgId = session.metadata?.org_id as string | null
          const stripeConnectAccountId = session.metadata?.stripe_connect_account_id as string | null
          const platformFeeCentsStr = session.metadata?.platform_fee_cents as string | null
          const orgRevenueCentsStr = session.metadata?.org_revenue_cents as string | null
          const totalTicketsStr = session.metadata?.total_tickets as string | null

          if (!metadataOrgId) {
            break // Invalid ticketing checkout
          }

          // Load order (including Connect fields)
          const { data: order, error: orderError } = await supabase
            .from("ticket_orders")
            .select("id, org_id, ticketed_event_id, status, total_cents, stripe_connect_account_id")
            .eq("id", orderId)
            .single()

          if (orderError || !order) {
            throw new Error("Order not found")
          }

          // Order status guard: skip if already processed
          if (order.status !== "pending_payment") {
            await supabase.from("stripe_webhook_receipts").insert({
              stripe_event_id: event.id,
              outcome: "skipped",
            })
            break
          }

          // Verify amounts match
          const amountTotal = session.amount_total || 0
          if (amountTotal !== order.total_cents) {
            throw new Error(`Amount mismatch: session ${amountTotal} vs order ${order.total_cents}`)
          }

          // Handle Connect destination charges if metadata present
          let stripeChargeId: string | null = null
          let stripeApplicationFeeId: string | null = null
          let applicationFeeAmount = 0

          if (stripeConnectAccountId && session.payment_intent) {
            // Validate Connect account matches order
            if (order.stripe_connect_account_id && order.stripe_connect_account_id !== stripeConnectAccountId) {
              throw new Error("Connect account mismatch")
            }

            // Retrieve PaymentIntent with expand to get charge and application fee
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(
                session.payment_intent as string,
                { expand: ["charges.data"] }
              )

              // If charges.data is empty, retry once after short delay
              if (!paymentIntent.charges?.data || paymentIntent.charges.data.length === 0) {
                await new Promise((resolve) => setTimeout(resolve, 1500))
                const retryPaymentIntent = await stripe.paymentIntents.retrieve(
                  session.payment_intent as string,
                  { expand: ["charges.data"] }
                )
                if (retryPaymentIntent.charges?.data && retryPaymentIntent.charges.data.length > 0) {
                  const charge = retryPaymentIntent.charges.data.find((c) => c.status === "succeeded") || retryPaymentIntent.charges.data[0]
                  stripeChargeId = charge.id
                  applicationFeeAmount = paymentIntent.application_fee_amount || 0
                  stripeApplicationFeeId = paymentIntent.application_fee_amount ? (paymentIntent.application_fee as string) || null : null
                }
              } else {
                const charge = paymentIntent.charges.data.find((c) => c.status === "succeeded") || paymentIntent.charges.data[0]
                stripeChargeId = charge.id
                applicationFeeAmount = paymentIntent.application_fee_amount || 0
                stripeApplicationFeeId = paymentIntent.application_fee_amount ? (paymentIntent.application_fee as string) || null : null
              }

              // Recompute platform fee from order items for validation
              const { data: orderItemsForFee } = await supabase
                .from("ticket_order_items")
                .select("quantity")
                .eq("order_id", orderId)

              if (orderItemsForFee) {
                const totalTicketsFromDB = orderItemsForFee.reduce((sum, item) => sum + item.quantity, 0)
                const expectedFee = totalTicketsFromDB * 100 // $1 per ticket
                if (applicationFeeAmount !== expectedFee && platformFeeCentsStr) {
                  console.warn(`Fee mismatch: expected ${expectedFee}, got ${applicationFeeAmount}, metadata says ${platformFeeCentsStr}`)
                }
              }
            } catch (piError: any) {
              console.error("Error retrieving PaymentIntent:", piError)
              // Continue without Connect fields if PaymentIntent retrieval fails
            }
          }

          // Finalize holds (check if expired)
          const { data: holds } = await supabase
            .from("ticket_holds")
            .select("id, ticket_type_id, qty, expires_at")
            .eq("order_id", orderId)
          const { data: seatHolds } = await supabase
            .from("seat_holds")
            .select("id, seat_map_section_id, expires_at")
            .eq("order_id", orderId)

          const now = new Date()
          for (const hold of holds || []) {
            if (new Date(hold.expires_at) < now) {
              // Hold expired - release capacity and cancel order
              await supabase.rpc("increment_ticket_capacity", {
                p_ticket_type_id: hold.ticket_type_id,
                p_quantity: hold.qty,
              })
              await supabase.from("ticket_orders").update({ status: "cancelled" }).eq("id", orderId)
              throw new Error("Hold expired, order cancelled")
            }
          }
          for (const hold of seatHolds || []) {
            if (new Date(hold.expires_at) < now) {
              await supabase.from("seat_holds").delete().eq("order_id", orderId)
              await supabase.from("ticket_holds").delete().eq("order_id", orderId)
              await supabase.from("ticket_orders").update({ status: "cancelled" }).eq("id", orderId)
              throw new Error("Seat hold expired, order cancelled")
            }
          }

          // Load order items
          const { data: orderItems, error: itemsError } = await supabase
            .from("ticket_order_items")
            .select("ticket_type_id, quantity")
            .eq("order_id", orderId)

          if (itemsError || !orderItems) {
            throw new Error("Failed to load order items")
          }

          // Create tickets with raw tokens for email
          const tickets: any[] = []
          const ticketsWithRawTokens: Array<{ ticket: any; qr_token_raw: string }> = []
          
          for (const item of orderItems) {
            for (let i = 0; i < item.quantity; i++) {
              const { raw: qrTokenRaw, hash: qrTokenHash } = await generateSecureToken()
              const entryCode = generateEntryCode()
              // Store entry code normalized (uppercase, no dashes)
              const entryCodeNormalized = entryCode.toUpperCase().replace(/[^A-Z0-9]/g, "")

              const ticket = {
                org_id: order.org_id,
                ticketed_event_id: order.ticketed_event_id,
                order_id: orderId,
                ticket_type_id: item.ticket_type_id,
                status: "active",
                qr_token_hash: qrTokenHash,
                entry_code: entryCodeNormalized,
              }
              
              tickets.push(ticket)
              ticketsWithRawTokens.push({ ticket, qr_token_raw: qrTokenRaw })
            }
          }

          // Insert tickets and get IDs back
          const { data: insertedTickets, error: ticketsError } = await supabase
            .from("tickets")
            .insert(tickets)
            .select("id, entry_code, ticket_type_id")

          if (ticketsError || !insertedTickets) {
            throw new Error(`Failed to create tickets: ${ticketsError?.message || "Unknown error"}`)
          }

          const ticketTypeIds = Array.from(new Set(orderItems.map((item) => item.ticket_type_id)))
          const { data: orderItemTicketTypes, error: orderItemTicketTypesError } = await supabase
            .from("ticket_types")
            .select("id, seating_mode")
            .in("id", ticketTypeIds)

          if (orderItemTicketTypesError) {
            throw new Error("Failed to load ticket type seating modes")
          }

          const reservedTypeIds = new Set(
            (orderItemTicketTypes ?? [])
              .filter((ticketType: any) => ticketType.seating_mode === "reserved_seating")
              .map((ticketType: any) => ticketType.id as string),
          )

          const reservedTickets = insertedTickets.filter((ticket) => reservedTypeIds.has(ticket.ticket_type_id))
          if (reservedTickets.length > 0) {
            const orderedSeatHolds = [...(seatHolds ?? [])].sort(
              (left, right) => new Date(left.expires_at).getTime() - new Date(right.expires_at).getTime(),
            )

            if (orderedSeatHolds.length !== reservedTickets.length) {
              throw new Error("Reserved seat hold count mismatch")
            }

            const seatAssignmentsPayload = reservedTickets.map((ticket, index) => ({
              ticket_id: ticket.id,
              seat_map_section_id: orderedSeatHolds[index].seat_map_section_id,
            }))

            const { data: insertedAssignments, error: assignmentError } = await supabase
              .from("seat_assignments")
              .insert(seatAssignmentsPayload)
              .select("id, ticket_id")

            if (assignmentError || !insertedAssignments) {
              throw new Error("Failed to create seat assignments")
            }

            for (const assignment of insertedAssignments) {
              const { error: ticketUpdateError } = await supabase
                .from("tickets")
                .update({ seat_assignment_id: assignment.id })
                .eq("id", assignment.ticket_id)

              if (ticketUpdateError) {
                throw new Error("Failed to link ticket seat assignment")
              }
            }
          }

          // Update order status and Connect fields
          const orderUpdateData: any = {
            status: "paid",
            stripe_payment_intent_id: session.payment_intent as string | null,
            processed_at: new Date().toISOString(),
          }

          // Sync purchaser email/name from Stripe session (customer may have changed it during checkout)
          // This ensures our ticket receipt and Stripe receipt go to the email the customer actually used
          const sessionEmail = (session.customer_details?.email ?? session.customer_email) as string | undefined
          if (sessionEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sessionEmail)) {
            orderUpdateData.purchaser_email = sessionEmail
            const sessionName = (session.customer_details?.name ?? null) as string | null
            if (sessionName?.trim()) {
              orderUpdateData.purchaser_name = sessionName.trim()
            }
          }

          if (stripeChargeId) {
            orderUpdateData.stripe_charge_id = stripeChargeId
          }
          if (stripeApplicationFeeId) {
            orderUpdateData.stripe_application_fee_id = stripeApplicationFeeId
          }

          const { error: updateError } = await supabase
            .from("ticket_orders")
            .update(orderUpdateData)
            .eq("id", orderId)

          if (updateError) {
            throw new Error("Failed to update order status")
          }

          // Insert Connect transaction record if Connect metadata present
          if (stripeConnectAccountId && stripeChargeId && applicationFeeAmount > 0) {
            try {
              const grossAmount = amountTotal
              const netAmount = grossAmount - applicationFeeAmount

              const { error: transactionError } = await supabase
                .from("stripe_connect_transactions")
                .insert({
                  ticket_order_id: orderId,
                  stripe_charge_id: stripeChargeId,
                  stripe_application_fee_id: stripeApplicationFeeId,
                  connect_account_id: stripeConnectAccountId,
                  gross_amount_cents: grossAmount,
                  application_fee_cents: applicationFeeAmount,
                  net_amount_cents: netAmount,
                })

              if (transactionError) {
                // Check for unique violation (23505)
                if (transactionError.code !== "23505") {
                  console.error("Failed to insert Connect transaction:", transactionError)
                  // Log but don't fail webhook - order is already marked paid
                }
              }
            } catch (txError: any) {
              console.error("Error inserting Connect transaction:", txError)
              // Continue - order is already updated
            }
          }

          // Delete holds (they're finalized)
          await supabase.from("ticket_holds").delete().eq("order_id", orderId)
          await supabase.from("seat_holds").delete().eq("order_id", orderId)

          // Send receipt (call tickets-send-receipt Edge Function)
          // Pass raw tokens for QR code generation and access links
          const baseUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || ""
          try {
            // Map inserted tickets with their raw tokens for email payload
            const ticketsForEmail = insertedTickets.map((insertedTicket) => {
              const match = ticketsWithRawTokens.find(
                ({ ticket }) =>
                  ticket.entry_code === insertedTicket.entry_code &&
                  ticket.ticket_type_id === insertedTicket.ticket_type_id,
              )
              return {
                id: insertedTicket.id,
                qr_token_raw: match?.qr_token_raw || "",
                entry_code: insertedTicket.entry_code,
                ticket_type_id: insertedTicket.ticket_type_id,
              }
            })
            
            await fetch(`${baseUrl}/functions/v1/tickets-send-receipt`, {
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
            // Don't fail the webhook if receipt fails
          }

          // Record success in stripe_webhook_receipts for audit parity
          await supabase.from("stripe_webhook_receipts").insert({
            stripe_event_id: event.id,
            outcome: "success",
          })

          // Set webhook result for ticket sale
          webhookResult.order_id = orderId
          webhookResult.org_id = metadataOrgId
          webhookResult.amount_cents = amountTotal
          webhookResult.tickets_created = insertedTickets.length
          webhookResult.message = `Ticket sale completed: ${insertedTickets.length} ticket(s) created for order ${orderId.slice(-8).toUpperCase()}`

          break
        } else if (session.mode === "payment") {
          // GUARDIAN FEE - Membership payment: check for checkout_session_id in metadata
          webhookResult.payment_type = PAYMENT_TYPES.GUARDIAN_FEE
          const checkoutSessionId = session.metadata?.checkout_session_id as string | null
          const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null
          if (!checkoutSessionId || !paymentIntentId) break

          const { data: checkout } = await supabase
            .from("checkout_sessions")
            .select("id, org_id, parent_id")
            .eq("id", checkoutSessionId)
            .maybeSingle()
          if (!checkout) break

          const existingPayment = await supabase
            .from("payments")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .maybeSingle()

          if (!existingPayment.data) {
            await supabase.from("payments").insert({
              org_id: checkout.org_id,
              checkout_session_id: checkout.id,
              parent_id: checkout.parent_id,
              amount_cents: session.amount_total ?? 0,
              currency: session.currency ?? "usd",
              stripe_payment_intent_id: paymentIntentId,
              stripe_charge_id: typeof session.latest_charge === "string" ? session.latest_charge : null,
              platform_fee_cents: 0,
              status: "pending",
            })
          }

          await supabase
            .from("checkout_sessions")
            .update({
              status: "pending",
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", checkout.id)

          // Set webhook result for guardian fee
          webhookResult.org_id = checkout.org_id
          webhookResult.amount_cents = session.amount_total ?? 0
          webhookResult.message = `Guardian fee checkout received: $${((session.amount_total ?? 0) / 100).toFixed(2)} for checkout ${checkoutSessionId.slice(-8).toUpperCase()}`

          break
        }

        // ORG LICENSE - Your edge function creates subscription Checkout Sessions
        if (session.mode !== "subscription") break

        webhookResult.payment_type = PAYMENT_TYPES.ORG_LICENSE
        const subId = typeof session.subscription === "string" ? session.subscription : null
        const resolvedOrgId =
          (session.client_reference_id ?? session.metadata?.org_id ?? session.metadata?.organization_id ?? null) as string | null

        if (!subId || !resolvedOrgId) break

        const subscription = await stripe.subscriptions.retrieve(subId)
        const priceId = subscription.items.data[0]?.price?.id ?? null
        const plan = priceToPlan(priceId)

        await upsertLicense(supabase, resolvedOrgId, {
          status: subscription.status === "trialing" ? "trial" : "active",
          plan,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_end: subscription.trial_end,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          stripe_latest_invoice_id: subscription.latest_invoice as string | null,
        })

        // OPTIONAL: update your checkout_sessions row status if you stored checkout_session_id in metadata
        const checkoutSessionId = session.metadata?.checkout_session_id as string | undefined
        if (checkoutSessionId) {
          await supabase
            .from("checkout_sessions")
            .update({ status: "succeeded", stripe_checkout_session_id: session.id })
            .eq("id", checkoutSessionId)
        }

        // Set webhook result for org license
        webhookResult.org_id = resolvedOrgId
        webhookResult.subscription_id = subscription.id
        webhookResult.plan = plan
        webhookResult.message = `Organization license activated: ${plan || 'unknown'} plan for org ${resolvedOrgId.slice(-8).toUpperCase()}`

        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null
        if (!subId) break

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        await upsertLicense(supabase, lic.org_id, {
          status: "active",
          current_period_end: invoice.lines.data[0]?.period?.end ?? invoice.period_end ?? null,
          stripe_subscription_id: subId,
          stripe_latest_invoice_id: invoice.id,
        })

        // Set webhook result for license invoice
        webhookResult.payment_type = PAYMENT_TYPES.ORG_LICENSE
        webhookResult.org_id = lic.org_id
        webhookResult.subscription_id = subId
        webhookResult.amount_cents = invoice.amount_paid ?? 0
        webhookResult.message = `License invoice paid: $${((invoice.amount_paid ?? 0) / 100).toFixed(2)} for subscription ${subId.slice(-8).toUpperCase()}`

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null
        if (!subId) break

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        await upsertLicense(supabase, lic.org_id, {
          status: "past_due",
          current_period_end: invoice.lines.data[0]?.period?.end ?? invoice.period_end ?? null,
          stripe_subscription_id: subId,
          stripe_latest_invoice_id: invoice.id,
          grace_days: 7,
        })
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        const priceId = subscription.items.data[0]?.price?.id ?? null
        const plan = priceToPlan(priceId)
        const status =
          ["past_due", "unpaid"].includes(subscription.status)
            ? "past_due"
            : subscription.status === "trialing"
              ? "trial"
              : "active"

        await upsertLicense(supabase, lic.org_id, {
          status,
          plan,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_end: subscription.trial_end,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          stripe_latest_invoice_id: subscription.latest_invoice as string | null,
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        const endedStatus = subscription.cancel_at_period_end ? "canceled" : "expired"

        await upsertLicense(supabase, lic.org_id, {
          status: endedStatus,
          current_period_end: subscription.current_period_end,
          stripe_subscription_id: subscription.id,
        })
        break
      }

      // Keep these only if you also have one-time payments. Your current checkout is subscription.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent

        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
        })

        const session = sessions.data[0] ?? null
        if (!session) break

        // Determine if this is a ticket sale or guardian fee
        const isTicketSale = session.metadata?.order_id && session.metadata?.ticketed_event_id
        if (isTicketSale) {
          // Ticket sales are handled in checkout.session.completed
          webhookResult.payment_type = PAYMENT_TYPES.TICKET_SALE
          webhookResult.message = `Ticket sale payment_intent confirmed (already processed via checkout.session.completed)`
          break
        }

        // GUARDIAN FEE - payment_intent.succeeded
        webhookResult.payment_type = PAYMENT_TYPES.GUARDIAN_FEE

        const checkoutSessionId = session.metadata?.checkout_session_id as string | null

        const paymentIntentId = pi.id
        // Use amount_received if available (actual captured amount), else amount (intended)
        const amountReceived = pi.amount_received ?? pi.amount ?? 0
        const currency = pi.currency ?? "usd"
        const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null

        // Stripe metadata values are strings
        const isPartial = session.metadata?.is_partial === "true"
        const paymentType = isPartial ? "partial" : "full"

        // Fetch checkout session to get org_id/parent_id (needed for inserts)
        const { data: checkout, error: checkoutErr } = await supabase
          .from("checkout_sessions")
          .select("id, org_id, parent_id")
          .eq("id", checkoutSessionId)
          .maybeSingle()
        if (checkoutErr) throw checkoutErr
        if (!checkout) break

        // Upsert payment by stripe_payment_intent_id (idempotent & reliable)
        const { data: payment, error: upsertPayErr } = await supabase
          .from("payments")
          .upsert(
            {
              org_id: checkout.org_id,
              checkout_session_id: checkout.id,
              parent_id: checkout.parent_id,
              amount_cents: amountReceived,
              currency,
              stripe_payment_intent_id: paymentIntentId,
              stripe_charge_id: chargeId,
              platform_fee_cents: 0,
              status: "succeeded",
              payment_type: paymentType,
              paid_at: new Date().toISOString(),
            },
            { onConflict: "stripe_payment_intent_id" }, // ensure you have a unique constraint/index on this
          )
          .select("id")
          .single()
        if (upsertPayErr) throw upsertPayErr
        if (!payment) {
          throw new Error("Payment upsert did not return payment id")
        }

        // Load checkout_session_items with current fee_assignment balances for validation
        const { data: sessionItems, error: itemsErr } = await supabase
          .from("checkout_session_items")
          .select(`
            id,
            amount_cents,
            fee_assignment_id,
            fee_assignment:fee_assignments(id, balance_cents)
          `)
          .eq("checkout_session_id", checkout.id)

        if (itemsErr) throw itemsErr
        if (!sessionItems || sessionItems.length === 0) {
          console.warn(`No checkout_session_items found for checkout ${checkout.id}`)
          break
        }

        // Validate each item's amount_cents <= current fee_assignment.balance_cents
        // If any exceed, skip allocations and flag payment for review
        let shouldProcessAllocations = true
        const validationErrors: string[] = []

        for (const item of sessionItems) {
          const itemAmount = item.amount_cents
          const feeAssignment = item.fee_assignment as { id: string; balance_cents: number } | null
          
          if (!feeAssignment) {
            validationErrors.push(`Item ${item.id}: fee_assignment not found`)
            shouldProcessAllocations = false
            continue
          }

          const currentBalance = feeAssignment.balance_cents ?? 0
          if (itemAmount > currentBalance) {
            validationErrors.push(
              `Item ${item.id}: amount ${itemAmount} exceeds balance ${currentBalance} for fee_assignment ${feeAssignment.id}`
            )
            shouldProcessAllocations = false
          }
        }

        if (!shouldProcessAllocations) {
          // Payment succeeded but allocations would over-allocate - flag for review
          console.error(`Payment ${payment.id} cannot be allocated:`, validationErrors)
          
          // Optionally update payment with a flag or create a review record
          // For now, we'll log and leave payment as succeeded but without allocations
          // Admin can manually allocate or refund
          await supabase
            .from("checkout_sessions")
            .update({
              status: "succeeded",
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", checkout.id)
          
          // Log to billing_events for admin visibility
          await supabase.from("billing_events").insert({
            org_id: checkout.org_id,
            event_type: "payment_allocation_validation_failed",
            stripe_event_id: event.id,
            stripe_object_id: paymentIntentId,
            error_message: `Allocation validation failed: ${validationErrors.join("; ")}`,
            payload: { payment_id: payment.id, checkout_session_id: checkout.id, validation_errors: validationErrors },
          })
          
          break
        }

        // All validations passed - call complete_payment_processing to create allocations
        const { error: processErr } = await supabase.rpc("complete_payment_processing", {
          p_payment_id: payment.id,
          p_checkout_session_id: checkout.id,
        })

        if (processErr) {
          console.error(`complete_payment_processing failed for payment ${payment.id}:`, processErr)
          throw processErr
        }

        // Update checkout session status (complete_payment_processing also updates it, but ensure it's set)
        const { error: updCheckoutErr } = await supabase
          .from("checkout_sessions")
          .update({
            status: "succeeded",
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", checkout.id)
        if (updCheckoutErr) throw updCheckoutErr

        // Set webhook result for guardian fee payment
        webhookResult.org_id = checkout.org_id
        webhookResult.amount_cents = amountReceived
        webhookResult.message = `Guardian fee payment succeeded: $${(amountReceived / 100).toFixed(2)} (${paymentType}) for checkout ${checkout.id.slice(-8).toUpperCase()}`

        break
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent

        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
        })

        const session = sessions.data[0] ?? null
        if (!session) break

        const checkoutSessionId = session.metadata?.checkout_session_id as string | null

        const paymentIntentId = pi.id
        const currency = pi.currency ?? "usd"

        const { data: checkout, error: checkoutErr } = await supabase
          .from("checkout_sessions")
          .select("id, org_id, parent_id")
          .eq("id", checkoutSessionId)
          .maybeSingle()
        if (checkoutErr) throw checkoutErr
        if (!checkout) break

        // Upsert payment as failed (don’t rely on existing row)
        const { error: upsertPayErr } = await supabase
          .from("payments")
          .upsert(
            {
              org_id: checkout.org_id,
              checkout_session_id: checkout.id,
              parent_id: checkout.parent_id,
              amount_cents: pi.amount ?? 0,
              currency,
              stripe_payment_intent_id: paymentIntentId,
              status: "failed",
            },
            { onConflict: "stripe_payment_intent_id" },
          )
        if (upsertPayErr) throw upsertPayErr

        const { error: updCheckoutErr } = await supabase
          .from("checkout_sessions")
          .update({ status: "failed", stripe_payment_intent_id: paymentIntentId })
          .eq("id", checkout.id)
        if (updCheckoutErr) throw updCheckoutErr

        break
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account

        const payoutsEnabled = acct.payouts_enabled === true
        const chargesEnabled = acct.charges_enabled === true

        const requirements = acct.requirements ?? {}
        const disabledReason = requirements.disabled_reason ?? null
        const currentlyDue = requirements.currently_due ?? []
        const pastDue = requirements.past_due ?? []
        const pendingVerification = requirements.pending_verification ?? []
        const requirementErrors =
          (requirements.errors ?? []).map((err) => ({
            code: err.code ?? null,
            reason: err.reason ?? null,
            requirement: err.requirement ?? null,
          })) ?? []
        const deadline = requirements.current_deadline
          ? new Date(requirements.current_deadline * 1000).toISOString()
          : null

        // Map Stripe state -> payout_onboarding_status enum: pending | completed | restricted
        let onboardingStatus: "pending" | "completed" | "restricted" = "pending"
        if (chargesEnabled && payoutsEnabled && currentlyDue.length === 0 && pastDue.length === 0) {
          onboardingStatus = "completed"
        } else if (disabledReason?.startsWith("rejected.") || disabledReason === "listed") {
          onboardingStatus = "restricted"
        } else if (!payoutsEnabled) {
          onboardingStatus = "restricted"
        } else {
          onboardingStatus = "pending"
        }

        // Fetch existing row to log meaningful changes
        const { data: existingOrg } = await supabase
          .from("organizations")
          .select("id, stripe_payouts_enabled, stripe_payouts_disabled_reason, stripe_requirements_due")
          .eq("payout_account_id", acct.id)
          .maybeSingle()

        const { error } = await supabase
          .from("organizations")
          .update({
            payouts_enabled: payoutsEnabled,
            stripe_payouts_enabled: payoutsEnabled,
            payout_onboarding_status: onboardingStatus,
            stripe_payouts_disabled_reason: disabledReason,
            stripe_requirements_due: {
              currently_due: currentlyDue,
              past_due: pastDue,
              pending_verification: pendingVerification,
            },
            stripe_requirements_errors: requirementErrors,
            stripe_requirements_deadline: deadline,
            stripe_status_updated_at: new Date().toISOString(),
          })
          .eq("payout_account_id", acct.id)

        if (error) throw error

        // Record state changes for audit
        if (existingOrg) {
          const prevDueRaw: any = existingOrg.stripe_requirements_due
          const prevCurrentlyDue = Array.isArray(prevDueRaw?.currently_due)
            ? prevDueRaw.currently_due.length
            : Array.isArray(prevDueRaw)
              ? prevDueRaw.length
              : 0

          const changed =
            existingOrg.stripe_payouts_enabled !== payoutsEnabled ||
            existingOrg.stripe_payouts_disabled_reason !== disabledReason

          if (changed) {
            await supabase.from("billing_events").insert({
              org_id: existingOrg.id,
              event_type: "payout_status_changed",
              stripe_event_id: event.id,
              payload: {
                payouts_enabled: payoutsEnabled,
                disabled_reason: disabledReason,
                currently_due: currentlyDue,
                past_due: pastDue,
                pending_verification: pendingVerification,
                errors: requirementErrors,
                deadline,
              },
            })
          }

          if (prevCurrentlyDue === 0 && currentlyDue.length > 0) {
            await supabase.from("billing_events").insert({
              org_id: existingOrg.id,
              event_type: "payout_requirements_due",
              stripe_event_id: event.id,
              payload: {
                currently_due: currentlyDue,
                deadline,
              },
            })
          }
        }
        break
      }
      case "charge.refunded": {
        // Ticketing refund: find ticket order by payment_intent or charge_id
        const charge = event.data.object as Stripe.Charge

        // Find order by payment intent (preferred) or charge_id (fallback for Connect)
        let order = null
        if (charge.payment_intent) {
          const { data } = await supabase
            .from("ticket_orders")
            .select("id")
            .eq("stripe_payment_intent_id", charge.payment_intent)
            .single()
          order = data
        }

        // Fallback: try finding by charge_id if payment_intent lookup failed
        if (!order && charge.id) {
          const { data } = await supabase
            .from("ticket_orders")
            .select("id")
            .eq("stripe_charge_id", charge.id)
            .single()
          order = data
        }

        if (order) {
          // Mark order and tickets as refunded
          // Note: This handles both full and partial refunds - any charge.refunded for a ticket order marks the whole order refunded
          await supabase.from("ticket_orders").update({ status: "refunded" }).eq("id", order.id)
          await supabase.from("tickets").update({ status: "refunded" }).eq("order_id", order.id)

          // Release capacity
          const { data: orderItems } = await supabase
            .from("ticket_order_items")
            .select("ticket_type_id, quantity")
            .eq("order_id", order.id)

          const ticketCount = (orderItems || []).reduce((sum, item) => sum + item.quantity, 0)

          for (const item of orderItems || []) {
            await supabase.rpc("increment_ticket_capacity", {
              p_ticket_type_id: item.ticket_type_id,
              p_quantity: item.quantity,
            })
          }

          // Record success in stripe_webhook_receipts for audit parity
          await supabase.from("stripe_webhook_receipts").insert({
            stripe_event_id: event.id,
            outcome: "success",
          })

          // Set webhook result for ticket refund
          webhookResult.payment_type = PAYMENT_TYPES.TICKET_SALE
          webhookResult.order_id = order.id
          webhookResult.amount_cents = charge.amount_refunded ?? charge.amount
          webhookResult.tickets_created = -ticketCount // Negative to indicate refund
          webhookResult.message = `Ticket sale refunded: ${ticketCount} ticket(s) for order ${order.id.slice(-8).toUpperCase()}`
        } else {
          // Not a ticket order refund - log for observability but don't process
          webhookResult.message = `Refund received but no matching ticket order found`
        }

        break
      }
      default:
        webhookResult.message = `Unhandled event type: ${event.type}`
        break
    }
  } catch (err: any) {
    console.error("webhook processing error:", err?.message ?? err)

    // Best-effort error stamp
    await supabase
      .from("billing_events")
      .update({ error_message: err?.message ?? "unknown error" })
      .eq("stripe_event_id", event.id)

    // Return error response
    await supabase
      .from("billing_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id)

    return buildWebhookResponse({
      received: true,
      payment_type: webhookResult.payment_type,
      error: err?.message ?? "unknown error",
      org_id: webhookResult.org_id,
      order_id: webhookResult.order_id,
    })
  }

  await supabase
    .from("billing_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("stripe_event_id", event.id)

  // Return descriptive response based on what was processed
  return buildWebhookResponse({
    received: true,
    payment_type: webhookResult.payment_type,
    message: webhookResult.message || `Processed ${event.type}`,
    order_id: webhookResult.order_id,
    org_id: webhookResult.org_id,
    amount_cents: webhookResult.amount_cents,
    tickets_created: webhookResult.tickets_created,
    subscription_id: webhookResult.subscription_id,
    plan: webhookResult.plan,
  })
})
