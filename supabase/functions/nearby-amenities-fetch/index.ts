// Nearby Amenities Fetch Edge Function
// Fetches Google Places Nearby Search and generates AI-curated amenities via Gemini API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Timeout constants
const NEARBY_SEARCH_TIMEOUT_MS = 15000 // 15 seconds
const GEMINI_TIMEOUT_MS = 15000 // 15 seconds

// Constants
const MAX_RAW_PLACES = 40 // Maximum places to store in raw_places_json
const MIN_CURATED_ITEMS = 3 // Minimum items in curated list
const MAX_CURATED_ITEMS = 8 // Maximum items in curated list
const MAX_PER_CATEGORY = 5 // Cap places per category (3-5)
const MIN_PER_CATEGORY = 3

// Four curated categories (required by product)
const CANONICAL_CATEGORIES = [
    'Pre-Game Food',
    'Coffee & Quick Stops',
    'Essentials & Convenience',
    'Post-Game Hangouts',
] as const
type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number]

/**
 * Normalize Gemini free-form category to one of the four canonical categories
 */
function normalizeCategoryToCanonical(category: string | undefined | null): CanonicalCategory | null {
    if (!category || typeof category !== 'string') return null
    const trimmed = category.trim()
    
    // Exact match first (Gemini should return exact category names)
    if (CANONICAL_CATEGORIES.includes(trimmed as CanonicalCategory)) {
        return trimmed as CanonicalCategory
    }
    
    // Case-insensitive exact match
    const exactMatch = CANONICAL_CATEGORIES.find(c => c.toLowerCase() === trimmed.toLowerCase())
    if (exactMatch) return exactMatch
    
    // Fuzzy pattern matching for variations
    const lower = trimmed.toLowerCase()
    if (lower.includes('pre-game') || lower.includes('pregame') || lower.includes('pre game') || lower.includes('before game') || (lower.includes('fast food') || lower.includes('quick food') || lower.includes('casual dining')) && !lower.includes('post')) return 'Pre-Game Food'
    if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('bakery') || lower.includes('quick stop') || lower.includes('grab-and-go') || lower.includes('breakfast')) return 'Coffee & Quick Stops'
    if (lower.includes('essential') || lower.includes('convenience') || lower.includes('restroom') || lower.includes('pharmacy') || lower.includes('grocery') || lower.includes('store')) return 'Essentials & Convenience'
    if (lower.includes('post-game') || lower.includes('postgame') || lower.includes('post game') || lower.includes('hangout') || lower.includes('after game') || lower.includes('sit-down') || lower.includes('family-friendly')) return 'Post-Game Hangouts'
    // Default ambiguous to Pre-Game Food
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('meal')) return 'Pre-Game Food'
    return 'Pre-Game Food'
}

/**
 * Infer canonical category from Places API types (for fallback when Gemini fails)
 */
function inferCategoryFromTypes(types: string[]): CanonicalCategory {
    const lower = (types || []).map(t => t.toLowerCase())
    if (lower.some(t => t.includes('restaurant') || t.includes('food') || t.includes('meal') || t.includes('fast_food'))) return 'Pre-Game Food'
    if (lower.some(t => t.includes('cafe') || t.includes('coffee') || t.includes('bakery'))) return 'Coffee & Quick Stops'
    if (lower.some(t => t.includes('convenience') || t.includes('pharmacy') || t.includes('store') || t.includes('supermarket') || t.includes('grocery'))) return 'Essentials & Convenience'
    return 'Post-Game Hangouts'
}

const WALKING_SPEED_M_PER_MIN = 80 // ~80 meters per minute walking
const WALKING_FACTOR = 1.4 // Factor for non-straight-line walking paths

// Allowed event types (normalized)
const ALLOWED_EVENT_TYPES = ['game', 'practice', 'tournament', 'tryout', 'scrimmage', 'training', 'camp', 'other']

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
            keepalive: false,
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
 * Calculate Haversine distance between two points in meters
 * Formula: https://en.wikipedia.org/wiki/Haversine_formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Earth's radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180

    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}

/**
 * Calculate approximate walking minutes from distance in meters
 * Uses formula: distance_m * WALKING_FACTOR / WALKING_SPEED_M_PER_MIN
 * The walking factor accounts for non-straight-line paths
 */
function calculateWalkingMinutes(distanceMeters: number): number {
    if (distanceMeters <= 0) return 0
    const walkingMinutes = (distanceMeters * WALKING_FACTOR) / WALKING_SPEED_M_PER_MIN
    return Math.round(walkingMinutes)
}

/**
 * Build venue_key from place_id or lat/lng
 * When place_id is present: "place_id:ChIJ..."
 * Otherwise: "lat:<rounded>,lng:<rounded>" (4 decimal places)
 */
function buildVenueKey(placeId: string | null, lat: number | null, lng: number | null): string | null {
    if (placeId) {
        return `place_id:${placeId}`
    }
    if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
        return `lat:${lat.toFixed(4)},lng:${lng.toFixed(4)}`
    }
    return null
}

/**
 * Compute time_window from event_start_time
 * Time window boundaries (in UTC for consistency):
 * - morning: 05:00 - 10:59
 * - afternoon: 11:00 - 16:59
 * - evening: 17:00 - 04:59
 */
function computeTimeWindow(eventStartTime: string): 'morning' | 'afternoon' | 'evening' {
    try {
        const date = new Date(eventStartTime)
        const hour = date.getUTCHours()

        if (hour >= 5 && hour < 11) {
            return 'morning'
        } else if (hour >= 11 && hour < 17) {
            return 'afternoon'
        } else {
            return 'evening'
        }
    } catch {
        return 'afternoon' // Default fallback
    }
}

/**
 * Normalize event_type to allowed values
 */
function normalizeEventType(eventType: string): string {
    const normalized = (eventType || 'game').toLowerCase().trim()
    if (ALLOWED_EVENT_TYPES.includes(normalized)) {
        return normalized
    }
    return 'game' // Default fallback
}

/**
 * Convert place_id to integer hash for advisory lock
 */
function venueKeyToLockKey(venueKey: string): bigint {
    const hash = venueKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return BigInt(Math.abs(hash)) % BigInt(2 ** 31)
}

interface NormalizedPlace {
    place_id: string
    name: string
    location: { lat: number; lng: number }
    types: string[]
    walking_minutes: number
    rating?: number
}

interface AmenityItem {
    place_id: string
    name: string
    walking_minutes: number
    category?: string
    description?: string
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let lockAcquired = false
    let fetchInProgressSet = false
    let supabaseClient: any = null
    let lockKey: bigint = BigInt(0)

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey)

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
        const body = await req.json()
        let { latitude, longitude, place_id, event_type, event_start_time, refresh = false } = body

        // Normalize event_type (mitigation #8)
        event_type = normalizeEventType(event_type || 'game')

        // Default event_start_time to now if not provided
        if (!event_start_time) {
            event_start_time = new Date().toISOString()
        }

        // Resolve lat/lng from place_id if needed (mitigation #2)
        if ((!latitude || !longitude) && place_id) {
            // Try to get from venue_insights first
            const { data: insightsData } = await supabaseClient
                .from('venue_insights')
                .select('place_details_json')
                .eq('place_id', place_id)
                .single()

            if (insightsData?.place_details_json?.geometry?.location) {
                latitude = insightsData.place_details_json.geometry.location.lat
                longitude = insightsData.place_details_json.geometry.location.lng
            } else {
                // Make a Place Details API call for geometry only
                const placesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
                if (placesApiKey) {
                    try {
                        const detailsUrl = `https://places.googleapis.com/v1/places/${place_id}`
                        const detailsResponse = await fetchWithTimeout(
                            detailsUrl,
                            {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-Goog-Api-Key': placesApiKey,
                                    'X-Goog-FieldMask': 'location',
                                    'User-Agent': 'YouthSports.team/1.0',
                                },
                            },
                            NEARBY_SEARCH_TIMEOUT_MS
                        )

                        if (detailsResponse.ok) {
                            const detailsData = await detailsResponse.json()
                            if (detailsData.location) {
                                latitude = detailsData.location.latitude
                                longitude = detailsData.location.longitude
                            }
                        }
                    } catch (err) {
                        console.error('Place Details API error:', err)
                    }
                }
            }
        }

        // Validate lat/lng are finite numbers (mitigation T2)
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return new Response(
                JSON.stringify({ error: 'location_unavailable', message: 'Could not resolve venue coordinates' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Build venue_key (mitigation #6)
        const venueKey = buildVenueKey(place_id, latitude, longitude)
        if (!venueKey) {
            return new Response(
                JSON.stringify({ error: 'invalid_venue_key', message: 'Could not build venue key' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Compute time_window from event_start_time (mitigation #4)
        // Time window in UTC; future: support venue/timezone when available
        const timeWindow = computeTimeWindow(event_start_time)

        lockKey = venueKeyToLockKey(venueKey)

        // Acquire advisory lock (mitigation T4)
        await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })
        lockAcquired = true

        try {
            // Check existing cache
            const { data: existing, error: fetchError } = await supabaseClient
                .from('venue_nearby_places')
                .select('*')
                .eq('venue_key', venueKey)
                .single()

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError
            }

            // Check if fetch is in progress (mitigation #1)
            if (existing?.fetch_in_progress && !refresh) {
                // Release lock and return 429 with cached data if available
                await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
                lockAcquired = false

                // Try to return cached summaries if available
                if (existing?.id) {
                    const { data: cachedSummary } = await supabaseClient
                        .from('venue_nearby_amenities_summaries')
                        .select('summaries_json')
                        .eq('venue_nearby_places_id', existing.id)
                        .eq('event_type', event_type)
                        .eq('time_window', timeWindow)
                        .single()

                    if (cachedSummary?.summaries_json) {
                        return new Response(
                            JSON.stringify({
                                amenities: cachedSummary.summaries_json,
                                cached: true,
                                fetch_in_progress: true,
                            }),
                            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        )
                    }
                }

                return new Response(
                    JSON.stringify({ error: 'fetch_in_progress', cached: true }),
                    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Check cache validity (24h) and rate limits
            const cacheValid = existing?.last_api_call_at &&
                (Date.now() - new Date(existing.last_api_call_at).getTime()) < 24 * 60 * 60 * 1000

            let rawPlaces: NormalizedPlace[] = []

            // If we have cached raw places and not refreshing, use them
            if (!refresh && cacheValid && existing?.raw_places_json) {
                rawPlaces = existing.raw_places_json as NormalizedPlace[]
            } else {
                // Check rate limit (mitigation #7)
                const { data: canFetch } = await supabaseClient.rpc('can_fetch_nearby_places', {
                    p_venue_key: venueKey,
                })

                if (!canFetch && !refresh) {
                    // Use cached data if available
                    if (existing?.raw_places_json) {
                        rawPlaces = existing.raw_places_json as NormalizedPlace[]
                    }
                } else if (canFetch || (refresh && true)) {
                    // Fetch from Places API
                    const placesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
                    if (!placesApiKey) {
                        throw new Error('GOOGLE_PLACES_API_KEY not configured')
                    }

                    // Set fetch_in_progress flag
                    if (existing) {
                        await supabaseClient
                            .from('venue_nearby_places')
                            .update({ fetch_in_progress: true })
                            .eq('venue_key', venueKey)
                    } else {
                        await supabaseClient
                            .from('venue_nearby_places')
                            .insert({
                                venue_key: venueKey,
                                latitude,
                                longitude,
                                fetch_in_progress: true,
                            })
                    }
                    fetchInProgressSet = true

                    // Release lock before making API calls
                    await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
                    lockAcquired = false

                    // Call Places API Nearby Search (mitigation #5 - single request)
                    // Using includedTypes for restaurant, cafe, convenience_store
                    const nearbyUrl = 'https://places.googleapis.com/v1/places:searchNearby'
                    const nearbyBody = {
                        locationRestriction: {
                            circle: {
                                center: { latitude, longitude },
                                radius: 800, // ~10 min walk
                            },
                        },
                        includedTypes: ['restaurant', 'cafe', 'convenience_store', 'fast_food_restaurant', 'coffee_shop'],
                        maxResultCount: 20,
                        rankPreference: 'DISTANCE',
                    }

                    const nearbyResponse = await fetchWithTimeout(
                        nearbyUrl,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Goog-Api-Key': placesApiKey,
                                'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.rating,places.userRatingCount',
                                'User-Agent': 'YouthSports.team/1.0',
                            },
                            body: JSON.stringify(nearbyBody),
                        },
                        NEARBY_SEARCH_TIMEOUT_MS
                    )

                    if (!nearbyResponse.ok) {
                        const errorText = await nearbyResponse.text()
                        console.error('Nearby Search API error:', nearbyResponse.status, errorText)

                        // Log error
                        await supabaseClient.rpc('log_event', {
                            p_category: 'EVENT',
                            p_event_type: 'NEARBY_AMENITIES_PLACES_ERROR',
                            p_actor_user_id: user.id,
                            p_actor_role: 'system',
                            p_metadata: {
                                venue_key: venueKey,
                                error: errorText,
                                status: nearbyResponse.status,
                            },
                        } as any)

                        // Clear fetch_in_progress on failure
                        await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })
                        lockAcquired = true
                        await supabaseClient
                            .from('venue_nearby_places')
                            .update({ fetch_in_progress: false })
                            .eq('venue_key', venueKey)
                        fetchInProgressSet = false

                        return new Response(
                            JSON.stringify({ amenities: null, error: 'places_failed' }),
                            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        )
                    }

                    const nearbyData = await nearbyResponse.json()
                    const places = nearbyData.places || []

                    // Normalize places (mitigation T1, T3, T8)
                    rawPlaces = places.map((place: any) => {
                        // Strip "places/" prefix from id (T1)
                        const placeId = (place.id || '').replace(/^places\//, '')
                        // Get name from displayName.text (T3)
                        const name = place.displayName?.text ?? place.id ?? 'Unknown'
                        // Get location
                        const location = place.location ? {
                            lat: place.location.latitude,
                            lng: place.location.longitude,
                        } : { lat: 0, lng: 0 }
                        // Calculate walking minutes (T10)
                        const distanceM = haversineDistance(latitude, longitude, location.lat, location.lng)
                        const walkingMinutes = calculateWalkingMinutes(distanceM)

                        return {
                            place_id: placeId,
                            name,
                            location,
                            types: place.types || [],
                            walking_minutes: walkingMinutes,
                            rating: place.rating,
                        } as NormalizedPlace
                    })
                        .slice(0, MAX_RAW_PLACES) // Cap at 40 items (T8)
                        .sort((a: NormalizedPlace, b: NormalizedPlace) => a.walking_minutes - b.walking_minutes)

                    // Log successful fetch
                    await supabaseClient.rpc('log_event', {
                        p_category: 'EVENT',
                        p_event_type: 'NEARBY_AMENITIES_PLACES_FETCHED',
                        p_actor_user_id: user.id,
                        p_actor_role: 'system',
                        p_metadata: {
                            venue_key: venueKey,
                            places_count: rawPlaces.length,
                        },
                    } as any)

                    // Re-acquire lock for update
                    await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })
                    lockAcquired = true

                    // Update or insert venue_nearby_places
                    const updateData = {
                        latitude,
                        longitude,
                        raw_places_json: rawPlaces,
                        fetched_at: new Date().toISOString(),
                        last_api_call_at: new Date().toISOString(),
                        fetch_in_progress: false,
                        updated_at: new Date().toISOString(),
                    }

                    const { data: upsertedData } = await supabaseClient
                        .from('venue_nearby_places')
                        .upsert(
                            { venue_key: venueKey, ...updateData },
                            { onConflict: 'venue_key' }
                        )
                        .select('id')
                        .single()

                    fetchInProgressSet = false
                }
            }

            // If no raw places, return empty
            if (!rawPlaces || rawPlaces.length === 0) {
                return new Response(
                    JSON.stringify({ amenities: [], cached: false, error: 'no_places_found' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Now handle Gemini for curated list
            let amenities: AmenityItem[] = []
            let cached = false

            // Get venue_nearby_places_id
            const { data: placesRow } = await supabaseClient
                .from('venue_nearby_places')
                .select('id')
                .eq('venue_key', venueKey)
                .single()

            if (!placesRow?.id) {
                // Fallback: group raw places by inferred category
                const byCategory = new Map<CanonicalCategory, AmenityItem[]>()
                for (const cat of CANONICAL_CATEGORIES) byCategory.set(cat, [])
                for (const place of rawPlaces) {
                    const cat = inferCategoryFromTypes(place.types)
                    const arr = byCategory.get(cat)!
                    if (arr.length >= MAX_PER_CATEGORY) continue
                    arr.push({
                        place_id: place.place_id,
                        name: place.name,
                        walking_minutes: place.walking_minutes,
                        category: cat,
                    })
                }
                amenities = Array.from(byCategory.values()).flat()
                return new Response(
                    JSON.stringify({ amenities, cached: false, fallback: true }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Check for cached Gemini summary
            const { data: existingSummary } = await supabaseClient
                .from('venue_nearby_amenities_summaries')
                .select('*')
                .eq('venue_nearby_places_id', placesRow.id)
                .eq('event_type', event_type)
                .eq('time_window', timeWindow)
                .single()

            // Check if Gemini cache is valid (24h)
            const geminiCacheValid = existingSummary?.gemini_called_at &&
                (Date.now() - new Date(existingSummary.gemini_called_at).getTime()) < 24 * 60 * 60 * 1000

            if (!refresh && geminiCacheValid && existingSummary?.summaries_json) {
                amenities = existingSummary.summaries_json as AmenityItem[]
                cached = true
            } else {
                // Check rate limit for Gemini (mitigation #7)
                const { data: canFetchGemini } = await supabaseClient.rpc('can_fetch_nearby_gemini', {
                    p_venue_key: venueKey,
                    p_event_type: event_type,
                    p_time_window: timeWindow,
                })

                if (!canFetchGemini && !refresh && existingSummary?.summaries_json) {
                    // Use cached data
                    amenities = existingSummary.summaries_json as AmenityItem[]
                    cached = true
                } else {
                    // Call Gemini API
                    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
                    if (!geminiApiKey) {
                        // Fallback: group raw places by inferred category (no AI descriptions)
                        const byCategory = new Map<CanonicalCategory, AmenityItem[]>()
                        for (const cat of CANONICAL_CATEGORIES) byCategory.set(cat, [])
                        for (const place of rawPlaces) {
                            const cat = inferCategoryFromTypes(place.types)
                            const arr = byCategory.get(cat)!
                            if (arr.length >= MAX_PER_CATEGORY) continue
                            arr.push({
                                place_id: place.place_id,
                                name: place.name,
                                walking_minutes: place.walking_minutes,
                                category: cat,
                            })
                        }
                        amenities = Array.from(byCategory.values()).flat()
                    } else {
                        try {
                            // Build Gemini prompt: four curated categories, one place per category, 3-5 per category
                            const placesListForPrompt = rawPlaces.slice(0, 20).map(p =>
                                `- ${p.name} (${p.types.slice(0, 3).join(', ')})${p.rating ? `, rating: ${p.rating}` : ''}, ~${p.walking_minutes} min walk`
                            ).join('\n')

                            const prompt = `You are helping families at a youth sports ${event_type}. Event start time: ${event_start_time}. Time of day: ${timeWindow}.

Nearby places (use EXACT names from this list):
${placesListForPrompt}

RULES:
- Assign each place to exactly ONE of these four categories. Use the category names exactly as written:
  1. "Pre-Game Food" — Restaurants suitable for teams and families; fast, casual dining. Exclude bars, nightlife, fine dining.
  2. "Coffee & Quick Stops" — Coffee shops, cafes, bakeries, grab-and-go breakfast.
  3. "Essentials & Convenience" — Restrooms (if you know of public facilities), convenience stores, pharmacies, grocery or big-box essentials.
  4. "Post-Game Hangouts" — Casual sit-down restaurants, family-friendly spots, places suitable for groups after games.
- Put each place in only ONE category. No duplicate places across categories.
- Limit to 3–5 places per category. Rank by relevance (walkability, family-friendly, practical).
- Favor walkable, practical options. Avoid bars, nightclubs, adult-only venues.
- For each place provide a one-sentence description (e.g. "Popular with teams before games", "Quick coffee and pastries").

Respond ONLY with a valid JSON array. Each object: "name" (exact name from the list), "category" (one of the four above, exactly), "description" (one sentence).
[
  {"name": "Place Name", "category": "Pre-Game Food", "description": "One sentence."}
]
No other text or markdown.`

                            const geminiResponse = await fetchWithTimeout(
                                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'User-Agent': 'YouthSports.team/1.0',
                                    },
                                    body: JSON.stringify({
                                        contents: [{ parts: [{ text: prompt }] }],
                                        generationConfig: {
                                            maxOutputTokens: 800,
                                            temperature: 0.5,
                                        },
                                    }),
                                },
                                GEMINI_TIMEOUT_MS
                            )

                            let geminiParsed = false
                            if (geminiResponse.ok) {
                                const geminiData = await geminiResponse.json()
                                const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

                                if (geminiText) {
                                    try {
                                        // Try to parse JSON from response (T6 - lenient parsing)
                                        // Remove markdown code blocks if present
                                        let jsonStr = geminiText.trim()
                                        if (jsonStr.startsWith('```json')) {
                                            jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '')
                                        } else if (jsonStr.startsWith('```')) {
                                            jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '')
                                        }

                                        const parsed = JSON.parse(jsonStr)
                                        if (Array.isArray(parsed)) {
                                            const seenPlaceIds = new Set<string>()
                                            const byCategory = new Map<CanonicalCategory, AmenityItem[]>()
                                            for (const cat of CANONICAL_CATEGORIES) byCategory.set(cat, [])

                                            for (const item of parsed) {
                                                const matchedPlace = rawPlaces.find(p =>
                                                    p.name.toLowerCase() === item.name?.toLowerCase()
                                                )
                                                const placeKey = matchedPlace?.place_id || item.name || ''
                                                const canonical = normalizeCategoryToCanonical(item.category)
                                                if (!canonical || !item.name || seenPlaceIds.has(placeKey)) continue
                                                const arr = byCategory.get(canonical)!
                                                if (arr.length >= MAX_PER_CATEGORY) continue
                                                seenPlaceIds.add(placeKey)
                                                arr.push({
                                                    place_id: matchedPlace?.place_id || '',
                                                    name: item.name || matchedPlace?.name || 'Unknown',
                                                    walking_minutes: matchedPlace?.walking_minutes || 0,
                                                    category: canonical,
                                                    description: item.description || undefined,
                                                })
                                            }
                                            amenities = Array.from(byCategory.values()).flat()

                                            geminiParsed = true

                                            // Log successful AI generation
                                            await supabaseClient.rpc('log_event', {
                                                p_category: 'EVENT',
                                                p_event_type: 'NEARBY_AMENITIES_GEMINI_GENERATED',
                                                p_actor_user_id: user.id,
                                                p_actor_role: 'system',
                                                p_metadata: {
                                                    venue_key: venueKey,
                                                    event_type,
                                                    time_window: timeWindow,
                                                    amenities_count: amenities.length,
                                                },
                                            } as any)
                                        }
                                    } catch (parseErr) {
                                        console.error('Gemini response parse error:', parseErr)
                                    }
                                }
                            }

                            // Fallback if Gemini failed: group raw places by inferred category (accordion-friendly)
                            if (!geminiParsed || amenities.length < MIN_CURATED_ITEMS) {
                                console.log('Using fallback: grouping raw places by category')

                                const byCategory = new Map<CanonicalCategory, AmenityItem[]>()
                                for (const cat of CANONICAL_CATEGORIES) byCategory.set(cat, [])

                                for (const place of rawPlaces) {
                                    const cat = inferCategoryFromTypes(place.types)
                                    const arr = byCategory.get(cat)!
                                    if (arr.length >= MAX_PER_CATEGORY) continue
                                    arr.push({
                                        place_id: place.place_id,
                                        name: place.name,
                                        walking_minutes: place.walking_minutes,
                                        category: cat,
                                    })
                                }
                                amenities = Array.from(byCategory.values()).flat()
                            }

                            // Store Gemini results
                            const summaryUpsert = {
                                venue_nearby_places_id: placesRow.id,
                                event_type,
                                time_window: timeWindow,
                                summaries_json: amenities,
                                gemini_called_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            }

                            await supabaseClient
                                .from('venue_nearby_amenities_summaries')
                                .upsert(summaryUpsert, {
                                    onConflict: 'venue_nearby_places_id,event_type,time_window',
                                })

                        } catch (geminiErr) {
                            console.error('Gemini API error:', geminiErr)

                            // Log error
                            await supabaseClient.rpc('log_event', {
                                p_category: 'EVENT',
                                p_event_type: 'NEARBY_AMENITIES_GEMINI_ERROR',
                                p_actor_user_id: user.id,
                                p_actor_role: 'system',
                                p_metadata: {
                                    venue_key: venueKey,
                                    error: geminiErr instanceof Error ? geminiErr.message : String(geminiErr),
                                },
                            } as any)

                            // Fallback: group raw places by inferred category (no AI descriptions)
                            const byCategory = new Map<CanonicalCategory, AmenityItem[]>()
                            for (const cat of CANONICAL_CATEGORIES) byCategory.set(cat, [])
                            for (const place of rawPlaces) {
                                const cat = inferCategoryFromTypes(place.types)
                                const arr = byCategory.get(cat)!
                                if (arr.length >= MAX_PER_CATEGORY) continue
                                arr.push({
                                    place_id: place.place_id,
                                    name: place.name,
                                    walking_minutes: place.walking_minutes,
                                    category: cat,
                                })
                            }
                            amenities = Array.from(byCategory.values()).flat()
                        }
                    }
                }
            }

            // Return response
            return new Response(
                JSON.stringify({
                    amenities,
                    cached,
                    venue_key: venueKey,
                    event_type,
                    time_window: timeWindow,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } finally {
            // Always release lock and clear fetch_in_progress (mitigation T4)
            if (fetchInProgressSet) {
                try {
                    if (!lockAcquired) {
                        await supabaseClient.rpc('pg_advisory_lock_wrapper', { key: Number(lockKey) })
                        lockAcquired = true
                    }
                    await supabaseClient
                        .from('venue_nearby_places')
                        .update({ fetch_in_progress: false })
                        .eq('venue_key', buildVenueKey(body.place_id, body.latitude, body.longitude))
                } catch {
                    // Ignore errors in cleanup
                }
            }
            if (lockAcquired) {
                try {
                    await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
                } catch {
                    // Ignore unlock errors
                }
            }
        }

    } catch (error) {
        // Clean up lock if acquired
        if (lockAcquired && supabaseClient) {
            try {
                await supabaseClient.rpc('pg_advisory_unlock_wrapper', { key: Number(lockKey) })
            } catch {
                // Ignore unlock errors
            }
        }

        console.error('Edge Function error:', error)
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
