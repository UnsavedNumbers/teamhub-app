// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const muxWebhookSecret = Deno.env.get("MUX_WEBHOOK_SECRET")!

// Validate environment
if (!supabaseUrl || !supabaseServiceRoleKey || !muxWebhookSecret) {
  console.error("Missing env vars:", {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
    hasMuxWebhookSecret: !!muxWebhookSecret,
  })
  throw new Error("Missing required environment configuration")
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// CORS headers (webhooks don't typically need CORS, but including for consistency)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "mux-signature, content-type",
}

// Mux webhook event types we handle
type MuxEventType =
  | "video.upload.created"
  | "video.upload.asset_created"
  | "video.upload.cancelled"
  | "video.upload.errored"
  | "video.asset.created"
  | "video.asset.ready"
  | "video.asset.errored"
  | "video.asset.deleted"

interface MuxWebhookEvent {
  type: MuxEventType
  id: string
  created_at: string
  object: {
    type: string
    id: string
  }
  data: any
  environment?: {
    name: string
    id: string
  }
}

/**
 * Verify Mux webhook signature
 * Mux uses HMAC-SHA256 for signature verification
 */
async function verifyMuxSignature(
  body: string,
  signatureHeader: string
): Promise<boolean> {
  if (!signatureHeader) {
    console.error("No signature header provided")
    return false
  }
  
  // Parse signature header: "t=timestamp,v1=signature"
  const parts = signatureHeader.split(",")
  const timestamp = parts.find(p => p.startsWith("t="))?.split("=")[1]
  const signature = parts.find(p => p.startsWith("v1="))?.split("=")[1]
  
  if (!timestamp || !signature) {
    console.error("Invalid signature header format")
    return false
  }
  
  // Check timestamp is within 5 minutes
  const timestampSeconds = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestampSeconds) > 300) {
    console.error("Webhook timestamp too old or too far in future")
    return false
  }
  
  // Create signed payload
  const signedPayload = `${timestamp}.${body}`
  
  // Compute expected signature
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(muxWebhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  )
  
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
  
  return signature === expectedSignature
}

/**
 * Handle video.upload.asset_created event
 * This fires when upload completes and asset is being created
 */
async function handleUploadAssetCreated(data: any): Promise<void> {
  const uploadId = data.id
  const assetId = data.asset_id
  
  console.log(`Upload ${uploadId} created asset ${assetId}`)
  
  // Find video by upload ID and update with asset ID
  const { error } = await supabase
    .from("videos")
    .update({
      mux_asset_id: assetId,
      status: "processing",
      upload_completed_at: new Date().toISOString(),
      processing_started_at: new Date().toISOString(),
    })
    .eq("mux_upload_id", uploadId)
  
  if (error) {
    console.error("Failed to update video with asset ID:", error)
    throw error
  }
}

/**
 * Handle video.asset.ready event
 * This fires when asset processing is complete and video is playable
 */
async function handleAssetReady(data: any): Promise<void> {
  const assetId = data.id
  const playbackIds = data.playback_ids || []
  const duration = data.duration
  const aspectRatio = data.aspect_ratio
  const resolutionTier = data.resolution_tier
  const maxStoredResolution = data.max_stored_resolution
  const maxStoredFrameRate = data.max_stored_frame_rate
  
  // Get the signed playback ID
  const signedPlayback = playbackIds.find((p: any) => p.policy === "signed")
  const playbackId = signedPlayback?.id || playbackIds[0]?.id
  
  console.log(`Asset ${assetId} is ready with playback ID ${playbackId}`)
  
  // Generate thumbnail URL
  const thumbnailUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
    : null
  
  // Update video record
  const { data: video, error: selectError } = await supabase
    .from("videos")
    .select("id, org_id, uploaded_by, passthrough")
    .eq("mux_asset_id", assetId)
    .single()
  
  if (selectError || !video) {
    console.error("Failed to find video by asset ID:", selectError)
    throw new Error(`Video not found for asset ${assetId}`)
  }
  
  const { error: updateError } = await supabase
    .from("videos")
    .update({
      mux_playback_id: playbackId,
      status: "ready",
      duration_seconds: duration,
      aspect_ratio: aspectRatio,
      resolution_tier: resolutionTier,
      max_stored_resolution: maxStoredResolution,
      max_stored_frame_rate: maxStoredFrameRate,
      thumbnail_url: thumbnailUrl,
      processing_completed_at: new Date().toISOString(),
      error_type: null,
      error_message: null,
    })
    .eq("id", video.id)
  
  if (updateError) {
    console.error("Failed to update video to ready:", updateError)
    throw updateError
  }
  
  console.log(`Video ${video.id} is now ready for playback`)
}

/**
 * Handle video.asset.errored event
 */
async function handleAssetErrored(data: any): Promise<void> {
  const assetId = data.id
  const errors = data.errors || {}
  const errorType = errors.type || "unknown"
  const errorMessages = errors.messages || ["Unknown error occurred"]
  
  console.error(`Asset ${assetId} errored:`, errors)
  
  const { error } = await supabase
    .from("videos")
    .update({
      status: "errored",
      error_type: errorType,
      error_message: errorMessages.join("; "),
      processing_completed_at: new Date().toISOString(),
    })
    .eq("mux_asset_id", assetId)
  
  if (error) {
    console.error("Failed to update video to errored:", error)
    throw error
  }
}

/**
 * Handle video.upload.errored event
 */
async function handleUploadErrored(data: any): Promise<void> {
  const uploadId = data.id
  const error = data.error || {}
  const errorType = error.type || "upload_error"
  const errorMessage = error.message || "Upload failed"
  
  console.error(`Upload ${uploadId} errored:`, error)
  
  const { error: dbError } = await supabase
    .from("videos")
    .update({
      status: "errored",
      error_type: errorType,
      error_message: errorMessage,
    })
    .eq("mux_upload_id", uploadId)
  
  if (dbError) {
    console.error("Failed to update video to errored:", dbError)
    throw dbError
  }
}

/**
 * Handle video.upload.cancelled event
 */
async function handleUploadCancelled(data: any): Promise<void> {
  const uploadId = data.id
  
  console.log(`Upload ${uploadId} was cancelled`)
  
  const { error } = await supabase
    .from("videos")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("mux_upload_id", uploadId)
  
  if (error) {
    console.error("Failed to mark video as deleted:", error)
    throw error
  }
}

/**
 * Handle video.asset.deleted event
 */
async function handleAssetDeleted(data: any): Promise<void> {
  const assetId = data.id
  
  console.log(`Asset ${assetId} was deleted`)
  
  const { error } = await supabase
    .from("videos")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("mux_asset_id", assetId)
  
  if (error) {
    console.error("Failed to mark video as deleted:", error)
    throw error
  }
}

/**
 * Handle video.asset.created event
 * This provides early notification that asset processing has started
 */
async function handleAssetCreated(data: any): Promise<void> {
  const assetId = data.id
  const passthrough = data.passthrough
  
  console.log(`Asset ${assetId} created, passthrough:`, passthrough)
  
  // Parse passthrough if it's a string
  let passthroughData: any = null
  if (passthrough) {
    try {
      passthroughData = typeof passthrough === "string" 
        ? JSON.parse(passthrough) 
        : passthrough
    } catch (e) {
      console.error("Failed to parse passthrough data:", e)
    }
  }
  
  // If we have a video_id in passthrough, update directly
  if (passthroughData?.video_id) {
    const { error } = await supabase
      .from("videos")
      .update({
        mux_asset_id: assetId,
        status: "processing",
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", passthroughData.video_id)
    
    if (error) {
      console.error("Failed to update video with asset ID:", error)
    }
  }
}

// Main handler
serve(async (req: Request) => {
  console.log(`Incoming ${req.method} request to mux-webhook`)
  
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
    // Get raw body for signature verification
    const body = await req.text()
    
    // Verify webhook signature
    const signatureHeader = req.headers.get("mux-signature")
    if (!signatureHeader) {
      console.error("Missing Mux signature header")
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    const isValid = await verifyMuxSignature(body, signatureHeader)
    if (!isValid) {
      console.error("Invalid Mux signature")
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    // Parse event
    const event: MuxWebhookEvent = JSON.parse(body)
    
    console.log(`Processing Mux event: ${event.type}`, {
      eventId: event.id,
      objectId: event.object?.id,
    })
    
    // Handle different event types
    switch (event.type) {
      case "video.upload.asset_created":
        await handleUploadAssetCreated(event.data)
        break
      
      case "video.asset.created":
        await handleAssetCreated(event.data)
        break
      
      case "video.asset.ready":
        await handleAssetReady(event.data)
        break
      
      case "video.asset.errored":
        await handleAssetErrored(event.data)
        break
      
      case "video.upload.errored":
        await handleUploadErrored(event.data)
        break
      
      case "video.upload.cancelled":
        await handleUploadCancelled(event.data)
        break
      
      case "video.asset.deleted":
        await handleAssetDeleted(event.data)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    // Acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error processing webhook:", error)
    
    // Return 200 to prevent Mux from retrying on processing errors
    // Log the error for debugging but don't fail the webhook
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
