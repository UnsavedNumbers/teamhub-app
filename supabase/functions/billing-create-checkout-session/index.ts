// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// ---- CORS helpers (robust preflight) ----
// - Echo Access-Control-Request-Headers so OPTIONS never fails due to missing headers
// - Reflect Origin (more compatible than '*'; also safe if you later use credentials)
// NOTE: If you DO use cookies/credentials on the frontend, you must also add:
//   "Access-Control-Allow-Credentials": "true"
// and you must NOT use "*" for Allow-Origin.
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

// ---- Stripe + helpers ----
function planToPrice(
  plan: string,
  priceStarter?: string | null,
  priceStandard?: string | null,
  pricePro?: string | null,
) {
  switch (plan) {
    case "starter":
      return priceStarter ?? null
    case "standard":
      return priceStandard ?? null
    case "pro":
      return pricePro ?? null
    default:
      return null
  }
}

serve(async (req) => {
  // Preflight must always succeed with CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  // Read env vars inside handler so we can return JSON *with CORS* even when misconfigured
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

  const priceStarter = Deno.env.get("STRIPE_PRICE_STARTER_YEAR")
  const priceStandard = Deno.env.get("STRIPE_PRICE_STANDARD_YEAR")
  const pricePro = Deno.env.get("STRIPE_PRICE_PRO_YEAR")

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

  const organizationId = payload?.organization_id as string | undefined
  const requestedPlan = payload?.requested_plan as string | undefined
  const successUrl = payload?.success_url as string | undefined
  const cancelUrl = payload?.cancel_url as string | undefined

  if (!organizationId || !requestedPlan || !successUrl || !cancelUrl) {
    return json(req, { error: "Missing required parameters" }, 400)
  }

  const priceId = planToPrice(requestedPlan, priceStarter, priceStandard, pricePro)
  if (!priceId) {
    return json(req, { error: "Unsupported plan or missing Stripe price env var for this plan" }, 400)
  }

  // Auth (return 401 with CORS rather than throwing)
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) {
    return json(req, { error: userErr.message || "Invalid JWT" }, 401)
  }
  const user = userData?.user
  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  // Verify org admin access (RPC returns: { org_id, org_name, roles: [] })
  const { data: memberships, error: membershipError } = await supabase.rpc("get_user_organizations", {
    check_user_id: user.id,
  })

  if (membershipError) {
    return json(req, { error: membershipError.message }, 400)
  }

  const hasAdminRole = (memberships as any[] | null)?.some(
    (m) => m.org_id === organizationId && Array.isArray(m.roles) && m.roles.includes("org_admin"),
  )

  if (!hasAdminRole) {
    return json(req, { error: "Forbidden" }, 403)
  }

  // Load or create license record for customer id (org_licenses schema uses org_id)
  const { data: existingLicense, error: licError } = await supabase
    .from("org_licenses")
    .select("id, stripe_customer_id")
    .eq("org_id", organizationId)
    .maybeSingle()

  if (licError) {
    return json(req, { error: licError.message }, 400)
  }

  let stripeCustomerId = existingLicense?.stripe_customer_id as string | null

  if (!stripeCustomerId) {
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("name, contact_email")
      .eq("id", organizationId)
      .maybeSingle()

    if (orgErr) {
      return json(req, { error: orgErr.message }, 400)
    }

    const customer = await stripe.customers.create({
      name: org?.name ?? undefined,
      email: org?.contact_email ?? user.email ?? undefined,
      metadata: { org_id: organizationId },
    })

    stripeCustomerId = customer.id

    // Upsert org_licenses row (unique on org_id)
    const { error: upsertErr } = await supabase
      .from("org_licenses")
      .upsert({ org_id: organizationId, stripe_customer_id: stripeCustomerId }, { onConflict: "org_id" })

    if (upsertErr) {
      return json(req, { error: upsertErr.message }, 400)
    }

    // Optional: keep a copy on organizations table (only if this column exists)
    const { error: orgUpdateErr } = await supabase
      .from("organizations")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", organizationId)

    if (orgUpdateErr) {
      return json(req, { error: orgUpdateErr.message }, 400)
    }
  }

  // Create a checkout_sessions record (your table requires parent_id NOT NULL)
  const { data: checkout, error: checkoutErr } = await supabase
    .from("checkout_sessions")
    .insert({
      org_id: organizationId,
      parent_id: user.id,
      status: "created",
      currency: "usd",
      subtotal_cents: 0,
      platform_fee_cents: 0,
      total_cents: 0,
    })
    .select("id")
    .single()

  if (checkoutErr || !checkout) {
    return json(req, { error: checkoutErr?.message ?? "Failed to create checkout session record" }, 400)
  }

  // Create Stripe subscription Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: organizationId,
    metadata: {
      org_id: organizationId,
      requested_plan: requestedPlan,
      checkout_session_id: checkout.id,
      environment: Deno.env.get("DENO_ENV") ?? "unknown",
    },
    subscription_data: {
      metadata: {
        org_id: organizationId,
        checkout_session_id: checkout.id,
        requested_plan: requestedPlan,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  // Store stripe session id on our checkout_sessions row (optional but useful)
  const { error: checkoutUpdateErr } = await supabase
    .from("checkout_sessions")
    .update({ stripe_checkout_session_id: session.id, status: "in_progress" })
    .eq("id", checkout.id)

  if (checkoutUpdateErr) {
    return json(req, { error: checkoutUpdateErr.message }, 400)
  }

  return json(req, { checkout_session_url: session.url, session_id: session.id }, 200)
})
