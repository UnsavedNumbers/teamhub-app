// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// CORS headers (must be available before any env var validation)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * Lazily load and validate environment variables + Supabase client.
 * This avoids throwing at module load time, which would kill the
 * function before it can respond to CORS preflight (OPTIONS) requests.
 */
function getConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!
  const muxTokenSecret = Deno.env.get("MUX_SECRET_KEY")!

  if (!supabaseUrl || !supabaseServiceRoleKey || !muxTokenId || !muxTokenSecret) {
    console.error("Missing env vars:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceRoleKey,
      hasMuxTokenId: !!muxTokenId,
      hasMuxSecretKey: !!muxTokenSecret,
    })
    throw new Error("Missing required environment configuration")
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  return { supabaseUrl, supabaseServiceRoleKey, muxTokenId, muxTokenSecret, supabase }
}

// Mux API base URL
const MUX_API_BASE = "https://api.mux.com"

interface CreateUploadRequest {
  org_id: string
  team_id?: string
  event_id?: string
  title: string
  description?: string
  category?: "practice" | "game" | "highlight" | "training" | "event" | "other"
  visibility?: "private" | "team" | "organization" | "guardians"
  recorded_at?: string
}

interface MuxDirectUploadResponse {
  data: {
    id: string
    url: string
    timeout: number
    status: string
    new_asset_settings: {
      playback_policy: string[]
      passthrough: string
    }
    cors_origin: string
  }
}

/**
 * Creates a Mux Direct Upload URL and records the pending video in the database
 */
async function createDirectUpload(
  userId: string,
  request: CreateUploadRequest,
  config: ReturnType<typeof getConfig>
): Promise<{ upload_url: string; video_id: string; upload_id: string }> {
  const { supabase, muxTokenId, muxTokenSecret } = config
  
  // Generate a video record ID upfront so we can use it in passthrough
  const videoId = crypto.randomUUID()
  
  // Create passthrough data for webhook correlation
  const passthrough = JSON.stringify({
    video_id: videoId,
    org_id: request.org_id,
    team_id: request.team_id || null,
    uploaded_by: userId,
  })
  
  // Call Mux API to create direct upload
  const muxAuth = btoa(`${muxTokenId}:${muxTokenSecret}`)
  
  const muxResponse = await fetch(`${MUX_API_BASE}/video/v1/uploads`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${muxAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["signed"],
        passthrough: passthrough,
        video_quality: "basic",
      },
      timeout: 3600, // 1 hour timeout for upload
    }),
  })
  
  if (!muxResponse.ok) {
    const errorText = await muxResponse.text()
    console.error("Mux API error:", muxResponse.status, errorText)
    throw new Error(`Mux API error: ${muxResponse.status}`)
  }
  
  const muxData: MuxDirectUploadResponse = await muxResponse.json()
  const uploadUrl = muxData.data.url
  const muxUploadId = muxData.data.id
  
  // Insert video record in pending_upload status
  const { error: insertError } = await supabase
    .from("videos")
    .insert({
      id: videoId,
      org_id: request.org_id,
      team_id: request.team_id || null,
      event_id: request.event_id || null,
      mux_upload_id: muxUploadId,
      title: request.title,
      description: request.description || null,
      category: request.category || "practice",
      visibility: request.visibility || "team",
      status: "pending_upload",
      uploaded_by: userId,
      recorded_at: request.recorded_at ? new Date(request.recorded_at).toISOString() : null,
      passthrough: {
        video_id: videoId,
        org_id: request.org_id,
        team_id: request.team_id || null,
        uploaded_by: userId,
      },
    })
  
  if (insertError) {
    console.error("Database insert error:", insertError)
    throw new Error(`Failed to create video record: ${insertError.message}`)
  }
  
  console.log(`Created video ${videoId} with Mux upload ${muxUploadId}`)
  
  return {
    upload_url: uploadUrl,
    video_id: videoId,
    upload_id: muxUploadId,
  }
}

/**
 * Verify user has permission to upload videos for this org
 */
async function verifyUploadPermission(userId: string, orgId: string, supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single()
  
  if (error || !data) {
    return false
  }
  
  // Only org_admins, staff, and coaches can upload videos
  return ["org_admin", "staff", "coach"].includes(data.role)
}

/**
 * Extract user ID from Authorization header
 */
async function getUserIdFromAuth(authHeader: string, supabase: ReturnType<typeof createClient>): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  
  const token = authHeader.replace("Bearer ", "")
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    console.error("Auth error:", error)
    return null
  }
  
  return user.id
}

// Main handler
serve(async (req: Request) => {
  console.log(`Incoming ${req.method} request to mux-create-direct-upload`)
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }
  
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  
  try {
    // Load config (env vars + supabase client) inside the handler, after CORS preflight
    const config = getConfig()
    
    // Authenticate user
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    const userId = await getUserIdFromAuth(authHeader, config.supabase)
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    // Parse request body
    const body: CreateUploadRequest = await req.json()
    
    // Validate required fields
    if (!body.org_id || !body.title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: org_id, title" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }
    
    // Verify user has upload permission
    const hasPermission = await verifyUploadPermission(userId, body.org_id, config.supabase)
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to upload videos to this organization" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }
    
    // Create direct upload
    const result = await createDirectUpload(userId, body, config)
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error creating direct upload:", error)
    
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
