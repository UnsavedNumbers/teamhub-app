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

  if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
    return json(
      req,
      { error: "Server misconfigured: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or STRIPE_SECRET_KEY" },
      500,
    )
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

  const orderId = payload?.order_id as string | undefined
  const amountCents = payload?.amount_cents as number | undefined // Optional for partial refunds

  if (!orderId) {
    return json(req, { error: "Missing required field: order_id" }, 400)
  }

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  try {
    // Load order
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .select("id, org_id, status, stripe_charge_id, total_cents")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return json(req, { error: "Order not found" }, 404)
    }

    // Check if already refunded
    if (order.status === "refunded") {
      return json(req, { error: "Order already refunded" }, 400)
    }

    // Check if order is paid
    if (order.status !== "paid") {
      return json(req, { error: `Cannot refund order with status: ${order.status}` }, 400)
    }

    // Require stripe_charge_id for refunds
    if (!order.stripe_charge_id) {
      return json(req, { error: "Order does not have a Stripe charge ID" }, 400)
    }

    // Verify user is org_admin of the order's organization
    const { data: memberships, error: membershipError } = await supabase.rpc("get_user_organizations", {
      check_user_id: user.id,
    })

    if (membershipError) {
      return json(req, { error: membershipError.message }, 400)
    }

    const hasAdminRole = (memberships as any[] | null)?.some(
      (m) =>
        m.org_id === order.org_id &&
        Array.isArray(m.roles) &&
        m.roles.includes("org_admin"),
    )

    if (!hasAdminRole) {
      return json(req, { error: "Forbidden: Must be organization admin" }, 403)
    }

    // Process refund through Stripe
    const refundParams: any = {
      charge: order.stripe_charge_id,
      refund_application_fee: true, // Refunds platform fee too
      reverse_transfer: true, // Reverses transfer to Connect account
    }

    // If amount_cents provided, do partial refund; otherwise full refund
    if (amountCents !== undefined && amountCents > 0) {
      if (amountCents > order.total_cents) {
        return json(req, { error: "Refund amount cannot exceed order total" }, 400)
      }
      refundParams.amount = amountCents
    }

    const refund = await stripe.refunds.create(refundParams)

    // Return success - webhook charge.refunded will update DB and capacity
    return json(req, {
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status,
      message: "Refund processed. Order will be updated when webhook processes the refund.",
    })
  } catch (error: any) {
    console.error("Error processing refund:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
