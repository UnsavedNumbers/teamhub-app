// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TICKETING") || Deno.env.get("STRIPE_WEBHOOK_SECRET")!

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Missing required environment configuration")
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

      const orderId = session.metadata?.order_id
      const orgId = session.metadata?.org_id
      const ticketedEventId = session.metadata?.ticketed_event_id

      if (!orderId || !orgId || !ticketedEventId) {
        throw new Error("Missing metadata in checkout session")
      }

      // Load order
      const { data: order, error: orderError } = await supabase
        .from("ticket_orders")
        .select("id, org_id, ticketed_event_id, status, total_cents")
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

      // Update order status
      const { error: updateError } = await supabase
        .from("ticket_orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string | null,
        })
        .eq("id", orderId)

      if (updateError) {
        throw new Error("Failed to update order status")
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

      // Find order by payment intent
      const { data: order } = await supabase
        .from("ticket_orders")
        .select("id")
        .eq("stripe_payment_intent_id", charge.payment_intent)
        .single()

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
