/**
 * useVenueInsights Hook
 * 
 * React Query hook for fetching and managing venue insights.
 * Provides automatic caching, deduplication, and refetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVenueInsights, refreshVenueInsights, fetchNeighborhoodSummaryDirect } from '../data/services/venueInsightsService'
import { CACHE_TTL, QUERY_CONFIG } from '../constants/api'

/**
 * Hook to fetch venue insights for a given place_id
 * 
 * @param placeId - Google Place ID (null to disable query)
 * @returns React Query result with venue insights data
 */
export function useVenueInsights(placeId: string | null) {
  return useQuery({
    queryKey: ['venueInsights', placeId],
    queryFn: () => {
      if (!placeId) {
        throw new Error('place_id is required')
      }
      return fetchVenueInsights(placeId, false)
    },
    enabled: !!placeId,
    staleTime: CACHE_TTL.VENUE_INSIGHTS_MS,
    refetchOnWindowFocus: false,
    retry: QUERY_CONFIG.RETRY_COUNT,
  })
}

/**
 * Hook to refresh venue insights (force fetch from APIs)
 * 
 * @returns Mutation function to refresh venue insights
 */
export function useRefreshVenueInsights() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (placeId: string) => refreshVenueInsights(placeId),
    onSuccess: (result, placeId) => {
      if (result.data) {
        // Update cache with new data
        queryClient.setQueryData(['venueInsights', placeId], result)
        // Invalidate to trigger refetch if needed
        queryClient.invalidateQueries({ queryKey: ['venueInsights', placeId] })
      }
    },
  })
}

/**
 * Hook to fetch neighborhood/area summary directly from Google Places API (New).
 * Bypasses edge function for immediate, fresh data.
 * 
 * @param placeId - Google Place ID (null to disable query)
 * @returns React Query result with neighborhood summary data
 */
export function useNeighborhoodSummaryDirect(placeId: string | null) {
  return useQuery({
    queryKey: ['neighborhoodSummary', placeId],
    queryFn: () => {
      if (!placeId) {
        throw new Error('place_id is required')
      }
      return fetchNeighborhoodSummaryDirect(placeId)
    },
    enabled: !!placeId,
    staleTime: QUERY_CONFIG.STALE_TIME_MS * 2, // 10 minutes (2x standard stale time)
    refetchOnWindowFocus: false,
    retry: QUERY_CONFIG.RETRY_COUNT,
  })
}
