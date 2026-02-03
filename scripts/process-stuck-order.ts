// Script to manually process a stuck ticket order
// Usage: npx tsx scripts/process-stuck-order.ts <order_id>

import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import crypto from "crypto"

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
  console.error("Missing required environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

// Generate QR token (128-bit+ opaque)
function generateQrToken(): string {
  return crypto.randomBytes(16).toString("hex")
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
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

async function processStuckOrder(orderId: string) {
  console.log(`Processing order: ${orderId}`)

  // 1. Load order
  const { data: order, error: orderError } = await supabase
    .from("ticket_orders")
    .select("*")
    .eq("id", orderId)
    .single()

  if (orderError || !order) {
    throw new Error("Order not found")
  }

  console.log("Order status:", order.status)
  console.log("Stripe checkout session:", order.stripe_checkout_session_id)

  // 2. Check if already processed
  if (order.status === "paid") {
    console.log("Order already paid, skipping")
    return
  }

  // 3. Get Stripe checkout session
  const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id as string)
  console.log("Stripe session:", session.id, session.payment_status)

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null

  // 4. Verify payment status
  if (session.payment_status !== "paid") {
    throw new Error("Payment not completed")
  }

  // 5. Get Stripe Connect charge info if applicable
  let stripeChargeId: string | null = null
  let stripeApplicationFeeId: string | null = null

  if (paymentIntentId && order.stripe_connect_account_id) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["charges.data"],
      })

      if (paymentIntent.charges?.data && paymentIntent.charges.data.length > 0) {
        const charge = paymentIntent.charges.data.find((c) => c.status === "succeeded") || paymentIntent.charges.data[0]
        stripeChargeId = charge.id
        console.log("Stripe charge ID:", stripeChargeId)
      }
    } catch (e) {
      console.error("Failed to retrieve PaymentIntent:", e)
    }
  }

  // 6. Get order items
  const { data: orderItems, error: itemsError } = await supabase
    .from("ticket_order_items")
    .select("ticket_type_id, quantity")
    .eq("order_id", orderId)

  if (itemsError || !orderItems) {
    throw new Error("Failed to load order items")
  }

  console.log("Order items:", orderItems)

  // 7. Create tickets
  const tickets: any[] = []
  for (const item of orderItems) {
    for (let i = 0; i < item.quantity; i++) {
      const qrToken = generateQrToken()
      const entryCode = generateEntryCode()
      const qrTokenHash = hashToken(qrToken)
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

      console.log(`Created ticket: QR=${qrToken}, Code=${entryCodeNormalized}`)
    }
  }

  // 8. Insert tickets
  const { error: ticketsError } = await supabase.from("tickets").insert(tickets)
  if (ticketsError) {
    throw new Error(`Failed to create tickets: ${ticketsError.message}`)
  }
  console.log(`Inserted ${tickets.length} tickets`)

  // 9. Update order status
  const updateData: any = {
    status: "paid",
    stripe_payment_intent_id: paymentIntentId,
    processed_at: new Date().toISOString(),
  }

  if (stripeChargeId) {
    updateData.stripe_charge_id = stripeChargeId
  }

  const { error: updateError } = await supabase
    .from("ticket_orders")
    .update(updateData)
    .eq("id", orderId)

  if (updateError) {
    throw new Error(`Failed to update order status: ${updateError.message}`)
  }
  console.log("Order updated to paid")

  // 10. Delete holds
  await supabase.from("ticket_holds").delete().eq("order_id", orderId)
  console.log("Deleted holds")

  console.log("Order processed successfully!")
}

// Run the script
const orderId = process.argv[2]
if (!orderId) {
  console.error("Usage: npx tsx scripts/process-stuck-order.ts <order_id>")
  process.exit(1)
}

processStuckOrder(orderId).catch((err) => {
  console.error(err)
  process.exit(1)
})
