// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// CORS headers (must be available before any env var validation)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
}

function getConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const muxSigningKeyId = Deno.env.get("MUX_SIGNING_KEY_ID")!
  const muxSigningKeyPrivate = Deno.env.get("MUX_SIGNING_KEY_PRIVATE")!

  if (!supabaseUrl || !supabaseServiceRoleKey || !muxSigningKeyId || !muxSigningKeyPrivate) {
    console.error("Missing env vars:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceRoleKey,
      hasMuxSigningKeyId: !!muxSigningKeyId,
      hasMuxSigningKeyPrivate: !!muxSigningKeyPrivate,
    })
    throw new Error("Missing required environment configuration")
  }

  return { supabaseUrl, supabaseServiceRoleKey, muxSigningKeyId, muxSigningKeyPrivate }
}

// ============================================================================
// JWT Signing - follows https://www.mux.com/docs/guides/secure-video-playback
// ============================================================================

/** Mux audience types per the docs: v=video, t=thumbnail, g=gif, s=storyboard */
const MUX_AUD: Record<string, string> = {
  video: "v",
  thumbnail: "t",
  gif: "g",
  storyboard: "s",
}

/** Base64-URL encode (no padding, URL-safe chars) */
function b64url(input: Uint8Array | string): string {
  const str = typeof input === "string" ? input : String.fromCharCode(...input)
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

/**
 * Decode the private key from its stored format and import it for signing.
 *
 * The Mux API returns the private key as a base64-encoded PEM (PKCS#1).
 * The key may be stored as:
 *   - The raw base64-encoded PEM (from the API / mux.txt)
 *   - The decoded PEM text (from the .pem file)
 *
 * We need to get to the raw DER bytes, then wrap in PKCS#8 for WebCrypto.
 */
async function importSigningKey(rawKey: string): Promise<CryptoKey> {
  console.log("DEBUG: Starting key import, key length:", rawKey.length)

  // Normalise literal \n from env-var storage
  let key = rawKey.replace(/\\n/g, "\n").trim()
  console.log("DEBUG: After normalize, starts with PEM header:", key.startsWith("-----"))

  // If the value does NOT start with "-----", it's the base64-encoded PEM
  // that Mux returns from the signing-key API. Decode it first.
  if (!key.startsWith("-----")) {
    try {
      key = new TextDecoder().decode(
        Uint8Array.from(atob(key), (c) => c.charCodeAt(0))
      )
      console.log("DEBUG: Decoded base64 PEM, starts with header:", key.startsWith("-----"))
    } catch (e) {
      console.log("DEBUG: Base64 decode failed, assuming already PEM:", e)
      // not valid base64, assume it's already PEM text
    }
  }

  // Strip PEM headers/footers and whitespace to get raw base64 body
  const b64Body = key
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s/g, "")

  console.log("DEBUG: Base64 body length:", b64Body.length)

  // Decode base64 → DER bytes (this is PKCS#1 for Mux keys)
  const derBytes = Uint8Array.from(atob(b64Body), (c) => c.charCodeAt(0))
  console.log("DEBUG: DER bytes length:", derBytes.length)

  // Build proper ASN.1 DER-encoded PKCS#8 structure
  // PKCS#8 = SEQUENCE { version, AlgorithmIdentifier, OCTET STRING privateKey }
  const algorithmIdentifier = new Uint8Array([
    0x30, 0x0d,                   // SEQUENCE of 13 bytes
    0x06, 0x09,                   // OID, 9 bytes
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // rsaEncryption OID
    0x05, 0x00,                   // NULL
  ])

  // OCTET STRING header for the private key
  const derLength = derBytes.length
  const octetStringHeader = derLength > 255
    ? new Uint8Array([0x04, 0x82, (derLength >> 8) & 0xff, derLength & 0xff])
    : new Uint8Array([0x04, derLength])

  // Calculate total private key info length (version + algo + octet string)
  const version = new Uint8Array([0x02, 0x01, 0x00]) // INTEGER 0
  const privateKeyInfoLength = version.length + algorithmIdentifier.length + octetStringHeader.length + derBytes.length

  // Build the complete PKCS#8 SEQUENCE
  const sequenceHeader = privateKeyInfoLength > 255
    ? new Uint8Array([0x30, 0x82, (privateKeyInfoLength >> 8) & 0xff, privateKeyInfoLength & 0xff])
    : new Uint8Array([0x30, privateKeyInfoLength])

  console.log("DEBUG: Sequence header:", Array.from(sequenceHeader))
  console.log("DEBUG: Private key info length:", privateKeyInfoLength)

  // Assemble the complete PKCS#8 key
  const pkcs8Parts = [
    sequenceHeader,
    version,
    algorithmIdentifier,
    octetStringHeader,
    derBytes,
  ]

  const totalLength = pkcs8Parts.reduce((sum, part) => sum + part.length, 0)
  const pkcs8 = new Uint8Array(totalLength)
  let offset = 0
  for (const part of pkcs8Parts) {
    pkcs8.set(part, offset)
    offset += part.length
  }

  console.log("DEBUG: PKCS#8 total length:", pkcs8.length)
  console.log("DEBUG: PKCS#8 first 20 bytes:", Array.from(pkcs8.slice(0, 20)))

  try {
    const importedKey = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    )
    console.log("DEBUG: Key imported successfully")
    return importedKey
  } catch (e) {
    console.error("ERROR: Key import failed:", e)
    throw e
  }
}

/**
 * Generate a signed JWT for Mux playback.
 *
 * Per the Mux guide the JWT must contain:
 *   sub  – Mux Playback ID
 *   aud  – "v" | "t" | "g" | "s" | "d"
 *   exp  – UNIX epoch seconds
 *   kid  – Signing Key ID
 */
async function generateSignedPlaybackToken(
  playbackId: string,
  type: "video" | "thumbnail" | "gif" | "storyboard" = "video",
  expirationSeconds: number = 7200,
  signingKeyId: string,
  signingKeyPrivate: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  // 1. Build JWT header & payload per Mux docs
  const header = { alg: "RS256", typ: "JWT", kid: signingKeyId }
  const payload = {
    sub: playbackId,
    aud: MUX_AUD[type] || "v",
    exp: now + expirationSeconds,
    kid: signingKeyId,
  }

  // 2. Encode
  const encodedHeader  = b64url(JSON.stringify(header))
  const encodedPayload = b64url(JSON.stringify(payload))
  const signingInput   = `${encodedHeader}.${encodedPayload}`

  // 3. Sign with RSA-SHA256
  const privateKey = await importSigningKey(signingKeyPrivate)
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput),
  )

  return `${signingInput}.${b64url(new Uint8Array(sig))}`
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
    const config = getConfig()
    const { supabaseUrl, supabaseServiceRoleKey, muxSigningKeyId, muxSigningKeyPrivate } = config
    
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
      Math.min(expiration, 43200), // Cap at 12 hours
      muxSigningKeyId,
      muxSigningKeyPrivate
    )
    
    // Construct playback URLs
    const streamUrl = `https://stream.mux.com/${finalPlaybackId}.m3u8?token=${signedToken}`
    const thumbnailToken = await generateSignedPlaybackToken(finalPlaybackId, "thumbnail", expiration, muxSigningKeyId, muxSigningKeyPrivate)
    const thumbnailUrl = `https://image.mux.com/${finalPlaybackId}/thumbnail.jpg?token=${thumbnailToken}`
    
    // Generate animated GIF token
    const gifToken = await generateSignedPlaybackToken(finalPlaybackId, "gif", expiration, muxSigningKeyId, muxSigningKeyPrivate)
    const animatedGifUrl = `https://image.mux.com/${finalPlaybackId}/animated.gif?token=${gifToken}`
    
    // Generate storyboard token
    const storyboardToken = await generateSignedPlaybackToken(finalPlaybackId, "storyboard", expiration, muxSigningKeyId, muxSigningKeyPrivate)
    const storyboardUrl = `https://image.mux.com/${finalPlaybackId}/storyboard.vtt?token=${storyboardToken}`
    
    return new Response(
      JSON.stringify({
        playback_id: finalPlaybackId,
        stream_url: streamUrl,
        thumbnail_url: thumbnailUrl,
        animated_gif_url: animatedGifUrl,
        storyboard_url: storyboardUrl,
        token: signedToken,
        thumbnail_token: thumbnailToken,
        storyboard_token: storyboardToken,
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
    .eq("org_id", video.org_id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single()
  
  if (member) {
    // Org admins and coaches can see all org videos
    if (member.role === "org_admin" || member.role === "coach") {
      return true
    }
    // Any org member can see organization-scoped videos (matches DB can_view_video)
    if (video.visibility === "organization") {
      return true
    }
  }

  // Check if user is a guardian of a linked athlete (table uses user_id, not guardian_id)
  if (video.video_athlete_links?.length > 0) {
    const athleteIds = video.video_athlete_links.map((l: any) => l.athlete_id)

    const { data: guardians } = await supabase
      .from("athlete_guardians")
      .select("athlete_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("athlete_id", athleteIds)

    if (guardians && guardians.length > 0) {
      // Guardian can see team, guardians, or private videos when their athlete is linked
      if (video.visibility === "team" || video.visibility === "guardians" || video.visibility === "private") {
        return true
      }
    }
  }

  // For team visibility, org members with any role can access (e.g. parent on team)
  if (video.visibility === "team") {
    return !!member
  }

  return false
}
