// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const muxSigningKeyId = Deno.env.get("MUX_SIGNING_KEY_ID")!
const muxSigningKeyPrivate = Deno.env.get("MUX_SIGNING_KEY_PRIVATE")!

// Validate environment
if (!supabaseUrl || !supabaseServiceRoleKey || !muxSigningKeyId || !muxSigningKeyPrivate) {
  console.error("Missing env vars:", {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
    hasMuxSigningKeyId: !!muxSigningKeyId,
    hasMuxSigningKeyPrivate: !!muxSigningKeyPrivate,
  })
  throw new Error("Missing required environment configuration")
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
}

/**
 * Base64 URL encode (no padding, URL safe characters)
 */
function base64UrlEncode(data: Uint8Array | string): string {
  const base64 = typeof data === "string"
    ? btoa(data)
    : btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Import the RSA private key for signing
 */
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  // Clean the PEM key - handle both literal \n and actual newlines
  const cleanedPem = pemKey
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----|\s/g, "")
  
  // Decode base64
  const binaryDer = Uint8Array.from(atob(cleanedPem), c => c.charCodeAt(0))
  
  // Import as PKCS#8 (Mux provides RSA private keys)
  // First convert PKCS#1 to PKCS#8 format
  // PKCS#8 header for RSA
  const pkcs8Header = new Uint8Array([
    0x30, 0x82, // SEQUENCE
    ((binaryDer.length + 26) >> 8) & 0xff,
    (binaryDer.length + 26) & 0xff,
    0x02, 0x01, 0x00, // INTEGER 0
    0x30, 0x0d, // SEQUENCE
    0x06, 0x09, // OID
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // rsaEncryption
    0x05, 0x00, // NULL
    0x04, 0x82, // OCTET STRING
    (binaryDer.length >> 8) & 0xff,
    binaryDer.length & 0xff,
  ])
  
  const pkcs8Key = new Uint8Array(pkcs8Header.length + binaryDer.length)
  pkcs8Key.set(pkcs8Header)
  pkcs8Key.set(binaryDer, pkcs8Header.length)
  
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      pkcs8Key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    )
  } catch (e) {
    // If PKCS#8 conversion fails, try importing as-is
    // This might work if the key is already in PKCS#8 format
    console.log("PKCS#8 conversion failed, trying direct import")
    return await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    )
  }
}

/**
 * Generate a signed JWT for Mux playback
 */
async function generateSignedPlaybackToken(
  playbackId: string,
  type: "video" | "thumbnail" | "gif" | "storyboard" = "video",
  expirationSeconds: number = 7200 // 2 hours default
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + expirationSeconds
  
  // JWT header
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: muxSigningKeyId,
  }
  
  // JWT payload
  const payload: any = {
    sub: playbackId,
    aud: type,
    exp: exp,
    kid: muxSigningKeyId,
  }
  
  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  
  // Sign the JWT
  const privateKey = await importPrivateKey(muxSigningKeyPrivate)
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(signingInput)
  )
  
  const encodedSignature = base64UrlEncode(new Uint8Array(signature))
  
  return `${signingInput}.${encodedSignature}`
}

// Main handler
serve(async (req: Request) => {
  console.log(`Incoming ${req.method} request to mux-signed-playback`)
  
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
    // Verify authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    const token = authHeader.split(" ")[1]
    
    // Create Supabase client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })
    
    // Get user from token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    if (authError || !user) {
      console.error("Auth error:", authError)
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    // Parse request body
    const body = await req.json()
    const { video_id, playback_id, type = "video", expiration = 7200 } = body
    
    // Create service role client for data access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    let finalPlaybackId = playback_id
    let videoData: any = null
    
    // If video_id provided, fetch video and verify access
    if (video_id) {
      const { data: video, error: videoError } = await supabaseAdmin
        .from("videos")
        .select(`
          id,
          org_id,
          mux_playback_id,
          visibility,
          status,
          uploaded_by,
          video_athlete_links(athlete_id)
        `)
        .eq("id", video_id)
        .single()
      
      if (videoError || !video) {
        console.error("Video not found:", videoError)
        return new Response(JSON.stringify({ error: "Video not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      
      videoData = video
      finalPlaybackId = video.mux_playback_id
      
      if (!finalPlaybackId) {
        return new Response(JSON.stringify({ error: "Video not ready for playback" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      
      // Verify user has access to this video
      const hasAccess = await verifyVideoAccess(supabaseAdmin, user.id, video)
      if (!hasAccess) {
        console.log(`User ${user.id} denied access to video ${video_id}`)
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    } else if (!playback_id) {
      return new Response(JSON.stringify({ error: "video_id or playback_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    // Generate signed token
    const signedToken = await generateSignedPlaybackToken(
      finalPlaybackId,
      type,
      Math.min(expiration, 43200) // Cap at 12 hours
    )
    
    // Construct playback URLs
    const streamUrl = `https://stream.mux.com/${finalPlaybackId}.m3u8?token=${signedToken}`
    const thumbnailToken = await generateSignedPlaybackToken(finalPlaybackId, "thumbnail", expiration)
    const thumbnailUrl = `https://image.mux.com/${finalPlaybackId}/thumbnail.jpg?token=${thumbnailToken}`
    
    // Generate animated GIF token
    const gifToken = await generateSignedPlaybackToken(finalPlaybackId, "gif", expiration)
    const animatedGifUrl = `https://image.mux.com/${finalPlaybackId}/animated.gif?token=${gifToken}`
    
    // Generate storyboard token
    const storyboardToken = await generateSignedPlaybackToken(finalPlaybackId, "storyboard", expiration)
    const storyboardUrl = `https://image.mux.com/${finalPlaybackId}/storyboard.vtt?token=${storyboardToken}`
    
    return new Response(
      JSON.stringify({
        playback_id: finalPlaybackId,
        stream_url: streamUrl,
        thumbnail_url: thumbnailUrl,
        animated_gif_url: animatedGifUrl,
        storyboard_url: storyboardUrl,
        token: signedToken,
        expires_in: expiration,
        video: videoData ? {
          id: videoData.id,
          status: videoData.status,
        } : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error: any) {
    console.error("Error generating playback token:", error)
    return new Response(
      JSON.stringify({ error: "Failed to generate playback token" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

/**
 * Verify user has access to view a video
 */
async function verifyVideoAccess(
  supabase: any,
  userId: string,
  video: any
): Promise<boolean> {
  // Public videos are accessible to anyone
  if (video.visibility === "public") {
    return true
  }
  
  // Owner always has access
  if (video.uploaded_by === userId) {
    return true
  }
  
  // Check if user has a role in the org
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", video.org_id)
    .eq("user_id", userId)
    .single()
  
  if (member) {
    // Org admins and coaches can see all org videos
    if (member.role === "org_admin" || member.role === "coach") {
      return true
    }
  }
  
  // Check if user is a guardian of a linked athlete
  if (video.video_athlete_links?.length > 0) {
    const athleteIds = video.video_athlete_links.map((l: any) => l.athlete_id)
    
    const { data: guardians } = await supabase
      .from("athlete_guardians")
      .select("athlete_id")
      .eq("guardian_id", userId)
      .in("athlete_id", athleteIds)
    
    if (guardians && guardians.length > 0) {
      // Guardian can only see team/private videos if their athlete is linked
      if (video.visibility === "team" || video.visibility === "private") {
        return true
      }
    }
  }
  
  // For team visibility, check if user is on same team
  if (video.visibility === "team") {
    // This would require additional team membership checks
    // For now, org members with any role can access team videos
    return !!member
  }
  
  return false
}
