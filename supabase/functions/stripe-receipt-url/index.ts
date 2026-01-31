// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase environment not configured")
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null

interface FeeAssignmentRow {
  id: string
  org_id: string
  parent_id: string
  athlete_id: string
}

interface PaymentRow {
  id: string
  stripe_charge_id: string | null
  stripe_payment_intent_id: string | null
  status: string
  created_at: string
}

/**
 * CORS: Reflect origin, allow POST and auth headers (mirror parent-create-checkout-session).
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  if (!stripe) {
    return json(req, { error: "Stripe not configured" }, 503)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
        apikey: req.headers.get("apikey") ?? "",
      },
    },
  })

  let body: any
  try {
    body = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const assignmentId = typeof body?.assignment_id === "string" ? body.assignment_id.trim() : null
  if (!assignmentId) {
    return json(req, { error: "Missing or invalid assignment_id" }, 400)
  }

  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr) {
    return json(req, { error: "Unauthorized" }, 401)
  }
  const user = authData?.user
  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  // Load fee assignment (service role so RLS does not block)
  const { data: assignment, error: assignmentErr } = await supabase
    .from("fee_assignments")
    .select("id, org_id, parent_id, athlete_id")
    .eq("id", assignmentId)
    .maybeSingle()

  if (assignmentErr) {
    return json(req, { error: "Failed to load assignment" }, 500)
  }
  if (!assignment) {
    return json(req, { error: "Assignment not found" }, 404)
  }

  const fa = assignment as FeeAssignmentRow

  // Authorization: org_admin or coach for this org, OR parent, OR guardian of athlete in this org
  const isParent = fa.parent_id === user.id
  if (isParent) {
    // allowed
  } else {
    const { data: memberships, error: membershipErr } = await supabase.rpc("get_user_organizations", {
      check_user_id: user.id,
    })
    if (membershipErr) {
      return json(req, { error: "Failed to check membership" }, 500)
    }
    const hasOrgRole = (memberships as any[] | null)?.some(
      (m: any) =>
        m.org_id === fa.org_id &&
        Array.isArray(m.roles) &&
        (m.roles.includes("org_admin") || m.roles.includes("coach"))
    )
    if (!hasOrgRole) {
      const { data: guardianRow, error: guardianErr } = await supabase
        .from("athlete_guardians")
        .select("id")
        .eq("athlete_id", fa.athlete_id)
        .eq("user_id", user.id)
        .eq("org_id", fa.org_id)
        .eq("status", "active")
        .maybeSingle()

      if (guardianErr) {
        return json(req, { error: "Failed to check guardian" }, 500)
      }
      if (!guardianRow) {
        return json(req, { error: "Forbidden" }, 403)
      }
    }
  }

  // Resolve payments for this assignment: (1) payment_allocations, or (2) checkout_session_items
  let paymentIds: string[] = []
  const { data: allocations, error: allocErr } = await supabase
    .from("payment_allocations")
    .select("payment_id")
    .eq("fee_assignment_id", assignmentId)

  if (allocErr) {
    return json(req, { error: "Failed to load allocations" }, 500)
  }
  paymentIds = [...new Set((allocations ?? []).map((a: any) => a.payment_id).filter(Boolean))]

  // Fallback: payments may exist without allocations (e.g. webhook skipped allocations)
  if (paymentIds.length === 0) {
    const { data: items, error: itemsErr } = await supabase
      .from("checkout_session_items")
      .select("checkout_session_id")
      .eq("fee_assignment_id", assignmentId)

    if (itemsErr) {
      return json(req, { error: "Failed to load checkout items" }, 500)
    }
    const sessionIds = [...new Set((items ?? []).map((i: any) => i.checkout_session_id).filter(Boolean))]
    if (sessionIds.length === 0) {
      return json(req, { error: "No Stripe receipt available for this assignment" }, 404)
    }
    const { data: paymentsBySession, error: payErr } = await supabase
      .from("payments")
      .select("id")
      .in("checkout_session_id", sessionIds)
      .eq("status", "succeeded")
      .not("stripe_payment_intent_id", "is", null)
      .order("created_at", { ascending: false })
    if (payErr) {
      return json(req, { error: "Failed to load payments" }, 500)
    }
    paymentIds = (paymentsBySession ?? []).map((p: any) => p.id)
  }

  if (paymentIds.length === 0) {
    return json(req, { error: "No Stripe receipt available for this assignment" }, 404)
  }

  const { data: payments, error: paymentsErr } = await supabase
    .from("payments")
    .select("id, stripe_charge_id, stripe_payment_intent_id, status, created_at")
    .in("id", paymentIds)
    .order("created_at", { ascending: false })

  if (paymentsErr) {
    return json(req, { error: "Failed to load payments" }, 500)
  }

  // First successful payment that has Stripe data (use most recent by created_at desc)
  const successStatuses = ["succeeded"]
  const paymentWithStripe = (payments as PaymentRow[] ?? []).find(
    (p) =>
      successStatuses.includes(p.status) &&
      (p.stripe_charge_id != null || p.stripe_payment_intent_id != null)
  )
  if (!paymentWithStripe) {
    return json(req, { error: "No Stripe receipt available for this assignment" }, 404)
  }

  let chargeId: string | null = paymentWithStripe.stripe_charge_id
  if (!chargeId && paymentWithStripe.stripe_payment_intent_id) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentWithStripe.stripe_payment_intent_id)
      chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null
    } catch (stripeErr: any) {
      console.error("Stripe PI retrieve error:", stripeErr?.message)
      return json(req, { error: "Receipt unavailable" }, 500)
    }
  }
  if (!chargeId) {
    return json(req, { error: "No Stripe receipt available for this assignment" }, 404)
  }

  try {
    const charge = await stripe.charges.retrieve(chargeId)
    const receiptUrl = charge.receipt_url ?? null
    if (!receiptUrl || typeof receiptUrl !== "string") {
      return json(req, { error: "Receipt URL not yet available from Stripe" }, 404)
    }
    return json(req, { url: receiptUrl }, 200)
  } catch (stripeErr: any) {
    console.error("Stripe charge retrieve error:", stripeErr?.message)
    return json(req, { error: "Receipt unavailable" }, 500)
  }
})
