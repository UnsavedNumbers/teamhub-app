// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase environment not configured")
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null

serve(async (req) => {
  if (!stripe) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  })

  let payload: any
  try {
    payload = await req.json()
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const organizationId = payload?.organization_id as string | undefined
  const returnUrl = payload?.return_url as string | undefined

  if (!organizationId || !returnUrl) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const { data: memberships, error: membershipError } = await supabase.rpc("get_user_organizations", {
    check_user_id: user.id,
  })

  if (membershipError) {
    return new Response(JSON.stringify({ error: membershipError.message }), { status: 400 })
  }

  const hasAdminRole = (memberships as any[] | null)?.some((m) => m.organization_id === organizationId && m.role === "org_admin")
  if (!hasAdminRole) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", organizationId)
    .maybeSingle()

  if (orgError || !org?.stripe_customer_id) {
    return new Response(JSON.stringify({ error: "Stripe customer missing" }), { status: 400 })
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: returnUrl,
  })

  return new Response(JSON.stringify({ portal_url: portal.url }), { status: 200 })
})
