// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!
const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!

// Validate environment
if (!supabaseUrl || !supabaseServiceRoleKey || !muxTokenId || !muxTokenSecret) {
  console.error("Missing env vars:", {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
    hasMuxTokenId: !!muxTokenId,
    hasMuxTokenSecret: !!muxTokenSecret,
  })
  throw new Error("Missing required environment configuration")
}

// Create Supabase client with service role for database operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Mux API base URL
const MUX_API_BASE = "https://api.mux.com"

interface CreateUploadRequest {
  orgId: string
  teamId?: string
  eventId?: string
  title: string
  description?: string
  category?: "practice" | "game" | "highlight" | "training" | "event" | "other"
  visibility?: "private" | "team" | "organization" | "guardians"
  recordedAt?: string
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
  request: CreateUploadRequest
): Promise<{ uploadUrl: string; videoId: string; muxUploadId: string }> {
  // Generate a video record ID upfront so we can use it in passthrough
  const videoId = crypto.randomUUID()
  
  // Create passthrough data for webhook correlation
  const passthrough = JSON.stringify({
    video_id: videoId,
    org_id: request.orgId,
    team_id: request.teamId || null,
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
      org_id: request.orgId,
      team_id: request.teamId || null,
      event_id: request.eventId || null,
      mux_upload_id: muxUploadId,
      title: request.title,
      description: request.description || null,
      category: request.category || "practice",
      visibility: request.visibility || "team",
      status: "pending_upload",
      uploaded_by: userId,
      recorded_at: request.recordedAt ? new Date(request.recordedAt).toISOString() : null,
      passthrough: {
        video_id: videoId,
        org_id: request.orgId,
        team_id: request.teamId || null,
        uploaded_by: userId,
      },
    })
  
  if (insertError) {
    console.error("Database insert error:", insertError)
    throw new Error(`Failed to create video record: ${insertError.message}`)
  }
  
  console.log(`Created video ${videoId} with Mux upload ${muxUploadId}`)
  
  return {
    uploadUrl,
    videoId,
    muxUploadId,
  }
}

/**
 * Verify user has permission to upload videos for this org
 */
async function verifyUploadPermission(userId: string, orgId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  // Only owners, admins, and coaches can upload videos
  return ["owner", "admin", "coach"].includes(data.role)
}

/**
 * Extract user ID from Authorization header
 */
async function getUserIdFromAuth(authHeader: string): Promise<string | null> {
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
    // Authenticate user
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    const userId = await getUserIdFromAuth(authHeader)
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    // Parse request body
    const body: CreateUploadRequest = await req.json()
    
    // Validate required fields
    if (!body.orgId || !body.title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: orgId, title" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }
    
    // Verify user has upload permission
    const hasPermission = await verifyUploadPermission(userId, body.orgId)
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
    const result = await createDirectUpload(userId, body)
    
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
