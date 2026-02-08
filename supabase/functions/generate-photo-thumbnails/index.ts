import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { ImageMagick, initialize, MagickFormat } from "https://deno.land/x/imagemagick_deno@0.0.14/mod.ts"
import { encode } from "https://esm.sh/blurhash@2.0.5?target=deno"
import * as exifr from "https://esm.sh/exifr@7.1.3?target=deno"

await initialize()

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type ThumbnailSizeKey = "sm" | "md" | "lg"

const SIZE_MAP: Record<ThumbnailSizeKey, number> = {
  sm: 240,
  md: 480,
  lg: 1280,
}

async function resizeToWebp(imageBytes: Uint8Array, maxSize: number): Promise<Uint8Array> {
  return await new Promise((resolve, reject) => {
    ImageMagick.read(imageBytes, (img) => {
      try {
        const magick: any = img as any
        if (typeof magick.autoOrient === "function") {
          magick.autoOrient()
        }
        if (typeof magick.strip === "function") {
          magick.strip()
        }
        const maxSide = Math.max(img.width, img.height)
        const scale = maxSide > maxSize ? maxSize / maxSide : 1
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        img.resize(width, height)
        img.quality = 82
        img.write(MagickFormat.WebP, (data) => resolve(data))
      } catch (err) {
        reject(err)
      }
    })
  })
}

async function generateBlurhash(imageBytes: Uint8Array): Promise<string | null> {
  try {
    return await new Promise((resolve, reject) => {
    ImageMagick.read(imageBytes, (img) => {
      try {
        const magick: any = img as any
        if (typeof magick.autoOrient === "function") {
          magick.autoOrient()
        }
        img.resize(32, 32)
          const width = img.width
          const height = img.height
          img.write(MagickFormat.Rgba, (data) => {
            const pixels = new Uint8ClampedArray(data)
            resolve(encode(pixels, width, height, 4, 4))
          })
        } catch (err) {
          reject(err)
        }
      })
    })
  } catch {
    return null
  }
}

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
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  let body: { photo_id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!body.photo_id) {
    return new Response(JSON.stringify({ error: "photo_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const { data: photo, error: photoError } = await supabase
      .from("gallery_photos")
      .select("id, storage_path, gallery_id, galleries(org_id)")
      .eq("id", body.photo_id)
      .maybeSingle()

    if (photoError || !photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const orgId = (photo as any).galleries?.org_id
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organization not found for photo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: imageBlob, error: downloadError } = await supabase.storage
      .from("public-media")
      .download(photo.storage_path)

    if (downloadError || !imageBlob) {
      return new Response(JSON.stringify({ error: "Failed to download photo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const imageBytes = new Uint8Array(await imageBlob.arrayBuffer())

    let takenAt: string | null = null
    try {
      const exif = await exifr.parse(imageBytes, {
        pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
        translateValues: true,
        gps: false,
      }) as any
      const candidate = exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate
      if (candidate instanceof Date) {
        takenAt = candidate.toISOString()
      } else if (typeof candidate === "string") {
        const parsed = new Date(candidate)
        if (!Number.isNaN(parsed.getTime())) {
          takenAt = parsed.toISOString()
        }
      }
    } catch {
      takenAt = null
    }

    const blurhash = await generateBlurhash(imageBytes)

    const uploads: Record<ThumbnailSizeKey, string> = {
      sm: "",
      md: "",
      lg: "",
    }

    for (const sizeKey of Object.keys(SIZE_MAP) as ThumbnailSizeKey[]) {
      const resized = await resizeToWebp(imageBytes, SIZE_MAP[sizeKey])
      const thumbPath = `orgs/${orgId}/galleries/${photo.gallery_id}/thumbnails/${photo.id}_${sizeKey}.webp`
      const { error: uploadError } = await supabase.storage
        .from("public-media")
        .upload(thumbPath, resized, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true,
        })

      if (uploadError) {
        return new Response(JSON.stringify({ error: "Failed to upload thumbnail" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      uploads[sizeKey] = thumbPath
    }

    const updatePayload: Record<string, unknown> = {
      thumbnail_sm_path: uploads.sm,
      thumbnail_md_path: uploads.md,
      thumbnail_lg_path: uploads.lg,
      thumbnail_path: uploads.md,
      updated_at: new Date().toISOString(),
    }

    if (blurhash) updatePayload.blurhash = blurhash
    if (takenAt) updatePayload.taken_at = takenAt

    const { error: updateError } = await supabase
      .from("gallery_photos")
      .update(updatePayload)
      .eq("id", photo.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update photo record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, thumbnails: uploads, blurhash, taken_at: takenAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
