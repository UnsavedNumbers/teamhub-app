// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TICKETING")

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
  const missing = []
  if (!supabaseUrl) missing.push("SUPABASE_URL")
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY")
  if (!stripeSecretKey) missing.push("STRIPE_SECRET_KEY")
  if (!stripeWebhookSecret) missing.push("STRIPE_WEBHOOK_SECRET_TICKETING")
  throw new Error(`Missing required environment configuration: ${missing.join(", ")}`)
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Generate QR token (128-bit+ opaque)
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

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 })
  }

  const eventId = event.id
  const eventType = event.type

  // Check idempotency
  const { data: existingReceipt } = await supabase
    .from("stripe_webhook_receipts")
    .select("id, outcome")
    .eq("stripe_event_id", eventId)
    .single()

  if (existingReceipt) {
    console.log(`Event ${eventId} already processed, skipping`)
    return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 })
  }

  try {
    if (eventType === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // Guard on metadata with optional chaining
      const orderId = session.metadata?.order_id
      const orgId = session.metadata?.org_id
      const ticketedEventId = session.metadata?.ticketed_event_id
      const stripeConnectAccountId = session.metadata?.stripe_connect_account_id
      const platformFeeCentsStr = session.metadata?.platform_fee_cents
      const orgRevenueCentsStr = session.metadata?.org_revenue_cents
      const totalTicketsStr = session.metadata?.total_tickets

      if (!orderId || !orgId || !ticketedEventId) {
        throw new Error("Missing required metadata in checkout session")
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

      if (order.status !== "pending_payment") {
        console.log(`Order ${orderId} already processed (status: ${order.status})`)
        await supabase.from("stripe_webhook_receipts").insert({
          stripe_event_id: eventId,
          outcome: "skipped",
        })
        return new Response(JSON.stringify({ received: true }), { status: 200 })
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

      // Load order items
      const { data: orderItems, error: itemsError } = await supabase
        .from("ticket_order_items")
        .select("ticket_type_id, quantity")
        .eq("order_id", orderId)

      if (itemsError || !orderItems) {
        throw new Error("Failed to load order items")
      }

      // Create tickets
      const tickets: any[] = []
      for (const item of orderItems) {
        for (let i = 0; i < item.quantity; i++) {
          const qrToken = generateQrToken()
          const entryCode = generateEntryCode()
          const qrTokenHash = await hashToken(qrToken)
          // Store entry code normalized (uppercase, no dashes)
          const entryCodeNormalized = entryCode.toUpperCase().replace(/[^A-Z0-9]/g, "")

          tickets.push({
            org_id: order.org_id,
            ticketed_event_id: order.ticketed_event_id,
            order_id: orderId,
            ticket_type_id: item.ticket_type_id,
            status: "active",
            qr_token_hash: qrTokenHash,
            entry_code: entryCodeNormalized,
          })
        }
      }

      // Insert tickets
      const { error: ticketsError } = await supabase.from("tickets").insert(tickets)

      if (ticketsError) {
        throw new Error(`Failed to create tickets: ${ticketsError.message}`)
      }

      // Update order status and Connect fields (order update first, then transaction insert)
      const orderUpdateData: any = {
        status: "paid",
        stripe_payment_intent_id: session.payment_intent as string | null,
        processed_at: new Date().toISOString(),
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
            if (transactionError.code === "23505") {
              console.log(`Transaction already recorded for order ${orderId}`)
            } else {
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

      // Send receipt (call tickets-send-receipt Edge Function)
      const baseUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || ""
      try {
        await fetch(`${baseUrl}/functions/v1/tickets-send-receipt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
          },
          body: JSON.stringify({ order_id: orderId }),
        })
      } catch (receiptError) {
        console.error("Failed to send receipt:", receiptError)
        // Don't fail the webhook if receipt fails
      }

      // Record success
      await supabase.from("stripe_webhook_receipts").insert({
        stripe_event_id: eventId,
        outcome: "success",
      })

      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    if (eventType === "charge.refunded") {
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
        await supabase.from("ticket_orders").update({ status: "refunded" }).eq("id", order.id)
        await supabase.from("tickets").update({ status: "refunded" }).eq("order_id", order.id)

        // Release capacity
        const { data: orderItems } = await supabase
          .from("ticket_order_items")
          .select("ticket_type_id, quantity")
          .eq("order_id", order.id)

        for (const item of orderItems || []) {
          await supabase.rpc("increment_ticket_capacity", {
            p_ticket_type_id: item.ticket_type_id,
            p_quantity: item.quantity,
          })
        }
      }

      await supabase.from("stripe_webhook_receipts").insert({
        stripe_event_id: eventId,
        outcome: "success",
      })

      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    // Unhandled event type
    await supabase.from("stripe_webhook_receipts").insert({
      stripe_event_id: eventId,
      outcome: "skipped",
    })

    return new Response(JSON.stringify({ received: true, unhandled: eventType }), { status: 200 })
  } catch (error: any) {
    console.error("Error processing webhook:", error)

    await supabase.from("stripe_webhook_receipts").insert({
      stripe_event_id: eventId,
      outcome: "error",
      error_message: error.message,
    })

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
