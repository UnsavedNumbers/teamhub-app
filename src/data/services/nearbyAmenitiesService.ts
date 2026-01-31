/**
 * Nearby Amenities Service
 * 
 * Provides data access for nearby amenities (Google Places Nearby Search + AI curation).
 * Calls Edge Function to fetch and cache nearby amenity information.
 */

import { supabase } from '../../lib/supabase'

/**
 * Individual amenity item returned from the API
 */
export interface AmenityItem {
    place_id: string
    name: string
    walking_minutes: number
    category?: string
    description?: string
}

/**
 * Response from the nearby-amenities-fetch edge function
 */
export interface NearbyAmenitiesResponse {
    amenities: AmenityItem[] | null
    cached: boolean
    venue_key?: string
    event_type?: string
    time_window?: string
    fallback?: boolean
    fetch_in_progress?: boolean
    error?: string
}

/**
 * Parameters for fetching nearby amenities
 */
export interface FetchNearbyAmenitiesParams {
    latitude?: number | null
    longitude?: number | null
    placeId?: string | null
    eventType: string
    eventStartTime: string
    refresh?: boolean
}

/**
 * Build venue_key the same way as the server for React Query cache key consistency
 * When place_id is present: "place_id:ChIJ..."
 * Otherwise: "lat:<rounded>,lng:<rounded>" (4 decimal places)
 */
export function buildVenueKey(
    placeId: string | null | undefined,
    lat: number | null | undefined,
    lng: number | null | undefined
): string | null {
    if (placeId) {
        return `place_id:${placeId}`
    }
    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined &&
        Number.isFinite(lat) && Number.isFinite(lng)) {
        return `lat:${lat.toFixed(4)},lng:${lng.toFixed(4)}`
    }
    return null
}

/**
 * Fetch nearby amenities for a given venue location
 * 
 * @param params - Location and event context parameters
 * @returns Nearby amenities data or error
 */
export async function fetchNearbyAmenities(
    params: FetchNearbyAmenitiesParams
): Promise<{ data: NearbyAmenitiesResponse | null; error: Error | null }> {
    // Require either lat/lng or placeId
    const hasCoordinates = params.latitude !== null && params.latitude !== undefined &&
        params.longitude !== null && params.longitude !== undefined &&
        Number.isFinite(params.latitude) && Number.isFinite(params.longitude)
    const hasPlaceId = !!params.placeId

    if (!hasCoordinates && !hasPlaceId) {
        return { data: null, error: new Error('Either coordinates or place_id is required') }
    }

    try {
        const { data, error } = await supabase.functions.invoke('nearby-amenities-fetch', {
            body: {
                latitude: params.latitude,
                longitude: params.longitude,
                place_id: params.placeId,
                event_type: params.eventType,
                event_start_time: params.eventStartTime,
                refresh: params.refresh ?? false,
            },
        })

        if (error) {
            console.error('Nearby amenities fetch error:', error)
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
        }

        return { data: data as NearbyAmenitiesResponse, error: null }
    } catch (err) {
        console.error('Nearby amenities service error:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error fetching nearby amenities'),
        }
    }
}

/**
 * Refresh nearby amenities (force fetch from APIs)
 * 
 * @param params - Location and event context parameters
 * @returns Updated nearby amenities or error
 */
export async function refreshNearbyAmenities(
    params: FetchNearbyAmenitiesParams
): Promise<{ data: NearbyAmenitiesResponse | null; error: Error | null }> {
    return fetchNearbyAmenities({ ...params, refresh: true })
}
