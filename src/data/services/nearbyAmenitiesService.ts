/**
 * Nearby Amenities Service
 * 
 * Provides data access for nearby amenities (Google Places Nearby Search + AI curation).
 * Calls Edge Function to fetch and cache nearby amenity information.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'

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

function buildMockAmenities(eventType: string): AmenityItem[] {
    const cafe: AmenityItem[] = [
        { place_id: 'amenity-cafe-001', name: 'Parkside Coffee House', walking_minutes: 6, category: 'cafe', description: 'Quick espresso drinks, breakfast wraps, and indoor seating for pregame meetups.' },
        { place_id: 'amenity-food-001', name: 'Champions Grill', walking_minutes: 9, category: 'food', description: 'Family-style menu with sandwiches, salads, and kid-friendly combo meals.' },
        { place_id: 'amenity-pharmacy-001', name: 'Riverside Pharmacy', walking_minutes: 11, category: 'pharmacy', description: 'Convenient pickup for first aid supplies and hydration products.' },
        { place_id: 'amenity-hotel-001', name: 'Gateway Suites', walking_minutes: 14, category: 'lodging', description: 'Tournament-rate hotel with early breakfast and team block options.' },
        { place_id: 'amenity-grocery-001', name: 'City Market Fresh', walking_minutes: 12, category: 'grocery', description: 'Healthy snacks, drinks, and grab-and-go meal kits for game days.' },
    ]

    const nightlife: AmenityItem[] = [
        { place_id: 'amenity-food-002', name: 'Victory Pizza Co.', walking_minutes: 8, category: 'food', description: 'Large-group seating and quick dinner service after evening sessions.' },
        { place_id: 'amenity-dessert-001', name: 'Summit Creamery', walking_minutes: 10, category: 'dessert', description: 'Local ice cream and non-dairy options popular with family groups.' },
        { place_id: 'amenity-park-001', name: 'Riverfront Walk', walking_minutes: 7, category: 'outdoors', description: 'Scenic walking path for cooldown and recovery between games.' },
        { place_id: 'amenity-gas-001', name: 'Metro Fuel Stop', walking_minutes: 13, category: 'gas', description: 'Fuel, convenience goods, and late-night service for travel teams.' },
    ]

    if (eventType === 'fundraiser' || eventType === 'social_event') {
        return nightlife
    }
    return cafe
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

    if (USE_FAKE_DATA) {
        const venueKey = buildVenueKey(params.placeId, params.latitude, params.longitude) || 'place_id:demo'
        return {
            data: {
                amenities: buildMockAmenities(params.eventType),
                cached: true,
                venue_key: venueKey,
                event_type: params.eventType,
                time_window: params.eventStartTime,
                fallback: false,
                fetch_in_progress: false,
            },
            error: null,
        }
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
