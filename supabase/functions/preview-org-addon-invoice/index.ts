// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// ---- CORS helpers ----
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
  // Preflight must always succeed with CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  // Read env vars
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(
      req,
      { error: "Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
    )
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
  if (!stripeSecretKey) {
    return json(req, { error: "Stripe not configured: missing STRIPE_SECRET_KEY" }, 500)
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

  // Supabase client using service role key; pass through user Authorization header for getUser()
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  // Parse JSON payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const orgId = payload?.org_id as string | undefined
  const featureKey = payload?.feature_key as string | undefined

  if (!orgId || !featureKey) {
    return json(req, { error: "Missing required parameters: org_id and feature_key" }, 400)
  }

  // ============================================================================
  // STEP 1: Authorization
  // ============================================================================

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) {
    return json(req, { error: userErr.message || "Invalid JWT" }, 401)
  }
  const user = userData?.user
  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  // Check if user is platform admin
  const { data: platformAdminCheck } = await supabase.rpc("is_platform_admin", {
    check_user_id: user.id,
  })
  const isPlatformAdmin = platformAdminCheck === true

  // Verify org admin access OR platform admin
  let hasAdminRole = isPlatformAdmin
  if (!hasAdminRole) {
    const { data: memberships, error: membershipError } = await supabase.rpc("get_user_organizations", {
      check_user_id: user.id,
    })

    if (membershipError) {
      return json(req, { error: membershipError.message }, 400)
    }

    hasAdminRole = (memberships as any[] | null)?.some(
      (m) => m.org_id === orgId && Array.isArray(m.roles) && m.roles.includes("org_admin"),
    )
  }

  if (!hasAdminRole) {
    return json(req, { error: "Forbidden: must be org admin or platform admin" }, 403)
  }

  // ============================================================================
  // STEP 2: Validation
  // ============================================================================

  // Fetch feature configuration
  const { data: feature, error: featureErr } = await supabase
    .from("feature_entitlements")
    .select("addon_stripe_price_id")
    .eq("feature_key", featureKey)
    .is("archived_at", null)
    .maybeSingle()

  if (featureErr || !feature || !feature.addon_stripe_price_id) {
    return json(req, { error: "Add-on not found or not configured" }, 404)
  }

  // Fetch license
  const { data: license, error: licErr } = await supabase
    .from("org_licenses")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle()

  if (licErr || !license || !license.stripe_subscription_id || !license.stripe_customer_id) {
    return json(req, { error: "No active subscription found" }, 400)
  }

  // ============================================================================
  // STEP 3: Preview Upcoming Invoice
  // ============================================================================

  try {
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: license.stripe_customer_id,
      subscription: license.stripe_subscription_id,
      subscription_items: [
        {
          price: feature.addon_stripe_price_id,
        },
      ],
    })

    return json(req, {
      success: true,
      estimated_proration_amount: upcomingInvoice.amount_due,
      currency: upcomingInvoice.currency,
      next_invoice_date: upcomingInvoice.next_payment_attempt,
      line_items: upcomingInvoice.lines.data.map((line) => ({
        description: line.description || "",
        amount: line.amount,
        currency: line.currency,
      })),
    })
  } catch (stripeErr: any) {
    console.error("Stripe error:", stripeErr)
    return json(req, {
      success: false,
      error: stripeErr.message || "Failed to preview invoice",
    }, 500)
  }
})
