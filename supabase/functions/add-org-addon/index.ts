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
    .select("id, feature_key, available_as_addon, addon_stripe_price_id, addon_external_name, addon_is_public")
    .eq("feature_key", featureKey)
    .is("archived_at", null)
    .maybeSingle()

  if (featureErr) {
    return json(req, { error: featureErr.message }, 400)
  }

  if (!feature) {
    return json(req, { error: "Feature not found" }, 404)
  }

  // Validate feature is configured as add-on
  if (!feature.available_as_addon) {
    return json(req, { error: "Feature is not available as an add-on" }, 400)
  }

  if (!feature.addon_stripe_price_id) {
    return json(req, { error: "Add-on Stripe price ID not configured" }, 400)
  }

  // Check if public (unless platform admin)
  if (!isPlatformAdmin && !feature.addon_is_public) {
    return json(req, { error: "Add-on is not publicly available" }, 403)
  }

  // Fetch organization and license
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, current_tier_id")
    .eq("id", orgId)
    .maybeSingle()

  if (orgErr || !org) {
    return json(req, { error: orgErr?.message || "Organization not found" }, 400)
  }

  const { data: license, error: licErr } = await supabase
    .from("org_licenses")
    .select("id, stripe_subscription_id, stripe_customer_id, status")
    .eq("org_id", orgId)
    .maybeSingle()

  if (licErr) {
    return json(req, { error: licErr.message }, 400)
  }

  if (!license || !license.stripe_subscription_id) {
    return json(req, {
      success: false,
      error: "No active subscription found. Please create a subscription first.",
    }, 400)
  }

  // Validate subscription status
  if (!["active", "trialing"].includes(license.status || "")) {
    return json(req, {
      success: false,
      error: `Cannot add add-on: subscription status is ${license.status}. Account must be in good standing.`,
    }, 400)
  }

  // Check if feature is already included in tier
  if (org.current_tier_id) {
    const { data: tierAssignment, error: tierErr } = await supabase
      .from("tier_feature_assignments")
      .select("id, included")
      .eq("license_tier_id", org.current_tier_id)
      .eq("feature_entitlement_id", feature.id)
      .maybeSingle()

    if (tierErr) {
      return json(req, { error: tierErr.message }, 400)
    }

    if (tierAssignment?.included === true) {
      return json(req, {
        success: false,
        error: "Feature is already included in your plan",
      }, 400)
    }
  }

  // Check if add-on already purchased
  const { data: existingEntitlement, error: entitlementErr } = await supabase
    .from("org_addon_entitlements")
    .select("id, status, stripe_subscription_item_id")
    .eq("org_id", orgId)
    .eq("feature_key", featureKey)
    .maybeSingle()

  if (entitlementErr) {
    return json(req, { error: entitlementErr.message }, 400)
  }

  if (existingEntitlement) {
    if (existingEntitlement.status === "active") {
      return json(req, {
        success: false,
        error: "Add-on is already active",
      }, 400)
    }
    if (existingEntitlement.status === "pending_payment") {
      // Return existing entitlement info
      return json(req, {
        success: true,
        message: "Add-on purchase already in progress",
        entitlement_status: "pending_payment",
        stripe_subscription_item_id: existingEntitlement.stripe_subscription_item_id,
      }, 200)
    }
  }

  // ============================================================================
  // STEP 3: Update Stripe Subscription
  // ============================================================================

  try {
    // Fetch current subscription to get items
    const subscription = await stripe.subscriptions.retrieve(license.stripe_subscription_id, {
      expand: ["items.data.price"],
    })

    // Check if item already exists (idempotency)
    const existingItem = subscription.items.data.find(
      (item) => item.price.id === feature.addon_stripe_price_id,
    )

    if (existingItem) {
      // Item already exists, return existing entitlement
      const { data: existing } = await supabase
        .from("org_addon_entitlements")
        .select("*")
        .eq("stripe_subscription_item_id", existingItem.id)
        .maybeSingle()

      if (existing) {
        return json(req, {
          success: true,
          message: "Add-on already added",
          stripe_subscription_id: license.stripe_subscription_id,
          stripe_subscription_item_id: existingItem.id,
          entitlement_status: existing.status,
        }, 200)
      }
    }

    // Add new subscription item
    const updatedSubscription = await stripe.subscriptions.update(license.stripe_subscription_id, {
      items: [
        ...subscription.items.data.map((item) => ({
          id: item.id,
          price: item.price.id,
        })),
        {
          price: feature.addon_stripe_price_id!,
        },
      ],
      proration_behavior: "create_prorations",
      billing_cycle_anchor: "unchanged",
    })

    // Find the new item
    const newItem = updatedSubscription.items.data.find(
      (item) => item.price.id === feature.addon_stripe_price_id,
    )

    if (!newItem) {
      return json(req, { error: "Failed to find new subscription item" }, 500)
    }

    // ============================================================================
    // STEP 4: Handle Payment
    // ============================================================================

    let invoiceId: string | null = null
    let paymentActionRequired = false
    let paymentLink: string | undefined
    let clientSecret: string | undefined
    let entitlementStatus: "active" | "pending_payment" = "active"

    // Check if invoice was created
    if (updatedSubscription.latest_invoice) {
      const invoice = await stripe.invoices.retrieve(updatedSubscription.latest_invoice as string)
      invoiceId = invoice.id

      if (invoice.status === "open" && invoice.amount_due > 0) {
        entitlementStatus = "pending_payment"
        paymentActionRequired = true

        // Check if payment method exists
        const customer = await stripe.customers.retrieve(license.stripe_customer_id!)
        const hasPaymentMethod = customer.invoice_settings?.default_payment_method !== null

        if (!hasPaymentMethod) {
          // No payment method, provide payment link
          const paymentLinkObj = await stripe.paymentLinks.create({
            line_items: [
              {
                price: feature.addon_stripe_price_id!,
                quantity: 1,
              },
            ],
            invoice_creation: {
              enabled: true,
            },
          })
          paymentLink = paymentLinkObj.url
        } else {
          // Payment method exists, check if SCA is required
          if (invoice.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string)
            if (paymentIntent.status === "requires_action") {
              clientSecret = paymentIntent.client_secret || undefined
              // Use hosted invoice URL if available (preferred for SCA)
              if (invoice.hosted_invoice_url) {
                paymentLink = invoice.hosted_invoice_url
              }
            } else if (invoice.hosted_invoice_url) {
              // Use hosted invoice URL for any payment action
              paymentLink = invoice.hosted_invoice_url
            }
          } else if (invoice.hosted_invoice_url) {
            // Use hosted invoice URL if available
            paymentLink = invoice.hosted_invoice_url
          }
        }
      } else if (invoice.status === "paid") {
        entitlementStatus = "active"
      }
    }

    // ============================================================================
    // STEP 5: Create Entitlement Record
    // ============================================================================

    const { data: entitlement, error: insertErr } = await supabase
      .from("org_addon_entitlements")
      .insert({
        org_id: orgId,
        feature_key: featureKey,
        status: entitlementStatus,
        stripe_subscription_id: license.stripe_subscription_id,
        stripe_subscription_item_id: newItem.id,
        stripe_price_id: feature.addon_stripe_price_id!,
        current_period_start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      })
      .select()
      .single()

    if (insertErr) {
      // Rollback: remove item from Stripe subscription
      try {
        await stripe.subscriptions.update(license.stripe_subscription_id, {
          items: [
            {
              id: newItem.id,
              deleted: true,
            },
          ],
        })
      } catch (rollbackErr) {
        console.error("Failed to rollback Stripe subscription:", rollbackErr)
      }

      return json(req, { error: insertErr.message }, 500)
    }

    // ============================================================================
    // STEP 6: Log Action
    // ============================================================================

    const actionType =
      entitlementStatus === "active" ? "addon_add_succeeded" : "addon_add_requested"

    await supabase.from("license_change_log").insert({
      org_id: orgId,
      actor_user_id: user.id,
      action_type: actionType,
      feature_key: featureKey,
      stripe_subscription_id: license.stripe_subscription_id,
      stripe_subscription_item_id: newItem.id,
      stripe_invoice_id: invoiceId,
      result_status: entitlementStatus === "active" ? "succeeded" : "pending",
    })

    // ============================================================================
    // STEP 7: Return Success
    // ============================================================================

    return json(req, {
      success: true,
      stripe_subscription_id: license.stripe_subscription_id,
      stripe_subscription_item_id: newItem.id,
      invoice_id: invoiceId,
      payment_action_required: paymentActionRequired,
      payment_link: paymentLink,
      client_secret: clientSecret,
      entitlement_status: entitlementStatus,
    })
  } catch (stripeErr: any) {
    console.error("Stripe error:", stripeErr)
    return json(req, {
      success: false,
      error: stripeErr.message || "Failed to update Stripe subscription",
    }, 500)
  }
})
