// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
  const missing = []
  if (!supabaseUrl) missing.push("SUPABASE_URL")
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY")
  if (!stripeSecretKey) missing.push("STRIPE_SECRET_KEY")
  throw new Error(`Missing required environment configuration: ${missing.join(", ")}`)
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders = req.headers.get("Access-Control-Request-Headers") ?? "authorization, x-client-info, apikey, content-type"

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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const organizationId = payload?.organization_id as string | undefined
  if (!organizationId) {
    return json(req, { error: "Missing organization_id" }, 400)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  // Verify org_admin role
  const { data: memberships, error: membershipError } = await supabase.rpc("get_user_organizations", {
    check_user_id: user.id,
  })
  if (membershipError) {
    return json(req, { error: membershipError.message }, 400)
  }
  const hasAdminRole = (memberships as any[] | null)?.some(
    (m) =>
      m.org_id === organizationId &&
      Array.isArray(m.roles) &&
      m.roles.includes("org_admin"),
  )
  if (!hasAdminRole) {
    return json(req, { error: "Forbidden: Must be organization admin" }, 403)
  }

  // Fetch organization details
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, slug, payout_account_id")
    .eq("id", organizationId)
    .maybeSingle()

  if (orgError) {
    return json(req, { error: orgError.message }, 400)
  }
  if (!org) {
    return json(req, { error: "Organization not found" }, 404)
  }

  try {
    let payoutAccountId = org.payout_account_id as string | null
    let isNewAccount = false

    if (!payoutAccountId) {
      // Create a new Standard Connect account if the org never onboarded
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: { org_id: organizationId },
      })
      payoutAccountId = account.id
      isNewAccount = true

      const { error: setAccountError } = await supabase
        .from("organizations")
        .update({
          payout_account_id: payoutAccountId,
          connect_link_created_at: new Date().toISOString(),
        })
        .eq("id", organizationId)

      if (setAccountError) {
        return json(req, { error: setAccountError.message }, 400)
      }
    }

    const origin = req.headers.get("origin")
    if (!origin) {
      return json(req, { error: "Origin header required" }, 400)
    }

    const refreshUrl = new URL("/admin/organization?tab=payments&connect=refresh", origin).toString()
    const returnUrl = new URL("/admin/organization?tab=payments&onboarded=true", origin).toString()

    const accountLink = await stripe.accountLinks.create({
      account: payoutAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
      collection_options: { fields: "currently_due" },
    })

    // Track link creation
    await supabase
      .from("organizations")
      .update({ connect_link_created_at: new Date().toISOString() })
      .eq("id", organizationId)

    return json(req, {
      account_link_url: accountLink.url,
      account_id: payoutAccountId,
      expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
      is_new_account: isNewAccount,
    })
  } catch (err: any) {
    await supabase.from("billing_events").insert({
      org_id: organizationId,
      event_type: "connect_remediation_error",
      error_message: err?.message ?? "Unknown error",
      payload: { error: err?.toString() },
    })
    return json(req, { error: err?.message || "Failed to create remediation link" }, 500)
  }
})
