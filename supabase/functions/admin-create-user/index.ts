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
interface CreateUserRequest {
  org_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: "parent" | "coach" | "org_admin"
}

interface CreateUserResponse {
  success: boolean
  user_id?: string
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
    // Get authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json(req, { success: false, error: "Missing authorization header" }, 401)
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Create client for the requesting user to check permissions
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify requesting user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return json(req, { success: false, error: "Unauthorized" }, 401)
    }

    // Parse request body
    const body: CreateUserRequest = await req.json()

    // Validate required fields
    if (!body.org_id || !body.email || !body.first_name || !body.last_name || !body.phone || !body.role) {
      return json(req, {
        success: false,
        error: "Missing required fields: org_id, email, first_name, last_name, phone, role",
      }, 400)
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(body.email)) {
      return json(req, { success: false, error: "Invalid email format" }, 400)
    }

    // Validate role
    if (!["parent", "coach", "org_admin"].includes(body.role)) {
      return json(req, { success: false, error: "Invalid role. Must be parent, coach, or org_admin" }, 400)
    }

    // Check if requesting user is org admin for this org
    const { data: membership, error: membershipError } = await supabaseUser
      .from("organization_members")
      .select("role")
      .eq("org_id", body.org_id)
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return json(req, { success: false, error: "Not authorized: must be org admin for this organization" }, 403)
    }

    if (membership.role !== "org_admin") {
      return json(req, { success: false, error: "Not authorized: must be org admin" }, 403)
    }

    // Prevent creating other org_admin users (only platform admins can do that)
    if (body.role === "org_admin") {
      // Check if user is platform admin
      const { data: platformAdmin } = await supabaseUser
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single()

      if (!platformAdmin) {
        return json(req, {
          success: false,
          error: "Not authorized: only platform admins can create org_admin users",
        }, 403)
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(body.email.toLowerCase())

    let userId: string

    if (existingUser?.user) {
      // User exists - add to organization
      userId = existingUser.user.id

      // Check if user is already a member
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("org_id", body.org_id)
        .eq("user_id", userId)
        .single()

      if (existingMember) {
        return json(req, {
          success: false,
          error: "User is already a member of this organization",
        }, 409)
      }

      // Update user profile if needed
      const displayName = `${body.first_name.trim()} ${body.last_name.trim()}`
      await supabaseAdmin
        .from("users")
        .update({
          display_name: displayName,
          phone: body.phone.trim(),
        })
        .eq("id", userId)
    } else {
      // Create new auth user
      const displayName = `${body.first_name.trim()} ${body.last_name.trim()}`
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email.toLowerCase(),
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: body.first_name.trim(),
          last_name: body.last_name.trim(),
          phone: body.phone.trim(),
          display_name: displayName,
        },
      })

      if (createError || !newUser.user) {
        return json(req, {
          success: false,
          error: `Failed to create user: ${createError?.message || "Unknown error"}`,
        }, 500)
      }

      userId = newUser.user.id

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from("users")
        .insert({
          id: userId,
          email: body.email.toLowerCase(),
          display_name: displayName,
          phone: body.phone.trim(),
        })

      if (profileError) {
        // Rollback: delete auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json(req, {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`,
        }, 500)
      }
    }

    // Map frontend role to database role
    const dbRole = body.role === "admin" ? "org_admin" : body.role

    // Add user to organization
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        org_id: body.org_id,
        user_id: userId,
        role: dbRole,
      })

    if (memberError) {
      // If user was newly created, we could rollback here, but since they might have been existing,
      // we'll just return the error
      return json(req, {
        success: false,
        error: `Failed to add user to organization: ${memberError.message}`,
      }, 500)
    }

    return json(req, {
      success: true,
      user_id: userId,
      message: existingUser?.user
        ? "User added to organization successfully"
        : "User created and added to organization successfully",
    })
  } catch (error) {
    console.error("[admin-create-user] Error:", error)
    return json(req, {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }, 500)
  }
})
