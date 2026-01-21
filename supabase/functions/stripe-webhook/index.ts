// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")

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

async function upsertLicense(supabase: any, orgId: string, payload: {
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
}) {
  const graceDays = payload.grace_days ?? 0
  const graceEndsAt = payload.current_period_end ? new Date(payload.current_period_end * 1000 + graceDays * 24 * 60 * 60 * 1000) : null

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

  await supabase.from("org_licenses").upsert(record)
  await supabase.rpc("sync_org_license_summary", { org_id: orgId })
}

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const signature = req.headers.get("stripe-signature")
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", stripeWebhookSecret)
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }

  const existing = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle()

  if (existing.data) {
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  const organizationId = (event.data.object as any)?.client_reference_id || (event.data.object as any)?.metadata?.organization_id || null

  await supabase.from("billing_events").insert({
    org_id: organizationId,
    event_type: event.type,
    stripe_event_id: event.id,
    stripe_object_id: (event.data.object as any)?.id,
    payload: event,
  })

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === "payment") {
          const checkoutSessionId = (session.client_reference_id || session.metadata?.checkout_session_id) as string | null
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
              status: "succeeded",
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", checkout.id)

          break
        }

        if (session.mode !== "subscription") break
        const subId = session.subscription as string | null
        const orgId = (session.client_reference_id || session.metadata?.organization_id) as string | null
        if (!subId || !orgId) break
        const subscription = await stripe.subscriptions.retrieve(subId)
        const priceId = subscription.items.data[0]?.price?.id ?? null
        const plan = priceToPlan(priceId)
        await upsertLicense(supabase, orgId, {
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
        break
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string | null
        if (!subId) break
        const { data: lic } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle()
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
        const subId = invoice.subscription as string | null
        if (!subId) break
        const { data: lic } = await supabase
          .from("org_licenses")
          .select("org_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle()
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
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent
        const paymentIntentId = intent.id
        const { data: payment } = await supabase
          .from("payments")
          .select("id, checkout_session_id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle()
        if (!payment) break

        await supabase.rpc("complete_payment_processing", {
          p_payment_id: payment.id,
          p_checkout_session_id: payment.checkout_session_id,
        })

        await supabase
          .from("payments")
          .update({
            status: "succeeded",
            stripe_charge_id: typeof intent.latest_charge === "string" ? intent.latest_charge : null,
            paid_at: new Date().toISOString(),
          })
          .eq("id", payment.id)

        await supabase
          .from("checkout_sessions")
          .update({ status: "succeeded" })
          .eq("id", payment.checkout_session_id)

        break
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent
        const paymentIntentId = intent.id
        const { data: payment } = await supabase
          .from("payments")
          .select("id, checkout_session_id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle()
        if (!payment) break

        await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id)
        await supabase.from("checkout_sessions").update({ status: "canceled" }).eq("id", payment.checkout_session_id)
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const { data: lic } = await supabase
          .from("org_licenses")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle()
        if (!lic?.organization_id) break
        const priceId = subscription.items.data[0]?.price?.id ?? null
        const plan = priceToPlan(priceId)
        const status = ["past_due", "unpaid"].includes(subscription.status) ? "past_due" : subscription.status === "trialing" ? "trial" : "active"
        await upsertLicense(supabase, lic.organization_id, {
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
        const { data: lic } = await supabase
          .from("org_licenses")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle()
        if (!lic?.organization_id) break
        const endedStatus = subscription.cancel_at_period_end ? "canceled" : "expired"
        await upsertLicense(supabase, lic.organization_id, {
          status: endedStatus,
          current_period_end: subscription.current_period_end,
          stripe_subscription_id: subscription.id,
        })
        break
      }
      default:
        break
    }
  } catch (err: any) {
    await supabase
      .from("billing_events")
      .update({ error_message: err.message })
      .eq("stripe_event_id", event.id)
  }

  await supabase
    .from("billing_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("stripe_event_id", event.id)

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
