/**
 * Venue Insights Service
 * 
 * Provides data access for venue insights (Google Places + AI summaries).
 * Calls Edge Function to fetch and cache venue information.
 */

import { supabase } from '../../lib/supabase'
import type { VenueInsights, PlaceDetailsResponse } from '../../types/venueInsights'
import { mapVenueInsightsRow } from '../../types/venueInsights'

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
  if (!placeId) {
    return { data: null, error: new Error('place_id is required') }
  }

  try {
    const { data, error } = await supabase.functions.invoke('venue-insights-fetch', {
      body: {
        place_id: placeId,
        refresh,
      },
    })

    if (error) {
      console.error('Venue insights fetch error:', error)
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }

    return { data: data as VenueInsightsResponse, error: null }
  } catch (err) {
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
  if (!placeId) {
    return { data: null, error: new Error('place_id is required') }
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
  return fetchVenueInsights(placeId, true)
}
