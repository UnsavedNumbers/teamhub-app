// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
  throw new Error("Missing required environment configuration")
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

interface FeeAssignmentRow {
  id: string
  fee_id: string | null
  organization_id: string
  parent_id: string
  amount_cents: number
  balance_cents: number
  currency: string | null
  fee?: { title: string | null; description: string | null } | null
}

async function logError(supabase: any, organizationId: string | null, message: string, payload: any) {
  await supabase.from("billing_events").insert({
    organization_id: organizationId,
    event_type: "parent_checkout_error",
    error_message: message,
    payload,
  })
}

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  let body: any
  try {
    body = await req.json()
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const feeAssignmentIds = Array.isArray(body?.fee_assignment_ids) ? body.fee_assignment_ids : []
  const discountCodeRaw = body?.discount_code as string | undefined
  const successUrl = body?.success_url as string | undefined
  const cancelUrl = body?.cancel_url as string | undefined

  if (!feeAssignmentIds || feeAssignmentIds.length === 0 || !successUrl || !cancelUrl) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 })
  }

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "parent") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }

  let organizationId: string | null = null

  try {
    const { data: assignments, error: assignmentError } = await supabase
      .from("fee_assignments")
      .select(
        `id, fee_id, organization_id, parent_id, amount_cents, balance_cents, currency, fee:fees(title, description)`,
      )
      .in("id", feeAssignmentIds)
      .eq("parent_id", user.id)

    if (assignmentError) {
      throw assignmentError
    }

    if (!assignments || assignments.length !== feeAssignmentIds.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    organizationId = assignments[0].organization_id
    const allSameOrg = assignments.every((a) => a.organization_id === organizationId)
    if (!allSameOrg) {
      return new Response(JSON.stringify({ error: "Mixed organization fees not allowed" }), { status: 400 })
    }

    const subtotal = assignments.reduce((sum, a) => sum + (a.balance_cents ?? a.amount_cents ?? 0), 0)
    if (subtotal <= 0) {
      return new Response(JSON.stringify({ error: "Nothing to pay" }), { status: 400 })
    }

    // Discount validation
    let discountAmount = 0
    let discount
    if (discountCodeRaw) {
      const discountCode = discountCodeRaw.trim().toUpperCase()
      const { data: discountRow, error: discountError } = await supabase
        .from("discount_codes")
        .select(
          "id, discount_type, percent_off, amount_off_cents, status, redeem_by, max_redemptions, applies_to_fee_id, organization_id",
        )
        .eq("code", discountCode)
        .eq("organization_id", organizationId)
        .maybeSingle()

      if (discountError || !discountRow) {
        return new Response(JSON.stringify({ error: "Invalid discount code" }), { status: 400 })
      }

      if (discountRow.status !== "active") {
        return new Response(JSON.stringify({ error: "Discount code inactive" }), { status: 400 })
      }

      if (discountRow.redeem_by && new Date(discountRow.redeem_by) < new Date()) {
        return new Response(JSON.stringify({ error: "Discount code expired" }), { status: 400 })
      }

      if (discountRow.max_redemptions) {
        const { count } = await supabase
          .from("discount_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("discount_code_id", discountRow.id)
        if (typeof count === "number" && count >= discountRow.max_redemptions) {
          return new Response(JSON.stringify({ error: "Discount code usage limit reached" }), { status: 400 })
        }
      }

      const eligibleAssignments = assignments.filter((a) => !discountRow.applies_to_fee_id || a.fee_id === discountRow.applies_to_fee_id)
      const eligibleSubtotal = eligibleAssignments.reduce((sum, a) => sum + (a.balance_cents ?? a.amount_cents ?? 0), 0)
      if (eligibleSubtotal <= 0) {
        return new Response(JSON.stringify({ error: "Discount not applicable" }), { status: 400 })
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
      organization_id: a.organization_id,
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
      return new Response(JSON.stringify({ error: "Discount covers entire balance" }), { status: 400 })
    }

    // Create checkout session record
    const { data: checkout, error: checkoutError } = await supabase
      .from("checkout_sessions")
      .insert({
        organization_id: organizationId,
        parent_id: user.id,
        status: "created",
        currency: payableCharges[0]?.currency || "usd",
        subtotal_cents: totalCents,
        platform_fee_cents: 0,
        total_cents: totalCents,
      })
      .select("id")
      .single()

    if (checkoutError || !checkout) {
      throw checkoutError
    }

    const { data: createdCharges, error: chargeError } = await supabase
      .from("charges")
      .insert(
        payableCharges.map((c) => ({
          organization_id: c.organization_id,
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

    if (chargeError || !createdCharges) {
      throw chargeError
    }

    const { error: itemError } = await supabase
      .from("checkout_session_items")
      .insert(
        createdCharges.map((c) => ({
          checkout_session_id: checkout.id,
          charge_id: c.id,
          fee_assignment_id: c.fee_assignment_id,
          amount_cents: c.amount_cents,
        })),
      )

    if (itemError) {
      throw itemError
    }

    if (discount && discountAmount > 0) {
      const { error: redemptionError } = await supabase
        .from("discount_redemptions")
        .insert(
          adjustedCharges
            .filter((c) => c.discount_applied > 0)
            .map((c) => ({
              discount_code_id: discount.id,
              fee_assignment_id: c.fee_assignment_id,
              redeemed_by_parent_id: user.id,
              amount_cents_applied: c.discount_applied,
            })),
        )

      if (redemptionError) {
        throw redemptionError
      }
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

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      client_reference_id: checkout.id,
      metadata: {
        checkout_session_id: checkout.id,
        parent_id: user.id,
        organization_id: organizationId,
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?session_id={CHECKOUT_SESSION_ID}`,
    })

    await supabase
      .from("checkout_sessions")
      .update({ stripe_checkout_session_id: stripeSession.id, status: "in_progress" })
      .eq("id", checkout.id)

    return new Response(
      JSON.stringify({ checkout_session_url: stripeSession.url, session_id: stripeSession.id }),
      { status: 200 },
    )
  } catch (err: any) {
    await logError(supabase, organizationId, err?.message || "parent checkout error", { error: err?.toString(), body })
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
})
