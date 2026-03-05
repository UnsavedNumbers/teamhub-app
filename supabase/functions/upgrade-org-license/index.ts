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
  const targetTierId = payload?.target_tier_id as string | undefined
  const returnUrl = payload?.return_url as string | undefined
  // Platform admins can pass allow_downgrade=true to switch an org to any tier
  const allowDowngrade = payload?.allow_downgrade === true

  if (!orgId || !targetTierId) {
    return json(req, { error: "Missing required parameters: org_id and target_tier_id" }, 400)
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
  // STEP 1: Validation
  // ============================================================================

  // Fetch organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, current_tier_id")
    .eq("id", orgId)
    .maybeSingle()

  if (orgErr || !org) {
    return json(req, { error: orgErr?.message || "Organization not found" }, 400)
  }

  // Fetch org_licenses record
  const { data: license, error: licErr } = await supabase
    .from("org_licenses")
    .select("id, stripe_subscription_id, stripe_price_id, status")
    .eq("org_id", orgId)
    .maybeSingle()

  if (licErr) {
    return json(req, { error: licErr.message }, 400)
  }

  if (!license || !license.stripe_subscription_id) {
    return json(req, {
      success: false,
      message: "No active subscription found. Please use checkout flow to create a new subscription.",
    }, 400)
  }

  // Validate subscription status
  if (!["active", "trialing"].includes(license.status || "")) {
    return json(req, {
      success: false,
      message: `Cannot upgrade: subscription status is ${license.status}. Account must be in good standing.`,
    }, 400)
  }

  // Fetch target tier
  const { data: targetTier, error: targetTierErr } = await supabase
    .from("license_tiers")
    .select("id, tier_key, tier_name, stripe_price_id, status")
    .eq("id", targetTierId)
    .eq("status", "active")
    .maybeSingle()

  if (targetTierErr || !targetTier) {
    return json(req, { error: targetTierErr?.message || "Target tier not found or inactive" }, 400)
  }

  if (!targetTier.stripe_price_id) {
    return json(req, { error: "Target tier does not have a Stripe price ID configured" }, 400)
  }

  // NOTE: We do NOT check org_licenses.stripe_price_id or organizations.current_tier_id here
  // because both can be stale. The Stripe subscription is retrieved in STEP 4 and is the
  // definitive source of truth for whether an upgrade is needed.

  // ============================================================================
  // STEP 2: Idempotency Check
  // ============================================================================

  const idempotencyKey = `upgrade-${orgId}-${targetTierId}-${license.stripe_subscription_id}`
  const { data: existingLog, error: logCheckErr } = await supabase
    .from("license_change_log")
    .select("id, result_status, stripe_invoice_id")
    .eq("org_id", orgId)
    .eq("to_tier_id", targetTierId)
    .eq("stripe_subscription_id", license.stripe_subscription_id)
    .order("initiated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (logCheckErr) {
    return json(req, { error: logCheckErr.message }, 400)
  }

  if (existingLog) {
    if (existingLog.result_status === "pending") {
      return json(req, {
        success: false,
        message: "Upgrade already in progress",
        audit_log_id: existingLog.id,
      }, 400)
    }
    if (existingLog.result_status === "succeeded") {
      return json(req, {
        success: true,
        message: "Upgrade already completed",
        new_tier_id: targetTierId,
        stripe_subscription_id: license.stripe_subscription_id,
        stripe_invoice_id: existingLog.stripe_invoice_id,
        audit_log_id: existingLog.id,
      }, 200)
    }
  }

  // ============================================================================
  // STEP 3: Create Audit Log Entry
  // ============================================================================

  const currentTierId = org.current_tier_id

  const { data: auditLog, error: auditLogErr } = await supabase
    .from("license_change_log")
    .insert({
      org_id: orgId,
      actor_user_id: user.id,
      from_tier_id: currentTierId,
      to_tier_id: targetTierId,
      stripe_subscription_id: license.stripe_subscription_id,
      result_status: "pending",
    })
    .select("id")
    .single()

  if (auditLogErr || !auditLog) {
    return json(req, { error: auditLogErr?.message || "Failed to create audit log" }, 400)
  }

  // ============================================================================
  // STEP 4: Load Stripe Subscription
  // ============================================================================

  let subscription: Stripe.Subscription
  try {
    subscription = await stripe.subscriptions.retrieve(license.stripe_subscription_id, {
      expand: ["items.data.price"],
    })
  } catch (stripeErr: any) {
    await supabase
      .from("license_change_log")
      .update({
        result_status: "failed",
        error_json: { message: stripeErr.message, code: stripeErr.code },
      })
      .eq("id", auditLog.id)

    return json(req, {
      success: false,
      message: `Failed to retrieve subscription: ${stripeErr.message}`,
      audit_log_id: auditLog.id,
    }, 400)
  }

  // Find subscription item (should be single item for license)
  const subscriptionItem = subscription.items.data[0]
  if (!subscriptionItem) {
    await supabase
      .from("license_change_log")
      .update({
        result_status: "failed",
        error_json: { message: "No subscription items found" },
      })
      .eq("id", auditLog.id)

    return json(req, {
      success: false,
      message: "Subscription has no items",
      audit_log_id: auditLog.id,
    }, 400)
  }

  // Live price from Stripe — the only authoritative source
  const currentPriceId = subscriptionItem.price.id

  // If Stripe is already on the target price, nothing to do
  if (currentPriceId === targetTier.stripe_price_id) {
    await supabase
      .from("license_change_log")
      .update({ result_status: "succeeded" })
      .eq("id", auditLog.id)

    // Ensure DB is in sync with Stripe
    await supabase.from("org_licenses").update({ stripe_price_id: currentPriceId }).eq("org_id", orgId)
    await supabase.rpc("sync_org_license_summary", { org_id: orgId })

    return json(req, {
      success: true,
      message: "Subscription already on target price",
      new_tier_id: targetTierId,
      stripe_subscription_id: license.stripe_subscription_id,
      audit_log_id: auditLog.id,
    }, 200)
  }

  // Validate this is an upgrade (not a downgrade) using live Stripe price
  const { data: liveCurrentTier } = await supabase
    .from("license_tiers")
    .select("id, tier_key")
    .eq("stripe_price_id", currentPriceId)
    .eq("status", "active")
    .maybeSingle()

  // Downgrade guard — skipped for platform admins with allow_downgrade=true
  if (liveCurrentTier?.tier_key && !(isPlatformAdmin && allowDowngrade)) {
    const { data: comparisonResult } = await supabase.rpc("compare_tier_levels", {
      tier_key_1: liveCurrentTier.tier_key,
      tier_key_2: targetTier.tier_key,
    })
    // comparisonResult: -1 current < target (upgrade), 0 equal, 1 current > target (downgrade)
    if ((comparisonResult as number) >= 0) {
      await supabase
        .from("license_change_log")
        .update({ result_status: "failed", error_json: { message: "Downgrade not allowed" } })
        .eq("id", auditLog.id)

      return json(req, {
        success: false,
        message: "Cannot downgrade. Upgrades only. Please contact support for downgrades.",
        audit_log_id: auditLog.id,
      }, 400)
    }
  }

  // ============================================================================
  // STEP 5: Identify Add-Ons to Remove (if included in new tier)
  // ============================================================================

  // Get features included in new tier
  const { data: newTierFeatures, error: tierFeaturesErr } = await supabase
    .from("tier_feature_assignments")
    .select("feature_entitlements!inner(feature_key)")
    .eq("license_tier_id", targetTierId)
    .eq("included", true)

  if (tierFeaturesErr) {
    return json(req, { error: tierFeaturesErr.message }, 400)
  }

  const includedFeatureKeys = (newTierFeatures || [])
    .map((tf: any) => tf.feature_entitlements?.feature_key)
    .filter((key: string | undefined): key is string => !!key)

  // Get org's active add-ons
  const { data: activeAddOns, error: addOnsErr } = await supabase
    .from("org_addon_entitlements")
    .select("id, feature_key, stripe_subscription_item_id")
    .eq("org_id", orgId)
    .eq("status", "active")

  if (addOnsErr) {
    return json(req, { error: addOnsErr.message }, 400)
  }

  // Find add-ons that are now included in tier
  const addOnsToRemove = (activeAddOns || []).filter((addon) =>
    includedFeatureKeys.includes(addon.feature_key),
  )

  // ============================================================================
  // STEP 6: Update Subscription with Proration (including add-on removal)
  // ============================================================================

  try {
    const subscriptionItems: Array<
      | { id: string; price: string }
      | { id: string; deleted: boolean }
    > = [
      {
        id: subscriptionItem.id,
        price: targetTier.stripe_price_id,
      },
    ]

    // Add items to remove (add-ons now included in tier)
    addOnsToRemove.forEach((addon) => {
      subscriptionItems.push({
        id: addon.stripe_subscription_item_id,
        deleted: true,
      })
    })

    const updatedSubscription = await stripe.subscriptions.update(
      license.stripe_subscription_id,
      {
        items: subscriptionItems,
        proration_behavior: "create_prorations",
        billing_cycle_anchor: "unchanged",
        payment_behavior: "default_incomplete",
      },
      {
        idempotencyKey,
      },
    )

    // ============================================================================
    // STEP 7: Update Add-On Entitlements (mark removed add-ons as canceled)
    // ============================================================================

    for (const addon of addOnsToRemove) {
      await supabase
        .from("org_addon_entitlements")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", addon.id)

      await supabase.from("license_change_log").insert({
        org_id: orgId,
        actor_user_id: user.id,
        action_type: "addon_removed_tier_upgrade",
        feature_key: addon.feature_key,
        stripe_subscription_id: license.stripe_subscription_id,
        stripe_subscription_item_id: addon.stripe_subscription_item_id,
        result_status: "succeeded",
      })
    }

    // ============================================================================
    // STEP 8: Handle Payment Result
    // ============================================================================

    let invoice: Stripe.Invoice | null = null
    if (updatedSubscription.latest_invoice) {
      const invoiceId =
        typeof updatedSubscription.latest_invoice === "string"
          ? updatedSubscription.latest_invoice
          : updatedSubscription.latest_invoice.id

      try {
        invoice = await stripe.invoices.retrieve(invoiceId)
      } catch (invoiceErr: any) {
        console.error("Failed to retrieve invoice:", invoiceErr)
      }
    }

    if (invoice) {
      if (invoice.status === "paid") {
        // Payment succeeded immediately
        await supabase
          .from("license_change_log")
          .update({
            result_status: "succeeded",
            stripe_invoice_id: invoice.id,
          })
          .eq("id", auditLog.id)

        // Update org_licenses
        await supabase
          .from("org_licenses")
          .update({
            stripe_price_id: targetTier.stripe_price_id,
          })
          .eq("org_id", orgId)

        // Sync organization summary
        await supabase.rpc("sync_org_license_summary", { org_id: orgId })

        return json(req, {
          success: true,
          message: "Upgrade completed successfully",
          new_tier_id: targetTierId,
          stripe_subscription_id: license.stripe_subscription_id,
          stripe_invoice_id: invoice.id,
          audit_log_id: auditLog.id,
        }, 200)
      } else if (invoice.status === "open" || invoice.status === "draft") {
        // Invoice needs payment
        try {
          // Finalize invoice if draft
          if (invoice.status === "draft") {
            invoice = await stripe.invoices.finalizeInvoice(invoice.id)
          }

          // Attempt payment
          invoice = await stripe.invoices.pay(invoice.id)

          if (invoice.status === "paid") {
            // Payment succeeded
            await supabase
              .from("license_change_log")
              .update({
                result_status: "succeeded",
                stripe_invoice_id: invoice.id,
              })
              .eq("id", auditLog.id)

            await supabase
              .from("org_licenses")
              .update({
                stripe_price_id: targetTier.stripe_price_id,
              })
              .eq("org_id", orgId)

            await supabase.rpc("sync_org_license_summary", { org_id: orgId })

            return json(req, {
              success: true,
              message: "Upgrade completed successfully",
              new_tier_id: targetTierId,
              stripe_subscription_id: license.stripe_subscription_id,
              stripe_invoice_id: invoice.id,
              audit_log_id: auditLog.id,
            }, 200)
          } else {
            // Payment requires action (SCA) or failed
            const requiresAction =
              invoice.status === "requires_payment_method" ||
              invoice.status === "requires_action"

            if (requiresAction && invoice.payment_intent) {
              const paymentIntent =
                typeof invoice.payment_intent === "string"
                  ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
                  : invoice.payment_intent

              return json(req, {
                success: false,
                message: "Payment action required",
                payment_action_required: true,
                client_secret: paymentIntent.client_secret,
                audit_log_id: auditLog.id,
              }, 402)
            } else {
              // Payment failed
              await supabase
                .from("license_change_log")
                .update({
                  result_status: "failed",
                  error_json: {
                    message: `Payment failed: ${invoice.status}`,
                    invoice_id: invoice.id,
                  },
                })
                .eq("id", auditLog.id)

              return json(req, {
                success: false,
                message: `Payment failed: ${invoice.status}`,
                audit_log_id: auditLog.id,
              }, 402)
            }
          }
        } catch (payErr: any) {
          // Payment attempt failed
          await supabase
            .from("license_change_log")
            .update({
              result_status: "failed",
              error_json: {
                message: payErr.message,
                code: payErr.code,
              },
            })
            .eq("id", auditLog.id)

          return json(req, {
            success: false,
            message: `Payment failed: ${payErr.message}`,
            audit_log_id: auditLog.id,
          }, 402)
        }
      } else {
        // Invoice in unexpected state
        return json(req, {
          success: false,
          message: `Invoice in unexpected state: ${invoice.status}`,
          payment_action_required: invoice.status === "requires_payment_method" || invoice.status === "requires_action",
          audit_log_id: auditLog.id,
        }, 400)
      }
    } else {
      // No invoice yet (shouldn't happen with proration)
      return json(req, {
        success: false,
        message: "Subscription updated but no invoice found",
        audit_log_id: auditLog.id,
      }, 400)
    }
  } catch (stripeErr: any) {
    // Subscription update failed
    await supabase
      .from("license_change_log")
      .update({
        result_status: "failed",
        error_json: {
          message: stripeErr.message,
          code: stripeErr.code,
        },
      })
      .eq("id", auditLog.id)

    return json(req, {
      success: false,
      message: `Failed to update subscription: ${stripeErr.message}`,
      audit_log_id: auditLog.id,
    }, 400)
  }
})
