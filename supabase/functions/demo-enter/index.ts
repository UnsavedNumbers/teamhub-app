import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// ---- CORS helpers ----
function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders = req.headers.get("Access-Control-Request-Headers") ??
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

// ---- Types ----
interface DemoEnterRequest {
  code: string
  role: string
}

interface DemoEnterResponse {
  success: boolean
  redirect_url?: string
  session_token?: string
  error?: string
  message?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return json(req, {}, 200)
  }

  if (req.method !== "POST") {
    return json(req, { success: false, error: "Method not allowed" }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return json(req, { success: false, error: "Server misconfigured" }, 500)
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Parse request body
    const body: DemoEnterRequest = await req.json()

    if (!body.code || !body.role) {
      return json(req, {
        success: false,
        error: "Missing required fields: code, role",
      }, 400)
    }

    const normalizedCode = body.code.trim().toUpperCase()
    const role = body.role.trim()

    // Validate demo code
    const { data: demoCode, error: codeError } = await supabaseAdmin
      .from("demo_codes")
      .select(`
        *,
        demo_organizations!inner (
          id,
          status,
          allowed_roles,
          organization_id
        )
      `)
      .eq("demo_code", normalizedCode)
      .eq("status", "active")
      .single()

    if (codeError || !demoCode) {
      return json(req, {
        success: false,
        error: "Invalid or expired demo code",
      }, 400)
    }

    const demoOrg = (demoCode as any).demo_organizations
    if (!demoOrg || demoOrg.status !== "active") {
      return json(req, {
        success: false,
        error: "Demo organization is not active",
      }, 400)
    }

    // Check if role is allowed
    const allowedRoles: string[] = demoOrg.allowed_roles || ["org_admin", "coach", "parent", "athlete", "staff", "fan"]
    if (!allowedRoles.includes(role)) {
      return json(req, {
        success: false,
        error: `Role "${role}" is not available for this demo`,
      }, 400)
    }

    // Check if code is expired
    const expiresAt = new Date(demoCode.expires_at)
    if (expiresAt < new Date()) {
      return json(req, {
        success: false,
        error: "Demo code has expired",
      }, 400)
    }

    // Get shared demo user for this role
    const { data: demoAccount, error: accountError } = await supabaseAdmin
      .from("demo_account_roles")
      .select("user_id")
      .eq("role", role)
      .single()

    if (accountError || !demoAccount) {
      return json(req, {
        success: false,
        error: `Demo account for role "${role}" not found. Please contact support.`,
      }, 500)
    }

    const sharedDemoUserId = demoAccount.user_id

    // Get the shared demo user's email from auth.users
    const { data: demoUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(sharedDemoUserId)
    if (userError || !demoUser?.user?.email) {
      return json(req, {
        success: false,
        error: `Demo user account not properly configured. Please contact support.`,
      }, 500)
    }

    const demoUserEmail = demoUser.user.email

    // organization_id is optional (linked when demo org is fully set up); demo_org_id is always used
    const organizationId = demoOrg.organization_id ?? null

    // Create or update demo session (one active session per shared user)
    // First, delete any existing session for this user (since we want one active session per user)
    await supabaseAdmin
      .from("demo_sessions")
      .delete()
      .eq("user_id", sharedDemoUserId)

    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 7) // 7 days

    const { error: sessionError } = await supabaseAdmin
      .from("demo_sessions")
      .insert({
        user_id: sharedDemoUserId,
        demo_code: normalizedCode,
        demo_org_id: demoOrg.id,
        organization_id: organizationId,
        expires_at: sessionExpiresAt.toISOString(),
        last_activity_at: new Date().toISOString(),
      })

    if (sessionError) {
      console.error("Failed to create demo session:", sessionError)
      return json(req, {
        success: false,
        error: "Failed to create demo session",
      }, 500)
    }

    // Generate magic link for the shared demo user to sign them in
    // Construct proper redirect URL - prefer SITE_URL, fallback to localhost for dev
    let siteUrl = Deno.env.get("SITE_URL")
    if (!siteUrl) {
      // For local development, use localhost
      // In production, SITE_URL should be set in Edge Function secrets
      siteUrl = "http://localhost:5173"
    }
    // Ensure siteUrl doesn't end with a slash
    siteUrl = siteUrl.replace(/\/$/, "")
    const redirectTo = `${siteUrl}/portal/auth/callback?demo=true`

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: demoUserEmail,
      options: {
        redirectTo,
      },
    })

    if (linkError || !linkData) {
      console.error("Failed to generate magic link:", linkError)
      return json(req, {
        success: false,
        error: "Failed to generate sign-in link",
      }, 500)
    }

    return json(req, {
      success: true,
      redirect_url: linkData.properties.action_link,
      message: "Demo session created successfully",
    }, 200)

  } catch (err) {
    console.error("Demo enter error:", err)
    return json(req, {
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }, 500)
  }
})
