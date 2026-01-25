// Venue Insights Fetch Edge Function
// Fetches Google Places API data and generates AI summaries via Gemini API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Timeout constants
const PLACE_DETAILS_TIMEOUT_MS = 15000 // 15 seconds
const GEMINI_TIMEOUT_MS = 15000 // 15 seconds

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      keepalive: false, // Don't reuse connections
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

/**
 * Generate photo URL from photo reference
 */
function generatePhotoUrl(photoReference: string, maxWidth: number = 800): { url: string | null; error: string | null } {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  if (!apiKey) {
    return { url: null, error: 'GOOGLE_PLACES_API_KEY not configured' }
  }

  if (!photoReference || typeof photoReference !== 'string' || photoReference.length === 0) {
    return { url: null, error: 'Invalid photo_reference' }
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoReference)}&key=${apiKey}`

  // Validate URL format
  try {
    new URL(url) // Throws if invalid
    return { url, error: null }
  } catch {
    return { url: null, error: 'Generated invalid URL' }
  }
}

/**
 * Convert place_id to integer hash for advisory lock
 */
function placeIdToLockKey(placeId: string): bigint {
  const hash = placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return BigInt(Math.abs(hash)) % BigInt(2 ** 31)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { place_id, refresh = false } = await req.json()

    if (!place_id || typeof place_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid place_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lockKey = placeIdToLockKey(place_id)

    // Acquire advisory lock
    await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })

    try {
      // Check existing cache
      const { data: existing, error: fetchError } = await supabaseClient
        .from('venue_insights')
        .select('*')
        .eq('place_id', place_id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found", which is OK
        throw fetchError
      }

      // Check rate limits
      if (!refresh && existing) {
        const { data: canFetchPlaceDetails } = await supabaseClient.rpc('can_fetch_place_details', {
          p_place_id: place_id,
        })
        const { data: canFetchGemini } = await supabaseClient.rpc('can_fetch_gemini', {
          p_place_id: place_id,
        })

        // If we have cached data and rate limits prevent fetching, return cached data
        if (
          existing.place_details_json &&
          existing.place_details_fetched_at &&
          !canFetchPlaceDetails &&
          (!existing.ai_summary || !canFetchGemini)
        ) {
          // Release lock and return cached data
          await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })

          // Generate photo URLs from references
          const photos = existing.photos_json
            ? (Array.isArray(existing.photos_json)
                ? existing.photos_json
                : typeof existing.photos_json === 'string'
                ? JSON.parse(existing.photos_json)
                : [])
            : []

          const photoUrls = photos
            .map((photo: { reference?: string }) => {
              if (photo.reference) {
                return generatePhotoUrl(photo.reference)
              }
              return { url: null, error: 'Missing photo reference' }
            })
            .filter((result: { url: string | null }) => result.url !== null)
            .map((result: { url: string }) => result.url)

          return new Response(
            JSON.stringify({
              place_details: existing.place_details_json,
              photos: photoUrls,
              ai_summary: existing.ai_summary,
              ai_what_to_expect: existing.ai_what_to_expect,
              cached: true,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Check if fetch is in progress
      if (existing?.fetch_in_progress && !refresh) {
        await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
        return new Response(
          JSON.stringify({ error: 'Fetch already in progress', cached: true }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Set fetch_in_progress flag
      if (existing) {
        await supabaseClient
          .from('venue_insights')
          .update({ fetch_in_progress: true })
          .eq('place_id', place_id)
      }

      // Release lock before making API calls
      await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })

      // Fetch Place Details API
      let placeDetails: unknown = null
      let placeDetailsError: string | null = null
      const shouldFetchPlaceDetails =
        refresh || !existing?.place_details_json || !existing?.place_details_fetched_at

      if (shouldFetchPlaceDetails) {
        const { data: canFetch } = await supabaseClient.rpc('can_fetch_place_details', {
          p_place_id: place_id,
        })

        if (canFetch) {
          try {
            const placesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
            if (!placesApiKey) {
              throw new Error('GOOGLE_PLACES_API_KEY not configured')
            }

            const fields = [
              'id',
              'displayName',
              'formattedAddress',
              'photos',
              'rating',
              'userRatingCount',
              'types',
              'regularOpeningHours',
              'websiteUri',
              'nationalPhoneNumber',
              'editorialSummary',
              'priceLevel',
              'location',
            ]

            const url = `https://places.googleapis.com/v1/places/${place_id}`

            const response = await fetchWithTimeout(
              url,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Goog-Api-Key': placesApiKey,
                  'X-Goog-FieldMask': fields.join(','),
                  'User-Agent': 'YouthSports.team/1.0',
                },
              },
              PLACE_DETAILS_TIMEOUT_MS
            )

            if (!response.ok) {
              const errorText = await response.text()
              
              // Log error to event_logs
              await supabaseClient.rpc('log_event', {
                p_category: 'EVENT',
                p_event_type: 'VENUE_INSIGHTS_PLACE_DETAILS_ERROR',
                p_actor_user_id: user.id,
                p_actor_role: 'system',
                p_metadata: {
                  place_id,
                  error: errorText,
                  status: response.status,
                },
              } as any)
              
              throw new Error(`Place Details API error: ${response.status} ${errorText}`)
            }

            const placeDetailsData = await response.json()
            
            // Transform to match our expected format
            // Extract photo reference from photo name (format: "places/{place_id}/photos/{photo_reference}")
            const transformPhotos = (photos: Array<{ name?: string; widthPx?: number; heightPx?: number; authorAttributions?: Array<{ displayName?: string }> }> | undefined) => {
              if (!photos) return []
              return photos.map((photo) => {
                // Extract photo reference from name (e.g., "places/ChIJ.../photos/Aap_uED..." -> "Aap_uED...")
                let photoReference = ''
                if (photo.name) {
                  const parts = photo.name.split('/photos/')
                  if (parts.length > 1) {
                    photoReference = parts[1]
                  } else {
                    // Fallback: use the last part of the name
                    photoReference = photo.name.split('/').pop() || ''
                  }
                }
                return {
                  photo_reference: photoReference,
                  width: photo.widthPx || 0,
                  height: photo.heightPx || 0,
                  html_attributions: photo.authorAttributions?.map((attr) => attr.displayName || '') || [],
                }
              }).filter((photo) => photo.photo_reference) // Only include photos with valid references
            }

            placeDetails = {
              place_id: placeDetailsData.id || place_id,
              name: placeDetailsData.displayName?.text || placeDetailsData.displayName,
              formatted_address: placeDetailsData.formattedAddress,
              photos: transformPhotos(placeDetailsData.photos),
              rating: placeDetailsData.rating,
              user_ratings_total: placeDetailsData.userRatingCount,
              types: placeDetailsData.types,
              opening_hours: placeDetailsData.regularOpeningHours ? {
                weekday_text: placeDetailsData.regularOpeningHours.weekdayDescriptions,
              } : undefined,
              website: placeDetailsData.websiteUri,
              international_phone_number: placeDetailsData.nationalPhoneNumber,
              editorial_summary: placeDetailsData.editorialSummary ? {
                overview: typeof placeDetailsData.editorialSummary === 'string' 
                  ? placeDetailsData.editorialSummary 
                  : placeDetailsData.editorialSummary.text,
              } : undefined,
              price_level: placeDetailsData.priceLevel === 'PRICE_LEVEL_FREE' ? 0 : 
                          placeDetailsData.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ? 1 :
                          placeDetailsData.priceLevel === 'PRICE_LEVEL_MODERATE' ? 2 :
                          placeDetailsData.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ? 3 :
                          placeDetailsData.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' ? 4 : undefined,
              geometry: placeDetailsData.location ? {
                location: {
                  lat: placeDetailsData.location.latitude,
                  lng: placeDetailsData.location.longitude,
                },
              } : undefined,
            }
            
            // Log successful fetch
            await supabaseClient.rpc('log_event', {
              p_category: 'EVENT',
              p_event_type: 'VENUE_INSIGHTS_PLACE_DETAILS_FETCHED',
              p_actor_user_id: user.id,
              p_actor_role: 'system',
              p_metadata: {
                place_id,
                has_photos: (placeDetails as { photos?: unknown[] })?.photos?.length > 0,
              },
            } as any)
            
            // Check if place_id is valid (always valid if we got a response)
            const placeIdValid = true

            // Re-acquire lock for update
            await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })

            // Check if another process already updated
            const { data: recheck } = await supabaseClient
              .from('venue_insights')
              .select('place_details_fetched_at')
              .eq('place_id', place_id)
              .single()

            if (existing && recheck?.place_details_fetched_at !== existing.place_details_fetched_at) {
              // Another process updated, skip
              await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
            } else {
              // Update or insert venue_insights
              const photos = (placeDetails as { photos?: Array<{ photo_reference: string; width: number; height: number; html_attributions?: string[] }> })?.photos || []
              const photosJson = photos
                .filter((photo) => photo.photo_reference) // Only include photos with valid references
                .map((photo) => ({
                  reference: photo.photo_reference,
                  width: photo.width,
                  height: photo.height,
                  attribution: photo.html_attributions?.[0] || '',
                }))

              const updateData: Record<string, unknown> = {
                place_details_json: placeDetails,
                photos_json: photosJson,
                place_details_fetched_at: new Date().toISOString(),
                last_place_details_call_at: new Date().toISOString(),
                place_id_valid: placeIdValid,
                fetch_in_progress: false,
                updated_at: new Date().toISOString(),
              }

              if (existing) {
                await supabaseClient.from('venue_insights').update(updateData).eq('place_id', place_id)
              } else {
                await supabaseClient.from('venue_insights').insert({
                  place_id,
                  ...updateData,
                })
              }

              await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
            }
          } catch (error) {
            placeDetailsError = error instanceof Error ? error.message : 'Unknown error'
            console.error('Place Details API error:', placeDetailsError)

            // Log error to event_logs
            await supabaseClient.rpc('log_event', {
              p_category: 'EVENT',
              p_event_type: 'VENUE_INSIGHTS_PLACE_DETAILS_ERROR',
              p_actor_user_id: user.id,
              p_actor_role: 'system',
              p_metadata: {
                place_id,
                error: placeDetailsError,
              },
            } as any)

            // Re-acquire lock to clear fetch_in_progress
            await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })
            if (existing) {
              await supabaseClient
                .from('venue_insights')
                .update({ fetch_in_progress: false })
                .eq('place_id', place_id)
            }
            await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
          }
        } else {
          placeDetailsError = 'Rate limit exceeded. Please try again later.'
        }
      } else {
        placeDetails = existing.place_details_json
      }

      // Fetch Gemini API for AI summary (if needed)
      let aiSummary: string | null = null
      let aiWhatToExpect: string | null = null
      let geminiError: string | null = null

      const shouldFetchGemini = refresh || !existing?.ai_summary
      if (shouldFetchGemini && placeDetails) {
        const { data: canFetch } = await supabaseClient.rpc('can_fetch_gemini', {
          p_place_id: place_id,
        })

        if (canFetch) {
          try {
            const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
            if (!geminiApiKey) {
              throw new Error('GOOGLE_GEMINI_API_KEY not configured')
            }

            const placeDetailsObj = placeDetails as {
              name?: string
              formatted_address?: string
              types?: string[]
              rating?: number
              user_ratings_total?: number
              price_level?: number
              website?: string
              international_phone_number?: string
              opening_hours?: { weekday_text?: string[] }
            }

            // Build prompt for summary
            const summaryPrompt = `You are a helpful assistant providing venue information for youth sports events.

Given the following venue information from Google Places:
- Name: ${placeDetailsObj.name || 'N/A'}
- Address: ${placeDetailsObj.formatted_address || 'N/A'}
- Types: ${placeDetailsObj.types?.join(', ') || 'N/A'}
- Rating: ${placeDetailsObj.rating || 'N/A'}/5 (${placeDetailsObj.user_ratings_total || 0} reviews)
- Price Level: ${placeDetailsObj.price_level || 'N/A'}
- Website: ${placeDetailsObj.website || 'N/A'}
- Phone: ${placeDetailsObj.international_phone_number || 'N/A'}
- Opening Hours: ${placeDetailsObj.opening_hours?.weekday_text?.join('; ') || 'N/A'}

Write a concise 2-3 sentence summary of this venue suitable for parents attending youth sports events. Focus on:
- What type of facility it is
- Notable features or amenities
- Any relevant context for sports events

Do not make up information. Only use facts provided. If information is missing, acknowledge it.

Output format: Plain text, 2-3 sentences, no markdown.`

            // Build prompt for tips
            const tipsPrompt = `Based on the venue information provided, generate 3-5 practical tips for parents/guardians attending a youth sports event at this venue.

Focus on:
- Parking availability and tips
- What to bring
- Amenities available (restrooms, concessions, seating)
- Accessibility considerations
- Any venue-specific notes

Format as a bulleted list. Use only information from the provided data. If information is missing, say "Information not available" rather than guessing.

Output format: Markdown bullet list (each tip on a new line starting with -)`

            // Call Gemini API in parallel for both prompts
            const [summaryResult, tipsResult] = await Promise.allSettled([
              fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'YouthSports.team/1.0',
                  },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: summaryPrompt }] }],
                    generationConfig: {
                      maxOutputTokens: 200,
                      temperature: 0.7,
                    },
                  }),
                },
                GEMINI_TIMEOUT_MS
              ),
              fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'YouthSports.team/1.0',
                  },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: tipsPrompt }] }],
                    generationConfig: {
                      maxOutputTokens: 300,
                      temperature: 0.7,
                    },
                  }),
                },
                GEMINI_TIMEOUT_MS
              ),
            ])

            // Process summary result
            if (summaryResult.status === 'fulfilled') {
              const summaryResponse = summaryResult.value
              if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json()
                const candidates = summaryData.candidates?.[0]?.content?.parts?.[0]?.text
                if (candidates && typeof candidates === 'string') {
                  aiSummary = candidates.trim().substring(0, 500) // Max 500 chars
                  
                  // Log successful AI generation
                  await supabaseClient.rpc('log_event', {
                    p_category: 'EVENT',
                    p_event_type: 'VENUE_INSIGHTS_AI_SUMMARY_GENERATED',
                    p_actor_user_id: user.id,
                    p_actor_role: 'system',
                    p_metadata: {
                      place_id,
                      summary_length: aiSummary.length,
                    },
                  } as any)
                }
              }
            }

            // Process tips result
            if (tipsResult.status === 'fulfilled') {
              const tipsResponse = tipsResult.value
              if (tipsResponse.ok) {
                const tipsData = await tipsResponse.json()
                const candidates = tipsData.candidates?.[0]?.content?.parts?.[0]?.text
                if (candidates && typeof candidates === 'string') {
                  aiWhatToExpect = candidates.trim().substring(0, 1000) // Max 1000 chars
                  
                  // Log successful AI generation
                  await supabaseClient.rpc('log_event', {
                    p_category: 'EVENT',
                    p_event_type: 'VENUE_INSIGHTS_AI_TIPS_GENERATED',
                    p_actor_user_id: user.id,
                    p_actor_role: 'system',
                    p_metadata: {
                      place_id,
                      tips_length: aiWhatToExpect.length,
                    },
                  } as any)
                }
              }
            }

            // Validate AI output (basic validation)
            const validationStatus =
              aiSummary && aiSummary.length >= 50 && aiSummary.length <= 500 ? 'valid' : 'failed'

            // Re-acquire lock for update
            await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })

            // Check if another process already updated
            const { data: recheckGemini } = await supabaseClient
              .from('venue_insights')
              .select('ai_generated_at')
              .eq('place_id', place_id)
              .single()

            if (existing && recheckGemini?.ai_generated_at !== existing.ai_generated_at) {
              // Another process updated, skip
              await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
            } else {
              // Update AI fields
              const updateData: Record<string, unknown> = {
                ai_summary: aiSummary,
                ai_what_to_expect: aiWhatToExpect,
                ai_generated_at: aiSummary ? new Date().toISOString() : null,
                ai_validation_status: validationStatus,
                last_gemini_call_at: new Date().toISOString(),
                fetch_in_progress: false,
                updated_at: new Date().toISOString(),
              }

              await supabaseClient.from('venue_insights').update(updateData).eq('place_id', place_id)
              await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
            }
          } catch (error) {
            geminiError = error instanceof Error ? error.message : 'Unknown error'
            console.error('Gemini API error:', geminiError)

            // Log error to event_logs
            await supabaseClient.rpc('log_event', {
              p_category: 'EVENT',
              p_event_type: 'VENUE_INSIGHTS_GEMINI_ERROR',
              p_actor_user_id: user.id,
              p_actor_role: 'system',
              p_metadata: {
                place_id,
                error: geminiError,
              },
            } as any)

            // Re-acquire lock to clear fetch_in_progress
            await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })
            if (existing) {
              await supabaseClient
                .from('venue_insights')
                .update({ fetch_in_progress: false })
                .eq('place_id', place_id)
            }
            await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
          }
        } else {
          geminiError = 'Rate limit exceeded. Please try again later.'
        }
      } else if (existing) {
        aiSummary = existing.ai_summary
        aiWhatToExpect = existing.ai_what_to_expect
      }

      // Generate photo URLs from references
      // Use current placeDetails photos if available, otherwise use cached photos_json
      let photosToProcess: Array<{ reference?: string; photo_reference?: string }> = []
      
      if (placeDetails) {
        const placeDetailsPhotos = (placeDetails as { photos?: Array<{ photo_reference: string }> })?.photos || []
        photosToProcess = placeDetailsPhotos.map((photo) => ({ photo_reference: photo.photo_reference }))
      } else if (existing?.photos_json) {
        if (Array.isArray(existing.photos_json)) {
          photosToProcess = existing.photos_json
        } else if (typeof existing.photos_json === 'string') {
          try {
            photosToProcess = JSON.parse(existing.photos_json)
          } catch {
            photosToProcess = []
          }
        }
      }

      const photoUrls = photosToProcess
        .map((photo: { reference?: string; photo_reference?: string }) => {
          const ref = photo.reference || photo.photo_reference
          if (ref) {
            return generatePhotoUrl(ref)
          }
          return { url: null, error: 'Missing photo reference' }
        })
        .filter((result: { url: string | null }) => result.url !== null)
        .map((result: { url: string }) => result.url)

      // Return response
      return new Response(
        JSON.stringify({
          place_details: placeDetails,
          photos: photoUrls,
          ai_summary: aiSummary,
          ai_what_to_expect: aiWhatToExpect,
          errors: {
            place_details: placeDetailsError,
            gemini: geminiError,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } finally {
      // Always release lock
      try {
        await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
      } catch {
        // Ignore unlock errors
      }
    }
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
