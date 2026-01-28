// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
  throw new Error("Missing required environment configuration")
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

interface FeeAssignmentRow {
  id: string
  fee_id: string | null
  org_id: string
  parent_id: string
  amount_cents: number
  balance_cents: number
  currency: string | null
  fee?: { title: string | null; description: string | null } | null
}

/**
 * CORS: Allow any origin by reflecting Origin. This works with Authorization headers
 * as long as you are NOT using cookies/credentials in fetch().
 */
function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*"
  const reqHeaders =
    req.headers.get("access-control-request-headers") ??
    "authorization, apikey, content-type, x-client-info, x-requested-with, accept, prefer, range"

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
}

function json(req: Request, body: unknown, status = 200) {
  const cors = buildCorsHeaders(req)
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

async function logError(supabase: any, organizationId: string | null, message: string, payload: any) {
  // Best-effort logging; never throw from logger
  try {
    await supabase.from("billing_events").insert({
      org_id: organizationId,
      event_type: "parent_checkout_error",
      error_message: message,
      payload,
    })
  } catch (_e) {
    // ignore
  }
}

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  // IMPORTANT:
  // - Use service role key to read/write server-side.
  // - Also forward the end-user Authorization header to supabase.auth.getUser().
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: {
        // Pass through end-user JWT so auth.getUser() works
        Authorization: req.headers.get("Authorization") ?? "",
        // Some clients send apikey; pass through if present (harmless)
        apikey: req.headers.get("apikey") ?? "",
      },
    },
  })

  let body: any
  try {
    // NOTE: This is NOT a Stripe webhook endpoint, so req.json() is fine here.
    body = await req.json()
  } catch (_err) {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const feeAssignmentIds = Array.isArray(body?.fee_assignment_ids) ? body.fee_assignment_ids : []
  const discountCodeRaw = body?.discount_code as string | undefined
  const successUrl = body?.success_url as string | undefined
  const cancelUrl = body?.cancel_url as string | undefined

  if (!feeAssignmentIds || feeAssignmentIds.length === 0 || !successUrl || !cancelUrl) {
    return json(req, { error: "Missing required parameters" }, 400)
  }

  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr) {
    return json(req, { error: "Unauthorized" }, 401)
  }
  const user = authData?.user
  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileErr) {
    return json(req, { error: "Failed to load profile" }, 500)
  }

  if (profile?.role !== "parent") {
    return json(req, { error: "Forbidden" }, 403)
  }

  let organizationId: string | null = null

  try {
    const { data: assignments, error: assignmentError } = await supabase
      .from("fee_assignments")
      .select(`id, fee_id, org_id, parent_id, amount_cents, balance_cents, currency, fee:fees(title, description)`)
      .in("id", feeAssignmentIds)
      .eq("parent_id", user.id)

    if (assignmentError) throw assignmentError

    if (!assignments || assignments.length !== feeAssignmentIds.length) {
      return json(req, { error: "Forbidden" }, 403)
    }

    organizationId = assignments[0].org_id
    const allSameOrg = assignments.every((a) => a.org_id === organizationId)
    if (!allSameOrg) {
      return json(req, { error: "Mixed organization fees not allowed" }, 400)
    }

    const subtotal = assignments.reduce((sum, a) => sum + (a.balance_cents ?? a.amount_cents ?? 0), 0)
    if (subtotal <= 0) {
      return json(req, { error: "Nothing to pay" }, 400)
    }

    // Discount validation
    let discountAmount = 0
    let discount: any = null

    if (discountCodeRaw) {
      const discountCode = discountCodeRaw.trim().toUpperCase()
      const { data: discountRow, error: discountError } = await supabase
        .from("discount_codes")
        .select(
          "id, discount_type, percent_off, amount_off_cents, status, redeem_by, max_redemptions, applies_to_fee_id, org_id",
        )
        .eq("code", discountCode)
        .eq("org_id", organizationId)
        .maybeSingle()

      if (discountError || !discountRow) {
        return json(req, { error: "Invalid discount code" }, 400)
      }

      if (discountRow.status !== "active") {
        return json(req, { error: "Discount code inactive" }, 400)
      }

      if (discountRow.redeem_by && new Date(discountRow.redeem_by) < new Date()) {
        return json(req, { error: "Discount code expired" }, 400)
      }

      if (discountRow.max_redemptions) {
        const { count, error: countErr } = await supabase
          .from("discount_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("discount_code_id", discountRow.id)

        if (countErr) throw countErr
        if (typeof count === "number" && count >= discountRow.max_redemptions) {
          return json(req, { error: "Discount code usage limit reached" }, 400)
        }
      }

      const eligibleAssignments = assignments.filter((a) =>
        !discountRow.applies_to_fee_id || a.fee_id === discountRow.applies_to_fee_id
      )
      const eligibleSubtotal = eligibleAssignments.reduce(
        (sum, a) => sum + (a.balance_cents ?? a.amount_cents ?? 0),
        0,
      )
      if (eligibleSubtotal <= 0) {
        return json(req, { error: "Discount not applicable" }, 400)
      }

      if (discountRow.discount_type === "percent" && discountRow.percent_off) {
        discountAmount = Math.floor((eligibleSubtotal * discountRow.percent_off) / 100)
      } else if (discountRow.discount_type === "fixed" && discountRow.amount_off_cents) {
        discountAmount = discountRow.amount_off_cents
      }

      discountAmount = Math.min(discountAmount, eligibleSubtotal)
      discount = discountRow
    }

    const baseCharges = (assignments as FeeAssignmentRow[]).map((a) => ({
      fee_assignment_id: a.id,
      fee_id: a.fee_id,
      org_id: a.org_id,
      description: a.fee?.title || "Fee payment",
      amount_cents: a.balance_cents ?? a.amount_cents ?? 0,
      currency: a.currency || "usd",
      eligibleForDiscount: !discount?.applies_to_fee_id || discount.applies_to_fee_id === a.fee_id,
    }))

    let remainingDiscount = discountAmount
    const adjustedCharges = baseCharges.map((charge) => {
      if (!discount || remainingDiscount <= 0 || !charge.eligibleForDiscount) {
        return { ...charge, discount_applied: 0 }
      }
      const applied = Math.min(charge.amount_cents, remainingDiscount)
      remainingDiscount -= applied
      return { ...charge, amount_cents: charge.amount_cents - applied, discount_applied: applied }
    })

    const payableCharges = adjustedCharges.filter((c) => c.amount_cents > 0)
    const totalCents = payableCharges.reduce((sum, c) => sum + c.amount_cents, 0)
    if (totalCents <= 0) {
      return json(req, { error: "Discount covers entire balance" }, 400)
    }

    // Create checkout session record (internal)
    const { data: checkout, error: checkoutError } = await supabase
      .from("checkout_sessions")
      .insert({
        org_id: organizationId,
        parent_id: user.id,
        status: "created",
        currency: payableCharges[0]?.currency || "usd",
        subtotal_cents: totalCents,
        platform_fee_cents: 0,
        total_cents: totalCents,
      })
      .select("id")
      .single()

    if (checkoutError || !checkout) throw checkoutError

    const { data: createdCharges, error: chargeError } = await supabase
      .from("charges")
      .insert(
        payableCharges.map((c) => ({
          org_id: c.org_id,
          charge_type: "fee_payment",
          fee_assignment_id: c.fee_assignment_id,
          fee_id: c.fee_id,
          description: c.description,
          amount_cents: c.amount_cents,
          currency: c.currency,
          status: "pending",
          created_by_user_id: user.id,
        })),
      )
      .select("id, fee_assignment_id, amount_cents")

    if (chargeError || !createdCharges) throw chargeError

    const { error: itemError } = await supabase.from("checkout_session_items").insert(
      createdCharges.map((c) => ({
        checkout_session_id: checkout.id,
        charge_id: c.id,
        fee_assignment_id: c.fee_assignment_id,
        amount_cents: c.amount_cents,
      })),
    )
    if (itemError) throw itemError

    if (discount && discountAmount > 0) {
      const { error: redemptionError } = await supabase.from("discount_redemptions").insert(
        adjustedCharges
          .filter((c) => c.discount_applied > 0)
          .map((c) => ({
            discount_code_id: discount.id,
            fee_assignment_id: c.fee_assignment_id,
            redeemed_by_parent_id: user.id,
            amount_cents_applied: c.discount_applied,
          })),
      )
      if (redemptionError) throw redemptionError
    }

    const lineItems = createdCharges.map((c) => {
      const charge = payableCharges.find((p) => p.fee_assignment_id === c.fee_assignment_id)
      return {
        price_data: {
          currency: charge?.currency || "usd",
          product_data: { name: charge?.description || "Team Fee" },
          unit_amount: c.amount_cents,
        },
        quantity: 1,
      }
    })

    // Fetch organization with Connect status for payment routing
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("payout_account_id, payouts_enabled, billing_mode")
      .eq("id", organizationId)
      .single()

    if (orgError || !org) {
      return json(req, { error: "Organization not found" }, 404)
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      client_reference_id: checkout.id,
      metadata: {
        checkout_session_id: checkout.id,
        parent_id: user.id,
        organization_id: organizationId,
        fee_assignment_ids: payableCharges.map((c) => c.fee_assignment_id).join(","),
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?session_id={CHECKOUT_SESSION_ID}`,
      payment_intent_data: {
        metadata: {
          checkout_session_id: checkout.id,
          parent_id: user.id,
          organization_id: organizationId,
        },
      },
    }

    // Route to connected account (destination charge)
    if (org.payout_account_id && org.payouts_enabled && org.billing_mode === "platform_facilitated") {
      const platformFeeCents = Math.floor(totalCents * 0.029) // example fee
      sessionParams.payment_intent_data = {
        ...(sessionParams.payment_intent_data ?? {}),
        transfer_data: { destination: org.payout_account_id },
        application_fee_amount: platformFeeCents,
        metadata: {
          ...(sessionParams.payment_intent_data?.metadata ?? {}),
          checkout_session_id: checkout.id,
          parent_id: user.id,
          organization_id: organizationId,
        },
      }

      await supabase.from("checkout_sessions").update({ platform_fee_cents: platformFeeCents }).eq("id", checkout.id)
    }

    try {
      const stripeSession = await stripe.checkout.sessions.create(sessionParams)

      await supabase
        .from("checkout_sessions")
        .update({
          stripe_checkout_session_id: stripeSession.id,
          status: "in_progress",
        })
        .eq("id", checkout.id)

      return json(req, { checkout_session_url: stripeSession.url, session_id: stripeSession.id }, 200)
    } catch (stripeError: any) {
      await supabase.from("checkout_sessions").update({ status: "failed" }).eq("id", checkout.id)

      await logError(
        supabase,
        organizationId,
        `Stripe session creation failed: ${stripeError?.message ?? "unknown Stripe error"}`,
        { error: stripeError?.toString?.() ?? String(stripeError), checkout_id: checkout.id },
      )

      return json(req, { error: "Payment processing failed. Please try again or contact support." }, 500)
    }
  } catch (err: any) {
    await logError(supabase, organizationId, err?.message || "parent checkout error", {
      error: err?.toString?.() ?? String(err),
      body,
    })
    return json(req, { error: err?.message || "Internal error" }, 500)
  }
})
