/**
 * useNearbyAmenities Hook
 * 
 * React Query hook for fetching and managing nearby amenities.
 * Provides automatic caching, deduplication, and refetching.
 * 
 * Query key is built to match server-side venue_key for consistent caching:
 * - ['nearbyAmenities', venue_key, event_type, event_start_time]
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchNearbyAmenities,
    refreshNearbyAmenities,
    buildVenueKey,
    type FetchNearbyAmenitiesParams,
} from '../data/services/nearbyAmenitiesService'
import { CACHE_TTL, QUERY_CONFIG } from '../constants/api'

/**
 * Parameters for the useNearbyAmenities hook
 */
export interface UseNearbyAmenitiesParams {
    latitude?: number | null
    longitude?: number | null
    placeId?: string | null
    eventType: string
    eventStartTime: string
    enabled?: boolean
}

/**
 * Hook to fetch nearby amenities for a given venue location
 * 
 * @param params - Location, event context, and enabled flag
 * @returns React Query result with nearby amenities data
 */
export function useNearbyAmenities({
    latitude,
    longitude,
    placeId,
    eventType,
    eventStartTime,
    enabled = true,
}: UseNearbyAmenitiesParams) {
    // Build venue_key using the same algorithm as the server (Technical T7)
    const venueKey = buildVenueKey(placeId, latitude, longitude)

    // Normalize event_type to lowercase for consistent cache key
    const normalizedEventType = (eventType || 'game').toLowerCase()

    // Determine if we can make the request
    const hasValidLocation = !!venueKey
    const isEnabled = enabled && hasValidLocation

    return useQuery({
        queryKey: ['nearbyAmenities', venueKey, normalizedEventType, eventStartTime],
        queryFn: async () => {
            const result = await fetchNearbyAmenities({
                latitude: latitude ?? undefined,
                longitude: longitude ?? undefined,
                placeId: placeId ?? undefined,
                eventType: normalizedEventType,
                eventStartTime,
                refresh: false,
            })

            if (result.error) {
                throw result.error
            }

            return result.data
        },
        enabled: isEnabled,
        staleTime: CACHE_TTL.NEARBY_AMENITIES_MS,
        refetchOnWindowFocus: false,
        retry: QUERY_CONFIG.RETRY_COUNT,
        // Don't retry on 429 (fetch in progress)
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    })
}

/**
 * Hook to refresh nearby amenities (force fetch from APIs)
 * Used by admin-only refresh button
 * 
 * @returns Mutation function to refresh nearby amenities
 */
export function useRefreshNearbyAmenities() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: FetchNearbyAmenitiesParams) => {
            const result = await refreshNearbyAmenities(params)
            if (result.error) {
                throw result.error
            }
            return result.data
        },
        onSuccess: (data, params) => {
            if (data) {
                // Build the same query key as useNearbyAmenities
                const venueKey = buildVenueKey(params.placeId, params.latitude, params.longitude)
                const normalizedEventType = (params.eventType || 'game').toLowerCase()
                const queryKey = ['nearbyAmenities', venueKey, normalizedEventType, params.eventStartTime]

                // Update cache with new data
                queryClient.setQueryData(queryKey, data)

                // Invalidate to trigger refetch if needed
                queryClient.invalidateQueries({ queryKey: ['nearbyAmenities', venueKey] })
            }
        },
    })
}

/**
 * Helper hook to check if nearby amenities should be shown
 * Returns true if we have valid location data (lat/lng or place_id)
 */
export function canShowNearbyAmenities(
    latitude?: number | null,
    longitude?: number | null,
    placeId?: string | null
): boolean {
    const hasCoordinates = latitude !== null && latitude !== undefined &&
        longitude !== null && longitude !== undefined &&
        Number.isFinite(latitude) && Number.isFinite(longitude)
    const hasPlaceId = !!placeId

    return hasCoordinates || hasPlaceId
}
