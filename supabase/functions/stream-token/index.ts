// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const streamApiKey = Deno.env.get("STREAM_API_KEY")!
const streamApiSecret = Deno.env.get("STREAM_API_SECRET")!

if (!supabaseUrl || !supabaseServiceRoleKey || !streamApiKey || !streamApiSecret) {
  console.error("Missing env vars:", { 
    hasUrl: !!supabaseUrl, 
    hasServiceKey: !!supabaseServiceRoleKey, 
    hasStreamKey: !!streamApiKey, 
    hasStreamSecret: !!streamApiSecret 
  })
  throw new Error("Missing required environment configuration")
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Helper function to create Stream JWT token using Web Crypto API
async function createStreamToken(userId: string, secret: string): Promise<string> {
  // JWT Header
  const header = {
    alg: "HS256",
    typ: "JWT"
  }
  
  // JWT Payload - Stream requires user_id claim
  const payload = {
    user_id: userId
  }
  
  // Base64URL encode
  const base64UrlEncode = (obj: any) => {
    const json = JSON.stringify(obj)
    const base64 = btoa(json)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
  
  const encodedHeader = base64UrlEncode(header)
  const encodedPayload = base64UrlEncode(payload)
  const data = `${encodedHeader}.${encodedPayload}`
  
  // Sign with HMAC-SHA256
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const message = encoder.encode(data)
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  
  const signature = await crypto.subtle.sign("HMAC", key, message)
  const hashArray = Array.from(new Uint8Array(signature))
  const base64Signature = btoa(String.fromCharCode(...hashArray))
  const encodedSignature = base64Signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  return `${data}.${encodedSignature}`
}

interface TokenRequest {
  userId: string
}

interface TokenResponse {
  token: string
  user: {
    id: string
    name?: string
    email?: string
    image?: string
    role?: string
    org_ids?: string[]
    team_ids?: string[]
  }
}

serve(async (req: Request) => {
  console.log(`Incoming ${req.method} request to stream-token`)
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  try {
    console.log("Processing POST request")
    
    // Verify authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      console.error("Missing authorization header")
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { 
          status: 401, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        }
      )
    }

    // Get user from JWT
    const jwt = authHeader.replace("Bearer ", "")
    console.log("Fetching user from JWT")
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      console.error("Authentication failed:", authError)
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { 
          status: 401, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        }
      )
    }

    console.log("User authenticated:", user.id)

    // Check if user is platform admin
    console.log("Checking platform admin status")
    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .single()
    
    const isPlatformAdmin = !!platformAdmin
    console.log("Is platform admin:", isPlatformAdmin)

    // Fetch user's organization memberships and roles
    console.log("Fetching organization memberships")
    const { data: memberships, error: membershipsError } = await supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", user.id)

    if (membershipsError) {
      console.error("Error fetching memberships:", membershipsError)
    }

    // Fetch team memberships via athlete_guardians
    console.log("Fetching team memberships")
    const { data: guardianAthletes } = await supabase
      .from("athlete_guardians")
      .select(`
        athlete_id,
        athletes:athlete_id (
          team_memberships:team_memberships!inner (
            team_id
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")

    // Collect unique org and team IDs
    const orgIds = memberships?.map(m => m.org_id) || []
    const teamIds = new Set<string>()

    if (guardianAthletes) {
      guardianAthletes.forEach((ga: any) => {
        ga.athletes?.team_memberships?.forEach((tm: any) => {
          if (tm.team_id) teamIds.add(tm.team_id)
        })
      })
    }

    // Determine primary role
    let primaryRole = "guardian"
    if (isPlatformAdmin) {
      primaryRole = "platform_admin"
    } else if (memberships?.some(m => m.role === "org_admin")) {
      primaryRole = "org_admin"
    } else if (memberships?.some(m => m.role === "coach")) {
      primaryRole = "coach"
    }

    console.log("Building Stream user data")

    // Prepare user data for Stream (use auth user data, not custom users table)
    const streamUserData = {
      id: user.id,
      name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      email: user.email,
      image: user.user_metadata?.avatar_url,
      role: primaryRole,
      org_ids: orgIds,
      team_ids: Array.from(teamIds),
    }

    // Generate Stream token using Web Crypto API
    console.log("Generating Stream token")
    const token = await createStreamToken(user.id, streamApiSecret)

    const response: TokenResponse = {
      token,
      user: streamUserData,
    }

    console.log("Successfully generated token for user:", user.id)

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (error: any) {
    console.error("Error generating Stream token:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  }
})
