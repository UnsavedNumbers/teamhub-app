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

function isLocalRequestOrigin(req: Request): boolean {
  const xAppOrigin = normalizeOrigin(req.headers.get("X-App-Origin"))
  if (xAppOrigin) return isLocalHostOrigin(xAppOrigin)

  const requestOrigin = normalizeOrigin(req.headers.get("Origin"))
  if (requestOrigin) return isLocalHostOrigin(requestOrigin)

  const refererOrigin = inferOriginFromReferer(req.headers.get("Referer"))
  if (refererOrigin) return isLocalHostOrigin(refererOrigin)

  return false
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

function sanitizeActionLink(actionLink: string, expectedSiteUrl: string): string {
  try {
    const linkUrl = new URL(actionLink)
    const expectedOrigin = new URL(expectedSiteUrl).origin
    if (linkUrl.origin !== expectedOrigin && linkUrl.pathname === DEMO_AUTH_CALLBACK_PATH) {
      return new URL(linkUrl.pathname + linkUrl.search + linkUrl.hash, expectedOrigin).toString()
    }

    const redirectParam = linkUrl.searchParams.get("redirect_to")
    if (!redirectParam) return actionLink

    const redirectUrl = new URL(redirectParam)
    if (redirectUrl.origin === expectedOrigin) return actionLink

    const rewrittenRedirect = new URL(redirectUrl.pathname + redirectUrl.search + redirectUrl.hash, expectedOrigin)
    linkUrl.searchParams.set("redirect_to", rewrittenRedirect.toString())
    return linkUrl.toString()
  } catch {
    return actionLink
  }
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

    // Generate magic link for the shared demo user to sign them in.
    // Prefer current request origin/context and avoid localhost fallbacks in prod.
    const isLocalEnvironment = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
    let siteUrl = resolveDemoSiteUrl(req, supabaseUrl)
    const localRequestOrigin = isLocalRequestOrigin(req)
    if (!isLocalEnvironment && isLocalHostOrigin(siteUrl) && !localRequestOrigin) {
      console.error("[demo-enter] Unsafe localhost redirect host resolved in non-local environment; forcing production demo host", {
        resolvedSiteUrl: siteUrl,
        localRequestOrigin,
      })
      siteUrl = DEMO_APP_URL_PROD
    }
    const redirectTo = `${siteUrl}${DEMO_AUTH_CALLBACK_PATH}?demo=true`

    console.log("Demo enter: Using redirect URL:", redirectTo)

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

    const rawActionLink = linkData.properties.action_link
    const hashedToken = linkData.properties.hashed_token

    // Verify OTP server-side to get session tokens directly.
    // This bypasses the Supabase Auth redirect allowlist entirely,
    // so localhost and any origin work without config changes.
    let sessionTokens: { access_token: string; refresh_token: string } | null = null
    try {
      const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
        token_hash: hashedToken,
        type: "magiclink",
      })

      if (!verifyError && verifyData?.session) {
        sessionTokens = {
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
        }
        console.log("[demo-enter] OTP verified server-side, returning session tokens directly")
      } else {
        console.error("[demo-enter] OTP verification failed, falling back to action link", verifyError)
      }
    } catch (verifyErr) {
      console.error("[demo-enter] OTP verification exception, falling back to action link", verifyErr)
    }

    // If server-side verification succeeded, return tokens directly
    if (sessionTokens) {
      return json(req, {
        success: true,
        access_token: sessionTokens.access_token,
        refresh_token: sessionTokens.refresh_token,
        message: "Demo session created successfully",
      }, 200)
    }

    // Fallback: return sanitized action link (browser redirect through Supabase)
    const safeActionLink = sanitizeActionLink(rawActionLink, siteUrl)
    return json(req, {
      success: true,
      redirect_url: safeActionLink,
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
