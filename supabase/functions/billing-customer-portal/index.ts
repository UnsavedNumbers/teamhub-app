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

// ---- CORS helpers ----
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  // add prod origins here, e.g. "https://app.yourdomain.com"
])

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? ""
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : ""

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
}

function json(req: Request, body: unknown, status = 200) {
  const cors = corsHeaders(req)
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
// ----------------------

serve(async (req) => {
  // ✅ Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (!stripe) {
    return json(req, { error: "Stripe not configured" }, 500)
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const organizationId = payload?.organization_id as string | undefined
  const returnUrl = payload?.return_url as string | undefined

  if (!organizationId || !returnUrl) {
    return json(req, { error: "Missing required parameters" }, 400)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  const { data: memberships, error: membershipError } = await supabase.rpc("get_user_organizations", {
    check_user_id: user.id,
  })

  if (membershipError) {
    return json(req, { error: membershipError.message }, 400)
  }

  // ✅ FIX: your RPC returns { org_id, org_name, roles: ["org_admin", ...] }
  const hasAdminRole = (memberships as any[] | null)?.some(
    (m) =>
      m.org_id === organizationId &&
      Array.isArray(m.roles) &&
      m.roles.includes("org_admin"),
  )

  if (!hasAdminRole) {
    return json(req, { error: "Forbidden" }, 403)
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", organizationId)
    .maybeSingle()

  if (orgError || !org?.stripe_customer_id) {
    return json(req, { error: "Stripe customer missing" }, 400)
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: returnUrl,
  })

  return json(req, { portal_url: portal.url }, 200)
})
