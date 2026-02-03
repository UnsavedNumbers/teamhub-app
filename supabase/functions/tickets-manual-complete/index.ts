// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function to manually complete a stuck ticket order
 * Used when webhook fails to process and order is stuck in pending_payment
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

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

  if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
    return json(
      req,
      { error: "Server misconfigured" },
      500,
    )
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  // Parse payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const orderId = payload?.order_id as string | undefined

  if (!orderId) {
    return json(req, { error: "Missing required field: order_id" }, 400)
  }

  try {
    // Load order
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return json(req, { error: "Order not found" }, 404)
    }

    // Verify user has admin access to the org
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("org_id", order.org_id)
      .eq("user_id", user.id)
      .single()

    if (!membership || membership.role !== "admin") {
      return json(req, { error: "Forbidden: Must be organization admin" }, 403)
    }

    // Check if already processed
    if (order.status === "paid") {
      return json(req, { error: "Order already paid" }, 400)
    }

    // Get Stripe checkout session
    if (!order.stripe_checkout_session_id) {
      return json(req, { error: "No Stripe checkout session found" }, 400)
    }

    const session = await stripe.checkout.sessions.retrieve(
      order.stripe_checkout_session_id as string
    )

    // Verify payment status
    if (session.payment_status !== "paid") {
      return json(req, { error: "Payment not completed in Stripe" }, 400)
    }

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null

    // Get Stripe Connect charge info if applicable
    let stripeChargeId: string | null = null

    if (paymentIntentId && order.stripe_connect_account_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["charges.data"],
        })

        if (paymentIntent.charges?.data && paymentIntent.charges.data.length > 0) {
          const charge = paymentIntent.charges.data.find((c) => c.status === "succeeded") || paymentIntent.charges.data[0]
          stripeChargeId = charge.id
        }
      } catch (e) {
        console.error("Failed to retrieve PaymentIntent:", e)
      }
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("ticket_order_items")
      .select("ticket_type_id, quantity")
      .eq("order_id", orderId)

    if (itemsError || !orderItems) {
      return json(req, { error: "Failed to load order items" }, 500)
    }

    // Create tickets with raw tokens for email
    const tickets: any[] = []
    const ticketsWithRawTokens: Array<{ ticket: any; qr_token_raw: string }> = []
    
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        const { raw: qrTokenRaw, hash: qrTokenHash } = await generateSecureToken()
        const entryCode = generateEntryCode()
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
      return json(req, { error: `Failed to create tickets: ${ticketsError?.message || "Unknown error"}` }, 500)
    }

    // Update order status
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
      return json(req, { error: `Failed to update order status: ${updateError.message}` }, 500)
    }

    // Delete holds
    await supabase.from("ticket_holds").delete().eq("order_id", orderId)

    // Try to send receipt with raw tokens
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || ""
    try {
      // Map inserted tickets with their raw tokens for email
      const ticketsForEmail = insertedTickets.map((insertedTicket) => {
        const match = ticketsWithRawTokens.find(
          ({ ticket }) => 
            ticket.entry_code === insertedTicket.entry_code &&
            ticket.ticket_type_id === insertedTicket.ticket_type_id
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
      // Don't fail if receipt fails
    }

    return json(req, {
      success: true,
      message: "Order completed successfully",
      tickets_created: insertedTickets.length,
    })
  } catch (error: any) {
    console.error("Error completing order:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
