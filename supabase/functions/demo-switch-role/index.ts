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
interface DemoSwitchRoleRequest {
  role: string
}

interface DemoSwitchRoleResponse {
  success: boolean
  redirect_url?: string
  error?: string
  message?: string
}

const DEMO_APP_URL_LOCAL = "http://localhost:5173"
const DEMO_APP_URL_PROD = "https://demo.youthsports.team"
const DEMO_AUTH_CALLBACK_PATH = "/portal/auth/callback"

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    return url.origin.replace(/\/$/, "")
  } catch {
    return null
  }
}

function inferOriginFromReferer(referer: string | null): string | null {
  if (!referer) return null
  try {
    return new URL(referer).origin.replace(/\/$/, "")
  } catch {
    return null
  }
}

function isLocalHostOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase()
    return host === "localhost" || host === "127.0.0.1" || host === "::1"
  } catch {
    return false
  }
}

function resolveDemoSiteUrl(req: Request, supabaseUrl: string): string {
  const xAppOrigin = normalizeOrigin(req.headers.get("X-App-Origin"))
  const requestOrigin = normalizeOrigin(req.headers.get("Origin"))
  const refererOrigin = inferOriginFromReferer(req.headers.get("Referer"))
  const forwardedHost = req.headers.get("X-Forwarded-Host")?.trim()
  const forwardedProto = req.headers.get("X-Forwarded-Proto")?.trim() || "https"
  const hostHeader = req.headers.get("Host")?.trim()

  const candidateFromHeaders = xAppOrigin || requestOrigin || refererOrigin
  if (candidateFromHeaders) {
    return candidateFromHeaders
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "")
  }

  if (hostHeader) {
    const proto = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1") ? "http" : "https"
    return `${proto}://${hostHeader}`.replace(/\/$/, "")
  }

  const explicitDemoUrl = normalizeOrigin(Deno.env.get("DEMO_APP_URL") ?? null)
  const fallbackEnvUrl = normalizeOrigin(Deno.env.get("SITE_URL") ?? Deno.env.get("APP_URL") ?? null)
  const isLocalEnvironment = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")

  if (explicitDemoUrl) {
    return explicitDemoUrl
  }

  if (fallbackEnvUrl) {
    if (!isLocalEnvironment && isLocalHostOrigin(fallbackEnvUrl)) {
      return DEMO_APP_URL_PROD
    }
    return fallbackEnvUrl
  }

  return isLocalEnvironment ? DEMO_APP_URL_LOCAL : DEMO_APP_URL_PROD
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

    // Get authorization header to identify current user
    // For Edge Functions, the Authorization header contains the user's JWT token
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json(req, { success: false, error: "Missing authorization" }, 401)
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create client for the requesting user using their JWT token
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return json(req, { success: false, error: "Unauthorized" }, 401)
    }

    // Parse request body
    const body: DemoSwitchRoleRequest = await req.json()

    if (!body.role) {
      return json(req, {
        success: false,
        error: "Missing required field: role",
      }, 400)
    }

    const role = body.role.trim()

    // Get current demo session
    const { data: currentSession, error: sessionError } = await supabaseAdmin
      .from("demo_sessions")
      .select(`
        *,
        demo_organizations!inner (
          id,
          status,
          allowed_roles,
          organization_id
        )
      `)
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (sessionError || !currentSession) {
      return json(req, {
        success: false,
        error: "No active demo session found",
      }, 400)
    }

    const demoOrg = (currentSession as any).demo_organizations
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

    // Get shared demo user for the new role
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

    const newSharedDemoUserId = demoAccount.user_id

    // Get the shared demo user's email
    const { data: demoUser, error: userLookupError } = await supabaseAdmin.auth.admin.getUserById(newSharedDemoUserId)
    if (userLookupError || !demoUser?.user?.email) {
      return json(req, {
        success: false,
        error: `Demo user account not properly configured. Please contact support.`,
      }, 500)
    }

    const demoUserEmail = demoUser.user.email
    // organization_id is optional; demo_org_id is always used
    const organizationId = demoOrg.organization_id ?? null

    // Delete existing session for the new shared user (if any)
    await supabaseAdmin
      .from("demo_sessions")
      .delete()
      .eq("user_id", newSharedDemoUserId)

    // Create new demo session for the new role
    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 7) // 7 days

    const { error: newSessionError } = await supabaseAdmin
      .from("demo_sessions")
      .insert({
        user_id: newSharedDemoUserId,
        demo_code: currentSession.demo_code,
        demo_org_id: demoOrg.id,
        organization_id: organizationId,
        expires_at: sessionExpiresAt.toISOString(),
        last_activity_at: new Date().toISOString(),
      })

    if (newSessionError) {
      console.error("Failed to create demo session:", newSessionError)
      return json(req, {
        success: false,
        error: "Failed to create demo session",
      }, 500)
    }

    // Generate magic link for the new shared demo user.
    // Prefer current request origin/context and avoid localhost fallbacks in prod.
    const isLocalEnvironment = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
    let siteUrl = resolveDemoSiteUrl(req, supabaseUrl)
    if (!isLocalEnvironment && isLocalHostOrigin(siteUrl)) {
      console.error("[demo-switch-role] Unsafe localhost redirect host resolved in non-local environment; forcing production demo host", {
        resolvedSiteUrl: siteUrl,
      })
      siteUrl = DEMO_APP_URL_PROD
    }
    const redirectTo = `${siteUrl}${DEMO_AUTH_CALLBACK_PATH}?demo=true&role=${role}`

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
      message: "Role switched successfully",
    }, 200)

  } catch (err) {
    console.error("Demo switch role error:", err)
    return json(req, {
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }, 500)
  }
})
