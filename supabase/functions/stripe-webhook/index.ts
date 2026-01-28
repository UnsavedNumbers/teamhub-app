// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!

const priceStarter = Deno.env.get("STRIPE_PRICE_STARTER_YEAR")
const priceStandard = Deno.env.get("STRIPE_PRICE_STANDARD_YEAR")
const pricePro = Deno.env.get("STRIPE_PRICE_PRO_YEAR")

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Missing required environment configuration")
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

function priceToPlan(priceId: string | null): string | null {
  switch (priceId) {
    case priceStarter:
      return "starter"
    case priceStandard:
      return "standard"
    case pricePro:
      return "pro"
    default:
      return null
  }
}

// Extract org_id robustly from different Stripe object types
function extractOrgIdFromEvent(event: Stripe.Event): string | null {
  const obj: any = event.data.object as any

  // Checkout Session has client_reference_id and metadata
  if (event.type.startsWith("checkout.session.")) {
    return (obj?.client_reference_id ?? obj?.metadata?.org_id ?? obj?.metadata?.organization_id ?? null) as string | null
  }

  // Subscription might have metadata if you set it (recommended)
  if (event.type.startsWith("customer.subscription.")) {
    return (obj?.metadata?.org_id ?? obj?.metadata?.organization_id ?? null) as string | null
  }

  // Invoices sometimes contain subscription details; org_id usually not present unless you add metadata upstream
  if (event.type.startsWith("invoice.")) {
    return (obj?.metadata?.org_id ?? obj?.metadata?.organization_id ?? null) as string | null
  }

  // PaymentIntent typically won’t carry org_id unless you attach metadata yourself
  if (event.type.startsWith("payment_intent.")) {
    return (obj?.metadata?.org_id ?? obj?.metadata?.organization_id ?? null) as string | null
  }

  return null
}

async function upsertLicense(
  supabase: any,
  orgId: string,
  payload: {
    status?: string
    plan?: string | null
    current_period_start?: number | null
    current_period_end?: number | null
    cancel_at_period_end?: boolean | null
    trial_end?: number | null
    grace_days?: number | null
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    stripe_price_id?: string | null
    stripe_latest_invoice_id?: string | null
  },
) {
  const graceDays = payload.grace_days ?? 0
  const graceEndsAt =
    payload.current_period_end
      ? new Date(payload.current_period_end * 1000 + graceDays * 24 * 60 * 60 * 1000)
      : null

  // IMPORTANT: use org_id (not organization_id)
  const record = {
    org_id: orgId,
    status: payload.status,
    plan: payload.plan,
    current_period_start: payload.current_period_start ? new Date(payload.current_period_start * 1000).toISOString() : null,
    current_period_end: payload.current_period_end ? new Date(payload.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: payload.cancel_at_period_end ?? false,
    trial_ends_at: payload.trial_end ? new Date(payload.trial_end * 1000).toISOString() : null,
    grace_ends_at: graceEndsAt ? graceEndsAt.toISOString() : null,
    stripe_customer_id: payload.stripe_customer_id,
    stripe_subscription_id: payload.stripe_subscription_id,
    stripe_price_id: payload.stripe_price_id,
    stripe_latest_invoice_id: payload.stripe_latest_invoice_id,
  }

  const { error: upsertErr } = await supabase
    .from("org_licenses")
    .upsert(record, { onConflict: "org_id" })

  if (upsertErr) throw upsertErr

  const { error: rpcErr } = await supabase.rpc("sync_org_license_summary", { org_id: orgId })
  if (rpcErr) throw rpcErr
}

async function markFeeAssignmentPaid(
  supabase: any,
  feeAssignmentId: string,
  amountPaidCents: number,
) {
  // Read current state (needed if you support partial payments / multiple payments)
  const { data: fa, error: faErr } = await supabase
    .from("fee_assignments")
    .select("id, amount_cents, paid_cents_total, balance_cents")
    .eq("id", feeAssignmentId)
    .single()

  if (faErr) throw faErr

  const newPaid = (fa.paid_cents_total ?? 0) + amountPaidCents
  const newBalance = Math.max(fa.amount_cents - newPaid, 0)

  const newStatus =
    newBalance === 0 ? "paid" :
      newPaid > 0 ? "partial" :
        "unpaid"

  const { error: updErr } = await supabase
    .from("fee_assignments")
    .update({
      paid_cents_total: newPaid,
      balance_cents: newBalance,
      status: newStatus,
    })
    .eq("id", feeAssignmentId)

  if (updErr) throw updErr
}

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const signature = req.headers.get("stripe-signature")
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature ?? "", stripeWebhookSecret)
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }

  // Idempotency guard
  const { data: existing, error: existingErr } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle()

  if (existingErr) {
    // If billing_events is misconfigured, you still want webhook processing to proceed,
    // but you should see this in logs.
    console.error("billing_events lookup error:", existingErr.message)
  } else if (existing?.id) {
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  const orgId = extractOrgIdFromEvent(event)

  // Best-effort logging (don’t block billing if logging fails)
  const { error: insertEventErr } = await supabase.from("billing_events").insert({
    org_id: orgId, // <-- change this if your billing_events uses a different column name
    event_type: event.type,
    stripe_event_id: event.id,
    stripe_object_id: (event.data.object as any)?.id,
    payload: event,
  })

  if (insertEventErr) {
    console.error("billing_events insert error:", insertEventErr.message)
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === "payment") {
          const checkoutSessionId = session.metadata?.checkout_session_id as string | null
          const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null
          if (!checkoutSessionId || !paymentIntentId) break

          const { data: checkout } = await supabase
            .from("checkout_sessions")
            .select("id, org_id, parent_id")
            .eq("id", checkoutSessionId)
            .maybeSingle()
          if (!checkout) break

          const existingPayment = await supabase
            .from("payments")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .maybeSingle()

          if (!existingPayment.data) {
            await supabase.from("payments").insert({
              org_id: checkout.org_id,
              checkout_session_id: checkout.id,
              parent_id: checkout.parent_id,
              amount_cents: session.amount_total ?? 0,
              currency: session.currency ?? "usd",
              stripe_payment_intent_id: paymentIntentId,
              stripe_charge_id: typeof session.latest_charge === "string" ? session.latest_charge : null,
              platform_fee_cents: 0,
              status: "pending",
            })
          }

          await supabase
            .from("checkout_sessions")
            .update({
              status: "pending",
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", checkout.id)

          break
        }

        // Your edge function creates subscription Checkout Sessions
        if (session.mode !== "subscription") break

        const subId = typeof session.subscription === "string" ? session.subscription : null
        const resolvedOrgId =
          (session.client_reference_id ?? session.metadata?.org_id ?? session.metadata?.organization_id ?? null) as string | null

        if (!subId || !resolvedOrgId) break

        const subscription = await stripe.subscriptions.retrieve(subId)
        const priceId = subscription.items.data[0]?.price?.id ?? null
        const plan = priceToPlan(priceId)

        await upsertLicense(supabase, resolvedOrgId, {
          status: subscription.status === "trialing" ? "trial" : "active",
          plan,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_end: subscription.trial_end,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          stripe_latest_invoice_id: subscription.latest_invoice as string | null,
        })

        // OPTIONAL: update your checkout_sessions row status if you stored checkout_session_id in metadata
        const checkoutSessionId = session.metadata?.checkout_session_id as string | undefined
        if (checkoutSessionId) {
          await supabase
            .from("checkout_sessions")
            .update({ status: "succeeded", stripe_checkout_session_id: session.id })
            .eq("id", checkoutSessionId)
        }

        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null
        if (!subId) break

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        await upsertLicense(supabase, lic.org_id, {
          status: "active",
          current_period_end: invoice.lines.data[0]?.period?.end ?? invoice.period_end ?? null,
          stripe_subscription_id: subId,
          stripe_latest_invoice_id: invoice.id,
        })
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null
        if (!subId) break

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        await upsertLicense(supabase, lic.org_id, {
          status: "past_due",
          current_period_end: invoice.lines.data[0]?.period?.end ?? invoice.period_end ?? null,
          stripe_subscription_id: subId,
          stripe_latest_invoice_id: invoice.id,
          grace_days: 7,
        })
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        const priceId = subscription.items.data[0]?.price?.id ?? null
        const plan = priceToPlan(priceId)
        const status =
          ["past_due", "unpaid"].includes(subscription.status)
            ? "past_due"
            : subscription.status === "trialing"
              ? "trial"
              : "active"

        await upsertLicense(supabase, lic.org_id, {
          status,
          plan,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_end: subscription.trial_end,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          stripe_latest_invoice_id: subscription.latest_invoice as string | null,
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const { data: lic, error: licErr } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle()

        if (licErr) throw licErr
        if (!lic?.org_id) break

        const endedStatus = subscription.cancel_at_period_end ? "canceled" : "expired"

        await upsertLicense(supabase, lic.org_id, {
          status: endedStatus,
          current_period_end: subscription.current_period_end,
          stripe_subscription_id: subscription.id,
        })
        break
      }

      // Keep these only if you also have one-time payments. Your current checkout is subscription.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent

        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
        })

        const session = sessions.data[0] ?? null
        if (!session) break

        const checkoutSessionId = session.metadata?.checkout_session_id as string | null

        const paymentIntentId = pi.id
        // Use amount_received if available (actual captured amount), else amount (intended)
        const amountReceived = pi.amount_received ?? pi.amount ?? 0
        const currency = pi.currency ?? "usd"
        const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null

        // Stripe metadata values are strings
        const isPartial = session.metadata?.is_partial === "true"
        const paymentType = isPartial ? "partial" : "full"

        // Fetch checkout session to get org_id/parent_id (needed for inserts)
        const { data: checkout, error: checkoutErr } = await supabase
          .from("checkout_sessions")
          .select("id, org_id, parent_id")
          .eq("id", checkoutSessionId)
          .maybeSingle()
        if (checkoutErr) throw checkoutErr
        if (!checkout) break

        // Upsert payment by stripe_payment_intent_id (idempotent & reliable)
        const { data: payment, error: upsertPayErr } = await supabase
          .from("payments")
          .upsert(
            {
              org_id: checkout.org_id,
              checkout_session_id: checkout.id,
              parent_id: checkout.parent_id,
              amount_cents: amountReceived,
              currency,
              stripe_payment_intent_id: paymentIntentId,
              stripe_charge_id: chargeId,
              platform_fee_cents: 0,
              status: "succeeded",
              payment_type: paymentType,
              paid_at: new Date().toISOString(),
            },
            { onConflict: "stripe_payment_intent_id" }, // ensure you have a unique constraint/index on this
          )
          .select("id")
          .single()
        if (upsertPayErr) throw upsertPayErr
        if (!payment) {
          throw new Error("Payment upsert did not return payment id")
        }

        // Load checkout_session_items with current fee_assignment balances for validation
        const { data: sessionItems, error: itemsErr } = await supabase
          .from("checkout_session_items")
          .select(`
            id,
            amount_cents,
            fee_assignment_id,
            fee_assignment:fee_assignments(id, balance_cents)
          `)
          .eq("checkout_session_id", checkout.id)

        if (itemsErr) throw itemsErr
        if (!sessionItems || sessionItems.length === 0) {
          console.warn(`No checkout_session_items found for checkout ${checkout.id}`)
          break
        }

        // Validate each item's amount_cents <= current fee_assignment.balance_cents
        // If any exceed, skip allocations and flag payment for review
        let shouldProcessAllocations = true
        const validationErrors: string[] = []

        for (const item of sessionItems) {
          const itemAmount = item.amount_cents
          const feeAssignment = item.fee_assignment as { id: string; balance_cents: number } | null
          
          if (!feeAssignment) {
            validationErrors.push(`Item ${item.id}: fee_assignment not found`)
            shouldProcessAllocations = false
            continue
          }

          const currentBalance = feeAssignment.balance_cents ?? 0
          if (itemAmount > currentBalance) {
            validationErrors.push(
              `Item ${item.id}: amount ${itemAmount} exceeds balance ${currentBalance} for fee_assignment ${feeAssignment.id}`
            )
            shouldProcessAllocations = false
          }
        }

        if (!shouldProcessAllocations) {
          // Payment succeeded but allocations would over-allocate - flag for review
          console.error(`Payment ${payment.id} cannot be allocated:`, validationErrors)
          
          // Optionally update payment with a flag or create a review record
          // For now, we'll log and leave payment as succeeded but without allocations
          // Admin can manually allocate or refund
          await supabase
            .from("checkout_sessions")
            .update({
              status: "succeeded",
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", checkout.id)
          
          // Log to billing_events for admin visibility
          await supabase.from("billing_events").insert({
            org_id: checkout.org_id,
            event_type: "payment_allocation_validation_failed",
            stripe_event_id: event.id,
            stripe_object_id: paymentIntentId,
            error_message: `Allocation validation failed: ${validationErrors.join("; ")}`,
            payload: { payment_id: payment.id, checkout_session_id: checkout.id, validation_errors: validationErrors },
          })
          
          break
        }

        // All validations passed - call complete_payment_processing to create allocations
        const { error: processErr } = await supabase.rpc("complete_payment_processing", {
          p_payment_id: payment.id,
          p_checkout_session_id: checkout.id,
        })

        if (processErr) {
          console.error(`complete_payment_processing failed for payment ${payment.id}:`, processErr)
          throw processErr
        }

        // Update checkout session status (complete_payment_processing also updates it, but ensure it's set)
        const { error: updCheckoutErr } = await supabase
          .from("checkout_sessions")
          .update({
            status: "succeeded",
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", checkout.id)
        if (updCheckoutErr) throw updCheckoutErr

        break
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent

        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
        })

        const session = sessions.data[0] ?? null
        if (!session) break

        console.log(session);

        const checkoutSessionId = session.metadata?.checkout_session_id as string | null

        const paymentIntentId = pi.id
        const currency = pi.currency ?? "usd"

        const { data: checkout, error: checkoutErr } = await supabase
          .from("checkout_sessions")
          .select("id, org_id, parent_id")
          .eq("id", checkoutSessionId)
          .maybeSingle()
        if (checkoutErr) throw checkoutErr
        if (!checkout) break

        // Upsert payment as failed (don’t rely on existing row)
        const { error: upsertPayErr } = await supabase
          .from("payments")
          .upsert(
            {
              org_id: checkout.org_id,
              checkout_session_id: checkout.id,
              parent_id: checkout.parent_id,
              amount_cents: pi.amount ?? 0,
              currency,
              stripe_payment_intent_id: paymentIntentId,
              status: "failed",
            },
            { onConflict: "stripe_payment_intent_id" },
          )
        if (upsertPayErr) throw upsertPayErr

        const { error: updCheckoutErr } = await supabase
          .from("checkout_sessions")
          .update({ status: "failed", stripe_payment_intent_id: paymentIntentId })
          .eq("id", checkout.id)
        if (updCheckoutErr) throw updCheckoutErr

        break
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account

        const payoutsEnabled = acct.payouts_enabled === true
        const chargesEnabled = acct.charges_enabled === true

        const currentlyDue = acct.requirements?.currently_due?.length ?? 0
        const pendingVerif = acct.requirements?.pending_verification?.length ?? 0

        // Map Stripe state -> your enum
        // Adjust these strings to match your actual payout_onboarding_status enum values
        let onboardingStatus: string
        if (chargesEnabled && payoutsEnabled) onboardingStatus = "complete"
        else if (currentlyDue > 0) onboardingStatus = "pending"
        else if (pendingVerif > 0) onboardingStatus = "in_review"
        else onboardingStatus = "restricted"

        const { error } = await supabase
          .from("organizations")
          .update({
            payouts_enabled: payoutsEnabled,
            payout_onboarding_status: onboardingStatus,
            // optional: connect_link_created_at, updated_at already handled by trigger
          })
          .eq("payout_account_id", acct.id)

        if (error) throw error
        break
      }
      default:
        break
    }
  } catch (err: any) {
    console.error("webhook processing error:", err?.message ?? err)

    // Best-effort error stamp
    await supabase
      .from("billing_events")
      .update({ error_message: err?.message ?? "unknown error" })
      .eq("stripe_event_id", event.id)
  }

  await supabase
    .from("billing_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("stripe_event_id", event.id)

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
