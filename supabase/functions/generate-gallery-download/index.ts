import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import JSZip from "https://esm.sh/jszip@3.10.1?target=deno"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const MAX_PHOTOS = 500
const MAX_BYTES = 2 * 1024 * 1024 * 1024
const MAX_DOWNLOADS_PER_HOUR = 10
const SIGNED_URL_TTL_SECONDS = 60 * 60

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("Authorization") ?? ""
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
  } = await supabaseUser.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let payload: { gallery_id?: string; photo_ids?: string[] }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const galleryId = payload?.gallery_id
  if (!galleryId) {
    return new Response(JSON.stringify({ error: "gallery_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const { data: gallery, error: galleryError } = await supabaseUser
      .from("galleries")
      .select("id, org_id, can_download")
      .eq("id", galleryId)
      .maybeSingle()

    if (galleryError || !gallery) {
      return new Response(JSON.stringify({ error: "Gallery not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!gallery.can_download) {
      return new Response(JSON.stringify({ error: "Downloads not enabled for this gallery" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabaseAdmin
      .from("gallery_zip_downloads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo)

    if ((recentCount || 0) >= MAX_DOWNLOADS_PER_HOUR) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let photosQuery = supabaseUser
      .from("gallery_photos")
      .select("id, storage_path, filename, size_bytes, can_download")
      .eq("gallery_id", galleryId)
      .eq("can_download", true)

    if (payload.photo_ids && payload.photo_ids.length > 0) {
      photosQuery = photosQuery.in("id", payload.photo_ids)
    }

    const { data: photos, error: photosError } = await photosQuery

    if (photosError || !photos) {
      return new Response(JSON.stringify({ error: "Unable to load photos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (payload.photo_ids && photos.length !== payload.photo_ids.length) {
      return new Response(JSON.stringify({ error: "Some photos are not accessible" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (photos.length === 0) {
      return new Response(JSON.stringify({ error: "No downloadable photos found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (photos.length > MAX_PHOTOS) {
      return new Response(JSON.stringify({ error: "Too many photos requested" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const totalBytes = photos.reduce((sum, photo: any) => sum + Number(photo.size_bytes || 0), 0)
    if (totalBytes > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Download exceeds size limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const zip = new JSZip()

    for (const photo of photos) {
      const { data: fileBlob, error: fileError } = await supabaseAdmin.storage
        .from("public-media")
        .download(photo.storage_path)
      if (fileError || !fileBlob) {
        return new Response(JSON.stringify({ error: "Failed to download photo assets" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const arrayBuffer = await fileBlob.arrayBuffer()
      const safeName = photo.filename || `${photo.id}.jpg`
      zip.file(safeName, arrayBuffer)
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } })
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `gallery-${galleryId}-${timestamp}.zip`
    const path = `orgs/${gallery.org_id}/galleries/${galleryId}/downloads/${user.id}/${filename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("public-media")
      .upload(path, zipBytes, {
        contentType: "application/zip",
        cacheControl: "3600",
        upsert: true,
      })

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Failed to upload archive" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: signedUrl, error: signedError } = await supabaseAdmin.storage
      .from("public-media")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

    if (signedError || !signedUrl?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to create download link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    await supabaseAdmin
      .from("gallery_zip_downloads")
      .insert({
        gallery_id: galleryId,
        user_id: user.id,
        photo_count: photos.length,
        size_bytes: totalBytes,
      })
      .catch(() => {
        // Best effort logging
      })

    return new Response(JSON.stringify({ url: signedUrl.signedUrl, filename }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
