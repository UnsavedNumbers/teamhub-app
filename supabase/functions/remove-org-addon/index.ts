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
  // STEP 2: Find Entitlement
  // ============================================================================

  const { data: entitlement, error: entitlementErr } = await supabase
    .from("org_addon_entitlements")
    .select("id, stripe_subscription_id, stripe_subscription_item_id, status")
    .eq("org_id", orgId)
    .eq("feature_key", featureKey)
    .maybeSingle()

  if (entitlementErr) {
    return json(req, { error: entitlementErr.message }, 400)
  }

  if (!entitlement) {
    return json(req, {
      success: false,
      error: "Add-on entitlement not found",
    }, 404)
  }

  if (entitlement.status === "canceled") {
    return json(req, {
      success: true,
      message: "Add-on is already canceled",
    }, 200)
  }

  // ============================================================================
  // STEP 3: Remove from Stripe Subscription
  // ============================================================================

  try {
    await stripe.subscriptions.update(entitlement.stripe_subscription_id, {
      items: [
        {
          id: entitlement.stripe_subscription_item_id,
          deleted: true,
        },
      ],
      proration_behavior: "create_prorations",
    })

    // ============================================================================
    // STEP 4: Update Entitlement Status
    // ============================================================================

    const { error: updateErr } = await supabase
      .from("org_addon_entitlements")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", entitlement.id)

    if (updateErr) {
      return json(req, { error: updateErr.message }, 500)
    }

    // ============================================================================
    // STEP 5: Log Action
    // ============================================================================

    await supabase.from("license_change_log").insert({
      org_id: orgId,
      actor_user_id: user.id,
      action_type: "addon_remove_succeeded",
      feature_key: featureKey,
      stripe_subscription_id: entitlement.stripe_subscription_id,
      stripe_subscription_item_id: entitlement.stripe_subscription_item_id,
      result_status: "succeeded",
    })

    // ============================================================================
    // STEP 6: Return Success
    // ============================================================================

    return json(req, {
      success: true,
      message: "Add-on removed successfully",
    })
  } catch (stripeErr: any) {
    console.error("Stripe error:", stripeErr)
    return json(req, {
      success: false,
      error: stripeErr.message || "Failed to update Stripe subscription",
    }, 500)
  }
})
