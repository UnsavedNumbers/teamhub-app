import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { ImageMagick, initialize, MagickFormat, MagickGeometry, Gravity } from "https://deno.land/x/imagemagick_deno@0.0.14/mod.ts";

await initialize();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { gallery_id, source_photo_id, sizes: requestedSizes, force_regenerate } = await req.json();

        if (!gallery_id) throw new Error('gallery_id is required');

        // 1. Determine Photo ID
        let photoId = source_photo_id;

        const { data: gallery, error: galleryError } = await supabaseClient
            .from('galleries')
            .select('*')
            .eq('id', gallery_id)
            .single();

        if (galleryError || !gallery) {
            throw new Error(`Gallery not found: ${galleryError?.message}`);
        }

        if (!photoId) {
            // If gallery explicitly has a cover set (and we aren't being told to ignore it? well, usually manual overrides everything)
            // But if `source_photo_id` is NOT passed, check if we need to find one.
            if (gallery.cover_photo_id) {
                const { data: exists } = await supabaseClient.from('gallery_photos').select('id').eq('id', gallery.cover_photo_id).maybeSingle();
                if (exists) photoId = gallery.cover_photo_id;
            }

            // Fallback to oldest
            if (!photoId) {
                const { data: oldest } = await supabaseClient
                    .from('gallery_photos')
                    .select('id')
                    .eq('gallery_id', gallery_id)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                if (oldest) photoId = oldest.id;
            }
        }

        if (!photoId) {
            // Clear thumbnails
            await supabaseClient.from('galleries').update({
                cover_thumbnails: null,
                cover_generation_status: 'completed',
                cover_generated_at: new Date().toISOString()
            }).eq('id', gallery_id);

            return new Response(JSON.stringify({ message: 'Gallery empty, cleared thumbnails' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. Fetch Photo Path
        const { data: photo, error: photoError } = await supabaseClient
            .from('gallery_photos')
            .select('storage_path')
            .eq('id', photoId)
            .single();

        if (photoError || !photo) throw new Error(`Photo not found: ${photoError?.message}`);

        // Update Status
        await supabaseClient.from('galleries').update({ cover_generation_status: 'processing' }).eq('id', gallery_id);

        // 3. Download
        const { data: imageBlob, error: downloadError } = await supabaseClient.storage
            .from('public-media')
            .download(photo.storage_path);

        if (downloadError) throw downloadError;

        const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

        // 4. Generate Sizes
        const sizes = {
            thumb_small: { width: 150, height: 150 },
            thumb_medium: { width: 300, height: 300 },
            thumb_large: { width: 600, height: 400 },
            thumb_wide: { width: 800, height: 450 }
        };

        const results: Record<string, any> = {};

        for (const [sizeName, dims] of Object.entries(sizes)) {
            if (requestedSizes && !requestedSizes.includes(sizeName)) continue;

            results[sizeName] = {};
            const formats = ['webp', 'jpg'];

            for (const format of formats) {
                const resizedBytes = await new Promise<Uint8Array>((resolve) => {
                    ImageMagick.read(imageBuffer, (img) => {
                        // Smart crop logic: Resize to cover then crop center
                        const aspect = img.width / img.height;
                        const targetAspect = dims.width / dims.height;
                        let resizeWidth = dims.width;
                        let resizeHeight = dims.height;

                        if (aspect > targetAspect) {
                            resizeHeight = dims.height;
                            resizeWidth = Math.ceil(dims.height * aspect);
                        } else {
                            resizeWidth = dims.width;
                            resizeHeight = Math.ceil(dims.width / aspect);
                        }

                        img.resize(resizeWidth, resizeHeight);
                        img.crop(dims.width, dims.height, Gravity.Center);
                        img.quality = 80;

                        const magickFormat = format === 'webp' ? MagickFormat.WebP : MagickFormat.Jpeg;
                        img.write(magickFormat, (data) => resolve(data));
                    });
                });

                const fileName = `${sizeName}.${format}`;
                const path = `galleries/${gallery_id}/covers/${fileName}`;
                const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';

                const { error: uploadError } = await supabaseClient.storage
                    .from('public-media')
                    .upload(path, resizedBytes, { contentType, upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabaseClient.storage.from('public-media').getPublicUrl(path);
                results[sizeName][format] = publicUrl;
            }
        }

        // 5. Update Gallery Record
        await supabaseClient.from('galleries').update({
            cover_photo_id: photoId,
            cover_thumbnails: results,
            cover_generated_at: new Date().toISOString(),
            cover_generation_status: 'completed'
        }).eq('id', gallery_id);

        return new Response(JSON.stringify({ success: true, thumbnails: results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
