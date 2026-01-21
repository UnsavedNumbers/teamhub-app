// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
const priceStarter = Deno.env.get("STRIPE_PRICE_STARTER_YEAR")
const priceStandard = Deno.env.get("STRIPE_PRICE_STANDARD_YEAR")
const pricePro = Deno.env.get("STRIPE_PRICE_PRO_YEAR")

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase env vars missing")
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null

function planToPrice(plan: string) {
  switch (plan) {
    case "starter":
      return priceStarter
    case "standard":
      return priceStandard
    case "pro":
      return pricePro
    default:
      return null
  }
}

serve(async (req) => {
  if (!stripe) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  })

  let payload: any
  try {
    payload = await req.json()
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const organizationId = payload?.organization_id as string | undefined
  const requestedPlan = payload?.requested_plan as string | undefined
  const successUrl = payload?.success_url as string | undefined
  const cancelUrl = payload?.cancel_url as string | undefined

  if (!organizationId || !requestedPlan || !successUrl || !cancelUrl) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 })
  }

  const priceId = planToPrice(requestedPlan)
  if (!priceId) {
    return new Response(JSON.stringify({ error: "Unsupported plan" }), { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  // Verify org admin access
  const { data: memberships, error: membershipError } = await supabase.rpc("get_user_organizations", {
    check_user_id: user.id,
  })

  if (membershipError) {
    return new Response(JSON.stringify({ error: membershipError.message }), { status: 400 })
  }

  const hasAdminRole = (memberships as any[] | null)?.some((m) =>
    m.org_id === organizationId && m.role === "org_admin"
  )

  if (!hasAdminRole) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }

  // Load or create license record for customer id
  const { data: existingLicense } = await supabase
    .from("org_licenses")
    .select("id, stripe_customer_id")
    .eq("org_id", organizationId)
    .maybeSingle()

  let stripeCustomerId = existingLicense?.stripe_customer_id as string | null

  if (!stripeCustomerId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name, contact_email")
      .eq("id", organizationId)
      .maybeSingle()

    const customer = await stripe.customers.create({
      name: org?.name,
      email: org?.contact_email ?? user.email ?? undefined,
      metadata: { organization_id: organizationId },
    })

    stripeCustomerId = customer.id

    await supabase.from("org_licenses").upsert({
      org_id: organizationId,
      stripe_customer_id: stripeCustomerId,
    })

    await supabase
      .from("organizations")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", organizationId)
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: organizationId,
    metadata: {
      organization_id: organizationId,
      requested_plan: requestedPlan,
      environment: Deno.env.get("DENO_ENV") ?? "unknown",
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return new Response(
    JSON.stringify({ checkout_session_url: session.url, session_id: session.id }),
    { status: 200 },
  )
})
