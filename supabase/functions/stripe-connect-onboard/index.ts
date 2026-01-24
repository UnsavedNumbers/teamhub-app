// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
const stripeConnectReturnUrl = Deno.env.get("STRIPE_CONNECT_RETURN_URL")
const stripeConnectRefreshUrl = Deno.env.get("STRIPE_CONNECT_REFRESH_URL")

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
  throw new Error("Missing required environment configuration")
}

if (!stripeConnectReturnUrl || !stripeConnectRefreshUrl) {
  throw new Error("Missing STRIPE_CONNECT_RETURN_URL or STRIPE_CONNECT_REFRESH_URL")
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

function buildCorsHeaders(_req: Request) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  try {
    // Check if organization already has payout_account_id
    // Note: For production, consider creating an RPC function with advisory lock
    // to prevent race conditions when multiple admins onboard simultaneously
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("payout_account_id, connect_link_created_at")
      .eq("id", organizationId)
      .single()

    if (orgError) {
      return json(req, { error: orgError.message }, 400)
    }

    let accountId: string
    let isNewAccount = false
    let isNewLink = false

    if (org.payout_account_id) {
      // Account exists, check if link expired (>24 hours)
      accountId = org.payout_account_id
      const linkCreatedAt = org.connect_link_created_at
      const now = new Date()
      const linkAge = linkCreatedAt ? now.getTime() - new Date(linkCreatedAt).getTime() : Infinity
      const linkExpired = linkAge > 24 * 60 * 60 * 1000 // 24 hours

      if (linkExpired) {
        isNewLink = true
      }
    } else {
      // Create new Connect account
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: {
          org_id: organizationId,
        },
      })

      accountId = account.id
      isNewAccount = true
      isNewLink = true

      // Store payout_account_id in database
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          payout_account_id: accountId,
          connect_link_created_at: new Date().toISOString(),
        })
        .eq("id", organizationId)

      if (updateError) {
        // Log error for manual cleanup
        await supabase.from("billing_events").insert({
          org_id: organizationId,
          event_type: "connect_account_creation_failed",
          error_message: `Database update failed after Stripe account creation. Account ID: ${accountId}`,
          payload: { account_id: accountId, error: updateError.message },
        })

        // Retry update up to 3 times with exponential backoff
        let retries = 0
        let lastError = updateError
        while (retries < 3) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000))
          const { error: retryError } = await supabase
            .from("organizations")
            .update({
              payout_account_id: accountId,
              connect_link_created_at: new Date().toISOString(),
            })
            .eq("id", organizationId)

          if (!retryError) {
            break
          }
          lastError = retryError
          retries++
        }

        if (retries === 3 && lastError) {
          return json(req, { error: "Failed to link Stripe account. Please contact support." }, 500)
        }
      }
    }

    // Generate Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: stripeConnectRefreshUrl,
      return_url: stripeConnectReturnUrl,
      type: "account_onboarding",
    })

    // Update connect_link_created_at timestamp
    if (isNewLink) {
      await supabase
        .from("organizations")
        .update({
          connect_link_created_at: new Date().toISOString(),
        })
        .eq("id", organizationId)
    }

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    return json(req, {
      account_link_url: accountLink.url,
      account_id: accountId,
      link_expires_at: expiresAt.toISOString(),
      is_new_link: isNewLink,
    }, 200)
  } catch (err: any) {
    await supabase.from("billing_events").insert({
      org_id: organizationId,
      event_type: "connect_onboarding_error",
      error_message: err?.message || "Unknown error",
      payload: { error: err?.toString() },
    })

    return json(req, { error: err?.message || "Internal error" }, 500)
  }
})
