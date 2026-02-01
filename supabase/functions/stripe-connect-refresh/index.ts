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

function mapAccountToSnapshot(acct: Stripe.Account) {
  const requirements = acct.requirements ?? {}
  const disabledReason = requirements.disabled_reason ?? null
  const currentlyDue = requirements.currently_due ?? []
  const pastDue = requirements.past_due ?? []
  const pendingVerification = requirements.pending_verification ?? []
  const errors =
    (requirements.errors ?? []).map((err) => ({
      code: err.code ?? null,
      reason: err.reason ?? null,
      requirement: err.requirement ?? null,
    })) ?? []

  const deadline = requirements.current_deadline
    ? new Date(requirements.current_deadline * 1000).toISOString()
    : null

  let onboardingStatus: "pending" | "completed" | "restricted" = "pending"
  if (acct.payouts_enabled && acct.charges_enabled && currentlyDue.length === 0 && pastDue.length === 0) {
    onboardingStatus = "completed"
  } else if (disabledReason?.startsWith("rejected.") || disabledReason === "listed") {
    onboardingStatus = "restricted"
  } else if (!acct.payouts_enabled) {
    onboardingStatus = "restricted"
  }

  return {
    payouts_enabled: acct.payouts_enabled === true,
    charges_enabled: acct.charges_enabled === true,
    disabled_reason: disabledReason,
    requirements_due: { currently_due: currentlyDue, past_due: pastDue, pending_verification: pendingVerification },
    requirements_errors: errors,
    requirements_deadline: deadline,
    payout_onboarding_status: onboardingStatus,
    stripe_status_updated_at: new Date().toISOString(),
  }
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

  // Verify user is org_admin of the organization
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

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, payout_account_id, slug")
    .eq("id", organizationId)
    .maybeSingle()

  if (orgError) {
    return json(req, { error: orgError.message }, 400)
  }
  if (!org) {
    return json(req, { error: "Organization not found" }, 404)
  }
  if (!org.payout_account_id) {
    return json(req, { error: "Organization has not connected a Stripe account" }, 400)
  }

  try {
    const account = await stripe.accounts.retrieve(org.payout_account_id)
    const snapshot = mapAccountToSnapshot(account)

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        payouts_enabled: snapshot.payouts_enabled,
        stripe_payouts_enabled: snapshot.payouts_enabled,
        payout_onboarding_status: snapshot.payout_onboarding_status,
        stripe_payouts_disabled_reason: snapshot.disabled_reason,
        stripe_requirements_due: snapshot.requirements_due,
        stripe_requirements_errors: snapshot.requirements_errors,
        stripe_requirements_deadline: snapshot.requirements_deadline,
        stripe_status_updated_at: snapshot.stripe_status_updated_at,
      })
      .eq("id", organizationId)

    if (updateError) {
      return json(req, { error: updateError.message }, 400)
    }

    const dashboardUrl = `https://dashboard.stripe.com/connect/accounts/${org.payout_account_id}`
    return json(req, {
      status: {
        payoutAccountId: org.payout_account_id,
        dashboardUrl,
        ...snapshot,
      },
    })
  } catch (err: any) {
    return json(req, { error: err?.message || "Failed to refresh Stripe account" }, 500)
  }
})
