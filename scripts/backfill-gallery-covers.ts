import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Prepare environment
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function backfill() {
    console.log('Starting gallery cover thumbnail backfill...')

    const PAGE_SIZE = 50
    let processedCount = 0
    let errorCount = 0
    let skipCount = 0

    while (true) {
        // Find galleries needing processing
        // Filter: cover_thumbnails IS NULL AND (status IS NULL OR status != 'completed')
        const { data: galleries, error } = await supabase
            .from('galleries')
            .select('id, name')
            .is('cover_thumbnails', null)
            .or('cover_generation_status.is.null,cover_generation_status.neq.completed')
            .limit(PAGE_SIZE)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching galleries:', error)
            break
        }

        if (!galleries || galleries.length === 0) {
            break
        }

        console.log(`Processing batch: ${galleries.length} galleries...`)

        for (const gallery of galleries) {
            // Check if gallery has photos 
            const { count } = await supabase
                .from('gallery_photos')
                .select('*', { count: 'exact', head: true })
                .eq('gallery_id', gallery.id);

            if (!count || count === 0) {
                console.log(`[SKIP] Gallery ${gallery.id} (${gallery.name}) is empty`)
                skipCount++
                // Mark as completed to remove from queue
                await supabase
                    .from('galleries')
                    .update({
                        cover_generation_status: 'completed',
                        cover_generated_at: new Date().toISOString()
                    })
                    .eq('id', gallery.id)
            } else {
                console.log(`[PROCESS] Gallery ${gallery.id} (${gallery.name})...`)

                const { data, error: invokeError } = await supabase.functions.invoke('generate-gallery-cover', {
                    body: { gallery_id: gallery.id, force_regenerate: true }
                })

                if (invokeError) {
                    console.error(`[ERROR] Failed to process ${gallery.id}:`, invokeError)
                    errorCount++
                    // Mark as failed to avoid infinite loop
                    await supabase
                        .from('galleries')
                        .update({ cover_generation_status: 'failed' })
                        .eq('id', gallery.id)
                } else {
                    console.log(`[SUCCESS]`, data)
                    processedCount++
                }

                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    console.log('Backfill complete.')
    console.log(`Processed: ${processedCount}`)
    console.log(`Skipped: ${skipCount}`)
    console.log(`Errors: ${errorCount}`)
}

backfill().catch(console.error)
