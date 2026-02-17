/**
 * Venue Insights Service
 * 
 * Provides data access for venue insights (Google Places + AI summaries).
 * Calls Edge Function to fetch and cache venue information.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import type { VenueInsights, PlaceDetailsResponse } from '../../types/venueInsights'
import { mapVenueInsightsRow } from '../../types/venueInsights'
import { getDemoVenueInsightImages } from '../../utils/demoImagePlaceholders'

export interface VenueInsightsResponse {
  place_details: PlaceDetailsResponse | null
  photos: string[]
  ai_summary: string | null
  ai_what_to_expect: string | null
  errors?: {
    place_details?: string | null
    gemini?: string | null
  }
  cached?: boolean
}

function buildMockVenueInsights(placeId: string): VenueInsightsResponse {
  const catalog: Array<{
    placeId: string
    name: string
    address: string
    cityState: string
    lat: number
    lng: number
    summary: string
    expect: string
  }> = [
      {
        placeId: 'riv-001',
        name: 'Riverside Sports Complex',
        address: '1234 Athletic Way',
        cityState: 'Sacramento, CA 95814',
        lat: 38.58157,
        lng: -121.4944,
        summary: 'Riverside Sports Complex is a high-traffic youth tournament venue with full concessions, covered family seating, and nearby parking garages within a short walk.',
        expect: 'Expect active check-in lines 45 minutes before game time, strong weekend foot traffic, and quick access to restaurants and coffee options around the venue core.',
      },
      {
        placeId: 'lin-001',
        name: 'Lincoln High School Stadium',
        address: '5678 Education Blvd',
        cityState: 'Sacramento, CA 95822',
        lat: 38.51896,
        lng: -121.49324,
        summary: 'Lincoln High School Stadium provides a neighborhood-focused game-day setup with easy drop-off lanes, structured bleacher seating, and family-friendly concessions.',
        expect: 'Expect moderate arrival flow, limited premium parking, and a quieter post-game environment suited for youth events and school-hosted showcases.',
      },
    ]

  const fallback = catalog[Math.abs(placeId.length) % catalog.length]
  const selected = catalog.find((entry) => entry.placeId === placeId) || fallback
  const photos = getDemoVenueInsightImages(placeId)

  return {
    place_details: {
      place_id: placeId,
      name: selected.name,
      formatted_address: `${selected.address}, ${selected.cityState}`,
      photos: [
        {
          photo_reference: `${placeId}-photo-1`,
          width: 1200,
          height: 800,
          html_attributions: ['YouthSports Demo'],
        },
      ],
      rating: 4.6,
      user_ratings_total: 482,
      types: ['stadium', 'point_of_interest'],
      opening_hours: {
        open_now: true,
        weekday_text: [
          'Mon-Fri: 8:00 AM - 9:00 PM',
          'Sat-Sun: 7:00 AM - 10:00 PM',
        ],
      },
      editorial_summary: {
        overview: selected.summary,
      },
      area_summary: {
        content_blocks: [
          { topic: 'overview', content: selected.summary },
          { topic: 'what_to_expect', content: selected.expect },
        ],
      },
      geometry: {
        location: {
          lat: selected.lat,
          lng: selected.lng,
        },
      },
    } as PlaceDetailsResponse,
    photos: [
      photos[0],
      photos[1],
    ],
    ai_summary: selected.summary,
    ai_what_to_expect: selected.expect,
    errors: {
      place_details: null,
      gemini: null,
    },
    cached: true,
  }
}

/**
 * Fetch venue insights for a given place_id
 * 
 * @param placeId - Google Place ID
 * @param refresh - Force refresh even if cached data exists
 * @returns Venue insights data or error
 */
export async function fetchVenueInsights(
  placeId: string,
  refresh: boolean = false
): Promise<{ data: VenueInsightsResponse | null; error: Error | null }> {
  console.groupCollapsed(`%cfetchVenueInsights: ${placeId}`, 'color: #666; font-weight: bold;');
  debug.data('VenueInsightsService.fetchVenueInsights', 'Request', { placeId, refresh })
  debug.perf.start('venueInsightsService.fetchVenueInsights')

  if (!placeId) {
    debug.perf.end('venueInsightsService.fetchVenueInsights')
    debug.error('VenueInsightsService.fetchVenueInsights', 'place_id is required', { placeId })
    console.groupEnd()
    return { data: null, error: new Error('place_id is required') }
  }

  if (USE_FAKE_DATA) {
    debug.perf.end('venueInsightsService.fetchVenueInsights')
    debug.data('VenueInsightsService.fetchVenueInsights', 'Response (fake)', { placeId })
    console.groupEnd()
    return { data: buildMockVenueInsights(placeId), error: null }
  }

  try {
    const { data, error } = await supabase.functions.invoke('venue-insights-fetch', {
      body: {
        place_id: placeId,
        refresh,
      },
    })

    if (error) {
      debug.perf.end('venueInsightsService.fetchVenueInsights')
      debug.error('VenueInsightsService.fetchVenueInsights', 'Fetch error', { error, placeId })
      console.groupEnd()
      console.error('Venue insights fetch error:', error)
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }

    debug.perf.end('venueInsightsService.fetchVenueInsights')
    debug.data('VenueInsightsService.fetchVenueInsights', 'Response', { placeId, hasData: !!data })
    console.groupEnd()
    return { data: data as VenueInsightsResponse, error: null }
  } catch (err) {
    debug.perf.end('venueInsightsService.fetchVenueInsights')
    debug.error('VenueInsightsService.fetchVenueInsights', 'Exception fetching venue insights', { error: err, placeId })
    console.groupEnd()
    console.error('Venue insights service error:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error fetching venue insights'),
    }
  }
}

/**
 * Get venue insights from database (cached data only)
 * 
 * @param placeId - Google Place ID
 * @returns Cached venue insights or null
 */
export async function getCachedVenueInsights(
  placeId: string
): Promise<{ data: VenueInsights | null; error: Error | null }> {
  console.groupCollapsed(`%cgetCachedVenueInsights: ${placeId}`, 'color: #666; font-weight: bold;');
  debug.data('VenueInsightsService.getCachedVenueInsights', 'Request', { placeId })
  debug.perf.start('venueInsightsService.getCachedVenueInsights')

  if (!placeId) {
    debug.perf.end('venueInsightsService.getCachedVenueInsights')
    debug.error('VenueInsightsService.getCachedVenueInsights', 'place_id is required', { placeId })
    console.groupEnd()
    return { data: null, error: new Error('place_id is required') }
  }

  if (USE_FAKE_DATA) {
    const mock = buildMockVenueInsights(placeId)
    const timestamp = new Date().toISOString()
    return {
      data: {
        id: `venue-insights-${placeId}`,
        place_id: placeId,
        place_details: mock.place_details,
        photos: [],
        ai_summary: mock.ai_summary,
        ai_what_to_expect: mock.ai_what_to_expect,
        ai_generated_at: timestamp,
        ai_validation_status: 'valid',
        place_details_fetched_at: timestamp,
        last_place_details_call_at: timestamp,
        last_gemini_call_at: timestamp,
        fetch_in_progress: false,
        place_id_valid: true,
        created_at: timestamp,
        updated_at: timestamp,
      },
      error: null,
    }
    debug.perf.end('venueInsightsService.getCachedVenueInsights')
    debug.data('VenueInsightsService.getCachedVenueInsights', 'Response (fake)', { placeId })
    console.groupEnd()
    return {
      data: {
        id: `venue-insights-${placeId}`,
        place_id: placeId,
        place_details: mock.place_details,
        photos: [],
        ai_summary: mock.ai_summary,
        ai_what_to_expect: mock.ai_what_to_expect,
        ai_generated_at: timestamp,
        ai_validation_status: 'valid',
        place_details_fetched_at: timestamp,
        last_place_details_call_at: timestamp,
        last_gemini_call_at: timestamp,
        fetch_in_progress: false,
        place_id_valid: true,
        created_at: timestamp,
        updated_at: timestamp,
      },
      error: null,
    }
  }

  try {
    const { data, error } = await (supabase as any)
      .from('venue_insights')
      .select('*')
      .eq('place_id', placeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - not an error
        return { data: null, error: null }
      }
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }

    if (!data) {
      return { data: null, error: null }
    }

    const mapped = mapVenueInsightsRow(data as any)
    return { data: mapped, error: null }
  } catch (err) {
    console.error('Get cached venue insights error:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error fetching cached venue insights'),
    }
  }
}

/**
 * Refresh venue insights (force fetch from APIs)
 * 
 * @param placeId - Google Place ID
 * @returns Updated venue insights or error
 */
export async function refreshVenueInsights(
  placeId: string
): Promise<{ data: VenueInsightsResponse | null; error: Error | null }> {
  console.groupCollapsed(`%crefreshVenueInsights: ${placeId}`, 'color: #666; font-weight: bold;');
  debug.flow('VenueInsightsService.refreshVenueInsights', 'Refreshing insights', { placeId })
  debug.perf.start('venueInsightsService.refreshVenueInsights')
  const result = await fetchVenueInsights(placeId, true)
  debug.perf.end('venueInsightsService.refreshVenueInsights')
  if (result.error) {
    debug.error('VenueInsightsService.refreshVenueInsights', 'Failed to refresh', { error: result.error, placeId })
  } else {
    debug.flow('VenueInsightsService.refreshVenueInsights', 'Insights refreshed successfully', { placeId })
  }
  console.groupEnd()
  return result
}

// ============================================================================
// Direct Google Places API (New) - bypasses edge function
// ============================================================================

export interface NeighborhoodSummaryResponse {
  name: string | null
  area_summary: {
    content_blocks: Array<{ topic: string; content: string }>
  } | null
  error: string | null
}

/**
 * Fetch neighborhood/area summary directly from Google Places API (New).
 * Bypasses edge function for immediate, fresh data.
 * 
 * @param placeId - Google Place ID
 * @returns Area summary data or error
 */
export async function fetchNeighborhoodSummaryDirect(
  placeId: string
): Promise<{ data: NeighborhoodSummaryResponse | null; error: Error | null }> {
  if (!placeId) {
    return { data: null, error: new Error('place_id is required') }
  }

  if (USE_FAKE_DATA) {
    const mock = buildMockVenueInsights(placeId)
    return {
      data: {
        name: mock.place_details?.name || 'Demo Venue',
        area_summary: {
          content_blocks: [
            {
              topic: 'overview',
              content: mock.ai_summary || 'Popular youth sports destination with family-oriented amenities.',
            },
            {
              topic: 'description',
              content: mock.ai_what_to_expect || 'Plan for early arrival and event-day pedestrian traffic around entry gates.',
            },
          ],
        },
        error: null,
      },
      error: null,
    }
    debug.perf.end('venueInsightsService.fetchNeighborhoodSummaryDirect')
    debug.data('VenueInsightsService.fetchNeighborhoodSummaryDirect', 'Response (fake)', { placeId })
    console.groupEnd()
    return {
      data: {
        name: mock.place_details?.name || 'Demo Venue',
        area_summary: {
          content_blocks: [
            {
              topic: 'overview',
              content: mock.ai_summary || 'Popular youth sports destination with family-oriented amenities.',
            },
            {
              topic: 'description',
              content: mock.ai_what_to_expect || 'Plan for early arrival and event-day pedestrian traffic around entry gates.',
            },
          ],
        },
        error: null,
      },
      error: null,
    }
  }

  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    debug.perf.end('venueInsightsService.fetchNeighborhoodSummaryDirect')
    debug.error('VenueInsightsService.fetchNeighborhoodSummaryDirect', 'API key not configured', { placeId })
    console.groupEnd()
    return { data: null, error: new Error('Google Places API key not configured') }
  }

  try {
    const fields = ['displayName', 'neighborhoodSummary']
    const url = `https://places.googleapis.com/v1/places/${placeId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fields.join(','),
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      debug.perf.end('venueInsightsService.fetchNeighborhoodSummaryDirect')
      debug.error('VenueInsightsService.fetchNeighborhoodSummaryDirect', 'API error', { status: response.status, placeId })
      console.groupEnd()
      console.error('Google Places API error:', response.status, errorText)
      return {
        data: { name: null, area_summary: null, error: `API error: ${response.status}` },
        error: null,
      }
    }

    const data = await response.json()

    // Map neighborhoodSummary to our area_summary shape
    const ns = data.neighborhoodSummary
    let areaSummary: NeighborhoodSummaryResponse['area_summary'] = null

    if (ns) {
      const blocks: Array<{ topic: string; content: string }> = []
      const overviewText = ns.overview?.content?.text
      if (overviewText && typeof overviewText === 'string') {
        blocks.push({ topic: 'overview', content: overviewText })
      }
      const descriptionText = ns.description?.content?.text
      if (descriptionText && typeof descriptionText === 'string') {
        blocks.push({ topic: 'description', content: descriptionText })
      }
      if (blocks.length > 0) {
        areaSummary = { content_blocks: blocks }
      }
    }

    debug.perf.end('venueInsightsService.fetchNeighborhoodSummaryDirect')
    debug.data('VenueInsightsService.fetchNeighborhoodSummaryDirect', 'Response', { placeId, hasSummary: !!areaSummary })
    console.groupEnd()
    return {
      data: {
        name: data.displayName?.text || null,
        area_summary: areaSummary,
        error: null,
      },
      error: null,
    }
  } catch (err) {
    debug.perf.end('venueInsightsService.fetchNeighborhoodSummaryDirect')
    debug.error('VenueInsightsService.fetchNeighborhoodSummaryDirect', 'Exception fetching neighborhood summary', { error: err, placeId })
    console.groupEnd()
    console.error('fetchNeighborhoodSummaryDirect error:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error fetching neighborhood summary'),
    }
  }
}
